import assert from "node:assert/strict";
import test from "node:test";
import { hasDirectContact, inferTags, mergeTags, normaliseTags, risky } from "../src/lib/moderation.js";
import { validateListing } from "../src/routes/rack.js";
import { planShift } from "../src/lib/planner.js";

test("keeps the original risky screen", () => {
  assert.equal(risky("I lost another pen on nights"), false);
  assert.equal(risky("A patient on the ward"), true);
  assert.equal(risky("awkward laundry"), false);
  assert.equal(risky("code blue overhead"), true);
});

test("blocks direct contact details", () => {
  assert.equal(hasDirectContact("email me at nurse@example.com"), true);
  assert.equal(hasDirectContact("see https://example.com"), true);
  assert.equal(hasDirectContact("call 0412345678"), true);
  assert.equal(hasDirectContact("three pens and a glove"), false);
});

test("tags stay on the allowlist", () => {
  assert.deepEqual(normaliseTags(["nights", "nope", "nights", "ed"]), ["nights", "ed"]);
  assert.ok(inferTags("night shift and a lost pen").includes("nights"));
  assert.ok(mergeTags("placement week", ["student"]).includes("placements"));
});

test("listing validation hides nothing required", () => {
  const bad = validateListing({ type: "donate", title: "ok", description: "too short", size: "M", colour: "navy", suburb: "Footscray", state: "VIC", condition: "good", contactEmail: "a@b.com" });
  assert.ok(bad.error);
  const good = validateListing({
    type: "swap",
    title: "Navy scrub pants",
    description: "Clean pair, worn for placement, pickup from a station.",
    size: "12",
    colour: "navy",
    suburb: "Footscray",
    state: "vic",
    condition: "good",
    contactEmail: "student@example.com"
  });
  assert.equal(good.value.state, "VIC");
  assert.equal(good.value.contactEmail, "student@example.com");
  const named = validateListing({ ...good.value, description: "A spare set from the hospital pool, clean and ready.", contactEmail: "student@example.com", title: "Navy scrub pants", suburb: "Footscray", state: "VIC", condition: "good", colour: "navy", size: "12", type: "swap" });
  assert.equal(named.error, undefined);
  assert.equal(named.screen.flagged, true);
  assert.match(named.screen.flagReason, /workplace|hospital|clinical/i);
});

test("night shift plan has a caffeine cutoff six hours before sleep", () => {
  const plan = planShift({ start: "21:00", end: "07:30", sleepHours: 7, bufferMinutes: 75 });
  assert.equal(plan.night, true);
  assert.equal(plan.caffeineCutoff, plan.sleepStart - 360);
  assert.match(plan.sleepLabel, /09:00/);
});
