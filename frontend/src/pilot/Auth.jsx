import React, { useState, useEffect } from "react";
import Onboarding, {CoachIllustration} from "./Onboarding";
import {
  Bot,
  ArrowRight,
  Check,
  Briefcase,
  Users,
  Building2,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button, Field, useAction, ActionStatus } from "./ui";
import { RegisterForm } from "./Access";
const views = [
  "welcome",
  "intro",
  "profile",
  "start",
  "account",
  "login",
  "forgot",
  "sent",
  "reset",
  "manager",
  "direction",
  "public",
  "register",
];
const choices = [
  [
    "01",
    "Roadmap Estructurado",
    "Paso a paso desde prospección hasta cierre y negociación de contratos.",
    "roadmap",
  ],
  [
    "02",
    "AI Sales Coach",
    "Roleplay conversacional inmediato con un comprador difícil simulado.",
    "coach",
  ],
  [
    "03",
    "Bóveda de Recursos",
    "Plantillas de pitch, emails fríos y guías de manejo de objeciones.",
    "vault",
  ],
];
function readView(fallback) {
  const [group, view] = location.hash.slice(1).split("/");
  return group === "access" && views.includes(view) ? view : fallback;
}
export default function Auth({
  api,
  onLogin,
  onGuest,
  theme,
  toggleTheme,
  initialView = "welcome",
  initialDestination = "home",
}) {
  const [view, setViewState] = useState(() => readView(initialView)),
    [role, setRole] = useState("sales_rep"),
    [destination, setDestination] = useState(initialDestination),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirmPassword, setConfirmPassword] = useState(""),
    [show, setShow] = useState(false),
    [demos, setDemos] = useState([]),
    [reset, setReset] = useState(""),
    [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState(""),
    [loginOrigin, setLoginOrigin] = useState(
      initialView === "login" ? "start" : "welcome",
    );
  const action = useAction();
  function setView(next) {
    action.reset();
    setViewState(next);
    location.hash = "access/" + next;
  }
  function loginFrom(origin, target = destination) {
    setLoginOrigin(origin);
    setDestination(target);
    setPassword("");
    setView("login");
  }
  useEffect(() => {
    const change = () => {
      setViewState(readView(initialView));
      action.reset();
    };
    addEventListener("hashchange", change);
    return () => removeEventListener("hashchange", change);
  }, [initialView]);
  useEffect(() => {
    let live = true;
    api("/api/auth/demo-users")
      .then((d) => {
        if (live) setDemos(d.users || []);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [api]);
  async function submit(e) {
    e.preventDefault();
    await action.run(
      async () => {
        if (view === "login") {
          const d = await api("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
          });
          onLogin(d.token, destination);
          return;
        }
        if (view === "forgot") {
          const d = await api("/api/auth/forgot-password", {
            method: "POST",
            body: JSON.stringify({ email }),
          });
          setReset(d.reset_token || "");
          setView("sent");
          return;
        }
        if (password !== confirmPassword)
          throw Error("Las contraseñas no coinciden.");
        await api("/api/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ token: reset, new_password: password }),
        });
        setPassword("");
        setConfirmPassword("");
        setReset("");
        setView("login");
      },
      view === "reset"
        ? "Contraseña actualizada. Ya puedes iniciar sesión."
        : "",
    );
  }
  const progress = { intro: 1, profile: 2, start: 3 }[view];
  if (["welcome","intro","profile","start"].includes(view)) return <Onboarding {...{view,setView,role,setRole,destination,setDestination,choices,onGuest,loginFrom,theme,toggleTheme}}/>;
  return (
    <div className="auth-page">
      <div className="auth-top">
        <button className="brand" onClick={() => setView("welcome")}>
          <span className="brand-mark">sa</span>Sales Academy
        </button>
        <button className="text-button" onClick={toggleTheme}>
          {theme === "dark" ? "Modo claro" : "Modo oscuro"}
        </button>
      </div>
      <div className="auth-layout">
        <section className="auth-story">
          <span className="chip">TOP PRODUCER EDITION</span>
          <h1>
            Tu siguiente nivel
            <br />
            empieza con
            <br />
            <em>una conversación.</em>
          </h1>
          <p>
            Entrena tu método. Conoce tus resultados.
            <br />
            Llega preparado a cada presentación.
          </p>
          <div className="story-pillars">
            <span>
              <Check size={16} /> Un método de 11 pasos
            </span>
            <span>
              <Check size={16} /> Práctica con contexto
            </span>
            <span>
              <Check size={16} /> Tu progreso, en un lugar
            </span>
          </div>
          <div className="auth-signature">
            SALES ACADEMY <span>by AgenticOS</span>
          </div>
        </section>
        <section className="auth-card" key={view}>
          {progress && (
            <div className="onboarding-progress">
              <small>PASO {progress} DE 3</small>
              <div
                className="progress"
                role="progressbar"
                aria-label="Progreso del onboarding"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={3}
              >
                <span style={{ width: (progress / 3) * 100 + "%" }} />
              </div>
            </div>
          )}
          {view === "welcome" && (
            <>
              <div className="coach-avatar">
                <CoachIllustration/>
                <span className="online-dot" />
              </div>
              <p className="eyebrow">TU AI SALES COACH</p>
              <h2>
                Practica tus ventas.
                <br />
                Gana confianza.
              </h2>
              <p>Entrena objeciones y prepara tu próxima presentación.</p>
              <Button onClick={() => setView("intro")}>
                Comenzar <ArrowRight size={18} />
              </Button>
              <Button secondary onClick={() => loginFrom("welcome", "home")}>
                Ya tengo una cuenta
              </Button>
              <button className="text-button" onClick={() => setView("public")}>
                Conversar con el coach
              </button>
            </>
          )}
          {view === "intro" && (
            <>
              <div className="coach-avatar">
                <CoachIllustration intro/>
              </div>
              <h2>Conoce a tu coach.</h2>
              <p>
                Te acompañaré a practicar tu pitch, explorar objeciones y
                preparar tu siguiente conversación.
              </p>
              <div className="notice">
                Primero elige tu perfil y por dónde quieres empezar. Puedes
                explorar sin cuenta; inicia sesión cuando quieras guardar tu
                progreso.
              </div>
              <div className="story-pillars">
                <span>
                  <Check size={16} /> Entrena con un método claro
                </span>
                <span>
                  <Check size={16} /> Practica a tu ritmo
                </span>
              </div>
              <Button onClick={() => setView("profile")}>
                Continuar <ArrowRight size={18} />
              </Button>
              <button
                className="text-button"
                onClick={() => setView("welcome")}
              >
                Volver
              </button>
            </>
          )}
          {view === "profile" && (
            <>
              <p className="eyebrow">VAMOS A CONOCERTE</p>
              <h2>¿Cuál es tu perfil?</h2>
              <p>Selecciona cómo participas en el ciclo de ventas.</p>
              {[
                ["sales_rep", "Representante de ventas", Briefcase],
                ["manager", "Gerente o coach", Users],
                ["admin", "Dirección y administración", Building2],
              ].map(([id, label, Icon]) => (
                <button
                  key={id}
                  className={"choice " + (role === id ? "selected" : "")}
                  aria-pressed={role === id}
                  onClick={() => setRole(id)}
                >
                  <Icon size={22} />
                  <span>{label}</span>
                  {role === id && <Check size={18} />}
                </button>
              ))}
              <Button
                onClick={() =>
                  setView(
                    role === "sales_rep"
                      ? "start"
                      : role === "manager"
                        ? "manager"
                        : "direction",
                  )
                }
              >
                Continuar <ArrowRight size={18} />
              </Button>
              <button className="text-button" onClick={() => setView("intro")}>
                Volver
              </button>
            </>
          )}
          {view === "start" && (
            <>
              <p className="eyebrow">TU PRIMER PASO</p>
              <h2>¿Por dónde prefieres empezar?</h2>
              <p>Podrás acceder a todas las secciones en cualquier momento.</p>
              <div role="radiogroup" aria-label="Punto de inicio">
                {choices.map(([number, title, description, target]) => (
                  <label
                    key={target}
                    className={
                      "choice entry-choice " +
                      (destination === target ? "selected" : "")
                    }
                  >
                    <input
                      type="radio"
                      name="entry"
                      checked={destination === target}
                      onChange={() => setDestination(target)}
                    />
                    <span className="entry-number">{number}</span>
                    <span className="entry-copy">
                      <strong>{title}</strong>
                      <small>{description}</small>
                    </span>
                  </label>
                ))}
              </div>
              <Button
                disabled={!choices.some((c) => c[3] === destination)}
                onClick={() => onGuest(destination)}
              >
                Continuar al módulo <ArrowRight size={18} />
              </Button>
              <p className="fine-print">
                Prueba sin cuenta. Necesitarás iniciar sesión para guardar tu
                progreso.
              </p>
              <button
                className="text-button"
                onClick={() => setView("account")}
              >
                Quiero guardar mi progreso
              </button>
              <br />
              <button
                className="text-button"
                onClick={() => setView("profile")}
              >
                Volver
              </button>
            </>
          )}
          {["manager", "direction"].includes(view) && (
            <>
              <span className="icon-badge">
                {view === "manager" ? <Users /> : <Building2 />}
              </span>
              <p className="eyebrow">
                {view === "manager" ? "TU EQUIPO" : "DIRECCIÓN COMERCIAL"}
              </p>
              <h2>
                {view === "manager"
                  ? "Haz crecer a tu equipo."
                  : "Una academia para tu organización."}
              </h2>
              <p>
                {view === "manager"
                  ? "Acompaña el entrenamiento, revisa prácticas y consulta el avance de tus representantes."
                  : "Organiza los accesos y el contenido de tu academia. Acompaña la formación de tus equipos."}
              </p>
              <div className="notice">
                Accede con tu cuenta de{" "}
                {view === "manager" ? "gerente o coach" : "administración"}. Los
                permisos dependen de tu cuenta.
              </div>
              <Button
                onClick={() =>
                  loginFrom(view, view === "manager" ? "team" : "admin")
                }
              >
                {view === "manager"
                  ? "Acceder a mi equipo"
                  : "Acceder a mi academia"}
              </Button>
              <Button
                secondary
                onClick={() => {
                  setDestination("roadmap");
                  setView("start");
                }}
              >
                Explorar como representante
              </Button>
              <button
                className="text-button"
                onClick={() => setView("profile")}
              >
                Volver
              </button>
            </>
          )}
          {view === "register" && (
            <RegisterForm
              api={api}
              onLogin={onLogin}
              destination={destination === "home" ? "roadmap" : destination}
              onSignIn={() => loginFrom("register")}
              onBack={() => setView("welcome")}
            />
          )}
          {view === "account" && (
            <>
              <span className="icon-badge">
                <ShieldCheck />
              </span>
              <h2>Tu cuenta de práctica</h2>
              <p>
                Guarda tu progreso, tus resultados y el feedback de tu equipo.
              </p>
              <Button onClick={() => setView("register")}>
                Crear cuenta gratis
              </Button>
              <Button secondary onClick={() => loginFrom("account")}>
                Ya tengo una cuenta
              </Button>
              <Button
                secondary
                onClick={() => {
                  setDestination("roadmap");
                  setView("start");
                }}
              >
                Probar sin cuenta
              </Button>
              <button className="text-button" onClick={() => setView("start")}>
                Volver
              </button>
            </>
          )}
          {view === "public" && (
            <>
              <span className="icon-badge">
                <Bot />
              </span>
              <h2>Conversa con tu coach.</h2>
              <p>Explora el método antes de entrar a tu academia.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  action.run(async () => {
                    const d = await api("/api/smart-agent/public-chat", {
                      method: "POST",
                      body: JSON.stringify({
                        message: question,
                        mode: "general_coach",
                      }),
                    });
                    setAnswer(d.response);
                  }, "");
                }}
              >
                <Field label="Tu pregunta">
                  <textarea
                    required
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                  />
                </Field>
                <Button disabled={action.busy}>Preguntar al coach</Button>
              </form>
              {answer && <p className="notice">{answer}</p>}
              <ActionStatus action={action} />
              <Button secondary onClick={() => setView("intro")}>
                Comenzar mi recorrido
              </Button>
              <button
                className="text-button"
                onClick={() => setView("welcome")}
              >
                Volver
              </button>
            </>
          )}
          {["login", "forgot", "reset"].includes(view) && (
            <>
              <span className="icon-badge">
                <ShieldCheck size={28} />
              </span>
              <h2>
                {view === "login"
                  ? "Bienvenido de nuevo."
                  : view === "forgot"
                    ? "Recupera tu acceso."
                    : "Define tu nueva clave."}
              </h2>
              <p>
                {view === "login"
                  ? destination === "home"
                    ? "Continúa donde lo dejaste."
                    : "Inicia sesión para continuar en " +
                      ({
                        roadmap: "Roadmap",
                        coach: "AI Sales Coach",
                        roleplay: "Roleplay",
                        vault: "Bóveda",
                        team: "tu equipo",
                        admin: "tu academia",
                      }[destination] || "tu espacio") +
                      "."
                  : view === "forgot"
                    ? "Usa el correo asociado a tu academia."
                    : "Escribe tu nueva contraseña en ambos campos."}
              </p>
              <form onSubmit={submit}>
                {view !== "reset" && (
                  <Field
                    label="Correo electrónico"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                )}
                {view !== "forgot" && (
                  <Field label="Contraseña">
                    <div className="password-field">
                      <input
                        aria-label="Contraseña"
                        required
                        type={show ? "text" : "password"}
                        minLength={view === "reset" ? 8 : undefined}
                        autoComplete={
                          view === "reset" ? "new-password" : "current-password"
                        }
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        aria-label={
                          show ? "Ocultar contraseña" : "Mostrar contraseña"
                        }
                        onClick={() => setShow(!show)}
                      >
                        {show ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </Field>
                )}
                {view === "reset" && (
                  <Field
                    label="Confirmar contraseña"
                    type={show ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                )}
                {view === "login" && (
                  <button
                    type="button"
                    className="text-button forgot-link"
                    onClick={() => {
                      setReset("");
                      setView("forgot");
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
                <ActionStatus action={action} />
                <Button disabled={action.busy}>
                  {action.busy
                    ? "Un momento…"
                    : view === "login"
                      ? "Iniciar sesión"
                      : view === "forgot"
                        ? "Solicitar recuperación"
                        : "Guardar contraseña"}
                  <ArrowRight size={17} />
                </Button>
              </form>
              {view === "reset" && (
                <button
                  className="text-button"
                  onClick={() => setView("forgot")}
                >
                  Solicitar nuevo enlace
                </button>
              )}
              <button
                className="text-button"
                onClick={() =>
                  setView(view === "login" ? loginOrigin : "login")
                }
              >
                {view === "login" ? "Volver" : "Volver al inicio de sesión"}
              </button>
              {view === "login" && (
                <>
                  <br />
                  <button
                    className="text-button"
                    onClick={() => setView("register")}
                  >
                    Crear cuenta gratis
                  </button>
                  {demos.length > 0 && (
                    <details className="demo-options">
                      <summary>Explorar con una cuenta de demostración</summary>
                      <p>Datos sintéticos del entorno de demostración.</p>
                      <div className="segmented">
                        {[
                          ["sales_rep", "Rep"],
                          ["manager", "Gerente"],
                          ["admin", "Admin"],
                        ].map(([r, l]) => (
                          <button
                            type="button"
                            key={r}
                            onClick={() => {
                              const d = demos.find((x) => x.primary_role === r);
                              if (d) {
                                setEmail(d.email);
                                setPassword(d.password);
                              }
                            }}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )}
            </>
          )}
          {view === "sent" && (
            <>
              <span className="icon-badge">
                <Check />
              </span>
              <h2>Solicitud recibida.</h2>
              <p>
                Si la cuenta existe, se generaron instrucciones para recuperar
                el acceso.
              </p>
              <div className="notice">
                Este entorno de demostración no envía correo.{" "}
                {reset
                  ? "Puedes usar el enlace local de recuperación."
                  : "Comprueba el correo indicado o vuelve al acceso."}
              </div>
              {reset && (
                <Button
                  onClick={() => {
                    setPassword("");
                    setConfirmPassword("");
                    setView("reset");
                  }}
                >
                  Usar enlace local de recuperación
                </Button>
              )}
              <Button secondary onClick={() => setView("forgot")}>
                Solicitar nuevo enlace
              </Button>
              <button className="text-button" onClick={() => setView("login")}>
                Volver al inicio de sesión
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
