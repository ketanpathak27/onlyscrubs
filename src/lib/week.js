const WEEKDAYS = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

function parts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  return Object.fromEntries(fmt.formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

function utcForSydneyMidnight(year, month, day) {
  let utc = Date.UTC(Number(year), Number(month) - 1, Number(day), -11, 0, 0);
  for (let i = 0; i < 4; i++) {
    const shown = parts(new Date(utc), "Australia/Sydney");
    const hour = shown.hour === "24" ? "00" : shown.hour;
    if (`${shown.year}-${shown.month}-${shown.day} ${hour}:${shown.minute}` === `${year}-${month}-${day} 00:00`) return utc;
    const got = Date.UTC(Number(shown.year), Number(shown.month) - 1, Number(shown.day), Number(hour), Number(shown.minute));
    const want = Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0);
    utc += want - got;
  }
  return utc;
}

export function sydneyDayKey(date = new Date()) {
  const shown = parts(date, "Australia/Sydney");
  return `${shown.year}-${shown.month}-${shown.day}`;
}

export function sydneyWeekStartMs(date = new Date()) {
  const shown = parts(date, "Australia/Sydney");
  const weekday = String(shown.weekday || "Mon").slice(0, 3);
  const offset = WEEKDAYS[weekday] ?? 0;
  const todayMidnight = utcForSydneyMidnight(shown.year, shown.month, shown.day);
  const monday = new Date(todayMidnight - offset * 86400000);
  const mondayParts = parts(monday, "Australia/Sydney");
  return utcForSydneyMidnight(mondayParts.year, mondayParts.month, mondayParts.day);
}

export function inCurrentWeek(iso, now = new Date()) {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return false;
  return time >= sydneyWeekStartMs(now) && time <= now.getTime();
}

export function engagementScore(item) {
  return (Number(item?.score) || 0) + (Number(item?.hugs) || 0) + (Number(item?.sames) || 0);
}
