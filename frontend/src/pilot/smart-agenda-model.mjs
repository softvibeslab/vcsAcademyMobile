import { isDateKey } from "../components/calendar/calendar-model.mjs";
import { metricsFor } from "./model.mjs";

function amountOrNull(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export function agendaEvents(entries, reminders) {
  const events = [];
  for (const [index, entry] of (Array.isArray(entries) ? entries : []).entries()) {
    if (!isDateKey(entry?.date)) continue;
    const sales = Number(entry.number_of_sales);
    const sold = entry.sales_outcome === "sold" && Number.isFinite(sales) && sales > 0;
    const kind = sold ? "sale" : entry.tour_outcome === "no_tour" ? "activity" : "no-sale";
    events.push({
      id: `entry:${entry.id ?? `${entry.date}:${index}`}`,
      date: entry.date,
      title: sold ? `${sales} ${sales === 1 ? "venta" : "ventas"}` : kind === "activity" ? "Sin tour" : "Sin venta",
      kind,
      amount: sold ? amountOrNull(entry.sales_volume) : null,
      entryDate: entry.date,
      note: typeof entry.notes === "string" ? entry.notes : "",
      entry,
    });
  }
  for (const [index, reminder] of (Array.isArray(reminders) ? reminders : []).entries()) {
    if (!isDateKey(reminder?.follow_up_date)) continue;
    const note = typeof reminder.note === "string" ? reminder.note : "";
    events.push({
      id: `followup:${reminder.id ?? `${reminder.follow_up_date}:${index}`}`,
      date: reminder.follow_up_date,
      title: note.trim() ? note : "Seguimiento",
      kind: "followup",
      amount: null,
      entryDate: isDateKey(reminder.entry_date) ? reminder.entry_date : null,
      note,
      reminder,
    });
  }
  return events;
}

export function summaryFor(entries, dateOrMonth) {
  const isMonth = typeof dateOrMonth === "string" && /^\d{4}-\d{2}$/.test(dateOrMonth) && isDateKey(`${dateOrMonth}-01`);
  const validPeriod = isMonth || isDateKey(dateOrMonth);
  const selected = (Array.isArray(entries) ? entries : []).filter(entry =>
    validPeriod && isDateKey(entry?.date) && (isMonth ? entry.date.slice(0, 7) === dateOrMonth : entry.date === dateOrMonth),
  );
  const metrics = metricsFor(selected);
  return { tours: metrics.qualifiedTours, sales: metrics.salesCount, volume: metrics.volume, commission: null, spiffs: null, deposit: null };
}

export function followupOriginDate(selectedDate, today) {
  if (!isDateKey(today)) return null;
  return isDateKey(selectedDate) && selectedDate <= today ? selectedDate : today;
}
