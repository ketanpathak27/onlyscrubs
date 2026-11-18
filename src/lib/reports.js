/**
 * The one report rule, shared by the live handler and the policy pages.
 * - An ordinary report is recorded, and the item stays up until AUTO_HIDE_AFTER
 *   distinct reporters have reported it. Then it is hidden pending moderation.
 * - A report in a HIGH_SEVERITY category (patient-identifying information,
 *   threats, self-harm) hides the item immediately, pending moderation.
 * - The same connection cannot report the same item twice, and each connection
 *   has REPORTS_PER_DAY reports per day.
 */

export const REPORTS_PER_DAY = 8;
export const AUTO_HIDE_AFTER = 3;
export const REPORT_CATEGORIES = ["other", "spam", "harassment", "patient-info", "threats", "self-harm"];
export const HIGH_SEVERITY = new Set(["patient-info", "threats", "self-harm"]);

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
