import {CoachIllustration} from "./Onboarding";
import React, { useEffect, useState } from "react";
import { Home, Route, Bot, LayoutGrid, User, Sun, Moon } from "lucide-react";
import { blueprintSteps } from "../../../packages/domain/src/index.mjs";
import { Roadmap, Vault, LockedPanel } from "./Learning";
import { UnlockSheet } from "./Access";
import { itemAccess } from "./access-model.mjs";
import { InstallButton } from "./Install";
import { Calculators } from "./Workspace";
import {
  Header,
  ErrorBox,
  Card,
  Button,
  Field,
  Back,
  useAction,
  ActionStatus,
} from "./ui";
const nav = [
  ["home", "Home", Home],
  ["roadmap", "Roadmap", Route],
  ["coach", "AI Coach", Bot],
  ["vault", "Bóveda", LayoutGrid],
  ["profile", "Perfil", User],
];
const localSteps = blueprintSteps.map((s) => ({
  id: s.id,
  title: s.title,
  description: s.shortDescription,
  status: "available",
}));
function GuestCoach({ api, onAccess }) {
  const [message, setMessage] = useState(""),
    [messages, setMessages] = useState([]);
  const action = useAction();
  return (
    <>
      <Header
        eyebrow="AI SALES COACH · INVITADO"
        title="Entrena para tu próxima conversación."
        subtitle="Explora el método con el coach. Tu conversación se borra al salir de esta pantalla."
      />
      <Card>
        <div className="pilot-coach-intro"><CoachIllustration intro/><div><h2>Tu AI Sales Coach</h2><p>Vamos a preparar tu próxima conversación.</p></div></div><div className="pilot-coach-prompts">{["Preparar presentación","Practicar objeción","Revisar pitch"].map(text=><button key={text} onClick={()=>setMessage(text)}>{text}</button>)}</div>
        <div className="messages" aria-live="polite">
          {!messages.length && (
            <p>¿Qué parte de tu presentación te gustaría mejorar?</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={"message " + m.role}>
              <small>{m.role === "user" ? "TÚ" : "COACH"}</small>
              <p>{m.text}</p>
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const text = message.trim();
            if (text)
              action.run(async () => {
                const result = await api("/api/smart-agent/public-chat", {
                  method: "POST",
                  body: JSON.stringify({
                    message: text,
                    mode: "general_coach",
                  }),
                });
                setMessages((m) => [
                  ...m,
                  { role: "user", text },
                  { role: "assistant", text: result.response },
                ]);
                setMessage("");
              }, "");
          }}
        >
          <Field label="Tu mensaje">
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>
          <Button disabled={action.busy || !message.trim()}>
            Enviar mensaje
          </Button>
          <ActionStatus action={action} />
        </form>
        <div className="notice">
          Inicia sesión para practicar un roleplay y enviarlo a evaluación.
        </div>
        <Button secondary onClick={() => onAccess("roleplay")}>
          Practicar roleplay con mi cuenta
        </Button>
      </Card>
    </>
  );
}
/** Lección pública con contenido real del servidor (nivel Público). */
function GuestLesson({ api, id, step, onLocked, onRegister }) {
  const [state, setState] = useState({ busy: true });
  useEffect(() => {
    let live = true;
    setState({ busy: true });
    api("/api/public/blueprint/steps/" + encodeURIComponent(id))
      .then((d) => live && setState({ step: d.step }))
      .catch((e) => live && setState({ requires: e.code === "requires_plan" ? e.requires : null, error: e.status === 404 ? "Esta lección ya no está disponible." : e.message || "No pudimos cargar la lección." }));
    return () => {
      live = false;
    };
  }, [api, id]);
  if (state.busy) return <Card><p>Cargando…</p></Card>;
  if (state.requires) return <LockedPanel level={state.requires} onLocked={onLocked} />;
  if (!state.step) return <ErrorBox error={state.error} />;
  const data = state.step;
  return (
    <>
      <Back to="roadmap">Roadmap</Back>
      <Header eyebrow={"PASO " + data.step_number + " · PÚBLICO"} title={data.title} subtitle={data.description} />
      <Card>
        <p className="lead">{data.purpose}</p>
        {(data.scripts || []).map((sc) => (
          <article className="script" key={sc.id}>
            <small>{sc.script_type}</small>
            <h2>{sc.title}</h2>
            <p>{sc.body}</p>
            <p className="fine-print">{sc.compliance_note}</p>
          </article>
        ))}
        <ul>{(data.checklist || []).map((c) => <li key={c}>{c}</li>)}</ul>
        <Button onClick={onRegister}>Crea tu cuenta gratis para guardar tu progreso</Button>
      </Card>
    </>
  );
}

