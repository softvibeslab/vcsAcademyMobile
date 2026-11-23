import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { X, LoaderCircle, CalendarDays, ArrowRight } from "lucide-react";
import { Button, Card, ErrorBox, Field, Header, useRemote } from "./ui";
import { buildVisitPayload, cancunParts, initialVisitFields, isVisitId, recommendationLinks, shiftDate, TOUR_INTENTS, TOUR_STATUS, visitInstant, visitLabel, visitTime } from "./tour-model.mjs";
import "./tour-visits.css";

export function useTourVisits(api, from, to, revision = 0, enabled = true) {
  const [state, setState] = useState({ visits: [], busy: enabled, error: "" });
  const [tick, setTick] = useState(0);
  const retry = useCallback(() => setTick(n => n + 1), []);
  useEffect(() => {
    let live = true; const controller = new AbortController();
    if (!enabled) { setState({ visits: [], busy: false, error: "" }); return; }
    setState(previous => ({ ...previous, busy: true, error: "" }));
    (async () => {
      const visits = []; let cursor = null; const seen = new Set();
      do {
        const query = new URLSearchParams({ from, to, limit: "100", ...(cursor ? { cursor } : {}) });
        const data = await api(`/api/tour-visits?${query}`, { signal: controller.signal });
        visits.push(...(data.visits || []));
        cursor = data.next_cursor || null;
        if (cursor && seen.has(cursor)) throw Error("No se pudo completar la lista de visitas. Reintenta.");
        if (cursor) seen.add(cursor);
      } while (cursor);
      if (live) setState({ visits, busy: false, error: "" });
    })().catch(error => { if (live) setState({ visits: [], busy: false, error: error.message }); });
    return () => { live = false; controller.abort(); };
  }, [api, from, to, revision, enabled, tick]);
  return { ...state, retry };
}

export function useTourVisit(api, id, revision = 0) {
  const [state, setState] = useState({ id: null, visit: null, busy: false, error: "", code: null });
  const [tick, setTick] = useState(0);
  const retry = useCallback(() => setTick(n => n + 1), []);
  useEffect(() => {
    let live = true; const controller = new AbortController();
    if (!id) { setState({ id: null, visit: null, busy: false, error: "", code: null }); return; }
    if (!isVisitId(id)) { setState({ id, visit: null, busy: false, error: "Esta visita no está disponible.", code: "visit_not_found" }); return; }
    setState(previous => ({ id, visit: previous.id === id ? previous.visit : null, busy: true, error: "", code: null }));
    api(`/api/tour-visits/${id}`, { signal: controller.signal }).then(data => {
      if (live) setState({ id, visit: data.visit, busy: false, error: "", code: null });
    }).catch(error => { if (live) setState({ id, visit: null, busy: false, error: error.message, code: error.code || (error.status === 404 ? "visit_not_found" : null) }); });
    return () => { live = false; controller.abort(); };
  }, [api, id, revision, tick]);
  return { ...(state.id === (id || null) ? state : { id, visit: null, busy: !!id, error: "", code: null }), retry,
    replace: visit => setState({ id, visit, busy: false, error: "", code: null }) };
}

async function analysisRequest(api, visit, requestId) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 45000);
  try { return await api(`/api/tour-visits/${visit.id}/analysis`, { method: "POST", signal: controller.signal, body: JSON.stringify({ expected_revision: visit.revision, request_id: requestId }) }); }
  finally { clearTimeout(timer); }
}

export function TourRegistrationPrompt({ onChoose, onDismiss }) {
  return <div className="tour-registration-prompt" aria-label="Opciones para registrar el tour">
    <strong>¿Qué quieres registrar de este tour?</strong>
    <div>{TOUR_INTENTS.map(([intent, label]) => <button type="button" key={intent} onClick={() => onChoose(intent)}>{label}</button>)}</div>
    <button type="button" className="tour-text-button" onClick={onDismiss}>Seguir conversando</button>
  </div>;
}

