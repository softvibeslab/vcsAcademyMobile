import test from "node:test";
import assert from "node:assert/strict";
import {
  isDateKey,
  addDays,
  weekDates,
  groupEvents,
  nearbyEventDate,
  formatCalendarDate,
} from "./calendar-model.mjs";

test("date keys validate real civil dates, including leap-year century rules", () => {
  for (const value of ["2026-11-22", "2024-02-29", "2000-02-29", "0001-01-01", "0099-12-31", "9999-12-31"]) {
    assert.equal(isDateKey(value), true, value);
  }
  for (const value of [null, undefined, 20261122, "", " 2026-11-22", "2026-1-02", "2026-11-22T00:00:00Z", "2026-02-29", "1900-02-29", "2026-04-31", "2026-00-01", "2026-13-01", "2026-11-00", "2026-11-32", "0000-01-01", "10000-01-01"]) {
    assert.equal(isDateKey(value), false, String(value));
  }
});

test("adding civil days crosses months, leap days and years in either direction", () => {
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2027-01-01", -1), "2026-12-31");
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addDays("2024-02-29", 1), "2024-03-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("0099-12-31", 1), "0100-01-01");
  assert.equal(addDays("2026-11-22", 0), "2026-11-22");
  assert.equal(addDays("2026-02-30", 1), null);
  assert.equal(addDays("2026-11-22", 0.5), null);
  assert.equal(addDays("2026-11-22", "1"), null);
  assert.equal(addDays("2026-11-22", Infinity), null);
  assert.equal(addDays("0001-01-01", -1), null);
  assert.equal(addDays("9999-12-31", 1), null);
});

test("a week always runs Monday through Sunday across month and year boundaries", () => {
  const week = ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"];
  assert.deepEqual(weekDates("2026-11-16"), week);
  assert.deepEqual(weekDates("2026-11-22"), week);
  assert.deepEqual(weekDates("2027-01-01"), ["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
  assert.deepEqual(weekDates("2024-02-29"), ["2024-02-26", "2024-02-27", "2024-02-28", "2024-02-29", "2024-03-01", "2024-03-02", "2024-03-03"]);
  assert.deepEqual(weekDates("2026-02-29"), []);
  assert.deepEqual(weekDates(null), []);
});

test("grouping preserves event order and objects without mutating the input", () => {
  const first = Object.freeze({ id: "a", date: "2026-11-24", title: "First follow-up" });
  const second = Object.freeze({ id: "b", date: "2026-11-22", title: "Today's follow-up" });
  const third = Object.freeze({ id: "c", date: "2026-11-24", title: "Second follow-up" });
  const events = Object.freeze([first, second, third, null, { date: "2026-02-29" }, { id: "missing-date" }]);
  const grouped = groupEvents(events);
  assert(grouped instanceof Map);
  assert.deepEqual([...grouped.keys()], ["2026-11-24", "2026-11-22"]);
  assert.deepEqual(grouped.get("2026-11-24"), [first, third]);
  assert.equal(grouped.get("2026-11-24")[0], first);
  assert.deepEqual(grouped.get("2026-11-22"), [second]);
  assert.equal(events.length, 6);
  assert.deepEqual([...groupEvents([])], []);
  assert.deepEqual([...groupEvents(undefined)], []);
});

test("finding nearby activity prefers the first later date, otherwise the latest earlier date", () => {
  const events = Object.freeze([
    { date: "2026-11-30" },
    { date: "2026-11-20" },
    { date: "2026-11-22" },
    { date: "2026-11-24" },
    { date: "2026-11-24" },
    { date: "2026-02-29" },
    { date: "2026-11-10" },
  ]);
  assert.equal(nearbyEventDate(events, "2026-11-22"), "2026-11-24");
  assert.equal(nearbyEventDate(events, "2026-11-30"), "2026-11-24");
  assert.equal(nearbyEventDate(events, "2026-12-01"), "2026-11-30");
  assert.equal(nearbyEventDate(events, "2026-11-01"), "2026-11-10");
  assert.equal(nearbyEventDate([{ date: "2026-11-22" }], "2026-11-22"), null);
  assert.equal(nearbyEventDate([], "2026-11-22"), null);
  assert.equal(nearbyEventDate(events, "2026-02-29"), null);
  assert.equal(events[0].date, "2026-11-30", "the source array is not sorted in place");
});

test("formatting uses locale options while preserving the calendar day in UTC", () => {
  assert.equal(formatCalendarDate("2026-11-22"), "domingo, 22 de noviembre");
  assert.equal(formatCalendarDate("2026-11-22", "en-US", { weekday: "long", day: "numeric", month: "long" }), "Sunday, November 22");
  assert.equal(formatCalendarDate("2026-11-22", "en-US", { day: "numeric", timeZone: "America/Los_Angeles" }), "22", "timeZone cannot shift a civil date");
  assert.equal(formatCalendarDate("2026-11-22", "es-MX", { month: "long", year: "numeric" }), "noviembre de 2026");
  assert.equal(formatCalendarDate("2026-02-30"), "");
  assert.equal(formatCalendarDate(undefined), "");
});

test("civil date arithmetic and labels do not change across host time zones or DST", () => {
  const originalTimeZone = process.env.TZ;
  try {
    for (const zone of ["America/Cancun", "America/New_York", "Pacific/Kiritimati", "Pacific/Honolulu"]) {
      process.env.TZ = zone;
      assert.equal(addDays("2026-03-08", 1), "2026-03-09", zone);
      assert.equal(addDays("2026-11-01", 1), "2026-11-02", zone);
      assert.equal(weekDates("2026-03-08")[6], "2026-03-08", zone);
      assert.equal(formatCalendarDate("2026-11-22", "en-US", { weekday: "long" }), "Sunday", zone);
    }
  } finally {
    if (originalTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimeZone;
  }
});