export default function GuestWorkspace({
  route,
  api,
  onAccess,
  onRegister = onAccess,
  onRestart,
  onExit,
  theme,
  toggleTheme,
}) {
  const [page, id] = route.split("/");
  const group =
    page === "lesson"
      ? "roadmap"
      : [
            "resources",
            "resource",
            "calculators",
            "goalsheet",
            "notebook",
            "diary",
          ].includes(page)
        ? "vault"
        : page === "roleplay"
          ? "coach"
          : page;
  const access = (target = route) => onAccess(target);
  const [catalog, setCatalog] = useState(null),
    [catalogSteps, setCatalogSteps] = useState(null),
    [sheet, setSheet] = useState(null);
  useEffect(() => {
    let live = true;
    api("/api/public/catalog")
      .then((d) => {
        if (!live) return;
        setCatalog(d);
        setCatalogSteps(d.steps || null);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [api]);
  // El servidor decide los niveles; si no responde, se muestra la vista previa local.
  const steps = catalogSteps || localSteps;
  const locked = (level) => setSheet(level || "gratis");
  let content;
  if (page === "roadmap") content = <Roadmap data={{ steps }} onLocked={locked} />;
  else if (page === "vault") content = <Vault />;
  else if (page === "coach" || page === "roleplay")
    content = <GuestCoach api={api} onAccess={onAccess} />;
  else if (page === "calculators") {
    const decision = itemAccess(catalog, "function:calculators");
    content = decision.kind === "plan" ? <LockedPanel level={decision.level} onLocked={locked} back="vault" backLabel="Bóveda" />
      : decision.kind === "hidden" ? <ErrorBox error="Este módulo no está disponible." />
      : <Calculators />;
  }
  else if (page === "lesson" && catalogSteps) {
    const step = steps.find((s) => s.id === id);
    content = step ? (
      <GuestLesson key={id} api={api} id={id} step={step} onLocked={locked} onRegister={() => onRegister("lesson/" + id)} />
    ) : (
      <Header title="No encontramos esta lección" />
    );
  } else if (page === "lesson") {
    const step = steps.find((s) => s.id === id);
    content = step ? (
      <>
        <Back to="roadmap">Roadmap</Back>
        <Header
          eyebrow="VISTA PREVIA · INVITADO"
          title={step.title}
          subtitle={step.description}
        />
        <Card>
          <h2>Antes de practicar</h2>
          <p>
            Identifica el objetivo de este paso, prepara una pregunta abierta y
            ensaya cómo conectarás la respuesta con la siguiente parte de tu
            conversación.
          </p>
          <p className="fine-print">
            Ejercicio ilustrativo para explorar el método. El contenido completo
            y el progreso se consultan con tu cuenta.
          </p>
          <Button onClick={() => access()}>
            Acceder a la lección completa
          </Button>
          <a className="button secondary" href="#coach">
            Preguntar al coach
          </a>
        </Card>
      </>
    ) : (
      <Header title="No encontramos esta lección" />
    );
  } else if (page === "resources")
    content = (
      <>
        <Back to="vault">Bóveda</Back>
        <Header
          eyebrow="RECURSOS · VISTA PREVIA"
          title="El conocimiento a mano."
        />
        <Card>
          <h2>Guía de práctica: escuchar antes de proponer</h2>
          <p>
            Pregunta qué quiere conseguir tu cliente. Resume lo que escuchaste y
            confirma que lo entendiste antes de presentar una solución.
          </p>
          <p className="fine-print">
            Ejemplo ilustrativo. Inicia sesión para consultar la biblioteca de
            tu academia y sus materiales autorizados.
          </p>
          <Button onClick={() => access()}>Abrir mi biblioteca</Button>
        </Card>
      </>
    );
  else if (page === "profile")
    content = (
      <>
        <Header
          eyebrow="TU ESPACIO"
          title="Estás explorando como invitado."
          subtitle="No se ha creado una cuenta. Esta prueba se reinicia al recargar la página."
        />
        <Card>
          <Button onClick={() => onAccess("home")}>Iniciar sesión</Button>
          <Button secondary onClick={onRestart}>
            Repetir onboarding
          </Button>
          <Button secondary onClick={onExit}>
            Salir de la prueba
          </Button>
        </Card>
      </>
    );
  else if (page === "home")
    content = (
      <>
        <Header
          eyebrow="BIENVENIDO · INVITADO"
          title="Descubre tu siguiente nivel."
          subtitle="Explora el método, conversa con el coach y conoce tus herramientas."
        />
        <Card>
          <h2>¿Por dónde quieres continuar?</h2>
          <div className="action-row">
            <a className="button" href="#roadmap">
              Roadmap
            </a>
            <a className="button secondary" href="#coach">
              AI Sales Coach
            </a>
            <a className="button secondary" href="#vault">
              Bóveda
            </a>
          </div>
          <p className="notice">
            Al iniciar sesión podrás consultar tus resultados y guardar tu
            progreso.
          </p>
        </Card>
      </>
    );
  else
    content = (
      <>
        <Back to="vault">Bóveda</Back>
        <Header
          eyebrow="TU ESPACIO PERSONAL"
          title="Continúa con tu cuenta."
          subtitle="Esta sección guarda información de tu academia y requiere iniciar sesión."
        />
        <Card>
          <Button onClick={() => access()}>Acceder para continuar</Button>
          <Button secondary onClick={onRestart}>
            Seguir explorando
          </Button>
        </Card>
      </>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home">
          <span className="brand-mark">sa</span>Sales Academy
        </a>
        <p className="nav-caption">EXPLORAR</p>
        <nav>
          {nav.map(([key, label, Icon]) => (
            <a
              key={key}
              className={group === key ? "active" : ""}
              href={"#" + key}
            >
              <Icon size={20} />
              {label}
            </a>
          ))}
        </nav>
        <div className="sidebar-coach">
          <Bot />
          <h3>Aprende a tu ritmo.</h3>
          <p className="fine-print">Tu cuenta conserva tu progreso.</p>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <a className="brand mobile-brand" href="#home">
            <span className="brand-mark">SA</span><span>Sales Academy<small className="pilot-brand-subtitle">Edición Top Producer</small></span>
          </a>
          <span className="top-label">EXPLORACIÓN SIN CUENTA</span>
          <div className="top-actions"><InstallButton /></div>
          <button aria-label="Cambiar tema" onClick={toggleTheme}>
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>
        <div className="content">
          <div className="guest-banner">
            <div>
              <strong>Modo invitado</strong>
              <small>Prueba temporal · se reinicia al recargar</small>
            </div>
            <div className="action-row">
              <button className="text-button" onClick={onRestart}>
                Cambiar punto de inicio
              </button>
              <Button secondary onClick={() => access()}>
                Iniciar sesión
              </Button>
              <Button onClick={() => onRegister(route)}>Crear cuenta gratis</Button>
            </div>
          </div>
          {content}
        </div>
        {sheet && (
          <UnlockSheet
            api={api}
            signedIn={false}
            level={sheet}
            onClose={() => setSheet(null)}
            onRegister={() => {
              setSheet(null);
              onRegister(route);
            }}
          />
        )}
        <footer className="app-footer">
          Sales Academy · Exploración temporal
        </footer>
      </main>
      <nav className="bottom-nav" aria-label="Navegación principal">
        {nav.map(([key, label, Icon]) => (
          <a
            key={key}
            className={group === key ? "active" : ""}
            href={"#" + key}
          >
            <Icon size={20} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
