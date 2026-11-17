/** Client-side shift rest planner. General sleep-hygiene arithmetic, not clinical advice. */

export function parseTime(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatClock(total) {
  const mins = ((total % 1440) + 1440) % 1440;
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const suffix = hours >= 12 ? "pm" : "am";
  const h12 = hours % 12 || 12;
  return `${hh}:${mm} (${h12}:${mm} ${suffix})`;
}

/**
 * @param {{ start: string, end: string, sleepHours?: number, bufferMinutes?: number }} input
 */
export function planShift(input) {
  const start = parseTime(input.start);
  const end = parseTime(input.end);
  if (start == null || end == null) return { error: "Enter a start and finish time." };
  let duration = end - start;
  if (duration <= 0) duration += 1440;
  if (duration < 4 * 60 || duration > 16 * 60) {
    return { error: "Use a shift length between 4 and 16 hours." };
  }
  const sleepHours = clamp(Number(input.sleepHours) || 7, 4, 9);
  const buffer = clamp(Number(input.bufferMinutes) || 75, 30, 180);
  const sleepMins = Math.round(sleepHours * 60);
  const night = start >= 18 * 60 && end <= 12 * 60;
  let mainStart;
  let note;
  let nap = null;
  if (night) {
    mainStart = end + 90;
    note = "After a night shift, a common pattern is to get home, eat, and sleep soon after, then use a short nap before the next night if you need it.";
    nap = { start: start - buffer - 90, end: start - buffer };
  } else {
    mainStart = start - buffer - sleepMins;
    note = "For an early or late shift, protect a block of sleep that finishes before you leave, with time to eat and travel.";
  }
  const mainEnd = mainStart + sleepMins;
  return {
    night,
    durationMinutes: duration,
    sleepStart: mainStart,
    sleepEnd: mainEnd,
    sleepLabel: `${formatClock(mainStart)} to ${formatClock(mainEnd)}`,
    caffeineCutoff: mainStart - 6 * 60,
    caffeineLabel: formatClock(mainStart - 6 * 60),
    nap,
    napLabel: nap ? `${formatClock(nap.start)} to ${formatClock(nap.end)}` : "",
    note
  };
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
