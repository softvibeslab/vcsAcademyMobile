import test from "node:test";
import assert from "node:assert/strict";
import { monthDates, shiftMonth } from "./month-model.mjs";

test("November 2026 starts on Sunday and places the sixth on Friday in a 42-day grid", () => {
  const days = monthDates("2026-11-22");
  assert.equal(days.length, 42);
  assert.equal(days[0], "2026-11-01");
  assert.equal(days[5], "2026-11-06");
  assert.equal(days[41], "2026-12-12");
  assert.equal(new Set(days).size, 42);
});

test("month grids include adjacent month dates across leap days and year boundaries", () => {
  const leap = monthDates("2024-02-29");
  assert.equal(leap[0], "2024-01-28");
  assert.equal(leap[32], "2024-02-29");
  assert.equal(leap.at(-1), "2024-03-09");
  const january = monthDates("2027-01-01");
  assert.equal(january[0], "2026-12-27");
  assert.equal(january[5], "2027-01-01");
  assert.equal(january.at(-1), "2027-02-06");
  assert.deepEqual(monthDates("2026-02-29"), []);
  assert.deepEqual(monthDates(undefined), []);
});

test("month navigation clamps the selected day while preserving month and year intent", () => {
  assert.equal(shiftMonth("2026-01-31", 1), "2026-02-28");
  assert.equal(shiftMonth("2024-01-31", 1), "2024-02-29");
  assert.equal(shiftMonth("2026-03-31", -1), "2026-02-28");
  assert.equal(shiftMonth("2026-12-31", 1), "2027-01-31");
  assert.equal(shiftMonth("2027-01-31", -1), "2026-12-31");
  assert.equal(shiftMonth("2024-02-29", 12), "2025-02-28");
  assert.equal(shiftMonth("2026-11-22", 0), "2026-11-22");
  assert.equal(shiftMonth("2026-11-22", -24), "2024-11-22");
  assert.equal(shiftMonth("0099-12-31", 1), "0100-01-31");
  assert.equal(shiftMonth("0001-01-01", -1), null);
  assert.equal(shiftMonth("9999-12-31", 1), null);
  assert.equal(shiftMonth("2026-02-29", 1), null);
  assert.equal(shiftMonth("2026-11-22", 1.5), null);
});

test("monthly date keys remain stable across host time zones and DST", () => {
  const original = process.env.TZ;
  try {
    for (const timeZone of ["America/Cancun", "America/New_York", "Pacific/Honolulu", "Pacific/Kiritimati"]) {
      process.env.TZ = timeZone;
      assert.equal(monthDates("2026-11-01")[0], "2026-11-01", timeZone);
      assert.equal(shiftMonth("2026-03-08", 1), "2026-04-08", timeZone);
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
