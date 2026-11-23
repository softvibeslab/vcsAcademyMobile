import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bot, Send, ArrowDown, LoaderCircle } from "lucide-react";
import { Header, Card, Field, Button, Empty, Loading, ErrorBox, useRemote, useAction, ActionStatus } from "./ui";
import { boundedHistory, compactReply, safeCoachActions, updateCoachTurn } from "./coach-model.mjs";

const STARTERS = [
  ["Presentación", "Ayúdame a preparar mi presentación."],
  ["Objeción", "Quiero practicar una objeción con una pareja."],
  ["Mi pitch", "Ayúdame a revisar mi pitch de ventas."],
];

function CoachReply({ turn }) {
  const reply = compactReply(turn.answer);
  const actions = safeCoachActions(turn.actions);
  const citations = [...new Set((Array.isArray(turn.citations) ? turn.citations : [])
    .filter(value => typeof value === "string" && value.trim()).slice(0, 8))];
  return (
    <div className="message assistant">
      <small>{turn.provider === "hermes" ? "COACH · HERMES" : "ORIENTACIÓN LOCAL"}</small>
      <p>{reply.preview}</p>
      {reply.detail && <details className="coach-detail"><summary>Ver respuesta completa</summary><p>{reply.detail}</p></details>}
      {actions.length > 0 && <div className="coach-actions">{actions.map(action => <a key={action.href} href={action.href}>{action.label}</a>)}</div>}
      {citations.length > 0 && <details className="coach-sources"><summary>Material consultado</summary><ul>{citations.map(source => <li key={source}>{source}</li>)}</ul></details>}
    </div>
  );
}

