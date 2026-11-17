import { json, readJson, auth, clientKey, rateLimit, rateLimitState, limited, timingSafeEqual } from "../lib/http.js";
import { sitemapUrls, submitIndexNow } from "../lib/indexnow.js";
import { clean } from "../lib/moderation.js";
import { unsubscribeToken, unsubscribeUrl } from "../lib/newsletter.js";
import { sessionCookie, signSession } from "../lib/session.js";
import { archiveOld, findById, listByPrefix, strip } from "../lib/store.js";

const KIND_PREFIX = {
  confession: "confession:",
  comment: "comment:",
  listing: "listing:",
  relay: "relay:"
};

async function requireAdmin(request, env) {
  const kv = env.CONFESSIONS_KV;
  if (!kv) return { error: json({ error: "Storage is not configured" }, 500) };
  if (await auth(request, env)) return { kv };
  const limit = await rateLimit(kv, "adminfail:" + (await clientKey(request)), 30, 900);
  if (!limit.ok) return { error: limited(limit) };
  return { error: json({ error: "Admin token required." }, 401) };
}

function applyAction(item, kind, action) {
  const now = new Date().toISOString();
  if (action === "delete") return { delete: true };
  if (action === "approve" && kind !== "relay") {
    item.status = "approved";
    item.approvedAt = now;
    delete item.hiddenAt;
    return { item };
  }
  if (action === "reject" && kind !== "relay") {
    item.status = "rejected";
    item.rejectedAt = now;
    return { item };
  }
  if (kind === "confession" && action === "archive") {
    item.status = "archived";
    item.archivedAt = now;
    return { item };
  }
  if (kind === "confession" && action === "restore") {
    item.status = "approved";
    item.restoredAt = now;
    return { item };
  }
  if (kind === "relay" && (action === "read" || action === "approve")) {
    item.status = "read";
    item.readAt = now;
    return { item };
  }
  return { error: "Unknown action." };
}

function withCookie(response, cookie) {
  const headers = new Headers(response.headers);
  headers.append("set-cookie", cookie);
  return new Response(response.body, { status: response.status, headers });
}

export async function apiAdminSession(request, env) {
  return json({ signedIn: await auth(request, env) });
}

export async function apiAdminLogin(request, env) {
  const kv = env.CONFESSIONS_KV;
  if (!kv) return json({ error: "Storage is not configured" }, 500);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const bucket = "adminlogin:" + (await clientKey(request));
  const state = await rateLimitState(kv, bucket, 5);
  if (!state.ok) return limited(state);
  const parsed = await readJson(request);
  const password = parsed.error ? "" : String(parsed.body.password ?? "");
  const expected = env.ADMIN_TOKEN || "";
  const matches = Boolean(expected) && (await timingSafeEqual(password, expected));
  if (!matches) {
    const limit = await rateLimit(kv, bucket, 5, 900);
    if (!limit.ok) return limited(limit);
    return json({ error: "Incorrect password." }, 401);
  }
  const cookie = sessionCookie(await signSession(expected));
  return withCookie(json({ ok: true }), cookie);
}

export async function apiAdminLogout(request) {
  if (request && request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  return withCookie(json({ ok: true }), sessionCookie("", 0));
}

export async function apiAdminIndexNow(request, env) {
  const gate = await requireAdmin(request, env);
  if (gate.error) return gate.error;
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!env.ASSETS) return json({ error: "Sitemap is not available." }, 500);
  const sitemapUrl = new URL("/sitemap.xml", request.url);
  const sitemapRes = await env.ASSETS.fetch(new Request(sitemapUrl));
  if (!sitemapRes.ok) return json({ error: "Sitemap could not be read." }, 500);
  const urls = sitemapUrls(await sitemapRes.text());
  if (!urls.length) return json({ error: "Sitemap was empty." }, 500);
  try {
    const result = await submitIndexNow(urls);
    if (!result.ok) {
      return json({
        ok: false,
        status: result.status,
        count: result.count,
        error: "IndexNow returned " + result.status + ". The key file must be live on onlyscrubs.org before a submission is accepted."
      }, 502);
    }
    return json({ ok: true, status: result.status, count: result.count });
  } catch {
    return json({ error: "IndexNow could not be reached." }, 502);
  }
}

export async function apiAdmin(request, env) {
  const gate = await requireAdmin(request, env);
  if (gate.error) return gate.error;
  const kv = gate.kv;
  await archiveOld(kv);
  if (request.method === "GET") {
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind") || "confession";
    const status = url.searchParams.get("status") || "pending";
    const prefix = KIND_PREFIX[kind] || KIND_PREFIX.confession;
    let items = await listByPrefix(kv, prefix);
    if (status === "reported") {
      items = items.filter((item) => (Number(item.reportsCount) || 0) > 0);
    } else if (status) {
      items = items.filter((item) => item.status === status);
    }
    return json({ items: items.map(strip) });
  }
  if (request.method === "PATCH") {
    const parsed = await readJson(request);
    if (parsed.error) return json({ error: "Invalid admin request." }, 400);
    const body = parsed.body;
    if (body.kind === "confession" && body.action === "archive-old") {
      return json({ ok: true, archived: await archiveOld(kv, true) });
    }
    if (body.kind === "newsletter" && body.action === "delete") {
      const email = clean(body.id).toLowerCase();
      await kv.delete("newsletter:" + email);
      return json({ ok: true });
    }
    const kind = KIND_PREFIX[body.kind] ? body.kind : "confession";
    const item = await findById(kv, KIND_PREFIX[kind], clean(body.id));
    if (!item) return json({ error: "Item not found." }, 404);
    const result = applyAction(item, kind, body.action);
    if (result.error) return json({ error: result.error }, 400);
    if (result.delete) {
      await kv.delete(item._key);
      return json({ ok: true });
    }
    await kv.put(item._key, JSON.stringify(strip(result.item)));
    return json({ ok: true });
  }
  return json({ error: "Method not allowed" }, 405);
}

