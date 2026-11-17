import { applySecurityHeaders, json, limited, readJson, clientKey, rateLimit, auth } from "../lib/http.js";
import { clean, risky, hasDirectContact, normaliseTags, mergeTags, validEmail } from "../lib/moderation.js";
import { CONSENT_TEXT, consentGiven, emailFromUnsubscribeToken, unsubscribeToken, unsubscribeUrl } from "../lib/newsletter.js";
import { archiveOld, findById, listByPrefix, strip } from "../lib/store.js";
import { verifyTurnstile, turnstileFailure } from "../lib/turnstile.js";

function examples() {
  return [
    {
      id: "example-1",
      text: "I packed five pens for one shift and still asked someone else if I could borrow one.",
      createdAt: "2026-06-04T00:00:00.000Z",
      status: "approved",
      score: 0,
      hugs: 0,
      sames: 0,
      tags: ["pens", "scrub-life"],
      commentsCount: 0,
      example: true
    },
    {
      id: "example-2",
      text: "My scrub pocket contained a snack wrapper, two pen lids, a mystery glove and absolutely no pen.",
      createdAt: "2026-06-04T00:00:00.000Z",
      status: "approved",
      score: 0,
      hugs: 0,
      sames: 0,
      tags: ["pens", "breaks", "scrub-life"],
      commentsCount: 0,
      example: true
    }
  ];
}

function toPublic(item, commentsCount) {
  const copy = strip(item);
  delete copy.lastReportReason;
  delete copy.hiddenAt;
  delete copy.reportedAt;
  copy.score = Number(copy.score) || 0;
  copy.hugs = Number(copy.hugs) || 0;
  copy.sames = Number(copy.sames) || 0;
  copy.tags = mergeTags(copy.text, copy.tags);
  copy.commentsCount = commentsCount || 0;
  return copy;
}

async function commentCounts(kv) {
  const comments = await listByPrefix(kv, "comment:");
  const counts = new Map();
  for (const comment of comments) {
    if (comment.status === "approved" && comment.confessionId) {
      counts.set(comment.confessionId, (counts.get(comment.confessionId) || 0) + 1);
    }
  }
  return counts;
}

function screenText(text, message) {
  if (risky(text) || hasDirectContact(text)) return message;
  return "";
}

export async function apiConfessions(request, env) {
  const kv = env.CONFESSIONS_KV;
  if (!kv) return json({ error: "Storage is not configured" }, 500);
  await archiveOld(kv);
  if (request.method === "GET") {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "approved";
    if (status !== "approved" && !(await auth(request, env))) return json({ error: "Admin token required." }, 401);
    const counts = await commentCounts(kv);
    let stored = await listByPrefix(kv, "confession:", status);
    if (status === "approved") stored = stored.filter((item) => !item.hiddenAt);
    let items = stored.map((item) => toPublic(item, counts.get(item.id) || 0));
    const q = clean(url.searchParams.get("q")).toLowerCase();
    const tag = clean(url.searchParams.get("tag")).toLowerCase();
    const sort = clean(url.searchParams.get("sort")).toLowerCase();
    const filtering = Boolean(q || tag || (sort && sort !== "new"));
    if (q) {
      items = items.filter((item) => item.text.toLowerCase().includes(q) || item.tags.some((entry) => entry.includes(q)));
    }
    if (tag) items = items.filter((item) => item.tags.includes(tag));
    if (sort === "top") {
      items.sort((a, b) => b.score + b.hugs + b.sames - (a.score + a.hugs + a.sames));
    }
    if (status === "approved" && !items.length && !filtering) {
      return json({ confessions: examples(), examples: true });
    }
    return json({ confessions: items });
  }
  if (request.method === "POST") {
    const limit = await rateLimit(kv, "confessions:" + (await clientKey(request)), 5, 3600);
    if (!limit.ok) return limited(limit);
    const parsed = await readJson(request);
    if (parsed.error) return json({ error: parsed.error === "Invalid request." ? "Invalid submission." : parsed.error }, parsed.status || 400);
    const body = parsed.body;
    if (body.website) return json({ ok: true, status: "pending" });
    const turnstile = await verifyTurnstile(request, env, body.turnstileToken || body["cf-turnstile-response"]);
    if (!turnstile.ok) return turnstileFailure(turnstile);
    const text = clean(body.text);
    if (!body.confirm) return json({ error: "Please confirm the submission rules first." }, 400);
    if (text.length < 20) return json({ error: "Make it at least 20 characters." }, 400);
    if (text.length > 700) return json({ error: "Keep it under 700 characters." }, 400);
    const blocked = screenText(
      text,
      "This looks like it may include patient, workplace or clinical details. Please rewrite it as harmless shift-life humour."
    );
    if (blocked) return json({ error: blocked }, 400);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record = {
      id,
      text,
      status: "pending",
      createdAt: now,
      score: 0,
      hugs: 0,
      sames: 0,
      tags: normaliseTags(body.tags)
    };
    await kv.put("confession:" + now + ":" + id, JSON.stringify(record));
    return json({ ok: true, status: "pending" }, 201);
  }
  return json({ error: "Method not allowed" }, 405);
}

