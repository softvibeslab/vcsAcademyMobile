import { addDays, isDateKey } from "./calendar-model.mjs";

// A month always uses six Sunday–Saturday rows, independent of the host timezone.
export function monthDates(dateKey) {
  if (!isDateKey(dateKey)) return [];
  const first = `${dateKey.slice(0, 7)}-01`;
  const weekday = new Date(`${first}T00:00:00Z`).getUTCDay();
  const days = Array.from({ length: 42 }, (_, index) => addDays(first, index - weekday));
  return days.every(Boolean) ? days : [];
}

export function shiftMonth(dateKey, amount) {
  if (!isDateKey(dateKey) || !Number.isInteger(amount)) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  const target = (year - 1) * 12 + month - 1 + amount;
  if (target < 0 || target >= 9999 * 12) return null;
  const targetYear = Math.floor(target / 12) + 1;
  const targetMonth = target % 12;
  const last = new Date(0);
  last.setUTCFullYear(targetYear, targetMonth + 1, 0);
  const targetDay = Math.min(day, last.getUTCDate());
  return `${String(targetYear).padStart(4, "0")}-${String(targetMonth + 1).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
}
