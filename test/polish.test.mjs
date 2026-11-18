import assert from "node:assert/strict";
import test from "node:test";
import worker, { securityTxt } from "../src/worker.js";
import { HSTS, applySecurityHeaders } from "../src/lib/http.js";
import { readFileSync } from "node:fs";
import { layout, navHrefIsCurrent, normalizeNavPath } from "../site/layout.mjs";
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


const css = readFileSync(new URL("../client/styles.css", import.meta.url), "utf8");

function primaryNav(html) {
  const start = html.indexOf('id="site-nav"');
  const end = html.indexOf("</nav>", start);
  return html.slice(start, end);
}

test("nav marks the current page for .html, extensionless paths, and guide articles", () => {
  assert.equal(normalizeNavPath("/shop"), "/shop.html");
  assert.equal(normalizeNavPath("/shop.html"), "/shop.html");
  assert.equal(normalizeNavPath("/guides/"), "/guides.html");
  assert.equal(normalizeNavPath("/index.html"), "/");
  assert.equal(navHrefIsCurrent("/guides.html", "/guides.html"), true);
  assert.equal(navHrefIsCurrent("/guides.html", "/guides"), true);
  assert.equal(navHrefIsCurrent("/guides.html", "/guides/isbar-handover.html"), true);
  assert.equal(navHrefIsCurrent("/guides.html", "/guides/isbar-handover"), true);
  assert.equal(navHrefIsCurrent("/shop.html", "/guides/isbar-handover.html"), false);
  assert.equal(navHrefIsCurrent("/privacy.html", "/privacy"), true);

  const article = layout({ title: "T", description: "D", path: "/guides/isbar-handover.html", main: "<h1>Guide</h1>", assets });
  const articleNav = primaryNav(article);
  assert.match(articleNav, /href="\/guides\.html" aria-current="page"/);
  assert.equal((articleNav.match(/aria-current="page"/g) || []).length, 1);

  const ext = layout({ title: "T", description: "D", path: "/shop", main: "<h1>Shop</h1>", assets });
  assert.match(primaryNav(ext), /href="\/shop\.html" aria-current="page"/);

  const privacy = layout({ title: "T", description: "D", path: "/privacy.html", active: "", main: "<h1>Privacy</h1>", assets });
  assert.match(primaryNav(privacy), /href="\/privacy\.html" aria-current="page"/);

  const homePage = layout({ title: "T", description: "D", path: "/", active: "/", main: "<h1>Home</h1>", assets });
  assert.doesNotMatch(primaryNav(homePage), /aria-current="page"/);
});

test("back-to-top control is present, labelled, and at least 44px", () => {
  const html = layout({ title: "T", description: "D", path: "/guides.html", active: "/guides.html", main: "<h1>Guides</h1>", assets });
  assert.match(html, /class="back-to-top"[^>]*data-back-to-top/);
  assert.match(html, /data-back-to-top[^>]*aria-label="Back to top"/);
  assert.match(html, /data-back-to-top[\s\S]*?<svg class="nav-icon"/);
  assert.match(css, /\.back-to-top\s*\{[\s\S]*?width:\s*var\(--tap\)/);
  assert.match(css, /\.back-to-top\s*\{[\s\S]*?safe-area-inset-bottom/);
});

test("cross-document view transitions are short, keep the header still, and turn off under reduced motion", () => {
  assert.match(css, /@view-transition\s*\{\s*navigation:\s*auto;/);
  assert.match(css, /view-transition-name:\s*site-header/);
  assert.match(css, /view-transition-name:\s*site-main/);
  assert.match(css, /os-vt-main-in/);
  assert.match(css, /--dur-page:\s*280ms/);
  const reduce = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduce, /@view-transition\s*\{\s*navigation:\s*none;/);
  assert.match(reduce, /::view-transition-old\(root\)/);
  assert.match(reduce, /::view-transition-new\(site-main\)/);
  assert.match(css, /html\.vt-enter \.reveal/);
});
