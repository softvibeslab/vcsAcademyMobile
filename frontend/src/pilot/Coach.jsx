import {CoachIllustration} from "./Onboarding";
import React, { useEffect, useState } from "react";
import { Bot, Send } from "lucide-react";
import {
  Header,
  Card,
  Field,
  Button,
  Empty,
  Loading,
  ErrorBox,
  useRemote,
  useAction,
  ActionStatus,
} from "./ui";
export function Coach({ api, refresh, initialTab }) {
  const [tab, setTab] = useState(initialTab),
    [messages, setMessages] = useState([]),
    [message, setMessage] = useState(""),
    [session, setSession] = useState(null),
    [scenarioId, setScenarioId] = useState(""),
    [submitted, setSubmitted] = useState(false);
  const r = useRemote(api, "/api/roleplay/scenarios"),
    action = useAction();
  useEffect(() => setTab(initialTab), [initialTab]);
  const scenario = r.data?.scenarios.find((s) => s.id === scenarioId);
  async function send(e) {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    await action.run(async () => {
      if (tab === "chat") {
        const result = await api("/api/smart-agent/chat", {
          method: "POST",
          body: JSON.stringify({
            message: text,
            mode: "general_coach",
            conversation_history: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });
        setMessages((m) => [
          ...m,
          { role: "user", content: text },
          {
            role: "assistant",
            content: result.response,
            citations: result.citations,
          },
        ]);
      } else {
        const result = await api(
          "/api/roleplay/sessions/" + session.id + "/turn",
          { method: "POST", body: JSON.stringify({ message: text }) },
        );
        setSession(result.session);
      }
      setMessage("");
    }, "");
  }
  return (
    <>
      <Header
        eyebrow="AI SALES COACH"
        title="Entrena para tu próxima conversación."
        subtitle="Prepara tu presentación, practica objeciones y revisa tu siguiente paso."
        action={
          <a className="button secondary" href="#feedback">
            Mis evaluaciones
          </a>
        }
      />
      <div className="segmented tabs">
        <button
          className={tab === "chat" ? "selected" : ""}
          onClick={() => setTab("chat")}
        >
          Conversar
        </button>
        <button
          className={tab === "practice" ? "selected" : ""}
          onClick={() => setTab("practice")}
        >
          Roleplay
        </button>
      </div>
      {tab === "practice" && !session ? (
        <Card>
          <h2>Elige tu siguiente reto</h2>
          {r.busy ? (
            <Loading />
          ) : r.error ? (
            <ErrorBox error={r.error} retry={r.retry} />
          ) : (
            <>
              <Field label="Escenario">
                <select
                  value={scenarioId}
                  onChange={(e) => setScenarioId(e.target.value)}
                >
                  <option value="">Selecciona una práctica</option>
                  {r.data.scenarios.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.title} · {s.difficulty}
                    </option>
                  ))}
                </select>
              </Field>
              {scenario && (
                <>
                  <p>{scenario.buyer_context}</p>
                  <p>
                    <strong>Objetivo:</strong> {scenario.objective}
                  </p>
                </>
              )}
              <Button
                disabled={!scenario || action.busy}
                onClick={() =>
                  action.run(async () => {
                    const result = await api("/api/roleplay/sessions", {
                      method: "POST",
                      body: JSON.stringify({
                        scenario_id: scenario.id,
                        blueprint_step_id: scenario.blueprint_step_id,
                      }),
                    });
                    setSession(result.session);
                    setSubmitted(false);
                  }, "")
                }
              >
                Iniciar práctica
              </Button>
            </>
          )}
        </Card>
      ) : (
        <Card className="chat-card">
          <div className="chat-heading">
            <span className="icon-badge">
              <CoachIllustration/>
            </span>
            <div>
              <h3>
                {tab === "chat"
                  ? "Tu coach personal"
                  : scenario?.title || "Práctica en curso"}
              </h3>
              <small>
                {tab === "chat"
                  ? "Pregunta, explora y prepara tu siguiente paso"
                  : "Simulación de entrenamiento por texto"}
              </small>
            </div>
          </div>
          <div className="messages" aria-live="polite">
            {tab === "chat" ? (
              messages.length ? (
                messages.map((m, i) => (
                  <div key={i} className={"message " + m.role}>
                    <small>{m.role === "user" ? "TÚ" : "COACH"}</small>
                    <p>{m.content}</p>
                  </div>
                ))
              ) : (
                <><div className="pilot-coach-intro"><CoachIllustration intro/><div><h2>¿Qué quieres mejorar hoy?</h2><p>Prepara tu presentación o practica una objeción.</p></div></div><div className="pilot-coach-prompts">{["Preparar presentación","Practicar objeción","Revisar pitch"].map(text=><button key={text} onClick={()=>setMessage(text)}>{text}</button>)}</div></>
              )
            ) : (session.turns || []).length ? (
              session.turns.map((t, i) => (
                <React.Fragment key={i}>
                  <div className="message user">
                    <small>TÚ</small>
                    <p>{t.rep}</p>
                  </div>
                  <div className="message assistant">
                    <small>CLIENTE</small>
                    <p>{t.buyer}</p>
                    <aside>{t.coach_tip}</aside>
                  </div>
                </React.Fragment>
              ))
            ) : (
              <Empty title="Tú abres la conversación">
                Presenta tu primera pregunta al cliente.
              </Empty>
            )}
          </div>
          {(tab === "chat" || session.status === "active") && (
            <form className="chat-input" onSubmit={send}>
              <Field label="Tu mensaje">
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe tu mensaje…"
                />
              </Field>
              <Button
                disabled={action.busy || !message.trim()}
                aria-label="Enviar mensaje"
              >
                <Send size={18} />
              </Button>
            </form>
          )}
          {tab === "practice" && (
            <div className="action-row">
              {session.status === "active" ? (
                <Button
                  secondary
                  disabled={action.busy || !(session.turns || []).length}
                  onClick={() =>
                    action.run(async () => {
                      const result = await api(
                        "/api/roleplay/sessions/" + session.id + "/complete",
                        { method: "POST" },
                      );
                      setSession(result.session);
                    }, "Práctica terminada. Puedes enviarla a evaluación.")
                  }
                >
                  Terminar práctica
                </Button>
              ) : (
                <>
                  <span className="chip">
                    Puntuación AI: {session.ai_score?.score ?? "—"}
                  </span>
                  <Button
                    disabled={submitted || action.busy}
                    onClick={() =>
                      action.run(async () => {
                        await api("/api/roleplay/submissions", {
                          method: "POST",
                          body: JSON.stringify({
                            session_id: session.id,
                            transcript: session.transcript,
                            submission_type: "text",
                          }),
                        });
                        setSubmitted(true);
                        refresh();
                      }, "Práctica enviada al equipo.")
                    }
                  >
                    {submitted ? "Enviada" : "Enviar a evaluación"}
                  </Button>
                  <Button
                    secondary
                    onClick={() => {
                      setSession(null);
                      setMessage("");
                    }}
                  >
                    Nueva práctica
                  </Button>
                </>
              )}
            </div>
          )}
        </Card>
      )}
      <ActionStatus action={action} />
    </>
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
