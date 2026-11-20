import test from "node:test";
import assert from "node:assert/strict";
import {
  anywayMoney,
  loanPayment,
  toCents,
  tourPayload,
  monthGoal,
  routeForRole,
  localDay,
} from "./model.mjs";
test("Anyway uses present spending in year one and handles zero inflation", () => {
  assert.equal(anywayMoney(3000, 20, 4), 89334.24);
  assert.equal(anywayMoney(3000, 20, 0), 60000);
  assert.equal(anywayMoney(3000, 1, 4), 3000);
});
test("Anyway rejects ranges and nonfinite values", () => {
  for (const args of [
    [-1, 20, 4],
    [3000, 0, 4],
    [3000, 2.5, 4],
    [3000, 20, 31],
    [Infinity, 20, 4],
  ])
    assert.throws(() => anywayMoney(...args));
});
test("Loan uses nominal monthly interest and zero rate and full deposit", () => {
  assert.deepEqual(loanPayment(20000, 20, 12, 48), {
    principal: 16000,
    monthly: 421.34,
  });
  assert.deepEqual(loanPayment(20000, 20, 0, 48), {
    principal: 16000,
    monthly: 333.33,
  });
  assert.deepEqual(loanPayment(20000, 100, 12, 48), {
    principal: 0,
    monthly: 0,
  });
});
test("Loan rejects invalid terms and preserves no stale result", () => {
  for (const args of [
    [20000, 20, 12, 0],
    [20000, 101, 12, 48],
    [20000, 20, Infinity, 48],
    [20000, 20, 12, 1.5],
  ])
    assert.throws(() => loanPayment(...args));
});
test("Money is exact cents and rejects ambiguous separators", () => {
  assert.equal(toCents("123.45"), 12345);
  assert.equal(toCents("0.01"), 1);
  for (const value of ["1,500", "1.005", "NaN", "-1"])
    assert.throws(() => toCents(value));
});
test("No Tour strips hidden result and amount; sold tours keep original classification", () => {
  assert.deepEqual(
    tourPayload({
      occurred_on: "2026-11-20",
      tour_kind: "no_tour",
      channel: "",
      sale_status: "sold",
      amount: "200",
    }),
    {
      occurred_on: "2026-11-20",
      tour_kind: "no_tour",
      channel: null,
      sale_status: null,
      net_volume_cents: 0,
    },
  );
  assert.equal(
    tourPayload({
      occurred_on: "2026-11-20",
      tour_kind: "nq",
      channel: "member",
      sale_status: "sold",
      amount: "2000",
    }).tour_kind,
    "nq",
  );
});
test("Goal is monthly money and optional basis point target", () => {
  assert.deepEqual(
    monthGoal({ month: "2026-11", amount: "6000", target: "50" }),
    { month: "2026-11", budget_volume_cents: 600000, target_close_bps: 5000 },
  );
  assert.equal(
    monthGoal({ month: "2026-11", amount: "6000", target: "" })
      .target_close_bps,
    null,
  );
  assert.throws(() =>
    monthGoal({ month: "2026-11", amount: "0", target: "50" }),
  );
});
test("Routes never give representative owner destinations", () => {
  assert.equal(routeForRole("owner", "team"), "team");
  assert.equal(routeForRole("representative", "team"), "home");
  assert.equal(routeForRole("representative", "coach"), "home");
});
test("Business day is Cancun, not browser UTC", () => {
  assert.equal(localDay(new Date("2026-11-21T02:00:00Z")), "2026-11-20");
});

test("individual permission concurrency uses its own version, not the lesson version", async () => {
  const { accessVersion } = await import("./model.mjs");
  assert.equal(accessVersion([{ user_id: "rep-a", version: 7 }], "rep-a"), 7);
  assert.equal(accessVersion([{ user_id: "rep-a", version: 7 }], "rep-b"), 0);
});

test("a previous No Tour corrected into a Q defaults to no sale", async () => {
  assert.deepEqual(
    tourPayload({
      occurred_on: "2026-11-20",
      tour_kind: "q",
      channel: "agency",
      sale_status: null,
      amount: "",
    }),
    {
      occurred_on: "2026-11-20",
      tour_kind: "q",
      channel: "agency",
      sale_status: "no_sale",
      net_volume_cents: 0,
    },
  );
});

test("publishing preserves reviewed lesson content and requires a new saved draft to republish", async () => {
  const { editorDraft } = await import("./model.mjs");
  const published = {
    id: "published-revision",
    title_en: "Welcome",
    video_url: "https://youtu.be/example",
    pdf_asset_id: "private-pdf",
  };
  assert.deepEqual(
    editorDraft({ draft: null, published_revision: published }),
    { ...published, id: null },
  );
  const draft = { ...published, id: "new-draft" };
  assert.deepEqual(
    editorDraft({ draft, published_revision: published }),
    draft,
  );
});
