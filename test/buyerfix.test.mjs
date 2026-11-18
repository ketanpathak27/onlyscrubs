import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { admin, confessions, guideArticle, home, shop } from "../site/pages.mjs";
import { parseGuide } from "../site/markdown.mjs";
import { layout } from "../site/layout.mjs";

const assets = { styles: "/a.css", theme: "/t.js", site: "/s.js", tools: "/tools.js", planner: "/p.js", checklist: "/c.js" };
const guides = [{ slug: "g0", path: "/guides/g0.html", title: "Guide 0", description: "About guide 0", tags: ["study"], minutes: 3 }];

function rendered(file) {
  return guideArticle(assets, parseGuide(readFileSync(new URL("../content/guides/" + file, import.meta.url), "utf8"), file.replace(/\.md$/, "")), []);
}

function publicPages() {
  return {
    home: home(assets, guides),
    shop: shop(assets),
    placement: rendered("first-clinical-placement.md"),
    confessions: confessions(assets),
    layout: layout({ title: "T", description: "D", path: "/x.html", main: "<p>x</p>", assets }),
    admin: admin(assets)
  };
}

test("public pages have no admin.html links, and Log out stays labelled and hidden by default", () => {
  const pages = publicPages();
  for (const [name, html] of Object.entries(pages)) {
    assert.doesNotMatch(html, /href="\/admin\.html"/, `${name} must not link to /admin.html`);
    assert.doesNotMatch(html, /class="admin-entry"/, `${name} must not show a public Admin entry`);
    assert.doesNotMatch(html, /data-admin-lock/, `${name} must not render an empty-text admin lock link`);
    assert.match(html, /data-admin-logout hidden>Log out<\/button>/, `${name} keeps a hidden Log out control with a text label`);
  }
});

test("the Life Admin Bundle is featured first on the shop, with honest savings wording", () => {
  const html = shop(assets);
  const bundle = html.indexOf('id="product-bundle"');
  const toolkit = html.indexOf('id="product-nursing-toolkit"');
  const renter = html.indexOf('id="product-renter-kit"');
  const nurses = html.indexOf(">For nurses<");
  assert.ok(bundle >= 0, "bundle card is present");
  assert.ok(bundle < nurses && bundle < toolkit && bundle < renter, "bundle is featured before the shop groups");
  assert.equal((html.match(/id="product-bundle"/g) || []).length, 1, "the bundle is not repeated in its group");
  assert.match(html, /Includes all 4 kits: save A\$32 vs buying separately \(A\$81\)\./);
  assert.match(html, /id="shop-featured-heading">The bundle</);
  assert.equal((html.match(/"@type":"Product"/g) || []).length, 10);
});

test("above-the-fold shop covers load eagerly, the rest stay lazy, and dimensions are set", () => {
  const html = shop(assets);
  const bundleBlock = html.slice(html.indexOf('id="product-bundle"'), html.indexOf('id="product-nursing-toolkit"'));
  assert.match(bundleBlock, /loading="eager"/);
  assert.match(bundleBlock, /fetchpriority="high"/);
  assert.match(bundleBlock, /width="960"/);
  assert.match(bundleBlock, /height="540"/);
  assert.equal((html.match(/fetchpriority="high"/g) || []).length, 1);
  const later = html.slice(html.indexOf('id="product-renter-kit"'));
  assert.match(later, /loading="lazy"/);
  assert.doesNotMatch(later, /loading="eager"|fetchpriority="high"/);
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]).filter((tag) => tag.includes("/shop/"));
  assert.ok(imgs.length >= 10);
  for (const tag of imgs) {
    assert.match(tag, /width="\d+"/);
    assert.match(tag, /height="\d+"/);
    assert.match(tag, /loading="(eager|lazy)"/);
    assert.match(tag, /decoding="async"/);
  }
});

test("the shop coffee block sits after every product card and stays hidden until a URL is set", () => {
  const html = shop(assets);
  const supportAt = html.indexOf("data-support-block");
  const lastCard = html.lastIndexOf('class="card shop-card');
  const lastGroup = html.lastIndexOf("shop-group");
  const affiliation = html.indexOf("class=\"affiliation shop-note\"");
  assert.ok(supportAt > lastCard && supportAt > lastGroup, "coffee block is after all product cards");
  assert.ok(affiliation >= 0 && supportAt > affiliation, "coffee block is after the shop affiliation note");
  assert.match(html, /<div class="callout shop-support" data-support-block hidden>/);
  assert.match(html, /data-support-slot hidden/);
});

test("relevant guides get one mid-article shop callout, and confessions never do", () => {
  const toolkitGuides = [
    "first-clinical-placement.md",
    "placement-costs.md",
    "first-rotation.md",
    "isbar-handover.md",
    "study-tips.md",
    "difficult-preceptor.md",
    "first-graduate-year.md"
  ];
  for (const file of toolkitGuides) {
    const html = rendered(file);
    assert.equal((html.match(/class="callout shop-callout"/g) || []).length, 1, `${file} has one callout`);
    assert.match(html, /From the OnlyScrubs creator/);
    assert.match(html, /lofiluffyy\.gumroad\.com\/l\/ozfbx/);
    assert.match(html, /not clinical, legal, tax or financial advice/i);
    assert.match(html, /not an official NMBA or Ahpra product/i);
    assert.match(html, /target="_blank" rel="noopener noreferrer"/);
    assert.match(html, /href="\/shop\.html"/);
    const calloutAt = html.indexOf("shop-callout");
    const articleAt = html.indexOf("<article");
    const firstH2 = html.indexOf("<h2", articleAt);
    assert.ok(calloutAt > firstH2, `${file} places the callout after the first section heading`);
  }

  const payGuides = ["pay-and-penalty-rates.md", "night-shift.md", "budgeting.md", "enterprise-bargaining-and-industrial-action.md"];
  for (const file of payGuides) {
    const html = rendered(file);
    assert.equal((html.match(/class="callout shop-callout"/g) || []).length, 1, `${file} has one callout`);
    assert.match(html, /lofiluffyy\.gumroad\.com\/l\/gnacj/);
    assert.match(html, /Pay estimates only/);
    assert.doesNotMatch(html, /lofiluffyy\.gumroad\.com\/l\/ozfbx/, `${file} does not also show the toolkit`);
  }

  for (const file of ["ahpra-registration-new-grad.md", "renewal-and-recency.md"]) {
    const html = rendered(file);
    assert.equal((html.match(/class="callout shop-callout"/g) || []).length, 1, `${file} has one callout`);
    assert.match(html, /lofiluffyy\.gumroad\.com\/l\/nlvlrt/);
    assert.match(html, /Not migration advice/);
  }

  const conf = confessions(assets);
  assert.doesNotMatch(conf, /shop-callout|From the OnlyScrubs creator|gumroad\.com/);

  for (const file of ["feet-and-back.md", "fatigue-and-night-shift-sleep.md", "social-media-and-professionalism.md", "speaking-up-about-safety.md"]) {
    assert.doesNotMatch(rendered(file), /shop-callout/, `${file} has no product callout`);
  }
});

test("homepage product cards open Gumroad directly and still offer More in the shop", () => {
  const html = home(assets, guides);
  const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
  assert.match(main, /More in the shop/);
  assert.match(main, /href="\/shop\.html"/);
  for (const slug of ["ozfbx", "gnacj", "disabv"]) {
    assert.match(main, new RegExp(`href="https://lofiluffyy\\.gumroad\\.com/l/${slug}" target="_blank" rel="noopener noreferrer"`));
  }
  assert.doesNotMatch(main, /shop-teaser" href="\/shop\.html#product-/);
});
