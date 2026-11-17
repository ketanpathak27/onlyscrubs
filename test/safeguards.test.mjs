import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { parseGuide } from "../site/markdown.mjs";
import { shop } from "../site/pages.mjs";
import { buildDigest } from "../src/lib/digest.js";
import { AUTO_HIDE_AFTER, decideReport, REPORTS_PER_DAY } from "../src/lib/reports.js";
import { screenText } from "../src/lib/screen.js";
import { apiConfessions, apiReport } from "../src/routes/community.js";
import { sydneyWeekStartMs } from "../src/lib/week.js";

function memoryKv() {
  const store = new Map();
  return {
    async get(key, type) {
      if (!store.has(key)) return null;
      const raw = store.get(key);
      if (type === "json" || type?.type === "json") return JSON.parse(raw);
      return raw;
    },
    async put(key, value) {
      store.set(key, String(value));
    },
    async delete(key) {
      store.delete(key);
    },
    async list({ prefix }) {
      const keys = [...store.keys()].filter((name) => name.startsWith(prefix)).map((name) => ({ name }));
      return { keys, list_complete: true };
    }
  };
}

function request(path, { method = "GET", body, ip = "203.0.113.10" } = {}) {
  return new Request("https://onlyscrubs.org" + path, {
    method,
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: body ? JSON.stringify(body) : undefined
  });
}

test("screen holds identifiers, profanity and self-harm instead of a clean pass", () => {
  const clean = screenText("I lost another pen on nights and the coffee was already cold.");
  assert.equal(clean.flagged, false);
  assert.equal(screenText("I left the pen at Fiona Stanley again today honestly").reasons.some((item) => item.code === "hospital"), true);
  assert.equal(screenText("The pen lived on ward 4B for the whole week somehow").reasons.some((item) => item.code === "ward"), true);
  assert.equal(screenText("Someone labelled bed 12 with my pen and I want it back").reasons.some((item) => item.code === "bed"), true);
  assert.equal(screenText("The sticker said MRN 1234567 and I did not write that here").reasons.some((item) => item.code === "mrn"), true);
  assert.equal(screenText("Please do not put DOB 02/03/1998 in a public joke at all").reasons.some((item) => item.code === "dob"), true);
  assert.equal(screenText("Call me on 0412345678 if you find the pen later").reasons.some((item) => item.code === "phone"), true);
  assert.equal(screenText("Email the pen back to nurse@example.com this week").reasons.some((item) => item.code === "email"), true);
  assert.equal(screenText("Sarah Chen borrowed the good pen and left a lid").reasons.some((item) => item.code === "name"), true);
  assert.equal(screenText("Nurse Kelly still has the highlighter from last week").reasons.some((item) => item.code === "clinician"), true);
  assert.equal(screenText("This shift was fucking ridiculous and I lost the pen").reasons.some((item) => item.code === "profanity"), true);
  const harm = screenText("After nights I want to die and I cannot shake it");
  assert.equal(harm.selfHarm, true);
  assert.match(harm.support.message, /000/);
  assert.ok(harm.support.lines.some((line) => line.phone === "13 11 14"));
});

test("report decisions ignore duplicates, cap the day, and hide at the threshold", () => {
  assert.equal(decideReport({ duplicate: true, usedToday: 0, distinctCount: 0, category: "spam" }).action, "duplicate");
  assert.equal(decideReport({ duplicate: false, usedToday: REPORTS_PER_DAY, distinctCount: 0, category: "other" }).action, "limited");
  const third = decideReport({ duplicate: false, usedToday: 1, distinctCount: AUTO_HIDE_AFTER - 1, category: "other" });
  assert.equal(third.hide, true);
  assert.equal(third.reportsCount, AUTO_HIDE_AFTER);
  const early = decideReport({ duplicate: false, usedToday: 0, distinctCount: 0, category: "patient-info" });
  assert.equal(early.hide, true);
  assert.equal(early.high, true);
  assert.equal(decideReport({ duplicate: false, usedToday: 0, distinctCount: 0, category: "threats" }).high, true);
  assert.equal(decideReport({ duplicate: false, usedToday: 0, distinctCount: 0, category: "nope" }).category, "other");
});

