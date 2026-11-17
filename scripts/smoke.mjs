const base = process.env.SMOKE_URL || "http://127.0.0.1:8787";
const token = process.env.ADMIN_TOKEN || "local-test-token";
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log("ok", name);
  } catch (error) {
    failed += 1;
    console.error("FAIL", name, error.message);
  }
}

async function get(path, init) {
  const res = await fetch(base + path, init);
  const type = res.headers.get("content-type") || "";
  const body = type.includes("json") ? await res.json() : await res.text();
  return { res, body };
}

await check("home", async () => {
  const { res, body } = await get("/");
  if (res.status !== 200 || !body.includes("OnlyScrubs")) throw new Error(String(res.status));
  if (!res.headers.get("content-security-policy")?.includes("script-src")) throw new Error("missing CSP");
  if (!res.headers.get("cache-control")?.includes("max-age=300")) throw new Error(res.headers.get("cache-control"));
});

await check("extensionless redirect", async () => {
  const res = await fetch(base + "/confessions", { redirect: "manual" });
  if (res.status !== 301 || res.headers.get("location") !== "/confessions.html") throw new Error(res.status + " " + res.headers.get("location"));
});

await check("guide and gear", async () => {
  const guide = await get("/guides/isbar-handover.html");
  if (guide.res.status !== 200 || !guide.body.includes("application/ld+json")) throw new Error("guide");
  if (!guide.body.includes("Not clinical advice")) throw new Error("disclaimer");
  const gear = await get("/gear-guide.html");
  if (!gear.body.includes("no extra cost") || gear.body.includes("affiliateUrl")) throw new Error("gear disclosure");
  const slot = gear.body.match(/data-ad-slot="[^"]+"[^>]*hidden/);
  if (!slot) throw new Error("ad slot not hidden");
});

await check("robots and sitemap", async () => {
  const robots = await get("/robots.txt");
  if (!robots.body.includes("Disallow: /admin") || !robots.body.includes("Disallow: /api/")) throw new Error(robots.body);
  const map = await get("/sitemap.xml");
  if (!map.body.includes("/guides/night-shift.html") || map.body.includes("/admin.html")) throw new Error("sitemap");
});

await check("admin noindex", async () => {
  const { res } = await get("/admin.html");
  if (res.headers.get("x-robots-tag") !== "noindex, nofollow") throw new Error(res.headers.get("x-robots-tag"));
});

await check("static cache", async () => {
  const home = await get("/");
  const css = home.body.match(/href="(\/assets\/styles\.[^"]+\.css)"/);
  if (!css) throw new Error("css missing");
  const asset = await get(css[1]);
  if (!asset.res.headers.get("cache-control")?.includes("immutable")) throw new Error(asset.res.headers.get("cache-control"));
});

await check("config", async () => {
  const { res, body } = await get("/api/config");
  if (body.adsEnabled !== false || body.turnstileSiteKey !== null || body.supportUrl !== "") throw new Error(JSON.stringify(body));
  if (res.headers.get("cache-control") !== "no-store") throw new Error("config cached");
});

const confessionText = "I brought six black pens and still had to borrow a highlighter from the tea room.";
let confessionId = "";
await check("confession validation", async () => {
  const missing = await get("/api/confessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: confessionText, confirm: false }) });
  if (missing.res.status !== 400) throw new Error("confirm");
  const risky = await get("/api/confessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "A patient on my ward did something funny today honestly", confirm: true }) });
  if (risky.res.status !== 400) throw new Error("risky " + JSON.stringify(risky.body));
  const created = await get("/api/confessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: confessionText, confirm: true, tags: ["pens", "not-a-tag"], website: "" }) });
  if (created.res.status !== 201 || created.body.status !== "pending") throw new Error(JSON.stringify(created.body));
});

await check("pending hidden then approved", async () => {
  const pub = await get("/api/confessions");
  if ((pub.body.confessions || []).some((item) => item.text === confessionText)) throw new Error("leaked pending");
  const denied = await get("/api/admin?kind=confession&status=pending");
  if (denied.res.status !== 401) throw new Error("auth");
  const queue = await get("/api/admin?kind=confession&status=pending", { headers: { authorization: "Bearer " + token } });
  const item = (queue.body.items || []).find((entry) => entry.text === confessionText);
  if (!item) throw new Error("not queued");
  confessionId = item.id;
  const approved = await get("/api/admin", { method: "PATCH", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify({ kind: "confession", id: confessionId, action: "approve" }) });
  if (!approved.body.ok) throw new Error("approve");
  const live = await get("/api/confessions");
  const found = live.body.confessions.find((entry) => entry.id === confessionId);
  if (!found || !found.tags.includes("pens")) throw new Error(JSON.stringify(found));
});

await check("rate and react dedupe", async () => {
  const first = await get("/api/rate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: confessionId }) });
  if (first.body.score !== 1) throw new Error(JSON.stringify(first.body));
  const second = await get("/api/rate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: confessionId }) });
  if (!second.body.alreadyRated || second.body.score !== 1) throw new Error(JSON.stringify(second.body));
  const hug = await get("/api/react", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: confessionId, reaction: "hug" }) });
  if (hug.body.hugs !== 1) throw new Error(JSON.stringify(hug.body));
  const again = await get("/api/react", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: confessionId, reaction: "hug" }) });
  if (!again.body.alreadyReacted || again.body.hugs !== 1) throw new Error(JSON.stringify(again.body));
});

