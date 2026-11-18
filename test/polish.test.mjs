import assert from "node:assert/strict";
import test from "node:test";
import worker, { securityTxt } from "../src/worker.js";
import { HSTS, applySecurityHeaders } from "../src/lib/http.js";
import { layout } from "../site/layout.mjs";
import { home } from "../site/pages.mjs";

const assets = { styles: "/assets/styles.css", site: "/assets/site.js" };
const guides = Array.from({ length: 6 }, (_, i) => ({
  slug: "g" + i,
  path: "/guides/g" + i + ".html",
  title: "Guide " + i,
  description: "About guide " + i,
  tags: ["study"],
  minutes: 3
}));

test("security.txt is served with contact, expiry about a year out, language and canonical", async () => {
  const res = await worker.fetch(new Request("https://onlyscrubs.org/.well-known/security.txt"), {});
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/plain/);
  const body = await res.text();
  assert.match(body, /^Contact: mailto:hello@onlyscrubs\.org$/m);
  assert.match(body, /^Preferred-Languages: en$/m);
  assert.match(body, /^Canonical: https:\/\/onlyscrubs\.org\/\.well-known\/security\.txt$/m);
  const expires = new Date(body.match(/^Expires: (.+)$/m)[1]);
  const days = (expires - Date.now()) / 86400000;
  assert.ok(days > 360 && days <= 366, "expires roughly one year out");
  const fixed = securityTxt(new Date("2026-11-18T00:00:00Z"));
  assert.match(fixed, /Expires: 2027-11-18T00:00:00Z/);
  const legacy = await worker.fetch(new Request("https://onlyscrubs.org/security.txt"), {});
  assert.equal(legacy.status, 301);
  assert.equal(legacy.headers.get("location"), "https://onlyscrubs.org/.well-known/security.txt");
});

test("HSTS is one year with subdomains and no preload", () => {
  assert.equal(HSTS, "max-age=31536000; includeSubDomains");
  const res = applySecurityHeaders(new Response("ok", { headers: { "content-type": "text/html" } }), "/", []);
  assert.equal(res.headers.get("strict-transport-security"), HSTS);
  assert.doesNotMatch(HSTS, /preload/);
});

test("no empty support link is rendered when there is no support URL", () => {
  const html = layout({ title: "T", description: "D", path: "/x.html", main: "<p>x</p>", assets });
  assert.doesNotMatch(html, /<a\b[^>]*data-support/);
  assert.doesNotMatch(html, /<a(?![^>]*\bhref=)[^>]*>/, "every <a> has an href");
  assert.match(html, /data-support-slot/);
});

test("Turnstile switches on by itself once both keys are set", async () => {
  const off = await (await worker.fetch(new Request("https://onlyscrubs.org/api/config"), { TURNSTILE_SITE_KEY: "site-key" })).json();
  assert.equal(off.turnstileSiteKey, null);
  const on = await (await worker.fetch(new Request("https://onlyscrubs.org/api/config"), { TURNSTILE_SITE_KEY: "site-key", TURNSTILE_SECRET: "x" })).json();
  assert.equal(on.turnstileSiteKey, "site-key");
  const html = layout({ title: "T", description: "D", path: "/x.html", main: "", assets });
  assert.match(html, /data-turnstile/, "the footer newsletter keeps a Turnstile slot");
});

test("homepage is a calm hero plus at most four focused sections, then the newsletter", () => {
  const html = home(assets, guides);
  const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
  const sections = main.match(/<section\b/g) || [];
  assert.ok(sections.length <= 6, "hero + up to 4 sections + newsletter, got " + sections.length);
  const hero = main.slice(0, main.indexOf("</section>"));
  assert.equal((hero.match(/class="button primary"/g) || []).length, 1, "one primary CTA in the hero");
  assert.equal((hero.match(/class="button secondary"/g) || []).length, 1, "one secondary CTA in the hero");
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(main, /href="\/guides\.html"/);
  assert.match(main, /href="\/shop\.html"/);
  assert.match(main, /href="\/confessions\.html"/);
  assert.match(main, /data-newsletter/);
  assert.match(main, /not medical advice/i, "the clean-boundary disclaimer stays on the homepage");
  assert.match(html, /"@type":"Organization"/);
  assert.match(html, /"@type":"WebSite"/);
  const guideLinks = main.match(/href="\/guides\/g\d\.html"/g) || [];
  assert.ok(guideLinks.length >= 3 && guideLinks.length <= 4, "3 or 4 featured guides");
});

test("mobile nav is a floating panel with icons and a quieter legal group", () => {
  const html = layout({ title: "T", description: "D", path: "/guides.html", active: "/guides.html", main: "<p>x</p>", assets });
  const navStart = html.indexOf('id="site-nav"');
  const navEnd = html.indexOf("</nav>", navStart);
  assert.ok(navStart > 0 && navEnd > navStart, "primary nav is present");
  const nav = html.slice(navStart, navEnd);

  assert.match(html, /data-nav-toggle[^>]*aria-expanded="false"/);
  assert.match(html, /aria-controls="site-nav"/);
  assert.match(html, /class="header-bar"/);
  assert.match(html, /class="nav-scrim"[^>]*data-nav-scrim/);
  assert.match(nav, /class="nav-primary"/);
  assert.match(nav, /class="nav-legal"[^>]*aria-label="Legal"/);

  const labels = ["Guides", "Scrub Rack", "Shift Kit", "Student Bay", "Gear", "Shop", "Confessions", "Wellbeing", "About"];
  for (const label of labels) {
    const item = nav.match(new RegExp(`<a href="[^"]+"[^>]*>[\\s\\S]*?${label}<\\/span>`));
    assert.ok(item, label + " is in the primary nav");
    assert.match(item[0], /class="nav-icon"[^>]*aria-hidden="true"/, label + " has a hidden icon");
    assert.match(item[0], /<svg /);
  }

  assert.match(nav, /href="\/privacy\.html"/);
  assert.match(nav, /href="\/terms\.html"/);
  assert.match(nav, /href="\/disclaimer\.html"/);
  assert.match(nav, /href="\/complaints\.html"/);
  assert.doesNotMatch(nav, /<img /);
  assert.doesNotMatch(nav, /https?:\/\/|cdn\.|googleapis|unpkg|jsdelivr/i, "icons are inline, not from a CDN");
  assert.match(nav, /href="\/guides\.html" aria-current="page"/);
  assert.match(html, /class="nav-toggle"/);
});
