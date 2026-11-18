import { readCookie, SESSION_COOKIE, verifySession } from "./session.js";

/** One year, all subdomains. Deliberately no preload: that is hard to undo. */
export const HSTS = "max-age=31536000; includeSubDomains";

export function json(data, status = 200, extra = {}) {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "strict-transport-security": HSTS
  });
  if (extra.retryAfter) headers.set("retry-after", String(extra.retryAfter));
  return new Response(JSON.stringify(data), { status, headers });
}

export function limited(check) {
  return json({ error: "Too many requests. Please try again later." }, 429, { retryAfter: check.retryAfter });
}

export async function readJson(request, max = 12000) {
  const len = Number(request.headers.get("content-length") || 0);
  if (len > max) return { error: "Payload too large.", status: 413 };
  const text = await request.text();
  if (text.length > max) return { error: "Payload too large.", status: 413 };
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { error: "Invalid request.", status: 400 };
    }
    return { body };
  } catch {
    return { error: "Invalid request.", status: 400 };
  }
}

export async function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const aa = enc.encode(String(a));
  const bb = enc.encode(String(b));
  if (aa.byteLength !== bb.byteLength) {
    await crypto.subtle.digest("SHA-256", aa);
    return false;
  }
  if (typeof crypto.subtle.timingSafeEqual === "function") {
    return crypto.subtle.timingSafeEqual(aa, bb);
  }
  const ha = new Uint8Array(await crypto.subtle.digest("SHA-256", aa));
  const hb = new Uint8Array(await crypto.subtle.digest("SHA-256", bb));
  let out = 0;
  for (let i = 0; i < ha.length; i++) out |= ha[i] ^ hb[i];
  return out === 0;
}

export async function auth(request, env) {
  const expected = env.ADMIN_TOKEN;
  if (!expected) return false;
  const header = request.headers.get("authorization") || "";
  const prefix = "Bearer ";
  if (header.startsWith(prefix)) return timingSafeEqual(header.slice(prefix.length), expected);
  return verifySession(expected, readCookie(request, SESSION_COOKIE));
}

/** Read a rate-limit bucket without incrementing it. */
export async function rateLimitState(kv, key, limit) {
  if (!kv) return { ok: true, count: 0 };
  const raw = await kv.get("rl:" + key, { type: "json" });
  const now = Date.now();
  if (!raw || !raw.reset || raw.reset <= now) return { ok: true, count: 0 };
  if (raw.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((raw.reset - now) / 1000)), count: raw.count };
  }
  return { ok: true, count: raw.count };
}

/** SHA-256 of the client IP, truncated. Matches the original vote-dedupe key material. */
export async function clientKey(request) {
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "unknown";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

export async function rateLimit(kv, key, limit, windowSec) {
  if (!kv) return { ok: true };
  const now = Date.now();
  const storageKey = "rl:" + key;
  const raw = await kv.get(storageKey, { type: "json" });
  if (!raw || !raw.reset || raw.reset <= now) {
    await kv.put(storageKey, JSON.stringify({ count: 1, reset: now + windowSec * 1000 }), {
      expirationTtl: windowSec + 5
    });
    return { ok: true };
  }
  if (raw.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((raw.reset - now) / 1000)) };
  }
  raw.count += 1;
  const ttl = Math.max(1, Math.ceil((raw.reset - now) / 1000));
  await kv.put(storageKey, JSON.stringify(raw), { expirationTtl: ttl });
  return { ok: true };
}

export function cacheControlFor(pathname) {
  if (pathname === "/sw.js" || pathname.startsWith("/admin") || pathname === "/unsubscribe") return "no-store";
  if (pathname.startsWith("/assets/fonts/")) return "public, max-age=604800";
  if (pathname.startsWith("/assets/")) return "public, max-age=31536000, immutable";
  if (pathname === "/robots.txt" || pathname === "/favicon.svg" || pathname === "/favicon.ico") {
    return "public, max-age=86400";
  }
  if (pathname.startsWith("/icons/") || pathname === "/apple-touch-icon.png" || pathname === "/og.png") {
    return "public, max-age=86400";
  }
  if (pathname === "/sitemap.xml" || pathname === "/manifest.webmanifest") return "public, max-age=3600";
  return "public, max-age=300";
}

export function contentSecurityPolicy(scriptHashes) {
  const hashes = (scriptHashes || []).map((hash) => `'${hash}'`).join(" ");
  return [
    "default-src 'self'",
    `script-src 'self' https://static.cloudflareinsights.com https://challenges.cloudflare.com ${hashes}`.trim(),
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' https://cloudflareinsights.com https://static.cloudflareinsights.com https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "upgrade-insecure-requests"
  ].join("; ");
}

export function applySecurityHeaders(response, pathname, scriptHashes) {
  const headers = new Headers(response.headers);
  const type = headers.get("content-type") || "";
  const isHtml = type.includes("text/html") || pathname.endsWith(".html") || pathname === "/";
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set("strict-transport-security", HSTS);
  headers.set("cache-control", cacheControlFor(pathname));
  if (pathname.startsWith("/admin") || pathname === "/unsubscribe") headers.set("x-robots-tag", "noindex, nofollow");
  if (pathname === "/unsubscribe") headers.set("referrer-policy", "no-referrer");
  if (isHtml || pathname.endsWith(".svg")) {
    headers.set("content-security-policy", contentSecurityPolicy(isHtml ? scriptHashes : []));
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
