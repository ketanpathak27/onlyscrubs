/** HMAC session cookie. The admin token is the key and never goes in the cookie. */

export const SESSION_COOKIE = "os_admin";
export const SESSION_SECONDS = 60 * 60 * 12;

function bytesToB64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return bytesToB64url(new Uint8Array(signature));
}

async function signaturesMatch(a, b) {
  const enc = new TextEncoder();
  const left = enc.encode(String(a));
  const right = enc.encode(String(b));
  if (left.byteLength !== right.byteLength) {
    await crypto.subtle.digest("SHA-256", left);
    return false;
  }
  if (typeof crypto.subtle.timingSafeEqual === "function") return crypto.subtle.timingSafeEqual(left, right);
  const ha = new Uint8Array(await crypto.subtle.digest("SHA-256", left));
  const hb = new Uint8Array(await crypto.subtle.digest("SHA-256", right));
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}

export function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === name) return trimmed.slice(eq + 1);
  }
  return "";
}

export async function signSession(token, now = Date.now()) {
  const payload = bytesToB64url(new TextEncoder().encode(JSON.stringify({ exp: now + SESSION_SECONDS * 1000 })));
  const signature = await hmac(token, payload);
  return `${payload}.${signature}`;
}

export async function verifySession(token, cookieValue, now = Date.now()) {
  if (!token || !cookieValue || String(cookieValue).split(".").length !== 2) return false;
  const [payload, signature] = String(cookieValue).split(".");
  const expected = await hmac(token, payload);
  if (!(await signaturesMatch(signature, expected))) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload)));
    return typeof data.exp === "number" && data.exp > now;
  } catch {
    return false;
  }
}

export function sessionCookie(value, maxAge = SESSION_SECONDS) {
  const parts = [
    `${SESSION_COOKIE}=${value}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Path=/",
    `Max-Age=${maxAge}`
  ];
  if (Number(maxAge) <= 0) parts.push("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
  return parts.join("; ");
}

export async function signMessage(secret, message) {
  return hmac(secret, message);
}

export async function verifyMessage(secret, message, signature) {
  if (!secret || !message || !signature) return false;
  return signaturesMatch(await hmac(secret, message), signature);
}

export function encodeTokenPart(text) {
  return bytesToB64url(new TextEncoder().encode(String(text)));
}

export function decodeTokenPart(value) {
  return new TextDecoder().decode(b64urlToBytes(String(value || "")));
}
