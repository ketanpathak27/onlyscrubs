import assert from "node:assert/strict";
import test from "node:test";
import { apiAdmin } from "../src/routes/admin.js";
import { apiConfessions, apiNewsletter, apiReport, apiUnsubscribe } from "../src/routes/community.js";
import { apiListings } from "../src/routes/rack.js";
import { apiNewsletterExport } from "../src/routes/admin.js";
import {
  CONSENT_TEXT,
  emailFromUnsubscribeToken,
  renderNewsletterEmail,
  unsubscribeToken,
  unsubscribeUrl
} from "../src/lib/newsletter.js";

const SECRET = "local-signing-secret";

function memoryKv() {
  const store = new Map();
  return {
    async get(key, options) {
      const value = store.get(key);
      if (value == null) return null;
      return options?.type === "json" ? JSON.parse(value) : value;
    },
    async put(key, value) {
      store.set(key, value);
    },
    async delete(key) {
      store.delete(key);
    },
    async list({ prefix }) {
      const keys = [...store.keys()].filter((name) => name.startsWith(prefix)).map((name) => ({ name }));
      return { keys, list_complete: true, cursor: "" };
    }
  };
}

function env() {
  return { ADMIN_TOKEN: SECRET, CONFESSIONS_KV: memoryKv() };
}