test("flagged confessions are stored pending and not published", async () => {
  const kv = memoryKv();
  const env = { CONFESSIONS_KV: kv };
  const text = "A patient on my ward did something funny today honestly";
  const created = await apiConfessions(request("/api/confessions", {
    method: "POST",
    body: { text, confirm: true, tags: [] }
  }), env);
  const body = await created.json();
  assert.equal(created.status, 201);
  assert.equal(body.status, "pending");
  assert.equal(body.held, true);
  const pub = await apiConfessions(request("/api/confessions"), env);
  const listed = await pub.json();
  assert.equal((listed.confessions || []).some((item) => item.text === text), false);
  const stored = [...(await kv.list({ prefix: "confession:" })).keys];
  const raw = JSON.parse(await kv.get(stored[0].name));
  assert.match(raw.flagReason, /patient|workplace|clinical/i);
});

test("self-harm posts return support lines and stay pending", async () => {
  const kv = memoryKv();
  const env = { CONFESSIONS_KV: kv };
  const created = await apiConfessions(request("/api/confessions", {
    method: "POST",
    body: { text: "This week I want to die and I needed to say it somewhere", confirm: true }
  }), env);
  const body = await created.json();
  assert.equal(body.held, true);
  assert.match(body.support.message, /Lifeline|000|struggling/i);
  const rawKey = (await kv.list({ prefix: "confession:" })).keys[0].name;
  const stored = JSON.parse(await kv.get(rawKey));
  assert.equal(stored.status, "pending");
  assert.equal(stored.support, undefined);
});

test("three distinct reports hide a post and a duplicate does not count", async () => {
  const kv = memoryKv();
  const env = { CONFESSIONS_KV: kv };
  const record = {
    id: "post-1",
    text: "I brought six pens and still had to borrow a highlighter from the tea room.",
    status: "approved",
    createdAt: new Date().toISOString(),
    score: 0,
    reportsCount: 0
  };
  await kv.put("confession:2026-11-17T00:00:00.000Z:post-1", JSON.stringify(record));
  const first = await apiReport(request("/api/report", { method: "POST", ip: "203.0.113.1", body: { id: "post-1", category: "spam", reason: "noise" } }), env);
  assert.equal((await first.json()).ok, true);
  const again = await apiReport(request("/api/report", { method: "POST", ip: "203.0.113.1", body: { id: "post-1", category: "spam", reason: "noise" } }), env);
  assert.equal((await again.json()).duplicate, true);
  await apiReport(request("/api/report", { method: "POST", ip: "203.0.113.2", body: { id: "post-1", category: "other", reason: "again" } }), env);
  const third = await apiReport(request("/api/report", { method: "POST", ip: "203.0.113.3", body: { id: "post-1", category: "harassment", reason: "third" } }), env);
  assert.equal((await third.json()).hidden, true);
  const stored = JSON.parse(await kv.get("confession:2026-11-17T00:00:00.000Z:post-1"));
  assert.ok(stored.hiddenAt);
  assert.equal(stored.reportsCount, 3);
});

test("a patient-information report hides immediately", async () => {
  const kv = memoryKv();
  const env = { CONFESSIONS_KV: kv };
  await kv.put("confession:2026-11-17T00:00:00.000Z:post-2", JSON.stringify({
    id: "post-2",
    text: "The tea room fridge is a crime scene of unlabelled yoghurt.",
    status: "approved",
    createdAt: new Date().toISOString(),
    reportsCount: 0
  }));
  const res = await apiReport(request("/api/report", {
    method: "POST",
    ip: "203.0.113.9",
    body: { id: "post-2", category: "patient-info", reason: "names someone" }
  }), env);
  assert.equal((await res.json()).hidden, true);
  const stored = JSON.parse(await kv.get("confession:2026-11-17T00:00:00.000Z:post-2"));
  assert.equal(stored.reportsCount, 1);
  assert.ok(stored.hiddenAt);
});