export async function apiComments(request, env) {
  const kv = env.CONFESSIONS_KV;
  if (!kv) return json({ error: "Storage is not configured" }, 500);
  if (request.method === "GET") {
    const id = new URL(request.url).searchParams.get("confessionId");
    if (!id) return json({ comments: [] });
    const comments = (await listByPrefix(kv, "comment:" + id + ":", "approved")).map(strip);
    return json({ comments });
  }
  if (request.method === "POST") {
    const limit = await rateLimit(kv, "comments:" + (await clientKey(request)), 10, 3600);
    if (!limit.ok) return limited(limit);
    const parsed = await readJson(request);
    if (parsed.error) return json({ error: parsed.error === "Invalid request." ? "Invalid comment." : parsed.error }, parsed.status || 400);
    const body = parsed.body;
    if (body.website) return json({ ok: true, status: "pending" });
    const turnstile = await verifyTurnstile(request, env, body.turnstileToken);
    if (!turnstile.ok) return turnstileFailure(turnstile);
    const confessionId = clean(body.confessionId);
    const text = clean(body.text);
    const parent = await findById(kv, "confession:", confessionId);
    if (!parent || parent.status !== "approved") return json({ error: "Confession not found." }, 404);
    if (text.length < 8) return json({ error: "Comment is too short." }, 400);
    if (text.length > 500) return json({ error: "Keep comments under 500 characters." }, 400);
    if (risky(text) || hasDirectContact(text)) {
      return json({ error: "Please remove patient, workplace or clinical details." }, 400);
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await kv.put("comment:" + confessionId + ":" + now + ":" + id, JSON.stringify({
      id,
      confessionId,
      text,
      status: "pending",
      createdAt: now
    }));
    return json({ ok: true, status: "pending" }, 201);
  }
  return json({ error: "Method not allowed" }, 405);
}

export async function apiRate(request, env) {
  const kv = env.CONFESSIONS_KV;
  if (!kv) return json({ error: "Storage is not configured" }, 500);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const hash = await clientKey(request);
  const limit = await rateLimit(kv, "rate:" + hash, 20, 3600);
  if (!limit.ok) return limited(limit);
  const parsed = await readJson(request);
  if (parsed.error) return json({ error: parsed.error === "Invalid request." ? "Invalid vote." : parsed.error }, parsed.status || 400);
  const item = await findById(kv, "confession:", clean(parsed.body.id));
  if (!item || item.status !== "approved") return json({ error: "Confession not found." }, 404);
  const voteKey = "vote:" + item.id + ":" + hash;
  if (await kv.get(voteKey)) return json({ ok: true, score: item.score || 0, alreadyRated: true });
  item.score = (Number(item.score) || 0) + 1;
  await kv.put(item._key, JSON.stringify(strip(item)));
  await kv.put(voteKey, "1", { expirationTtl: 60 * 60 * 24 * 365 });
  return json({ ok: true, score: item.score });
}

export async function apiReact(request, env) {
  const kv = env.CONFESSIONS_KV;
  if (!kv) return json({ error: "Storage is not configured" }, 500);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const hash = await clientKey(request);
  const limit = await rateLimit(kv, "react:" + hash, 30, 3600);
  if (!limit.ok) return limited(limit);
  const parsed = await readJson(request);
  if (parsed.error) return json({ error: "Invalid reaction." }, parsed.status || 400);
  const reaction = clean(parsed.body.reaction);
  if (reaction !== "hug" && reaction !== "same") return json({ error: "Unknown reaction." }, 400);
  const item = await findById(kv, "confession:", clean(parsed.body.id));
  if (!item || item.status !== "approved") return json({ error: "Confession not found." }, 404);
  const voteKey = "react:" + item.id + ":" + reaction + ":" + hash;
  const hugs = Number(item.hugs) || 0;
  const sames = Number(item.sames) || 0;
  if (await kv.get(voteKey)) {
    return json({ ok: true, hugs, sames, alreadyReacted: true });
  }
  if (reaction === "hug") item.hugs = hugs + 1;
  if (reaction === "same") item.sames = sames + 1;
  await kv.put(item._key, JSON.stringify(strip(item)));
  await kv.put(voteKey, "1", { expirationTtl: 60 * 60 * 24 * 365 });
  return json({ ok: true, hugs: Number(item.hugs) || 0, sames: Number(item.sames) || 0 });
}

export async function apiReport(request, env) {
  const kv = env.CONFESSIONS_KV;
  if (!kv) return json({ error: "Storage is not configured" }, 500);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const limit = await rateLimit(kv, "report:" + (await clientKey(request)), 10, 3600);
  if (!limit.ok) return limited(limit);
  const parsed = await readJson(request);
  if (parsed.error) return json({ error: parsed.error === "Invalid request." ? "Invalid report." : parsed.error }, parsed.status || 400);
  const kind = parsed.body.kind === "listing" ? "listing" : "confession";
  const prefix = kind === "listing" ? "listing:" : "confession:";
  const item = await findById(kv, prefix, clean(parsed.body.id));
  if (!item || item.status !== "approved") {
    return json({ error: kind === "listing" ? "Listing not found." : "Confession not found." }, 404);
  }
  const now = new Date().toISOString();
  item.reportsCount = (Number(item.reportsCount) || 0) + 1;
  item.lastReportReason = clean(parsed.body.reason).slice(0, 220) || "Community report";
  item.reportedAt = now;
  item.hiddenAt = item.hiddenAt || now;
  await kv.put(item._key, JSON.stringify(strip(item)));
  return json({ ok: true, hidden: true });
}

export async function apiNewsletter(request, env) {
  const kv = env.CONFESSIONS_KV;
  if (!kv) return json({ error: "Storage is not configured" }, 500);
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const limit = await rateLimit(kv, "newsletter:" + (await clientKey(request)), 5, 3600);
  if (!limit.ok) return limited(limit);
  const parsed = await readJson(request);
  if (parsed.error) return json({ error: parsed.error === "Invalid request." ? "Invalid request." : parsed.error }, parsed.status || 400);
  if (parsed.body.website) return json({ ok: true });
  const turnstile = await verifyTurnstile(request, env, parsed.body.turnstileToken);
  if (!turnstile.ok) return turnstileFailure(turnstile);
  if (!consentGiven(parsed.body.consent)) {
    return json({ error: "Please confirm you agree to hear from OnlyScrubs." }, 400);
  }
  const email = String(parsed.body.email || "").trim().toLowerCase();
  if (!validEmail(email)) return json({ error: "Enter a valid email address." }, 400);
  if (!env.ADMIN_TOKEN) return json({ error: "Newsletter signup is unavailable." }, 503);
  const existing = await kv.get("newsletter:" + email);
  const now = new Date().toISOString();
  if (!existing) {
    await kv.put("newsletter:" + email, JSON.stringify({
      email,
      createdAt: now,
      consentAt: now,
      consent: CONSENT_TEXT,
      source: "website"
    }));
  }
  const token = await unsubscribeToken(env.ADMIN_TOKEN, email);
  return json({ ok: true, unsubscribeUrl: unsubscribeUrl(token) });
}

function escPage(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function unsubscribePage(title, message, status = 200) {
  const html = `<!doctype html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${escPage(title)} | OnlyScrubs</title>
</head>
<body>
  <main>
    <h1>${escPage(title)}</h1>
    <p>${escPage(message)}</p>
    <p><a href="/">Back to OnlyScrubs</a></p>
    <p>OnlyScrubs, <a href="mailto:hello@onlyscrubs.org">hello@onlyscrubs.org</a></p>
  </main>
</body>
</html>`;
  const response = new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" }
  });
  return applySecurityHeaders(response, "/unsubscribe", []);
}

export async function apiUnsubscribe(request, env) {
  if (request.method !== "GET" && request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  const kv = env.CONFESSIONS_KV;
  if (!kv) return unsubscribePage("Unsubscribe", "Storage is not configured. Email hello@onlyscrubs.org and we will remove you.", 500);
  const limit = await rateLimit(kv, "unsub:" + (await clientKey(request)), 30, 3600);
  if (!limit.ok) return limited(limit);
  const token = new URL(request.url).searchParams.get("token") || "";
  const email = await emailFromUnsubscribeToken(env.ADMIN_TOKEN, token);
  if (!email) {
    return unsubscribePage(
      "Link not valid",
      "This unsubscribe link is not valid. Email hello@onlyscrubs.org and we will remove the address.",
      400
    );
  }
  await kv.delete("newsletter:" + email);
  return unsubscribePage(
    "Unsubscribed",
    "You have been removed from the OnlyScrubs newsletter. You will not get further notes unless you sign up again."
  );
}