export function Coach({ api, refresh, initialTab = "chat", onLocked, onGuideEvent }) {
  const [tab, setTab] = useState(initialTab);
  const [turns, setTurns] = useState([]);
  const [drafts, setDrafts] = useState({ chat: "", practice: "" });
  const [busyMode, setBusyMode] = useState(null);
  const [session, setSession] = useState(null);
  const [scenarioId, setScenarioId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [practicePending, setPracticePending] = useState(null);
  const [hasLatest, setHasLatest] = useState(false);
  const r = useRemote(api, "/api/roleplay/scenarios"), action = useAction();
  const requestRef = useRef(null), inputRef = useRef(null), logRef = useRef(null);
  const alive = useRef(true), nearBottom = useRef(true), activeTab = useRef(tab);
  activeTab.current = tab;
  const message = drafts[tab] || "";
  const scenario = r.data?.scenarios.find(item => item.id === scenarioId);
  const busy = !!busyMode || action.busy;
  const visibleContent = tab === "chat" ? turns : session?.turns;
  const visiblePending = tab === "practice" ? practicePending : null;

  useEffect(() => {
    nearBottom.current = true;
    setHasLatest(false);
    setTab(initialTab);
  }, [initialTab]);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; requestRef.current?.controller.abort(); };
  }, []);
  // Safari's visual viewport shrinks for the keyboard even when the layout viewport does not.
  useEffect(() => {
    const shell = document.querySelector(".app-shell--coach");
    const viewport = window.visualViewport;
    if (!shell || !viewport) return;
    const update = () => shell.style.setProperty("--coach-viewport-height", `${viewport.height}px`);
    update(); viewport.addEventListener("resize", update);
    return () => { viewport.removeEventListener("resize", update); shell.style.removeProperty("--coach-viewport-height"); };
  }, []);
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  }, [message, tab, session?.id]);
  useLayoutEffect(() => {
    const log = logRef.current;
    if (!log) return;
    if (nearBottom.current) { log.scrollTop = log.scrollHeight; setHasLatest(false); }
    else setHasLatest(true);
  }, [visibleContent, visiblePending, tab]);
  useEffect(() => {
    const log = logRef.current;
    if (!log || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => { if (nearBottom.current) log.scrollTop = log.scrollHeight; });
    observer.observe(log);
    return () => observer.disconnect();
  }, [tab, session?.id]);

  function changeTab(next) {
    nearBottom.current = true;
    setHasLatest(false);
    setTab(next);
  }
  function latest() {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
    nearBottom.current = true;
    setHasLatest(false);
  }
  function trackScroll() {
    const log = logRef.current;
    if (!log) return;
    nearBottom.current = log.scrollHeight - log.clientHeight - log.scrollTop < 64;
    if (nearBottom.current) setHasLatest(false);
  }
  function suggest(text) {
    setDrafts(previous => ({ ...previous, [tab]: text }));
    inputRef.current?.focus();
  }
  async function submitText(text, mode, retryTurn = null) {
    text = text.trim();
    if (!text || text.length > 1200 || requestRef.current || action.busy) return;
    if (mode === "practice" && session?.status !== "active") return;
    const controller = new AbortController();
    const request = { controller, mode, timedOut: false };
    requestRef.current = request;
    setBusyMode(mode);
    const id = retryTurn?.id || crypto.randomUUID();
    const history = retryTurn?.history || boundedHistory(turns);
    const turn = { id, question: text, history, status: "pending", error: "" };
    if (mode === "chat") setTurns(previous => updateCoachTurn(previous, turn));
    else setPracticePending(turn);
    setDrafts(previous => ({ ...previous, [mode]: previous[mode].trim() === text ? "" : previous[mode] }));
    if (activeTab.current === mode) nearBottom.current = true;
    const timer = setTimeout(() => { request.timedOut = true; controller.abort(); }, 45000);
    try {
      if (mode === "chat") {
        const result = await api("/api/smart-agent/chat", {
          method: "POST", signal: controller.signal,
          body: JSON.stringify({ message: text, mode: "general_coach", conversation_history: history }),
        });
        if (!alive.current) return;
        if (typeof result.response !== "string" || !result.response.trim()) throw new Error("El Coach no pudo completar la respuesta. Inténtalo de nuevo.");
        setTurns(previous => updateCoachTurn(previous, {
          id, status: "sent", answer: result.response, citations: result.citations,
          actions: result.recommended_actions, provider: result.provider || "local",
        }));
        onGuideEvent?.("coach");
      } else {
        const result = await api(`/api/roleplay/sessions/${session.id}/turn`, {
          method: "POST", signal: controller.signal, body: JSON.stringify({ message: text }),
        });
        if (!alive.current) return;
        setSession(result.session);
        setPracticePending(null);
      }
    } catch (error) {
      if (!alive.current) return;
      const errorText = request.timedOut
        ? "El Coach tardó demasiado. Tu mensaje sigue aquí; puedes reintentar."
        : error.message || "No pudimos enviar tu mensaje. Puedes reintentar.";
      if (mode === "chat") setTurns(previous => updateCoachTurn(previous, { id, status: "failed", error: errorText }));
      else setPracticePending({ ...turn, status: "failed", error: errorText });
      setDrafts(previous => ({ ...previous, [mode]: previous[mode] || text }));
    } finally {
      clearTimeout(timer);
      if (requestRef.current === request) requestRef.current = null;
      if (alive.current) setBusyMode(null);
    }
  }
  function send(event) {
    event.preventDefault();
    const failed = tab === "chat"
      ? turns.findLast(turn => turn.status === "failed" && turn.question === message.trim())
      : practicePending?.status === "failed" ? practicePending : null;
    submitText(message, tab, failed);
  }
  function retry(turn, mode) { submitText(turn.question, mode, turn); }
  function pendingMessage(turn, mode) {
    return turn && <React.Fragment key={turn.id}>
      <div className="message user"><small>TÚ</small><p>{turn.question}</p></div>
      {turn.status === "failed" && <div className="coach-send-error" role="alert"><p>{turn.error}</p><button type="button" disabled={busy} onClick={() => retry(turn, mode)}>Reintentar</button></div>}
    </React.Fragment>;
  }

  return (
    <section className="coach-page" aria-label="AI Coach">
      <header className="coach-topline">
        <span className="coach-avatar" aria-hidden="true"><Bot size={22} /></span>
        <div><h1>AI Coach</h1><p>Tu siguiente paso, más claro.</p></div>
        <a href="#feedback">Evaluaciones</a>
      </header>
      <div className="coach-tabs" role="group" aria-label="Modo de entrenamiento">
        <button type="button" aria-pressed={tab === "chat"} onClick={() => changeTab("chat")}>Conversar</button>
        <button type="button" aria-pressed={tab === "practice"} onClick={() => changeTab("practice")}>Roleplay</button>
      </div>
      {tab === "practice" && !session ? (
        <Card className="coach-scenarios">
          <h2>Elige tu siguiente reto</h2>
          {r.busy ? <Loading /> : r.error ? <ErrorBox error={r.error} retry={r.retry} /> : <>
            <Field label="Escenario"><select value={scenarioId} onChange={event => setScenarioId(event.target.value)}>
              <option value="">Selecciona una práctica</option>
              {r.data.scenarios.map(item => <option key={item.id} value={item.id} disabled={item.allowed === false}>{item.allowed === false ? "🔒 " : ""}{item.title} · {item.difficulty}{item.allowed === false ? " · Premium" : ""}</option>)}
            </select></Field>
            {r.data.scenarios.some(item => item.allowed === false) && onLocked && <p className="fine-print">Algunas prácticas son Premium. <button type="button" className="text-button" onClick={() => onLocked("premium")}>Desbloquear premium</button></p>}
            {scenario && <div className="coach-scenario-context"><p>{scenario.buyer_context}</p><p><strong>Objetivo:</strong> {scenario.objective}</p></div>}
            <Button disabled={!scenario || busy} onClick={() => action.run(async () => {
              const result = await api("/api/roleplay/sessions", { method: "POST", body: JSON.stringify({ scenario_id: scenario.id, blueprint_step_id: scenario.blueprint_step_id }) });
              setSession(result.session); setSubmitted(false); setPracticePending(null); nearBottom.current = true;
            }, "")}>Iniciar práctica</Button>
          </>}
          <ActionStatus action={action} />
        </Card>
      ) : (
        <div className="coach-conversation">
          {tab === "practice" && <div className="coach-practice-heading"><strong>{scenario?.title || "Práctica en curso"}</strong><span>Simulación por texto</span></div>}
          <div className="coach-log" ref={logRef} onScroll={trackScroll} role="log" aria-label={tab === "chat" ? "Conversación con el Coach" : "Conversación de práctica"} aria-live="polite" aria-relevant="additions text" tabIndex={0}>
            {tab === "chat" ? (turns.length ? turns.map(turn => <React.Fragment key={turn.id}>
              {pendingMessage(turn, "chat")}
              {turn.status === "sent" && <CoachReply turn={turn} />}
            </React.Fragment>) : <div className="coach-empty"><h2>¿Qué quieres preparar hoy?</h2><div className="coach-starters">{STARTERS.map(([label, prompt]) => <button type="button" key={label} onClick={() => suggest(prompt)}>{label}</button>)}</div></div>) : <>
              {(session.turns || []).map((turn, index) => <React.Fragment key={index}>
                <div className="message user"><small>TÚ</small><p>{turn.rep}</p></div>
                <div className="message assistant"><small>CLIENTE</small><p>{turn.buyer}</p><aside>{turn.coach_tip}</aside></div>
              </React.Fragment>)}
              {!(session.turns || []).length && !practicePending && <div className="coach-empty"><h2>Tú abres la conversación</h2><p>Presenta tu primera pregunta al cliente.</p></div>}
              {pendingMessage(practicePending, "practice")}
            </>}
            {busyMode === tab && <div className="coach-thinking" role="status"><LoaderCircle size={16} className="spin" aria-hidden="true" />{tab === "chat" ? "Coach está respondiendo…" : "Preparando respuesta…"}</div>}
          </div>
          {hasLatest && <button type="button" className="coach-latest" onClick={latest}><ArrowDown size={16} />Ir al último mensaje</button>}
          {(tab === "chat" || session.status === "active") && <form className="coach-composer" onSubmit={send}>
            <label className="coach-visually-hidden" htmlFor="coach-message">Tu mensaje</label>
            <textarea id="coach-message" ref={inputRef} rows={1} maxLength={1200} value={message} onChange={event => setDrafts(previous => ({ ...previous, [tab]: event.target.value }))} placeholder="Escribe tu mensaje…" enterKeyHint="send" onKeyDown={event => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(event); }
            }} />
            <button type="submit" aria-label="Enviar mensaje" disabled={busy || !message.trim()}><Send size={20} /></button>
            {message.length > 1000 && <small className="coach-character-count">{message.length}/1200</small>}
          </form>}
          {tab === "practice" && <div className="coach-practice-controls">
            {session.status === "active" ? <Button secondary disabled={busy || !(session.turns || []).length} onClick={() => action.run(async () => {
              const result = await api(`/api/roleplay/sessions/${session.id}/complete`, { method: "POST" });
              setSession(result.session); setPracticePending(null);
            }, "Práctica terminada. Puedes enviarla a evaluación.")}>Terminar práctica</Button> : <>
              <span className="chip">Puntuación AI: {session.ai_score?.score ?? "—"}</span>
              <Button disabled={submitted || busy} onClick={() => action.run(async () => {
                await api("/api/roleplay/submissions", { method: "POST", body: JSON.stringify({ session_id: session.id, transcript: session.transcript, submission_type: "text" }) });
                setSubmitted(true); refresh();
              }, "Práctica enviada al equipo.")}>{submitted ? "Enviada" : "Enviar a evaluación"}</Button>
              <Button secondary disabled={busy} onClick={() => { setSession(null); setPracticePending(null); setDrafts(previous => ({ ...previous, practice: "" })); action.reset(); }}>Nueva práctica</Button>
            </>}
            <ActionStatus action={action} />
          </div>}
        </div>
      )}
    </section>
  );
}
export function Feedback({ data }) {
  return (
    <>
      <Header
        eyebrow="APRENDE Y MEJORA"
        title="Mis evaluaciones"
        subtitle="Tus prácticas y el feedback de tu equipo."
      />
      <div className="stack">
        {data.submissions.length ? (
          data.submissions.map((s) => (
            <Card key={s.id}>
              <span className="chip">{s.status}</span>
              <h2>{s.scenario_id || "Práctica de ventas"}</h2>
              <p className="preserve">{s.transcript}</p>
              {s.manager_feedback ? (
                <>
                  <h3>Feedback del equipo · {s.manager_feedback.score}</h3>
                  <p>{s.manager_feedback.comments}</p>
                  <small>{s.manager_feedback.recommendation}</small>
                </>
              ) : (
                <p className="muted">Pendiente de revisión por tu equipo.</p>
              )}
            </Card>
          ))
        ) : (
          <Empty title="Tu primera práctica te espera">
            Inicia un roleplay y envíalo a evaluación.
          </Empty>
        )}
      </div>
    </>
  );
}
