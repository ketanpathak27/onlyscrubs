import assert from "node:assert/strict";
import test from "node:test";
import figures from "../data/figures.json" with { type: "json" };
import { siteConfig } from "../src/config.js";
import { advertise, confessions, guideArticle, productCallout, shiftKit, studentBay } from "../site/pages.mjs";
import { parseGuide } from "../site/markdown.mjs";
import { readFileSync } from "node:fs";

const assets = { styles: "/a.css", theme: "/t.js", site: "/s.js", tools: "/tools.js", planner: "/p.js", checklist: "/c.js" };
const hiddenNames = ["cpdOrganiser", "gradWorkbook", "placementKit", "expenseLog"].map((key) => siteConfig.upcomingProducts[key].label);

test("future product callouts stay hidden while the url is empty", () => {
  for (const key of ["cpdOrganiser", "gradWorkbook", "placementKit", "expenseLog"]) {
    assert.equal(siteConfig.upcomingProducts[key].url, "");
    assert.equal(productCallout(key), "");
  }
  const pay = productCallout("payTracker");
  assert.match(pay, /https:\/\/lofiluffyy\.gumroad\.com\/l\/gnacj/);
  assert.match(pay, /Pay estimates only/);
  assert.match(pay, /own award or enterprise agreement rates/);
  assert.doesNotMatch(pay, /\$\d/);
  const iqnm = productCallout("iqnmPlanner");
  assert.match(iqnm, /https:\/\/lofiluffyy\.gumroad\.com\/l\/nlvlrt/);
  assert.match(iqnm, /Not migration advice/);
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
  assert.equal(figures.pracPayment.incomeTestWeeklyAud, 1536.37);
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
  const rendered = (file) => guideArticle(assets, parseGuide(readFileSync(new URL("../content/guides/" + file, import.meta.url), "utf8"), file.replace(/\.md$/, "")), []);
  for (const file of ["pay-and-penalty-rates.md", "night-shift.md", "budgeting.md"]) {
    assert.match(rendered(file), /gumroad\.com\/l\/gnacj/);
  }
  for (const file of ["ahpra-registration-new-grad.md", "renewal-and-recency.md"]) {
    assert.match(rendered(file), /gumroad\.com\/l\/nlvlrt/);
  }
  for (const file of ["recording-your-cpd.md", "placement-costs.md", "nurse-midwife-tax.md", "graduate-program-hub.md"]) {
    const html = rendered(file);
    for (const name of hiddenNames) assert.equal(html.includes(name), false);
  }
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
