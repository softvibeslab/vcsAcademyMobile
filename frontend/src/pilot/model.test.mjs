import test from "node:test";
import assert from "node:assert/strict";
import {
  periodEntries,
  metricsFor,
  goalPayload,
  canManage,
  noteKey,
} from "./model.mjs";
test("month metrics exclude other periods and reuse canonical qualified-tour denominator", () => {
  const entries = [
    {
      date: "2026-11-01",
      tour_outcome: "qualified",
      sales_outcome: "sold",
      sales_volume: 600,
      number_of_sales: 1,
    },
    {
      date: "2026-11-12",
      tour_outcome: "close_today",
      sales_outcome: "no_sale",
      sales_volume: 0,
      number_of_sales: 0,
    },
    {
      date: "2026-10-31",
      tour_outcome: "qualified",
      sales_outcome: "sold",
      sales_volume: 9000,
      number_of_sales: 1,
    },
  ];
  const filtered = periodEntries(entries, "month", "2026-11-13");
  assert.equal(filtered.length, 2);
  assert.equal(metricsFor(filtered).vpg, 300);
  assert.equal(entries.length, 3);
});
test("weekly range starts Monday and excludes future entries", () => {
  const entries = ["2026-11-08", "2026-11-09", "2026-11-13", "2026-11-14"].map(
    (date) => ({ date }),
  );
  assert.deepEqual(
    periodEntries(entries, "week", "2026-11-13").map((x) => x.date),
    ["2026-11-09", "2026-11-13"],
  );
});
test("no-sale form clears stale volume, validates input and never adds unsupported channel fields", () => {
  const p = goalPayload({
    date: "2026-11-13",
    tour_outcome: "qualified",
    sales_outcome: "no_sale",
    sales_volume: "900",
    number_of_sales: "1",
    channel: "Agencia",
  });
  assert.equal(p.sales_volume, 0);
  assert.equal(p.number_of_sales, 0);
  assert(!("channel" in p));
  assert.throws(() =>
    goalPayload({
      date: "2026-11-13",
      tour_outcome: "qualified",
      sales_outcome: "sold",
      sales_volume: "-1",
      number_of_sales: "1",
    }),
  );
});
test("role preference cannot grant manager access", () => {
  assert.equal(
    canManage({ roles: ["sales_rep"], preference: "manager" }),
    false,
  );
  assert.equal(canManage({ roles: ["coach"] }), true);
});
test("notebook storage is scoped to authenticated identity", () => {
  assert.notEqual(noteKey("rep-a"), noteKey("rep-b"));
  assert.throws(() => noteKey(""));
});