const email = "rack-tester@example.com";
let listingId = "";
await check("listing moderation hides email", async () => {
  const created = await get("/api/listings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "donate", title: "Navy scrub top", description: "Clean student set, pickup near the station on a weekday.", size: "M", colour: "navy", suburb: "Brunswick", state: "VIC", condition: "good", contactEmail: email, confirm: true }) });
  if (created.res.status !== 201) throw new Error(JSON.stringify(created.body));
  const pub = await get("/api/listings");
  if (JSON.stringify(pub.body).includes(email)) throw new Error("email leaked");
  const queue = await get("/api/admin?kind=listing&status=pending", { headers: { authorization: "Bearer " + token } });
  const item = queue.body.items.find((entry) => entry.contactEmail === email);
  if (!item) throw new Error("listing missing");
  listingId = item.id;
  const bulk = await get("/api/admin/bulk", { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify({ kind: "listing", action: "approve", ids: [listingId] }) });
  if (!bulk.body.results?.[0]?.ok) throw new Error(JSON.stringify(bulk.body));
  const visible = await get("/api/listings");
  if (!visible.body.listings.some((entry) => entry.id === listingId) || JSON.stringify(visible.body).includes(email)) throw new Error("public listing");
});

await check("relay message", async () => {
  const sent = await get("/api/messages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ listingId, name: "Alex Student", email: "alex@example.com", message: "I can collect the navy top this week if it is still available.", confirm: true }) });
  if (sent.res.status !== 201) throw new Error(JSON.stringify(sent.body));
  const queue = await get("/api/admin?kind=relay&status=new", { headers: { authorization: "Bearer " + token } });
  if (!queue.body.items.some((item) => item.email === "alex@example.com")) throw new Error("relay missing");
});

await check("newsletter csv", async () => {
  const joined = await get("/api/newsletter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "notes@example.com" }) });
  if (!joined.body.ok) throw new Error(JSON.stringify(joined.body));
  const csv = await get("/api/admin/newsletter.csv", { headers: { authorization: "Bearer " + token } });
  if (!csv.body.includes("notes@example.com")) throw new Error(csv.body.slice(0, 200));
});

await check("admin cookie session", async () => {
  const session = await get("/api/admin/session");
  if (session.body.signedIn !== false) throw new Error(JSON.stringify(session.body));
  const bad = await get("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "not-the-token" }) });
  if (bad.res.status !== 401) throw new Error("bad login " + bad.res.status);
  const login = await fetch(base + "/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: token }) });
  const setCookie = login.headers.get("set-cookie") || "";
  if (!/os_admin=/.test(setCookie) || !/HttpOnly/i.test(setCookie) || !/Secure/i.test(setCookie) || !/SameSite=Strict/i.test(setCookie)) throw new Error(setCookie);
  if (setCookie.includes(token)) throw new Error("cookie contained the token");
  const stats = await get("/api/admin/stats", { headers: { cookie: setCookie.split(";")[0] } });
  if (stats.res.status !== 200 || stats.body.totals.approvedToday == null || stats.body.totals.newsletter == null) throw new Error(JSON.stringify(stats.body.totals));
  const page = await get("/admin.html");
  if (!page.body.includes('name="robots" content="noindex, nofollow"') || !page.body.includes("admin-signin")) throw new Error("login page");
  const home = await get("/");
  if (!home.body.includes('class="admin-entry"') || !home.body.includes("data-admin-lock")) throw new Error("entry points");
  const out = await fetch(base + "/api/admin/logout", { method: "POST" });
  if (!/Max-Age=0/i.test(out.headers.get("set-cookie") || "")) throw new Error("logout cookie");
});

await check("wellbeing numbers", async () => {
  const { body } = await get("/wellbeing.html");
  for (const number of ["1800 667 877", "13 11 14", "1300 22 4636", "13 92 76", ">000<"]) {
    if (!body.includes(number)) throw new Error("missing " + number);
  }
});

if (failed) {
  console.error(failed + " smoke checks failed");
  process.exit(1);
}
console.log("smoke passed");
