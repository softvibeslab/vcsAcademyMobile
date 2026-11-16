import {
  evaluateDiagnostic,
  questions,
  recommendations,
} from "./diagnostic.mjs";
import { track } from "./site.mjs";
const form = document.getElementById("diagnostic-form"),
  container = document.getElementById("question-container"),
  resultEl = document.getElementById("diagnostic-result"),
  back = document.getElementById("question-back"),
  next = document.getElementById("question-next"),
  error = document.getElementById("diagnostic-error");
const dimensions = {
  coordination: "Coordinación",
  practice: "Práctica",
  evidence: "Evidencia",
};
const options = [
  [0, "No existe"],
  [1, "Existe de forma parcial"],
  [2, "Está definido y se aplica"],
  ["unknown", "No lo sé"],
];
let index = 0,
  answers = Array(6).fill(null),
  started = false;
function el(tag, text, attrs = {}) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
  return e;
}
function render() {
  container.replaceChildren();
  const field = el("fieldset");
  field.append(
    el("span", dimensions[questions[index][0]], {
      class: "question-dimension",
    }),
    el("legend", questions[index][1]),
  );
  options.forEach(([value, label]) => {
    const l = el("label", undefined, { class: "question-choice" }),
      radio = el("input", undefined, {
        type: "radio",
        name: "answer",
        value: String(value),
      });
    radio.checked = answers[index] === value;
    radio.addEventListener("change", () => {
      answers[index] = value;
      error.textContent = "";
      if (!started) {
        track("diagnostic_started");
        started = true;
      }
    });
    l.append(radio, el("span", label));
    field.append(l);
  });
  container.append(field);
  document.getElementById("question-counter").textContent =
    `Pregunta ${index + 1} de 6`;
  document.getElementById("question-progress").value = index + 1;
  back.disabled = index === 0;
  next.textContent = index === 5 ? "Ver mi orientación ↗" : "Siguiente →";
}
back.addEventListener("click", () => {
  if (index > 0) {
    index--;
    error.textContent = "";
    render();
    container.querySelector("input")?.focus();
  }
});
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (answers[index] === null) {
    error.textContent =
      "Elige una respuesta para continuar. También puedes elegir «No lo sé».";
    container.querySelector("input")?.focus();
    return;
  }
  if (index < 5) {
    index++;
    render();
    container.querySelector("input")?.focus();
  } else showResult();
});
function showResult() {
  const r = evaluateDiagnostic(answers);
  form.hidden = true;
  resultEl.hidden = false;
  resultEl.replaceChildren();
  const titles = {
    essential: "Acordar lo esencial.",
    routine: "Hacer consistente la rutina.",
    pilot: "Preparar un piloto medible.",
  };
  resultEl.append(
    el("span", "TU ORIENTACIÓN", { class: "result-label" }),
    el("h2", titles[r.band], { id: "result-title" }),
    el(
      "p",
      r.baseline
        ? "Tienes definidos los elementos de esta autoevaluación. El siguiente paso es documentar una línea base y revisar las condiciones de un piloto."
        : "Elige una acción pequeña y observable en la dimensión con menos evidencia.",
    ),
  );
  const scores = el("div", undefined, { class: "score-list" });
  Object.entries(r.scores).forEach(([k, v]) => {
    const line = el("div", undefined, { class: "score-row" });
    line.append(el("span", dimensions[k]), el("strong", `${v} / 4`));
    scores.append(line);
  });
  resultEl.append(scores);
  const box = el("div", undefined, { class: "result-priorities" });
  box.append(
    el(
      "h3",
      r.priorities.length > 1
        ? "Prioridades compartidas"
        : `Empieza por ${dimensions[r.priorities[0]].toLowerCase()}`,
    ),
    el(
      "p",
      r.priorities.length > 1
        ? `Hay un empate en ${r.priorities.map((k) => dimensions[k].toLowerCase()).join(", ")}. Tú eliges por cuál comenzar.`
        : "Esta dimensión obtuvo la menor puntuación de tus respuestas. No es una calificación de tu equipo.",
    ),
  );
  if (r.unknown)
    box.append(
      el(
        "p",
        `${r.unknown} respuesta${r.unknown === 1 ? "" : "s"} «No lo sé»: queda${r.unknown === 1 ? "" : "n"} por confirmar; no significa que el proceso no exista.`,
      ),
    );
  resultEl.append(box);
  const links = el("div", undefined, { class: "result-links" });
  r.priorities.forEach((k) => {
    const { slug, id, label } = recommendations[k],
      a = el("a", label + " ↗", { href: `/mediahub/${slug}/` });
    a.addEventListener("click", () =>
      track("recommendation_opened", "result", id),
    );
    links.append(a);
  });
  resultEl.append(links);
  const details = el("details", undefined, { class: "result-answers" });
  details.append(el("summary", "Ver respuestas y cómo se calculó"));
  const ol = el("ol");
  answers.forEach((v, i) =>
    ol.append(
      el("li", questions[i][1] + " — " + options.find((o) => o[0] === v)[1]),
    ),
  );
  details.append(
    ol,
    el(
      "p",
      `Total ${r.total}/12. Cada respuesta suma 0, 1 o 2. «No lo sé» suma 0 y se señala por confirmar. 0–4: acordar lo esencial; 5–8: rutina consistente; 9–12: preparar piloto. La menor suma orienta la prioridad y los empates se muestran completos.`,
      { class: "caption" },
    ),
  );
  resultEl.append(details);
  const bottom = el("div", undefined, { class: "result-bottom" }),
    reset = el("button", "Volver a responder", {
      type: "button",
      class: "button button-outline button-small",
    });
  reset.addEventListener("click", () => {
    answers = Array(6).fill(null);
    index = 0;
    started = false;
    form.hidden = false;
    resultEl.hidden = true;
    render();
    container.querySelector("input")?.focus();
  });
  bottom.append(
    reset,
    el("a", "Solicitar demo por WhatsApp ↗", {
      href: resultEl.dataset.demoUrl || "/descubre/#demo",
      class: "button button-small",
      target: "_blank",
      rel: "noopener noreferrer",
      "data-whatsapp-demo": "",
    }),
  );
  resultEl.append(
    bottom,
    el(
      "p",
      "Orientación de proceso; no certifica seguridad, preparación técnica ni resultados de venta.",
      { class: "caption" },
    ),
  );
  resultEl.focus();
  track("diagnostic_completed", "result");
}
render();