export function TourVisitDialog({ api, intent, visit = null, initialContext = "", onClose, onSaved, onChanged }) {
  const today = cancunParts().date;
  const [fields, setFields] = useState(() => initialVisitFields(intent, initialContext, visit));
  const [selectedId, setSelectedId] = useState(visit?.id || "");
  const selected = useTourVisit(api, intent === "reflect" && selectedId !== visit?.id ? selectedId : null);
  const chosen = selectedId === visit?.id ? visit : selected.visit;
  const choices = useTourVisits(api, shiftDate(today, -30), shiftDate(today, 60), 0, intent === "reflect" && !visit);
  const [busy, setBusy] = useState(false), [phase, setPhase] = useState(""), [error, setError] = useState(""), [saved, setSaved] = useState(null);
  const dialog = useRef(null), trigger = useRef(null), inFlight = useRef(false), requestId = useRef(crypto.randomUUID()), mounted = useRef(true), finished = useRef(false);
  const titleId = useId();
  const feedbackVisible = intent === "reflect" || (intent === "edit" && visit?.status === "completed");
  const immutableTime = intent === "start" || (intent === "edit" && visit?.status !== "scheduled");
  const readExisting = intent === "reflect" && !!selectedId;
  const formTitle = intent === "edit" ? "Editar visita" : "Registrar visita";
  const set = (name, value) => setFields(previous => ({ ...previous, [name]: value }));
  useEffect(() => {
    mounted.current = true; trigger.current = document.activeElement; dialog.current?.showModal();
    dialog.current?.querySelector("input:not([readonly]), select, textarea, button")?.focus();
    return () => { mounted.current = false; dialog.current?.close(); if (trigger.current?.isConnected) trigger.current.focus(); };
  }, []);
  function finish(value) { if (!finished.current) { finished.current = true; onSaved(value); } }
  function close() { if (saved) finish(saved); else if (!busy) onClose(); }
  async function submit(event) {
    event.preventDefault(); if (inFlight.current || saved) return;
    setError("");
    let payload;
    try {
      if (selectedId && !chosen) throw Error("Espera a que se cargue la visita seleccionada.");
      payload = buildVisitPayload(fields, intent, intent === "reflect" ? chosen : visit);
    } catch (error) { setError(error.message); return; }
    inFlight.current = true; setBusy(true); setPhase("Guardando…");
    const target = intent === "reflect" ? chosen : intent === "edit" ? visit : null;
    try {
      const result = await api(target ? `/api/tour-visits/${target.id}` : "/api/tour-visits", {
        method: target ? "PATCH" : "POST",
        body: JSON.stringify({ ...payload, request_id: requestId.current, ...(target ? { expected_revision: target.revision } : {}) }),
      });
      const value = result.visit;
      if (mounted.current) { setSaved(value); setPhase(intent === "reflect" ? "Registro guardado. Generando análisis…" : "Registro guardado."); }
      onChanged?.();
      if (intent === "reflect") {
        try { await analysisRequest(api, value, crypto.randomUUID()); }
        catch { /* The visit is already saved; its detail exposes the recoverable analysis state. */ }
        onChanged?.();
      }
      finish(value);
    } catch (error) {
      if (mounted.current) setError(error.status === 409 ? `${error.message} Cierra y vuelve a abrir la visita para revisar su versión actual.` : error.message);
    } finally { inFlight.current = false; if (mounted.current) { setBusy(false); setPhase(""); } }
  }
  const count = (readExisting ? chosen?.context || "" : fields.context).length + (feedbackVisible ? fields.happened.length + fields.worked.length + fields.improve_next.length : 0);
  return <dialog className="tour-dialog" ref={dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close(); }}>
    <header><div><h2 id={titleId}>{formTitle}</h2><p>{intent === "edit" ? "Revisa los datos guardados." : TOUR_INTENTS.find(([value]) => value === intent)?.[1]}</p></div><button type="button" aria-label="Cerrar registro de visita" disabled={busy && !saved} onClick={close}><X size={20} /></button></header>
    <form onSubmit={submit}>
      <div className="tour-form-scroll">
        {intent === "reflect" && !visit && <Field label="Visita"><select value={selectedId} disabled={busy} onChange={event => { setSelectedId(event.target.value); setError(""); }}><option value="">Otra visita</option>{choices.visits.filter(item => ["scheduled", "in_progress"].includes(item.status)).map(item => <option key={item.id} value={item.id}>{visitLabel(item)} · {TOUR_STATUS[item.status]}</option>)}</select></Field>}
        {choices.error && <ErrorBox error={choices.error} retry={choices.retry} />}
        {selected.error && <ErrorBox error={selected.error} retry={selected.retry} />}
        {readExisting ? <div className="tour-existing-context"><strong>{chosen ? visitLabel(chosen) : "Cargando visita…"}</strong><p>{chosen?.context || "Sin contexto previo."}</p></div> : <Field label="Referencia · opcional"><input value={fields.title} maxLength={120} disabled={busy} onChange={event => set("title", event.target.value)} placeholder="Visita de la mañana" /></Field>}
        <div className="tour-date-fields"><Field label={feedbackVisible && intent !== "edit" ? "Fecha de la visita" : "Fecha"}><input type="date" required value={fields.date} readOnly={immutableTime} disabled={busy} onChange={event => set("date", event.target.value)} /></Field><Field label={feedbackVisible && intent !== "edit" ? "Hora de la visita" : "Hora"}><input type="time" required value={fields.time} readOnly={immutableTime} disabled={busy} onChange={event => setFields(previous => ({ ...previous, time: event.target.value, timeEdited: true }))} /></Field></div>
        <p className="tour-help">Hora de Cancún{intent === "start" ? " · el inicio se fija al confirmar." : "."}</p>
        {!readExisting && <Field label="Contexto de la visita"><textarea rows={3} maxLength={6000} value={fields.context} disabled={busy} onChange={event => set("context", event.target.value)} /></Field>}
        {feedbackVisible && <>
          <Field label="¿Qué pasó?"><textarea rows={3} required maxLength={4000} value={fields.happened} disabled={busy} onChange={event => set("happened", event.target.value)} /></Field>
          <Field label="¿Qué funcionó?"><textarea rows={2} maxLength={2000} value={fields.worked} disabled={busy} onChange={event => set("worked", event.target.value)} /></Field>
          <Field label="¿Qué mejorarías o harías después?"><textarea rows={2} maxLength={2000} value={fields.improve_next} disabled={busy} onChange={event => set("improve_next", event.target.value)} /></Field>
        </>}
        <p className="tour-help">{count.toLocaleString("es-MX")}/10 000 caracteres. Revisa el contexto antes de guardarlo.</p>
        {intent === "reflect" && <p className="tour-help">Al guardar, este contexto y feedback se envían al Coach para generar tu análisis.</p>}
        <ErrorBox error={error} />
        {phase && <p className="tour-status" role="status"><LoaderCircle size={16} className={busy ? "spin" : ""} />{phase}</p>}
      </div>
      <footer><button type="button" className="tour-secondary" disabled={busy && !saved} onClick={close}>{saved ? "Ver registro guardado" : "Cancelar"}</button>{!saved && <button type="submit" disabled={busy || (readExisting && (!chosen || selected.busy))}>{busy ? "Guardando…" : intent === "start" ? "Guardar e iniciar" : intent === "schedule" ? "Guardar tour" : intent === "edit" ? "Guardar cambios" : "Guardar feedback"}</button>}</footer>
    </form>
  </dialog>;
}

