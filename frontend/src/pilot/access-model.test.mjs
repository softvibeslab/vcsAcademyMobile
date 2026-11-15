// HU-AISALES-ACCESO-01: lógica pura de candados en el frontend.
import test from "node:test";
import assert from "node:assert/strict";
import { stepAction, planSummary, tierLabel, planError, LEVEL_LABEL } from "./access-model.mjs";

test("stepAction: plan antes que progreso; abierto si se puede", () => {
  assert.deepEqual(stepAction({ allowed: true, lock: null, status: "current" }), { kind: "open", label: "Comenzar" });
  assert.deepEqual(stepAction({ allowed: true, lock: null, status: "completed" }), { kind: "open", label: "Repasar" });
  assert.deepEqual(stepAction({ allowed: false, lock: "plan", level: "premium" }), { kind: "plan", label: "Desbloquear premium", level: "premium" });
  assert.deepEqual(stepAction({ allowed: false, lock: "plan", level: "gratis" }), { kind: "plan", label: "Crear cuenta gratis", level: "gratis" });
  assert.deepEqual(stepAction({ allowed: true, lock: "progress", status: "locked" }), { kind: "progress", label: "Completa el paso anterior" });
  assert.deepEqual(stepAction({ id: "x" }), { kind: "open", label: "Comenzar" }); // datos viejos sin nivel
});

test("planSummary cuenta módulos abiertos del catálogo", () => {
  assert.equal(planSummary(null), null);
  assert.deepEqual(planSummary({ items: [{ allowed: true }, { allowed: false }, { allowed: true }] }), { open: 2, total: 3 });
});

test("etiquetas en español y error de plan reconocible", () => {
  assert.deepEqual(LEVEL_LABEL, { publico: "Público", gratis: "Gratis", premium: "Premium" });
  assert.equal(tierLabel("premium"), "Premium");
  assert.equal(tierLabel("staff"), "Acceso completo");
  const e = Object.assign(Error("Esto es Premium."), { code: "requires_plan", requires: "premium" });
  assert.equal(planError(e), "premium");
  assert.equal(planError(Error("otro")), null);
});

// Revisión de código (PR #1)
test("itemAccess: abierto, bloqueado por plan u oculto según el catálogo", async () => {
  const { itemAccess } = await import("./access-model.mjs");
  const catalog = { items: [
    { id: "function:calculators", level: "premium", allowed: false },
    { id: "function:notebook", level: "gratis", allowed: true },
  ] };
  assert.deepEqual(itemAccess(catalog, "function:calculators"), { kind: "plan", level: "premium" });
  assert.deepEqual(itemAccess(catalog, "function:notebook"), { kind: "open" });
  assert.deepEqual(itemAccess(catalog, "function:goalsheet"), { kind: "hidden" });
  assert.deepEqual(itemAccess(null, "function:calculators"), { kind: "open" }); // sin catálogo no se bloquea la UI
});

test("premiumLockedCount cuenta solo pasos Premium bloqueados", async () => {
  const { premiumLockedCount } = await import("./access-model.mjs");
  const steps = [
    { allowed: true, level: "publico" },
    { allowed: false, lock: "plan", level: "gratis" },
    { allowed: false, lock: "plan", level: "premium" },
    { allowed: false, lock: "plan", level: "premium" },
  ];
  assert.equal(premiumLockedCount(steps), 2);
});
