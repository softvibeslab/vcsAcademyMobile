// Guía de inicio dentro de la app (FTD guia-de-inicio).
// Hoja de 4 pantallas (casos de uso, insights, metas, primeros pasos), tarjeta en Home y acceso en Perfil.
import React, { useState } from "react";
import { X, Route, Bot, BarChart3, NotebookPen, Check, ArrowRight, ArrowLeft, Compass, Target } from "lucide-react";
import { Button, Card, Field, useAction, ActionStatus } from "./ui";
import { localDate, metricsFor, periodEntries, money, noteKey } from "./model.mjs";
import { guideProgress } from "./guide-model.mjs";

export function readGoal(userId) {
  try {
    return JSON.parse(localStorage.getItem("sa.pilot.goal." + userId) || "{}");
  } catch {
    return {};
  }
}

function diaryCount(userId) {
  try {
    return JSON.parse(localStorage.getItem(noteKey(userId) + ".diary") || "[]").length;
  } catch {
    return 0;
  }
}

export function progressFor(user, data, guide) {
  return guideProgress(user, guide, {
    goal: readGoal(user.id),
    month: localDate().slice(0, 7),
    data,
    diaryCount: diaryCount(user.id),
  });
}

const USE_CASES = [
  [Route, "Prepárate antes del tour", "El Roadmap de 11 pasos trae propósito, guion y checklist de cada momento de la presentación."],
  [Bot, "Practica con el AI Coach", "Pregunta cómo manejar una objeción o haz un roleplay con un comprador difícil antes de tu cita."],
  [BarChart3, "Mide tu día", "Registra tours y ventas en Goal Sheet: la app calcula tu cierre, tu VPG y el avance de tu meta."],
  [NotebookPen, "Aprende de cada tour", "Smart Diary te hace tres preguntas después del tour y el AI Coach te sugiere qué practicar."],
];

function Insights({ data }) {
  const month = metricsFor(periodEntries(data.entries || [], "month"));
  const hasData = (data.entries || []).length > 0;
  const tip = (data.entries || []).find((e) => e.smart_agent_insight)?.smart_agent_insight;
  const rows = [
    ["Cierre", hasData ? month.closingPercent + "%" : "Ventas entre tours calificados", "Qué tanto conviertes tus presentaciones."],
    ["VPG", hasData ? money(month.vpg) : "Volumen entre tours calificados", "Cuánto vale en promedio cada tour."],
    ["Avance de tu meta", hasData ? money(month.volume) + " este mes" : "Volumen del mes entre tu meta", "Cuánto te falta para tu meta mensual."],
  ];
  return (
    <>
      <p className="pilot-guide-lead">{hasData ? "Así vas este mes, con tus registros reales:" : "Cuando registres tu día, Home te mostrará:"}</p>
      <div className="pilot-guide-insights">
        {rows.map(([label, value, help]) => (
          <div key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
            <p>{help}</p>
          </div>
        ))}
      </div>
      <div className="pilot-guide-tip">
        <Bot size={18} aria-hidden="true" />
        <p>{tip || "Recomendaciones del AI Coach: después de cada Goal Sheet te dice qué practicar para tu siguiente tour."}</p>
      </div>
    </>
  );
}

function Goals({ user, guide, setGuide, onSaved }) {
  const month = localDate().slice(0, 7);
  const current = readGoal(user.id);
  const [amount, setAmount] = useState(current.month === month ? current.amount || "" : "");
  const [weekly, setWeekly] = useState(guide.weeklyPractice || 3);
  const action = useAction();
  return (
    <form
      className="pilot-guide-goals"
      onSubmit={(e) => {
        e.preventDefault();
        action.run(async () => {
          if (!(Number(amount) > 0)) throw Error("Escribe una meta mayor a cero.");
          if (!(Number(weekly) >= 1 && Number(weekly) <= 21)) throw Error("Elige entre 1 y 21 prácticas por semana.");
          localStorage.setItem("sa.pilot.goal." + user.id, JSON.stringify({ month, amount: String(amount) }));
          setGuide({ ...guide, weeklyPractice: Number(weekly) });
          onSaved();
        }, "Metas guardadas.");
      }}
    >
      <Field label="Meta de volumen de este mes (USD)" type="number" min={1} step="any" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Field label="Prácticas con el AI Coach por semana" type="number" min={1} max={21} required value={weekly} onChange={(e) => setWeekly(e.target.value)} />
      <p className="fine-print">Puedes cambiarlas cuando quieras en Perfil. Se guardan en este dispositivo.</p>
      <ActionStatus action={action} />
      <Button disabled={action.busy}><Target size={16} /> Guardar mis metas</Button>
    </form>
  );
}

function StepList({ progress, onGo }) {
  return (
    <ol className="pilot-guide-steps">
      {progress.steps.map((s) => (
        <li key={s.id} className={s.done ? "done" : progress.next?.id === s.id ? "next" : ""}>
          <span className="pilot-guide-check" aria-hidden="true">{s.done ? <Check size={14} /> : null}</span>
          <div>
            <strong>{s.title}</strong>
            <small>{s.detail}</small>
          </div>
          {s.done ? <span className="pilot-guide-done">Hecho</span> : <a className="pilot-guide-go" href={s.to} onClick={onGo}>{s.cta}</a>}
        </li>
      ))}
    </ol>
  );
}