export function TourAnalysis({ api, visit, onChanged }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const request = useRef({ revision: null, id: null }), inFlight = useRef(false), alive = useRef(true);
  const steps = useRemote(api, "/api/blueprint/steps", visit.revision);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const analysis = visit.analysis;
  const stale = analysis?.status === "stale" || (analysis && analysis.context_revision !== visit.revision);
  const ready = analysis?.status === "ready" && !stale;
  const links = recommendationLinks(ready ? analysis : null, steps.data?.steps);
  async function analyze() {
    if (inFlight.current) return; inFlight.current = true; setBusy(true); setError("");
    if (request.current.revision !== visit.revision) request.current = { revision: visit.revision, id: crypto.randomUUID() };
    try { await analysisRequest(api, visit, request.current.id); }
    catch (error) { if (alive.current) setError(error.message); }
    finally { inFlight.current = false; if (alive.current) setBusy(false); onChanged?.(); }
  }
  return <section className="tour-analysis" aria-label="Aprendizaje con IA">
    <h3>Aprendizaje con IA</h3>
    {stale && <p className="tour-help">Análisis desactualizado. Actualízalo con el contexto que acabas de guardar.</p>}
    {(analysis?.summary || ready) && <details open={ready} className="tour-analysis-content"><summary>{stale ? "Ver análisis anterior" : "Ver análisis del Coach"}</summary><p>{analysis.summary}</p>{[["Algo que funcionó", "strengths"], ["Oportunidad de mejora", "improvement"], ["Siguiente práctica", "next_practice"]].map(([label, field]) => analysis[field] && <div key={field}><strong>{label}</strong><p>{analysis[field]}</p></div>)}<small>Generado por IA · {analysis.provider === "hermes" ? "Hermes" : "Coach"}{analysis.generated_at ? ` · ${cancunParts(new Date(analysis.generated_at)).date}` : ""}</small></details>}
    {!ready && !stale && !busy && <p className="tour-help">{analysis?.status === "failed" ? "Análisis no disponible. Puedes reintentar." : analysis?.status === "pending" ? "El análisis se está preparando. Si no termina, puedes reintentar." : "Aún no hay análisis de esta visita."}</p>}
    {ready && <div className="tour-recommendations">{steps.busy ? <p className="tour-help">Comprobando lecciones disponibles…</p> : steps.error ? <ErrorBox error={steps.error} retry={steps.retry} /> : links.length ? links.map(link => <a key={link.step_id} href={link.href}><strong>{link.title}</strong><span>{link.reason}</span>{link.notice && <small>{link.notice}</small>}<span className="tour-link-label">{link.notice ? "Ver requisitos en Roadmap" : "Abrir lección"} <ArrowRight size={14} /></span></a>) : <p className="tour-help">No hay una recomendación específica disponible para este caso.</p>}</div>}
    <ErrorBox error={error} />
    {busy && <p role="status" className="tour-status"><LoaderCircle size={16} className="spin" />Analizando visita…</p>}
    {!ready && visit.status !== "cancelled" && <button type="button" className="tour-secondary" disabled={busy} onClick={analyze}>{busy ? "Analizando…" : stale ? "Actualizar análisis" : ["failed", "pending"].includes(analysis?.status) || error ? "Reintentar análisis" : "Generar análisis con IA"}</button>}
  </section>;
}

