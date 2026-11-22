const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_DATE_OPTIONS = { weekday: "long", day: "numeric", month: "long" };

// A date key is a civil day, not a local timestamp. Keep all arithmetic in UTC.
function parseDateKey(value) {
  if (typeof value !== "string" || !DATE_KEY.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(0);
  // Unlike Date.UTC(year, ...), this also preserves years 0001 through 0099.
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : null;
}

export function isDateKey(value) {
  return parseDateKey(value) !== null;
}

export function addDays(dateKey, amount) {
  const date = parseDateKey(dateKey);
  if (!date || !Number.isInteger(amount)) return null;
  date.setUTCDate(date.getUTCDate() + amount);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return null;
  return date.toISOString().slice(0, 10);
}

export function weekDates(dateKey) {
  const date = parseDateKey(dateKey);
  if (!date) return [];
  const mondayOffset = -((date.getUTCDay() + 6) % 7);
  const days = Array.from({ length: 7 }, (_, index) => addDays(dateKey, mondayOffset + index));
  return days.every(Boolean) ? days : [];
}

export function groupEvents(events) {
  const grouped = new Map();
  for (const event of Array.isArray(events) ? events : []) {
    if (!isDateKey(event?.date)) continue;
    if (!grouped.has(event.date)) grouped.set(event.date, []);
    grouped.get(event.date).push(event);
  }
  return grouped;
}

export function nearbyEventDate(events, selectedDate) {
  if (!isDateKey(selectedDate)) return null;
  let next = null;
  let previous = null;
  for (const date of groupEvents(events).keys()) {
    if (date > selectedDate && (!next || date < next)) next = date;
    if (date < selectedDate && (!previous || date > previous)) previous = date;
  }
  return next || previous;
}

export function formatCalendarDate(dateKey, locale = "es-MX", options = DEFAULT_DATE_OPTIONS) {
  const date = parseDateKey(dateKey);
  if (!date) return "";
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(date);
}
