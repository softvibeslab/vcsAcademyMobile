import test from "node:test";
import assert from "node:assert/strict";
import { agendaEvents, summaryFor, followupOriginDate } from "./smart-agenda-model.mjs";
import { metricsFor } from "./model.mjs";

const sale = Object.freeze({ id: "sale-1", date: "2026-11-06", tour_outcome: "qualified", sales_outcome: "sold", number_of_sales: 2, sales_volume: 8000, notes: "Enviar material aprobado." });
const noSale = Object.freeze({ id: "day-2", date: "2026-11-07", tour_outcome: "close_today", sales_outcome: "no_sale", number_of_sales: 0, sales_volume: 0, notes: "Resolver preguntas." });
const noTour = Object.freeze({ id: "day-3", date: "2026-11-08", tour_outcome: "no_tour", sales_outcome: "no_sale", number_of_sales: 0, sales_volume: 0 });
const reminder = Object.freeze({ id: "followup-1", follow_up_date: "2026-11-09", entry_date: sale.date, note: "Confirmar siguiente paso.", status: "scheduled" });

test("agenda maps existing sales, no-sale days, no-tour days and dated follow-ups without inventing fields", () => {
  const entries = Object.freeze([sale, noSale, noTour]);
  const reminders = Object.freeze([reminder]);
  const events = agendaEvents(entries, reminders);
  assert.equal(events.length, 4);
  assert.deepEqual(events.map(event => event.kind), ["sale", "no-sale", "activity", "followup"]);
  assert.equal(events[0].title, "2 ventas");
  assert.equal(events[0].amount, 8000);
  assert.equal(events[0].entry, sale);
  assert.equal(events[0].note, sale.notes);
  assert.equal(events[0].entryDate, sale.date);
  assert.equal(events[1].title, "Sin venta");
  assert.equal(events[1].amount, null);
  assert.equal(events[2].title, "Sin tour");
  assert.equal(events[3].date, reminder.follow_up_date);
  assert.equal(events[3].entryDate, reminder.entry_date);
  assert.equal(events[3].title, reminder.note);
  assert.equal(events[3].amount, null);
  assert.equal(events[3].reminder, reminder);
  for (const event of events) {
    for (const field of ["time", "lead", "commission", "spiff", "deposit", "processingStatus"]) {
      assert.equal(Object.hasOwn(event, field), false, field);
    }
  }
  assert.deepEqual(entries, [sale, noSale, noTour]);
  assert.equal(reminders[0], reminder);
});

test("missing data does not create a sale, an amount or a dated event", () => {
  const entries = [
    { id: "not-a-sale", date: "2026-11-01", tour_outcome: "qualified", sales_outcome: "sold", number_of_sales: 0 },
    { id: "one-sale", date: "2026-11-02", tour_outcome: "qualified", sales_outcome: "sold", number_of_sales: 1 },
    { id: "invalid", date: "2026-02-29", sales_outcome: "sold", number_of_sales: 1, sales_volume: 500 },
  ];
  const events = agendaEvents(entries, [{ id: "empty-note", follow_up_date: "2026-11-03", entry_date: "2026-11-01" }, { id: "no-date" }]);
  assert.equal(events.length, 3);
  assert.equal(events[0].kind, "no-sale");
  assert.equal(events[1].title, "1 venta");
  assert.equal(events[1].amount, null);
  assert.equal(events[2].title, "Seguimiento");
  assert.deepEqual(agendaEvents(undefined, null), []);
});

test("daily and monthly summaries reuse canonical metrics and preserve absent financial fields as null", () => {
  const otherMonth = Object.freeze({ ...sale, id: "other-month", date: "2026-10-06", number_of_sales: 9, sales_volume: 99999 });
  const invalidDate = Object.freeze({ ...sale, id: "invalid-date", date: "2026-11-99" });
  const entries = Object.freeze([sale, noSale, noTour, otherMonth, invalidDate]);
  const monthly = summaryFor(entries, "2026-11");
  const canonical = metricsFor([sale, noSale, noTour]);
  assert.deepEqual(monthly, { tours: canonical.qualifiedTours, sales: canonical.salesCount, volume: canonical.volume, commission: null, spiffs: null, deposit: null });
  assert.deepEqual(summaryFor(entries, sale.date), { tours: 1, sales: 2, volume: 8000, commission: null, spiffs: null, deposit: null });
  assert.deepEqual(summaryFor(entries, noTour.date), { tours: 0, sales: 0, volume: 0, commission: null, spiffs: null, deposit: null });
  assert.deepEqual(summaryFor(entries, "2026-12"), { tours: 0, sales: 0, volume: 0, commission: null, spiffs: null, deposit: null });
  assert.deepEqual(summaryFor(entries, "2026-13"), summaryFor([], "2026-11"));
  assert.deepEqual(summaryFor(undefined, null), { tours: 0, sales: 0, volume: 0, commission: null, spiffs: null, deposit: null });
  assert.equal(entries[0], sale);
});

test("a future follow-up selects today's origin form without changing the follow-up date or creating a record", () => {
  assert.equal(followupOriginDate("2026-11-29", "2026-11-22"), "2026-11-22");
  assert.equal(followupOriginDate("2026-11-06", "2026-11-22"), "2026-11-06");
  assert.equal(followupOriginDate("2026-11-22", "2026-11-22"), "2026-11-22");
  assert.equal(followupOriginDate("2026-02-29", "2026-11-22"), "2026-11-22");
  assert.equal(followupOriginDate(undefined, "2026-11-22"), "2026-11-22");
  assert.equal(followupOriginDate("2026-11-22", "invalid"), null);
});
