/** Keyword screen kept from the original Worker, plus direct-contact checks. */

export const RISKY_PATTERN =
  /\b(patient|ward|hospital|clinic|diagnos(?:is|ed|e)|medication|surgery|resus|code\s*blue|dob|address|medicare|urn|mr\.?\s+[a-z]|mrs\.?\s+[a-z]|ms\.?\s+[a-z])\b/i;

export const TAGS = [
  "nights",
  "placements",
  "ed",
  "aged-care",
  "theatre",
  "midwifery",
  "student",
  "grad-year",
  "handover",
  "feet",
  "pens",
  "coffee",
  "laundry",
  "breaks",
  "scrub-life"
];

const TAG_SET = new Set(TAGS);

const INFER = [
  ["nights", /\b(night|nights|3am|0300|nocturnal)\b/i],
  ["placements", /\b(placement|facilitator|preceptor|buddy nurse)\b/i],
  ["ed", /\b(emergency department|ED|triage)\b/i],
  ["aged-care", /aged care|nursing home/i],
  ["theatre", /\btheatre\b/i],
  ["midwifery", /midwi|birth suite|postnatal/i],
  ["student", /\b(student|university|uni)\b/i],
  ["grad-year", /\b(grad|graduate year|new grad)\b/i],
  ["handover", /\bhandover\b|\bISBAR\b/i],
  ["feet", /\b(shoe|shoes|feet|sock|socks)\b/i],
  ["pens", /\b(pen|pens|highlighter)\b/i],
  ["coffee", /\b(coffee|caffeine)\b/i],
  ["laundry", /\blaundry\b/i],
  ["breaks", /\b(break|snack|lunch)\b/i],
  ["scrub-life", /\bscrub/i]
];

export function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function cleanMultiline(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function risky(text) {
  return RISKY_PATTERN.test(String(text || ""));
}

export function hasDirectContact(text) {
  const value = String(text || "");
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value)) return true;
  if (/https?:\/\//i.test(value)) return true;
  if (/(?:\+?61|0)\d[\d\s()-]{7,}/.test(value)) return true;
  if (/\b\d{8,}\b/.test(value)) return true;
  return false;
}

export function normaliseTags(input) {
  const raw = Array.isArray(input) ? input : [];
  const out = [];
  for (const item of raw) {
    const tag = clean(item).toLowerCase();
    if (TAG_SET.has(tag) && !out.includes(tag)) out.push(tag);
    if (out.length >= 5) break;
  }
  return out;
}

export function inferTags(text) {
  const found = [];
  for (const [tag, pattern] of INFER) {
    if (pattern.test(String(text || "")) && !found.includes(tag)) found.push(tag);
  }
  if (!found.length) found.push("scrub-life");
  return found.slice(0, 5);
}

export function mergeTags(text, stored) {
  const tags = normaliseTags(stored);
  for (const tag of inferTags(text)) {
    if (!tags.includes(tag)) tags.push(tag);
    if (tags.length >= 5) break;
  }
  return tags;
}

export function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase());
}