const PAGES = ["Casos de uso", "Insights", "Tus metas", "Primeros pasos"];

/** Hoja de la guía. Se cierra con «Omitir guía», la X o al empezar los primeros pasos. */
export function GuideSheet({ user, data, guide, setGuide, onClose }) {
  const [page, setPage] = useState(0);
  const progress = progressFor(user, data, guide);
  const name = (user.display_name || "").split(" ")[0];
  const close = () => onClose();
  return (
    <div className="pilot-sheet-backdrop" role="presentation" onClick={close}>
      <section className="pilot-sheet pilot-guide" role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={(e) => e.stopPropagation()}>
        <button className="pilot-sheet-close" aria-label="Cerrar guía" onClick={close}><X size={20} /></button>
        <div className="pilot-guide-dots" aria-label={"Pantalla " + (page + 1) + " de " + PAGES.length}>
          {PAGES.map((label, i) => <span key={label} className={i === page ? "on" : i < page ? "past" : ""} />)}
        </div>
        <span className="pilot-tag">GUÍA DE INICIO · {PAGES[page].toUpperCase()}</span>
        {page === 0 && (
          <>
            <h2 id="guide-title">{name ? `Hola, ${name}. ` : ""}Así te ayuda Sales Academy</h2>
            <div className="pilot-guide-cases">
              {USE_CASES.map(([Icon, title, text]) => (
                <div key={title}><span className="tile-icon"><Icon size={18} /></span><div><strong>{title}</strong><p>{text}</p></div></div>
              ))}
            </div>
          </>
        )}
        {page === 1 && (<><h2 id="guide-title">Lo que vas a ver en Home</h2><Insights data={data} /></>)}
        {page === 2 && (
          <>
            <h2 id="guide-title">Define tus metas</h2>
            <Goals user={user} guide={guide} setGuide={setGuide} onSaved={() => setPage(3)} />
          </>
        )}
        {page === 3 && (
          <>
            <h2 id="guide-title">Tus primeros pasos</h2>
            <p className="pilot-guide-lead">Prueba cada caso de uso. Se marcan solos cuando los haces · {progress.done} de {progress.total}.</p>
            <StepList progress={progress} onGo={close} />
          </>
        )}
        <div className="pilot-guide-nav">
          {page > 0 ? <button type="button" className="button secondary" onClick={() => setPage(page - 1)}><ArrowLeft size={16} /> Atrás</button> : <span />}
          {page < 3 ? (
            <button type="button" className="button" onClick={() => setPage(page + 1)}>{page === 2 ? "Omitir metas" : "Siguiente"} <ArrowRight size={16} /></button>
          ) : (
            <button type="button" className="button" onClick={() => { setGuide({ ...guide, hidden: false }); close(); }}>Empezar</button>
          )}
        </div>
        {page < 3 && (
          <button type="button" className="text-button pilot-guide-skip" onClick={() => { setGuide({ ...guide, seen: true }); close(); }}>
            Omitir guía
          </button>
        )}
      </section>
    </div>
  );
}

/** Tarjeta compacta en Home con el avance y el siguiente paso. */
export function GuideCard({ user, data, guide, setGuide, onOpen }) {
  if (!guide || guide.hidden) return null;
  const progress = progressFor(user, data, guide);
  return (
    <Card className="pilot-guide-card">
      <div className="pilot-guide-card-head">
        <span className="tile-icon"><Compass size={18} /></span>
        <div>
          <strong>{progress.complete ? "¡Completaste tus primeros pasos!" : "Tus primeros pasos"}</strong>
          <small>{progress.done} de {progress.total} · {progress.complete ? "Ya probaste los casos de uso principales." : "Siguiente: " + progress.next.title}</small>
        </div>
        <button className="text-button" onClick={() => setGuide({ ...guide, hidden: true })}>Ocultar</button>
      </div>
      <div className="progress" role="progressbar" aria-label="Avance de la guía" aria-valuenow={progress.done} aria-valuemin={0} aria-valuemax={progress.total}>
        <span style={{ width: (progress.done / progress.total) * 100 + "%" }} />
      </div>
      <div className="pilot-guide-card-actions">
        {!progress.complete && <a className="button" href={progress.next.to}>{progress.next.cta} <ArrowRight size={16} /></a>}
        <button className="button secondary" onClick={onOpen}>Ver la guía</button>
      </div>
    </Card>
  );
}

/** Acceso permanente en Perfil. */
export function GuideProfileCard({ user, data, guide, setGuide, onOpen }) {
  if (!guide) return null;
  const progress = progressFor(user, data, guide);
  return (
    <Card className="pilot-guide-profile">
      <span className="pilot-tag">GUÍA DE INICIO</span>
      <h2>Casos de uso, metas y primeros pasos</h2>
      <p>{progress.done} de {progress.total} pasos hechos.</p>
      <div className="pilot-guide-card-actions">
        <button className="button" onClick={onOpen}><Compass size={16} /> Ver la guía</button>
        {guide.hidden && <button className="button secondary" onClick={() => setGuide({ ...guide, hidden: false })}>Mostrar en Home</button>}
      </div>
    </Card>
  );
}
