export const questions = [
  [
    "coordination",
    "¿Cada tour tiene un responsable y un horario que el representante puede consultar?",
  ],
  [
    "coordination",
    "¿Los cambios de asignación llegan al representante mediante un proceso acordado?",
  ],
  [
    "practice",
    "¿El equipo identifica la versión aprobada del método y dónde consultarla?",
  ],
  [
    "practice",
    "¿La práctica termina con una observación concreta y una siguiente acción?",
  ],
  [
    "evidence",
    "¿Están definidos los estados y resultados que se registran después del tour?",
  ],
  [
    "evidence",
    "¿Las salas usan las mismas definiciones para revisar su operación?",
  ],
];
export function evaluateDiagnostic(answers) {
  if (
    !Array.isArray(answers) ||
    answers.length !== 6 ||
    answers.some((v) => ![0, 1, 2, "unknown"].includes(v))
  )
    throw new Error("Responde las seis preguntas antes de ver tu orientación.");
  const scores = { coordination: 0, practice: 0, evidence: 0 };
  answers.forEach((v, i) => {
    scores[questions[i][0]] += v === "unknown" ? 0 : v;
  });
  const total = Object.values(scores).reduce((a, b) => a + b, 0),
    min = Math.min(...Object.values(scores));
  return {
    scores,
    total,
    priorities: Object.keys(scores).filter((k) => scores[k] === min),
    unknown: answers.filter((v) => v === "unknown").length,
    band: total <= 4 ? "essential" : total <= 8 ? "routine" : "pilot",
    baseline: total === 12,
  };
}

export const recommendations = {
  coordination: {
    id: "before-tour",
    slug: "antes-del-tour",
    label: "Abrir la hoja de preparación",
  },
  practice: {
    id: "coaching",
    slug: "coaching-con-una-accion",
    label: "Leer la guía de coaching",
  },
  evidence: {
    id: "three-rooms",
    slug: "piloto-en-tres-salas",
    label: "Abrir la matriz de tres salas",
  },
};
