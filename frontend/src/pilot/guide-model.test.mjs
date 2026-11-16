// FTD guia-de-inicio: lógica pura de la guía dentro de la app.
import test from "node:test";
import assert from "node:assert/strict";
import { guideKey, emptyGuide, shouldAutoOpen, guideSteps, guideProgress, markGuide, routeEvent } from "./guide-model.mjs";

const rep = { id: "u1", roles: ["sales_rep"] };
const manager = { id: "m1", roles: ["manager"] };
const admin = { id: "a1", roles: ["admin"] };

test("se abre sola solo la primera vez y solo en Home", () => {
  assert.equal(guideKey("u1"), "sa.pilot.guide.u1");
  assert.equal(shouldAutoOpen(emptyGuide(), "home"), true);
  assert.equal(shouldAutoOpen(emptyGuide(), "roadmap"), false);
  assert.equal(shouldAutoOpen({ ...emptyGuide(), seen: true }, "home"), false);
});

test("pasos por rol: rep 5, gerente suma equipo, admin suma acceso", () => {
  assert.deepEqual(guideSteps(rep).map((s) => s.id), ["goal", "lesson", "coach", "goalsheet", "diary"]);
  assert.deepEqual(guideSteps(manager).map((s) => s.id), ["goal", "lesson", "coach", "goalsheet", "diary", "team"]);
  assert.equal(guideSteps(admin).at(-1).id, "access");
  for (const s of guideSteps(admin)) assert.match(s.to, /^#/);
});

test("el avance se detecta con datos reales de la app", () => {
  const month = "2026-11";
  const empty = guideProgress(rep, emptyGuide(), { goal: {}, month, data: { entries: [], submissions: [] }, diaryCount: 0 });
  assert.deepEqual([empty.done, empty.total, empty.next.id], [0, 5, "goal"]);
  const ctx = { goal: { month, amount: "20000" }, month, data: { entries: [{ id: "g1" }], submissions: [] }, diaryCount: 1 };
  const p = guideProgress(rep, markGuide(emptyGuide(), "lesson"), ctx);
  assert.deepEqual(p.steps.filter((s) => s.done).map((s) => s.id), ["goal", "lesson", "goalsheet", "diary"]);
  assert.equal(p.next.id, "coach");
  const staleGoal = guideProgress(rep, emptyGuide(), { ...ctx, goal: { month: "2026-10", amount: "5" } });
  assert.equal(staleGoal.steps[0].done, false, "una meta de otro mes no cuenta");
  const viaSubmission = guideProgress(rep, emptyGuide(), { ...ctx, data: { entries: [], submissions: [{ id: "s" }] } });
  assert.equal(viaSubmission.steps.find((s) => s.id === "coach").done, true);
  const all = guideProgress(rep, markGuide(markGuide(emptyGuide(), "lesson"), "coach"), ctx);
  assert.deepEqual([all.done, all.complete, all.next], [5, true, null]);
});

test("las visitas a pantallas guiadas se convierten en eventos", () => {
  assert.equal(routeEvent("lesson/step_1"), "lesson");
  assert.equal(routeEvent("team"), "team");
  assert.equal(routeEvent("admin"), "access");
  assert.equal(routeEvent("home"), null);
  const g = markGuide(emptyGuide(), "lesson");
  assert.equal(markGuide(g, "lesson"), g, "marcar dos veces no cambia el estado");
});