export async function apiAdminBulk(request, env) {
  const gate = await requireAdmin(request, env);
  if (gate.error) return gate.error;
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const parsed = await readJson(request);
  if (parsed.error) return json({ error: "Invalid admin request." }, 400);
  const kind = parsed.body.kind;
  const action = parsed.body.action;
  const ids = Array.isArray(parsed.body.ids) ? parsed.body.ids.map((id) => clean(id)).filter(Boolean) : [];
  if (!KIND_PREFIX[kind]) return json({ error: "Unknown queue." }, 400);
  if (!ids.length) return json({ error: "Choose at least one item." }, 400);
  if (ids.length > 50) return json({ error: "Bulk actions are limited to 50 items." }, 400);
  const results = [];
  for (const id of ids) {
    const item = await findById(gate.kv, KIND_PREFIX[kind], id);
    if (!item) {
      results.push({ id, ok: false, error: "Item not found." });
      continue;
    }
    const result = applyAction(item, kind, action);
    if (result.error) {
      results.push({ id, ok: false, error: result.error });
      continue;
    }
    if (result.delete) await gate.kv.delete(item._key);
    else await gate.kv.put(item._key, JSON.stringify(strip(result.item)));
    results.push({ id, ok: true });
  }
  return json({ ok: true, results });
}

export async function apiStats(request, env) {
  const gate = await requireAdmin(request, env);
  if (gate.error) return gate.error;
  const kv = gate.kv;
  const conf = await listByPrefix(kv, "confession:");
  const comments = await listByPrefix(kv, "comment:");
  const listings = await listByPrefix(kv, "listing:");
  const relays = await listByPrefix(kv, "relay:");
  const newsletter = await kv.list({ prefix: "newsletter:" });
  const today = sydneyDay(new Date().toISOString());
  const approvedToday = [...conf, ...listings].filter((item) => item.status === "approved" && sydneyDay(item.approvedAt) === today).length;
  const pendingConfessions = conf.filter((item) => item.status === "pending").length;
  const pendingListings = listings.filter((item) => item.status === "pending").length;
  return json({
    totals: {
      approved: conf.filter((item) => item.status === "approved").length,
      pending: pendingConfessions,
      pendingItems: pendingConfessions + pendingListings,
      approvedToday,
      archived: conf.filter((item) => item.status === "archived").length,
      pendingComments: comments.filter((item) => item.status === "pending").length,
      reports: conf.reduce((sum, item) => sum + (Number(item.reportsCount) || 0), 0) +
        listings.reduce((sum, item) => sum + (Number(item.reportsCount) || 0), 0),
      newsletter: newsletter.keys.length,
      pendingListings,
      approvedListings: listings.filter((item) => item.status === "approved").length,
      newMessages: relays.filter((item) => item.status === "new").length
    },
    flagged: conf
      .filter((item) => (Number(item.reportsCount) || 0) > 0)
      .sort((a, b) => (b.reportsCount || 0) - (a.reportsCount || 0))
      .slice(0, 10)
      .map(strip),
    flaggedListings: listings
      .filter((item) => (Number(item.reportsCount) || 0) > 0)
      .sort((a, b) => (b.reportsCount || 0) - (a.reportsCount || 0))
      .slice(0, 10)
      .map(strip)
  });
}

function sydneyDay(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(date);
}

function csvCell(value) {
  let cell = String(value ?? "");
  if (/^[=+\-@]/.test(cell)) cell = "'" + cell;
  if (/[",\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

export async function apiNewsletterExport(request, env) {
  const gate = await requireAdmin(request, env);
  if (gate.error) return gate.error;
  const listed = await gate.kv.list({ prefix: "newsletter:" });
  const rows = [["email", "createdAt", "consentAt", "unsubscribeUrl"]];
  const secret = env.ADMIN_TOKEN || "";
  for (const key of listed.keys) {
    const raw = await gate.kv.get(key.name);
    let email = key.name.slice("newsletter:".length);
    let createdAt = "";
    let consentAt = "";
    try {
      const parsed = JSON.parse(raw);
      email = parsed.email || email;
      createdAt = parsed.createdAt || "";
      consentAt = parsed.consentAt || "";
    } catch {
      /* keep the key */
    }
    const link = secret ? unsubscribeUrl(await unsubscribeToken(secret, email)) : "";
    rows.push([email, createdAt, consentAt, link]);
  }
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=\"onlyscrubs-newsletter.csv\"",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow"
    }
  });
}
