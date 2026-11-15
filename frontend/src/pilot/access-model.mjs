// Lógica pura de niveles de acceso para la UI (HU-AISALES-ACCESO-01). El servidor decide; esto solo pinta.
export const LEVEL_LABEL = { publico: "Público", gratis: "Gratis", premium: "Premium" };
const TIER_LABEL = { visitante: "Visitante", gratis: "Gratis", premium: "Premium", staff: "Acceso completo" };

export function tierLabel(tier) {
  return TIER_LABEL[tier] || "Gratis";
}

/** Qué hace un paso del roadmap al tocarlo: abrir, pedir plan o pedir completar el anterior. */
export function stepAction(step) {
  if (step.allowed === false || step.lock === "plan")
    return { kind: "plan", label: step.level === "gratis" ? "Crear cuenta gratis" : "Desbloquear premium", level: step.level || "premium" };
  if (step.lock === "progress") return { kind: "progress", label: "Completa el paso anterior" };
  return { kind: "open", label: step.status === "completed" ? "Repasar" : "Comenzar" };
}

export function planSummary(catalog) {
  if (!catalog?.items) return null;
  return { open: catalog.items.filter((i) => i.allowed).length, total: catalog.items.length };
}

/** Nivel requerido si el error es de plan (403 requires_plan); si no, null. */
export function planError(error) {
  return error?.code === "requires_plan" ? error.requires || "premium" : null;
}

/** Acceso a una función o recurso según el catálogo: abierto, bloqueado por plan u oculto por el admin. */
export function itemAccess(catalog, id) {
  if (!catalog?.items) return { kind: "open" };
  const item = catalog.items.find((i) => i.id === id);
  if (!item) return { kind: "hidden" };
  return item.allowed ? { kind: "open" } : { kind: "plan", level: item.level };
}

/** Pasos bloqueados que solo abre Premium (los «gratis» piden cuenta, no Premium). */
export function premiumLockedCount(steps) {
  return steps.filter((s) => stepAction(s).kind === "plan" && s.level === "premium").length;
}
