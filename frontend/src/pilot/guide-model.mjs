// Guía de inicio dentro de la app (FTD guia-de-inicio): lógica pura.
// Se guarda por cuenta en este dispositivo, igual que la meta mensual y las notas.

export const guideKey = (userId) => "sa.pilot.guide." + userId;

/** seen: ya se abrió sola una vez · hidden: tarjeta de Home oculta · events: pasos hechos por visita o acción. */
export const emptyGuide = () => ({ seen: false, hidden: false, weeklyPractice: 3, events: {} });

export function shouldAutoOpen(guide, page) {
  return page === "home" && !guide?.seen;
}

const REP_STEPS = [
  { id: "goal", title: "Define tu meta del mes", detail: "Fija el volumen que quieres lograr este mes.", to: "#profile", cta: "Definir meta" },
  { id: "lesson", title: "Abre tu primera lección", detail: "Paso 1 del Roadmap: propósito, guion y checklist.", to: "#lesson/step_1", cta: "Abrir lección" },
  { id: "coach", title: "Practica con el AI Coach", detail: "Pregúntale cómo manejar una objeción o haz un roleplay.", to: "#coach", cta: "Practicar" },
  { id: "goalsheet", title: "Registra tu día en Goal Sheet", detail: "Tours, ventas y volumen: así se calculan tu cierre y tu VPG.", to: "#goalsheet", cta: "Registrar" },
  { id: "diary", title: "Escribe tu feedback post-tour", detail: "Smart Diary: tres preguntas para aprender de cada tour.", to: "#diary", cta: "Escribir" },
];
const STAFF = ["manager", "trainer", "coach", "to_manager", "admin"];

export function guideSteps(user) {
  const steps = [...REP_STEPS];
  const roles = user?.roles || [];
  if (roles.some((r) => STAFF.includes(r)))
    steps.push({ id: "team", title: "Revisa a tu equipo", detail: "Avance, prácticas por evaluar y certificaciones.", to: "#team", cta: "Ver equipo" });
  if (roles.includes("admin"))
    steps.push({ id: "access", title: "Configura acceso y planes", detail: "Qué es Público, Gratis o Premium y los códigos de licencia.", to: "#admin", cta: "Configurar" });
  return steps;
}

/** ctx: { goal: {month, amount}, month: "YYYY-MM", data: { entries, submissions }, diaryCount } */
export function guideProgress(user, guide, ctx) {
  const events = guide?.events || {};
  const detected = {
    goal: ctx.goal?.month === ctx.month && Number(ctx.goal?.amount) > 0,
    lesson: Boolean(events.lesson),
    coach: Boolean(events.coach) || (ctx.data?.submissions || []).length > 0,
    goalsheet: (ctx.data?.entries || []).length > 0,
    diary: (ctx.diaryCount || 0) > 0,
    team: Boolean(events.team),
    access: Boolean(events.access),
  };
  const steps = guideSteps(user).map((s) => ({ ...s, done: Boolean(detected[s.id]) }));
  const done = steps.filter((s) => s.done).length;
  return { steps, done, total: steps.length, complete: done === steps.length, next: steps.find((s) => !s.done) || null };
}

/** Devuelve el mismo objeto si nada cambia (evita escrituras y renders de más). */
export function markGuide(guide, event) {
  if (!event || guide.events?.[event]) return guide;
  return { ...guide, events: { ...guide.events, [event]: true } };
}

export function routeEvent(route) {
  const page = String(route || "").split("/")[0];
  return { lesson: "lesson", team: "team", admin: "access" }[page] || null;
}
