/** Distinct-reporter limits. High-severity categories hide a post immediately. */

export const REPORTS_PER_DAY = 8;
export const AUTO_HIDE_AFTER = 3;
export const REPORT_CATEGORIES = ["other", "spam", "harassment", "patient-info", "threats"];
export const HIGH_SEVERITY = new Set(["patient-info", "threats"]);

export function normaliseCategory(value) {
  const category = String(value || "").trim().toLowerCase();
  return REPORT_CATEGORIES.includes(category) ? category : "other";
}

export function decideReport({ duplicate, usedToday, distinctCount, category }) {
  const normalised = normaliseCategory(category);
  if (duplicate) return { action: "duplicate", category: normalised };
  if (Number(usedToday) >= REPORTS_PER_DAY) return { action: "limited", category: normalised };
  const reportsCount = (Number(distinctCount) || 0) + 1;
  const high = HIGH_SEVERITY.has(normalised);
  return {
    action: "record",
    category: normalised,
    reportsCount,
    hide: high || reportsCount >= AUTO_HIDE_AFTER,
    high
  };
}