function request(url, { method = "GET", body, ip = "203.0.113.10", token } = {}) {
  const headers = { "CF-Connecting-IP": ip };
  if (body) headers["content-type"] = "application/json";
  if (token) headers.authorization = "Bearer " + token;
  return new Request(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
}

test("unsubscribe token signs the address and does not contain the secret", async () => {
  const token = await unsubscribeToken(SECRET, "Notes@Example.com");
  assert.equal(token.includes(SECRET), false);
  assert.equal(await emailFromUnsubscribeToken(SECRET, token), "notes@example.com");
  assert.equal(await emailFromUnsubscribeToken("other-secret", token), "");
  assert.equal(await emailFromUnsubscribeToken(SECRET, token + "x"), "");
});

test("newsletter email names the sender and includes a working unsubscribe link", async () => {
  const token = await unsubscribeToken(SECRET, "notes@example.com");
  const url = unsubscribeUrl(token);
  const message = renderNewsletterEmail({
    subject: "A short note",
    bodyText: "Guides are up.",
    unsubscribeUrl: url
  });
  assert.equal(message.from, "OnlyScrubs <hello@onlyscrubs.org>");
  assert.equal(message.replyTo, "hello@onlyscrubs.org");
  for (const part of [message.text, message.html]) {
    assert.match(part, /OnlyScrubs/);
    assert.match(part, /hello@onlyscrubs\.org/);
    assert.match(part, /unsubscribe/i);
    assert.ok(part.includes(url));
  }
  assert.equal(message.headers["List-Unsubscribe"], `<${url}>`);
  assert.equal(message.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.match(CONSENT_TEXT, /OnlyScrubs/);
  assert.match(CONSENT_TEXT, /hello@onlyscrubs\.org/);
  assert.match(CONSENT_TEXT, /unsubscribe/i);
});

test("signup needs consent, and the unsubscribe link removes the address", async () => {
  const box = env();
  const denied = await apiNewsletter(request("https://onlyscrubs.org/api/newsletter", {
    method: "POST",
    body: { email: "notes@example.com" }
  }), box);
  assert.equal(denied.status, 400);

  const joined = await apiNewsletter(request("https://onlyscrubs.org/api/newsletter", {
    method: "POST",
    body: { email: "notes@example.com", consent: true }
  }), box);
  assert.equal(joined.status, 200);
  const payload = await joined.json();
  assert.equal(payload.ok, true);
  const stored = JSON.parse(await box.CONFESSIONS_KV.get("newsletter:notes@example.com"));
  assert.equal(stored.consent, CONSENT_TEXT);
  assert.equal(payload.unsubscribeUrl.includes(SECRET), false);

  const csv = await apiNewsletterExport(request("https://onlyscrubs.org/api/admin/newsletter.csv", { token: SECRET }), box);
  const csvText = await csv.text();
  assert.match(csvText, /notes@example.com/);
  assert.match(csvText, /unsubscribeUrl/);
  assert.equal(csvText.includes(SECRET), false);
  assert.ok(csvText.includes(payload.unsubscribeUrl));

  const removed = await apiUnsubscribe(request(payload.unsubscribeUrl), box);
  assert.equal(removed.status, 200);
  assert.match(await removed.text(), /removed from the OnlyScrubs newsletter/);
  assert.equal(await box.CONFESSIONS_KV.get("newsletter:notes@example.com"), null);

  const again = await apiUnsubscribe(request(payload.unsubscribeUrl, { method: "POST" }), box);
  assert.equal(again.status, 200);
  const bad = await apiUnsubscribe(request("https://onlyscrubs.org/unsubscribe?token=nope"), box);
  assert.equal(bad.status, 400);
});

test("a listing report hides it and shows in the admin reported queue", async () => {
  const box = env();
  const created = await apiListings(request("https://onlyscrubs.org/api/listings", {
    method: "POST",
    body: {
      type: "donate",
      title: "Navy scrub top",
      description: "Clean student set, pickup near the station on a weekday.",
      size: "M",
      colour: "navy",
      suburb: "Brunswick",
      state: "VIC",
      condition: "good",
      contactEmail: "rack@example.com",
      confirm: true
    }
  }), box);
  assert.equal(created.status, 201);
  const queue = await apiAdmin(request("https://onlyscrubs.org/api/admin?kind=listing&status=pending", { token: SECRET }), box);
  const pending = await queue.json();
  const id = pending.items[0].id;
  const approved = await apiAdmin(request("https://onlyscrubs.org/api/admin", {
    method: "PATCH",
    token: SECRET,
    body: { kind: "listing", id, action: "approve" }
  }), box);
  assert.equal((await approved.json()).ok, true);

  const live = await apiListings(request("https://onlyscrubs.org/api/listings"), box);
  const before = await live.json();
  assert.equal(before.listings.some((item) => item.id === id), true);
  assert.equal(JSON.stringify(before).includes("rack@example.com"), false);

  const report = await apiReport(request("https://onlyscrubs.org/api/report", {
    method: "POST",
    ip: "203.0.113.21",
    body: { id, kind: "listing", category: "other", reason: "Names a workplace" }
  }), box);
  assert.equal((await report.json()).hidden, false);
  const stillUp = await (await apiListings(request("https://onlyscrubs.org/api/listings"), box)).json();
  assert.equal(stillUp.listings.some((item) => item.id === id), true, "one ordinary report leaves the listing up");

  const queued = await (await apiAdmin(request("https://onlyscrubs.org/api/admin?kind=listing&status=reported", { token: SECRET }), box)).json();
  assert.equal(queued.items[0].id, id);
  assert.equal(queued.items[0].reportsCount, 1);
  assert.equal(queued.items[0].hiddenAt, undefined);

  for (const ip of ["203.0.113.22", "203.0.113.23"]) {
    await apiReport(request("https://onlyscrubs.org/api/report", {
      method: "POST",
      ip,
      body: { id, kind: "listing", category: "spam", reason: "Still names a workplace" }
    }), box);
  }
  const hidden = await (await apiListings(request("https://onlyscrubs.org/api/listings"), box)).json();
  assert.equal(hidden.listings.some((item) => item.id === id), false);

  const flagged = await apiAdmin(request("https://onlyscrubs.org/api/admin?kind=listing&status=reported", { token: SECRET }), box);
  const flaggedBody = await flagged.json();
  assert.equal(flaggedBody.items[0].id, id);
  assert.equal(flaggedBody.items[0].reportsCount, 3);
  assert.ok(flaggedBody.items[0].hiddenAt);

  const restored = await apiAdmin(request("https://onlyscrubs.org/api/admin", {
    method: "PATCH",
    token: SECRET,
    body: { kind: "listing", id, action: "approve" }
  }), box);
  assert.equal((await restored.json()).ok, true);
  const back = await (await apiListings(request("https://onlyscrubs.org/api/listings"), box)).json();
  assert.equal(back.listings.some((item) => item.id === id), true);
});

test("a patient-information report hides the post from the public feed", async () => {
  const box = env();
  const text = "I brought six black pens and still had to borrow a highlighter from the tea room.";
  const created = await apiConfessions(request("https://onlyscrubs.org/api/confessions", {
    method: "POST",
    body: { text, confirm: true }
  }), box);
  assert.equal(created.status, 201);
  const queue = await apiAdmin(request("https://onlyscrubs.org/api/admin?kind=confession&status=pending", { token: SECRET }), box);
  const id = (await queue.json()).items[0].id;
  await apiAdmin(request("https://onlyscrubs.org/api/admin", {
    method: "PATCH",
    token: SECRET,
    body: { kind: "confession", id, action: "approve" }
  }), box);
  await apiReport(request("https://onlyscrubs.org/api/report", {
    method: "POST",
    ip: "203.0.113.11",
    body: { id, category: "patient-info", reason: "Identifies someone" }
  }), box);
  const pub = await (await apiConfessions(request("https://onlyscrubs.org/api/confessions"), box)).json();
  assert.equal(pub.confessions.some((item) => item.id === id), false);
  assert.equal(JSON.stringify(pub).includes(text), false);
});
