import assert from "node:assert/strict";
import test from "node:test";
import figures from "../data/figures.json" with { type: "json" };
import { siteConfig } from "../src/config.js";
import { advertise, confessions, productCallout, shiftKit, studentBay } from "../site/pages.mjs";
import { parseGuide } from "../site/markdown.mjs";
import { readFileSync } from "node:fs";

const assets = { styles: "/a.css", theme: "/t.js", site: "/s.js", tools: "/tools.js", planner: "/p.js", checklist: "/c.js" };
const hiddenNames = Object.values(siteConfig.upcomingProducts).map((item) => item.label);

test("future product callouts stay hidden while the url is empty", () => {
  for (const key of Object.keys(siteConfig.upcomingProducts)) {
    assert.equal(siteConfig.upcomingProducts[key].url, "");
    assert.equal(productCallout(key), "");
  }
});

test("figures carry a source and an as-of date", () => {
  assert.equal(figures.cpd.minimumHours, 20);
  assert.match(figures.cpd.source, /nursingmidwiferyboard\.gov\.au/);
  assert.equal(figures.renewal.generalFeeAud, 201);
  assert.equal(figures.renewal.nswGeneralFeeAud, 193);
  assert.equal(figures.renewal.feeScheduleAsOf, "2026-10-09");
  assert.equal(figures.recency.hours, 450);
  assert.equal(figures.recency.years, 5);
  assert.equal(figures.pracPayment.weeklyAud, 338.6);
  assert.equal(figures.pracPayment.year, 2026);
  for (const block of [figures.cpd, figures.renewal, figures.recency, figures.pracPayment]) {
    assert.ok(block.source || block.feeSource);
    assert.ok(block.asOf || block.feeScheduleAsOf);
  }
});

test("shop callouts land on guides tools, not on confessions, and do not name unreleased products", () => {
  const conf = confessions(assets);
  assert.doesNotMatch(conf, /From the OnlyScrubs creator/);
  for (const html of [shiftKit(assets), studentBay(assets)]) {
    assert.match(html, /From the OnlyScrubs creator/);
    assert.match(html, /href="\/shop\.html"/);
    for (const name of hiddenNames) assert.equal(html.includes(name), false);
  }
  const placement = parseGuide(readFileSync(new URL("../content/guides/first-clinical-placement.md", import.meta.url), "utf8"), "first-clinical-placement");
  assert.equal(placement.toolkit, "yes");
});

test("advertise page states the rules and invents no price or traffic figure", () => {
  const html = advertise(assets);
  assert.match(html, /hello@onlyscrubs\.org/);
  assert.match(html, /Advertising-hub/);
  assert.match(html, /canonical" href="https:\/\/onlyscrubs\.org\/advertise\.html"/);
  assert.match(html, /"@type":"WebPage"/);
  assert.doesNotMatch(html, /A\$\d|\$\d{2,}|best seller|visitors a month|pageviews/i);
  for (const name of hiddenNames) assert.equal(html.includes(name), false);
});