test("digest names the sender and keeps a per-subscriber unsubscribe slot", () => {
  const now = new Date("2026-11-17T02:00:00.000Z");
  const digest = buildDigest({
    now,
    confessions: [{
      id: "c1",
      status: "approved",
      text: "The label printer chose violence and I still have no pen.",
      createdAt: "2026-11-16T22:00:00.000Z",
      score: 3,
      hugs: 0,
      sames: 1
    }],
    guides: [{ title: "CPD requirements for new grads", description: "Hours, records, and the standard.", path: "/guides/cpd-for-new-grads.html", date: "2026-11-17" }],
    shift: { id: "c1", text: "Pinned: the coffee was cold before handover." }
  });
  assert.match(digest.subject, /OnlyScrubs/);
  assert.match(digest.html, /hello@onlyscrubs.org/);
  assert.match(digest.html, /\{\{unsubscribe_url\}\}/);
  assert.match(digest.text, /not affiliated with AHPRA/i);
  assert.match(digest.html, /CPD requirements for new grads/);
  assert.match(digest.text, /label printer/);
  assert.match(digest.text, /Pinned: the coffee/);
  assert.doesNotMatch(digest.html, /testimonial|best seller|no refund/i);
});

test("Sydney week starts on Monday", () => {
  const start = sydneyWeekStartMs(new Date("2026-11-17T06:00:00.000Z"));
  const tuesday = new Date("2026-11-17T06:00:00.000Z");
  assert.ok(start < tuesday.getTime());
  assert.ok(tuesday.getTime() - start < 3 * 86400000);
});

test("new guides stay in range and point at official sources", () => {
  const required = {
    "ahpra-registration-new-grad.md": ["ahpra.gov.au", "nursingmidwiferyboard.gov.au"],
    "nmba-standards-for-practice.md": ["nursingmidwiferyboard.gov.au"],
    "graduate-programs-by-state.md": ["health.nsw.gov.au", "health.vic.gov.au", "careers.health.qld.gov.au", "health.wa.gov.au", "sahealth.sa.gov.au", "health.tas.gov.au", "canberrahealthservices.act.gov.au", "health.nt.gov.au"],
    "first-rotation.md": ["nmsupport.org.au"],
    "difficult-preceptor.md": ["nmsupport.org.au"],
    "pay-and-penalty-rates.md": ["fairwork.gov.au", "anmf.org.au"],
    "cpd-for-new-grads.md": ["nursingmidwiferyboard.gov.au"],
    "social-media-and-professionalism.md": ["nursingmidwiferyboard.gov.au", "ahpra.gov.au"],
    "fatigue-and-night-shift-sleep.md": ["healthdirect.gov.au", "nmsupport.org.au"],
    "speaking-up-about-safety.md": ["ahpra.gov.au", "nursingmidwiferyboard.gov.au"]
  };
  for (const [file, hosts] of Object.entries(required)) {
    const raw = readFileSync(new URL("../content/guides/" + file, import.meta.url), "utf8");
    const guide = parseGuide(raw, file.replace(/\.md$/, ""));
    assert.ok(guide.words >= 700 && guide.words <= 1200, `${file} has ${guide.words} words`);
    assert.match(raw, /not clinical advice|not advice/i);
    for (const host of hosts) assert.match(raw, new RegExp(host.replace(/\./g, "\\.")));
    assert.doesNotMatch(raw, /best seller|\$\d/);
  }
  const names = readdirSync(new URL("../content/guides/", import.meta.url));
  assert.equal(names.length, 18);
});

test("shop page keeps plain prices and the consumer-law lines", () => {
  const html = shop({ styles: "/a.css", theme: "/t.js", site: "/s.js" });
  assert.match(html, /From the OnlyScrubs creator/);
  assert.match(html, /Australian Nursing Student &amp; New Grad Toolkit/);
  assert.match(html, /Australian Renter&#39;s Bond-Back Kit|Australian Renter's Bond-Back Kit/);
  assert.match(html, /A\$19/);
  assert.match(html, /A\$24/);
  assert.match(html, /Buy on Gumroad/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /Digital downloads delivered via Gumroad\. Your rights under the Australian Consumer Law apply\./);
  assert.match(html, /Independent templates\. Not affiliated with or endorsed by any government agency, NMBA or Ahpra\./);
  assert.match(html, /"price":"19"/);
  assert.match(html, /"priceCurrency":"AUD"/);
  assert.doesNotMatch(html, /best seller|was\/now|no refund|NMBA approved|ATO approved/i);
  const nursing = html.indexOf("Australian Nursing Student");
  const renter = html.indexOf("Renter");
  const budget = html.indexOf("Household Budget");
  const sole = html.indexOf("Sole Trader");
  assert.ok(nursing < renter && renter < budget && budget < sole);
  assert.doesNotMatch(html, /gumroad\.com\/js\/gumroad\.js/);
});