export function TourVisitDetail({ api, visitId, revision = 0, onChanged, onDeleted, onClose, compact = false }) {
  const detail = useTourVisit(api, visitId, revision);
  const [form, setForm] = useState(null), [confirm, setConfirm] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const mutation = useRef(null), inFlight = useRef(false);
  const visit = detail.visit;
  function changed() { detail.retry(); onChanged?.(); }
  async function mutate(action) {
    if (!visit || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    if (mutation.current?.action !== action || mutation.current?.revision !== visit.revision) mutation.current = { action, revision: visit.revision, id: crypto.randomUUID() };
    try {
      const result = await api(`/api/tour-visits/${visit.id}`, { method: action === "delete" ? "DELETE" : "PATCH", body: JSON.stringify({ expected_revision: visit.revision, request_id: mutation.current.id, ...(action === "delete" ? {} : { action }) }) });
      setConfirm(null);
      if (action === "delete") { onChanged?.(); onDeleted?.(visit.id); }
      else { detail.replace(result.visit); changed(); }
    } catch (error) { setError(error.status === 409 ? `${error.message} Actualiza el registro antes de intentar de nuevo.` : error.message); }
    finally { inFlight.current = false; setBusy(false); }
  }
  if (!visit) return <section className="tour-detail" aria-label="Detalle de visita">{detail.busy ? <p role="status">Cargando visita…</p> : <><ErrorBox error={detail.error || "Esta visita no está disponible."} retry={detail.code === "visit_not_found" ? undefined : detail.retry} /><a href="#agenda">Volver a Agenda</a></>}{onClose && <button type="button" className="tour-secondary" onClick={onClose}>Cerrar detalle</button>}</section>;
  return <article className={`tour-detail${compact ? " is-compact" : ""}`} aria-label="Detalle de visita">
    <header><div><span className={`tour-status-chip is-${visit.status}`}>{TOUR_STATUS[visit.status]}</span><h2>{visitLabel(visit)}</h2><p>{visit.event_date} · {visitTime(visit)} · Cancún</p></div>{onClose && <button type="button" aria-label="Cerrar detalle de visita" onClick={onClose}><X size={18} /></button>}</header>
    <div className="tour-detail-body"><strong>Contexto guardado</strong><p className="tour-preserve">{visit.context || "Sin contexto adicional."}</p>
      {visit.feedback && <section className="tour-feedback"><h3>Smart Diary</h3>{[["Qué pasó", "happened"], ["Qué funcionó", "worked"], ["Qué mejorarías o harías después", "improve_next"]].map(([label, field]) => visit.feedback[field] && <div key={field}><strong>{label}</strong><p className="tour-preserve">{visit.feedback[field]}</p></div>)}</section>}
      <TourAnalysis key={`${visit.id}:${visit.revision}`} api={api} visit={visit} onChanged={changed} />
      <div className="tour-record-actions"><a href={`#coach/${visit.id}`}>Continuar con el Coach</a>
        {visit.status === "scheduled" && <button type="button" disabled={busy} onClick={() => mutate("start")}>Iniciar visita</button>}
        {["scheduled", "in_progress"].includes(visit.status) && <button type="button" disabled={busy} onClick={() => setForm("reflect")}>Registrar cómo me fue</button>}
        {visit.status !== "cancelled" && <button type="button" disabled={busy} onClick={() => setForm("edit")}>Editar visita</button>}
        {["scheduled", "in_progress"].includes(visit.status) && <button type="button" disabled={busy} onClick={() => setConfirm("cancel")}>Cancelar visita</button>}
        <button type="button" disabled={busy} onClick={() => setConfirm("delete")}>Eliminar visita</button>
      </div>
      {confirm && <div className="tour-confirm" role="group" aria-label={confirm === "delete" ? "Confirmar eliminación" : "Confirmar cancelación"}><p>{confirm === "delete" ? "Se eliminarán esta visita, su feedback y su análisis." : "La visita quedará cancelada y conservará su contexto hasta que caduque o la elimines."}</p><button type="button" disabled={busy} onClick={() => mutate(confirm)}>{confirm === "delete" ? "Eliminar definitivamente" : "Confirmar cancelación"}</button><button type="button" disabled={busy} onClick={() => setConfirm(null)}>Volver</button></div>}
      <ErrorBox error={error} retry={error ? detail.retry : undefined} />
      <small className="tour-help">Disponible hasta {cancunParts(new Date(visit.expires_at)).date}.</small>
    </div>
    {form && <TourVisitDialog api={api} intent={form} visit={visit} onClose={() => setForm(null)} onChanged={onChanged} onSaved={value => { setForm(null); detail.replace(value); changed(); }} />}
  </article>;
}

export function TourDiary({ api, data, revision, refresh, visitId, renderLegacyNotes, onLocked }) {
  const today = cancunParts().date;
  const list = useTourVisits(api, shiftDate(today, -30), shiftDate(today, 60), revision, !data.goalsheetLocked);
  const [form, setForm] = useState(null), [view, setView] = useState("visits");
  const completed = list.visits.filter(visit => visit.status === "completed").sort((a,b) => String(visitInstant(b)).localeCompare(String(visitInstant(a))));
  const open = context => { if (data.goalsheetLocked) onLocked?.("premium"); else setForm({ context }); };
  return <section className="tour-diary-page"><Header title="Smart Diary" subtitle="Convierte cada visita en un aprendizaje." action={<Button onClick={() => open("")}>Registrar cómo me fue</Button>} />
    <div className="tour-diary-tabs" role="group" aria-label="Contenido de Smart Diary"><button type="button" aria-pressed={view === "visits"} onClick={() => setView("visits")}>Feedback de visitas</button><button type="button" aria-pressed={view === "local"} onClick={() => setView("local")}>Notas anteriores</button></div>
    {view === "local" ? <div className="tour-legacy-notes"><p className="tour-help">Tus notas anteriores siguen guardadas sólo en este navegador. Elige una para copiarla a un registro y revisa antes de confirmar.</p>{renderLegacyNotes(context => open(context))}</div> : <>
      {data.goalsheetLocked ? <Card><p>Los registros vinculados requieren acceso a Goal Sheet.</p><Button secondary onClick={() => onLocked?.("premium")}>Ver acceso</Button></Card> : <>
        <ErrorBox error={list.error} retry={list.retry} />
        {visitId && <TourVisitDetail key={visitId} api={api} visitId={visitId} revision={revision} onChanged={refresh} onDeleted={() => { location.hash = "diary"; list.retry(); }} />}
        <div className="tour-diary-list">{completed.map(visit => <a key={visit.id} href={`#diary/${visit.id}`}><CalendarDays size={19} /><span><strong>{visitLabel(visit)}</strong><small>{visit.event_date} · {visitTime(visit)} · {visit.analysis_status === "ready" ? "Análisis disponible" : "Ver feedback"}</small></span><ArrowRight size={17} /></a>)}</div>
        {list.busy && <p role="status">Cargando feedback…</p>}
        {!list.busy && !completed.length && !list.error && <Card><h2>Tu próxima visita deja un aprendizaje.</h2><p>Registra qué pasó, qué funcionó y qué practicarás después.</p></Card>}
      </>}
    </>}
    {form && <TourVisitDialog api={api} intent="reflect" initialContext={form.context} onClose={() => setForm(null)} onChanged={refresh} onSaved={visit => { setForm(null); setView("visits"); location.hash = `diary/${visit.id}`; list.retry(); }} />}
  </section>;
}

export function LatestVisitLearning({ api, data, revision }) {
  const today = cancunParts().date;
  const list = useTourVisits(api, shiftDate(today,-30), today, revision, !data.goalsheetLocked);
  const latest = list.visits.filter(visit => visit.status === "completed" && visit.analysis_status === "ready").sort((a,b) => String(visitInstant(b)).localeCompare(String(visitInstant(a))))[0];
  const detail = useTourVisit(api, latest?.id, revision);
  const links = recommendationLinks(detail.visit?.analysis, data.steps);
  if (!links.length || detail.visit?.analysis?.context_revision !== detail.visit?.revision) return null;
  return <section className="tour-roadmap-learning"><h2>Recomendado por tu última visita</h2><div className="tour-recommendations">{links.map(link => <a key={link.step_id} href={link.href}><strong>{link.title}</strong><span>{link.reason}</span>{link.notice && <small>{link.notice}</small>}</a>)}</div><a className="tour-origin-link" href={`#agenda/${latest.id}`}>Ver visita de origen <ArrowRight size={15} /></a></section>;
}
