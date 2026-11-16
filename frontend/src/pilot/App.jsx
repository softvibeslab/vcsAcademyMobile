import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Home,
  Route,
  Bot,
  LayoutGrid,
  User,
  Users,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  CalendarDays,
  ChevronRight,
} from "lucide-react";
import Auth from "./Auth";
import GuestWorkspace from "./GuestWorkspace";
import { UnlockSheet } from "./Access";
import { InstallButton } from "./Install";
import { GuideSheet, GuideCard, GuideProfileCard } from "./Guide";
import { guideKey, emptyGuide, shouldAutoOpen, markGuide, routeEvent } from "./guide-model.mjs";
import { planError, itemAccess } from "./access-model.mjs";
import { Header, Loading, ErrorBox, Button } from "./ui";
import { canManage, roleLabel } from "./model.mjs";
import { HomeView, GoalSheet, Agenda, Profile, Calculators } from "./Workspace";
import {
  Roadmap,
  Lesson,
  Vault,
  Resources,
  ResourceDetail,
  Notebook,
  LockedPanel,
} from "./Learning";
import { Coach, Feedback } from "./Coach";
import { Team, Admin } from "./Management";
import "./styles.css";
import "./fonts.css";
import "./training-design.css";
import "./access.css";
import "./guide.css";
const SESSION = "sa.pilot.session",
  BASE = (import.meta.env.VITE_PILOT_API_BASE_URL || "").replace(/\/$/, "");
const nav = [
  ["home", "Home", Home],
  ["roadmap", "Roadmap", Route],
  ["coach", "AI Coach", Bot],
  ["vault", "Bóveda", LayoutGrid],
  ["profile", "Perfil", User],
];
function App() {
  const [token, setToken] = useState(() => localStorage.getItem(SESSION) || ""),
    [theme, setTheme] = useState(
      () => localStorage.getItem("sa.pilot.theme") || "dark",
    ),
    [user, setUser] = useState(null),
    [data, setData] = useState(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [route, setRoute] = useState(() => location.hash.slice(1) || "home");
  const [unlock, setUnlock] = useState(null);
  const [guide, setGuideState] = useState(null),
    [guideOpen, setGuideOpen] = useState(false);
  const [guest, setGuest] = useState(false),
    [authEntry, setAuthEntry] = useState({
      view: "welcome",
      destination: "home",
    });
  const currentToken = useRef(token);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("sa.pilot.theme", theme);
  }, [theme]);
  useEffect(() => {
    const change = () => {
      setRoute(location.hash.slice(1) || "home");
      if (location.hash.startsWith("#access/")) setGuest(false);
      window.scrollTo(0, 0);
    };
    addEventListener("hashchange", change);
    return () => removeEventListener("hashchange", change);
  }, []);
  const clear = useCallback(() => {
    currentToken.current = "";
    localStorage.removeItem(SESSION);
    setToken("");
    setGuest(false);
    setAuthEntry({ view: "welcome", destination: "home" });
    setUser(null);
    setData(null);
    setError("");
  }, []);
  const api = useCallback(
    async (path, options = {}) => {
      let response;
      try {
        response = await fetch(BASE + path, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: "Bearer " + token } : {}),
            ...options.headers,
          },
        });
      } catch {
        throw Error(
          "No pudimos conectar con la academia. Comprueba la conexión e inténtalo de nuevo.",
        );
      }
      let payload;
      try {
        payload = await response.json();
      } catch {
        throw Error("El servicio no respondió correctamente.");
      }
      if (currentToken.current !== token)
        throw Error("La sesión cambió. Vuelve a abrir esta pantalla.");
      if (!response.ok) {
        if (response.status === 401 && token) clear();
        const detail = payload.detail;
        if (detail && typeof detail === "object" && !Array.isArray(detail))
          throw Object.assign(Error(detail.message || "No tienes acceso a esto."), detail, { status: response.status });
        throw Object.assign(Error(
          Array.isArray(detail)
            ? detail.map((x) => x.msg).join(". ")
            : detail ||
                payload.message ||
                "No fue posible completar la acción.",
        ), { status: response.status });
      }
      return payload.data || {};
    },
    [token, clear],
  );
  const refresh = () => setRevision((n) => n + 1);
  // Guía de inicio: estado por cuenta en este dispositivo (FTD guia-de-inicio).
  const setGuide = useCallback(
    (next) => {
      if (!user) return;
      setGuideState(next);
      try {
        localStorage.setItem(guideKey(user.id), JSON.stringify(next));
      } catch {}
    },
    [user],
  );
  useEffect(() => {
    if (!user) return setGuideState(null);
    try {
      setGuideState({ ...emptyGuide(), ...JSON.parse(localStorage.getItem(guideKey(user.id)) || "{}") });
    } catch {
      setGuideState(emptyGuide());
    }
  }, [user?.id]);
  useEffect(() => {
    if (!guide || !data) return;
    if (shouldAutoOpen(guide, route.split("/")[0])) {
      setGuide({ ...guide, seen: true });
      setGuideOpen(true);
      return;
    }
    const marked = markGuide(guide, routeEvent(route));
    if (marked !== guide) setGuide(marked);
  }, [guide, data, route, setGuide]);
  useEffect(() => {
    if (!token) return;
    let live = true;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const me = await api("/api/mobile/me");
        // Un módulo bloqueado por plan no tumba la carga: devuelve vacío y la UI muestra el candado.
        // También 404: el admin pudo ocultar el módulo.
        const soft = (p, fallback) => api(p).catch((e) => (planError(e) || e.status === 404 ? fallback : Promise.reject(e)));
        const [
          dashboard,
          blueprint,
          history,
          resources,
          feedback,
          certifications,
          reminders,
          catalog,
        ] = await Promise.all([
          api("/api/dashboard/rep"),
          api("/api/blueprint/steps"),
          soft("/api/goalsheet/history", { entries: [], locked: true }),
          api("/api/resources"),
          api("/api/roleplay/submissions/mine"),
          api("/api/certifications/mine"),
          soft("/api/reminders/upcoming", { reminders: [] }),
          soft("/api/public/catalog", null),
        ]);
        if (live) {
          setUser(me.user);
          setData({
            dashboard,
            steps: blueprint.steps,
            entries: history.entries,
            resources: resources.resources,
            submissions: feedback.submissions,
            decisions: certifications.decisions,
            reminders: reminders.reminders,
            catalog,
            goalsheetLocked: Boolean(history.locked),
          });
        }
      } catch (e) {
        if (live) setError(e.message);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [token, api, revision]);
  function login(value, destination = "home") {
    currentToken.current = value;
    localStorage.setItem(SESSION, value);
    setToken(value);
    setGuest(false);
    location.hash =
      /^(home|roadmap|coach|roleplay|vault|profile|goalsheet|notebook|diary|resources|resources\/(guides|scripts|audio)|calculators|team|admin|lesson\/[a-zA-Z0-9_-]+|resource\/[a-zA-Z0-9_-]+)$/.test(
        destination,
      )
        ? destination
        : "home";
  }
  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
    } finally {
      clear();
      location.hash = "home";
    }
  }
  if (!token && guest)
    return (
      <GuestWorkspace
        route={route}
        api={api}
        theme={theme}
        toggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        onAccess={(destination) => {
          setAuthEntry({ view: "login", destination });
          setGuest(false);
          location.hash = "access/login";
        }}
        onRegister={(destination) => {
          setAuthEntry({ view: "register", destination });
          setGuest(false);
          location.hash = "access/register";
        }}
        onRestart={() => {
          setAuthEntry({ view: "start", destination: route });
          setGuest(false);
          location.hash = "access/start";
        }}
        onExit={() => {
          setGuest(false);
          setAuthEntry({ view: "welcome", destination: "home" });
          location.hash = "access/welcome";
        }}
      />
    );
  if (!token)
    return (
      <Auth
        api={api}
        onLogin={login}
        initialView={authEntry.view}
        initialDestination={authEntry.destination}
        onGuest={(destination) => {
          setGuest(true);
          location.hash = destination;
        }}
        theme={theme}
        toggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
      />
    );
  if (!user || !data)
    return (
      <div className="startup">
        <a className="brand" href="pilot.html">
          <span className="brand-mark">sa</span>Sales Academy
        </a>
        {loading ? (
          <Loading />
        ) : (
          <>
            <ErrorBox error={error} retry={refresh} />
            <Button secondary onClick={clear}>
              Volver al acceso
            </Button>
          </>
        )}
      </div>
    );
  const [page, id] = route.split("/");
  const group = ["lesson"].includes(page)
    ? "roadmap"
    : [
          "goalsheet",
          "notebook",
          "diary",
          "resources",
          "resource",
          "calculators",
        ].includes(page)
      ? "vault"
      : ["feedback", "roleplay"].includes(page)
        ? "coach"
        : page;
  const props = {
    api,
    user,
    data,
    refresh,
    revision,
    onLocked: (level) => setUnlock({ level }),
    onGuideEvent: (event) => guide && setGuide(markGuide(guide, event)),
  };
  // Funciones que viven solo en el navegador: su nivel se aplica aquí con el catálogo del servidor.
  const gate = (itemId) => {
    const decision = itemAccess(data.catalog, itemId);
    if (decision.kind === "plan")
      return <LockedPanel level={decision.level} onLocked={props.onLocked} back="vault" backLabel="Bóveda" />;
    if (decision.kind === "hidden")
      return <ErrorBox error="Este módulo no está disponible en tu academia." />;
    return null;
  };
  let content;
  switch (page) {
    case "home":
      content = (
        <>
          <GuideCard user={user} data={data} guide={guide} setGuide={setGuide} onOpen={() => setGuideOpen(true)} />
          <HomeView {...props} />
        </>
      );
      break;
    case "roadmap":
      content = <Roadmap {...props} />;
      break;
    case "lesson":
      content = <Lesson key={id} {...props} id={id} />;
      break;
    case "coach":
    case "roleplay":
      content = (
        <Coach
          {...props}
          initialTab={page === "roleplay" ? "practice" : "chat"}
        />
      );
      break;
    case "feedback":
      content = <Feedback {...props} />;
      break;
    case "vault":
      content = <Vault {...props} />;
      break;
    case "goalsheet":
      content = data.goalsheetLocked ? (
        <LockedPanel level="premium" onLocked={props.onLocked} back="vault" backLabel="Bóveda" />
      ) : (
        <GoalSheet key={id || "today"} {...props} initialDate={id} />
      );
      break;
    case "agenda":
      content = <Agenda {...props} />;
      break;
    case "profile":
      content = (
        <Profile
          {...props}
          logout={logout}
          onUnlock={() => setUnlock({ level: "premium" })}
          guideSlot={<GuideProfileCard user={user} data={data} guide={guide} setGuide={setGuide} onOpen={() => setGuideOpen(true)} />}
        />
      );
      break;
    case "notebook":
    case "diary":
      content = gate("function:notebook") || (
        <Notebook key={page + user.id} {...props} diary={page === "diary"} />
      );
      break;
    case "resources":
      content = <Resources {...props} kind={id} />;
      break;
    case "resource":
      content = <ResourceDetail key={id} {...props} id={id} />;
      break;
    case "calculators":
      content = gate("function:calculators") || <Calculators />;
      break;
    case "team":
      content = canManage(user) ? (
        <Team {...props} />
      ) : (
        <ErrorBox error="Tu cuenta no tiene acceso al espacio de equipo." />
      );
      break;
    case "admin":
      content = user.roles.includes("admin") ? (
        <Admin {...props} />
      ) : (
        <ErrorBox error="Tu cuenta no tiene acceso a administración." />
      );
      break;
    default:
      content = (
        <>
          <Header title="Esta pantalla no está disponible" />
          <a className="button" href="#home">
            Ir a Home
          </a>
        </>
      );
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home">
          <span className="brand-mark">sa</span>
          <span>
            Sales Academy<small>TOP PRODUCER EDITION</small>
          </span>
        </a>
        <p className="nav-caption">TU ESPACIO</p>
        <nav>
          {nav.map(([key, label, Icon]) => (
            <a
              key={key}
              className={group === key ? "active" : ""}
              href={"#" + key}
            >
              <Icon size={20} />
              {label}
              <ChevronRight size={14} />
            </a>
          ))}
          {canManage(user) && (
            <>
              <p className="nav-caption">TU ORGANIZACIÓN</p>
              <a className={page === "team" ? "active" : ""} href="#team">
                <Users size={20} />
                Equipo
              </a>
            </>
          )}
          {user.roles.includes("admin") && (
            <a className={page === "admin" ? "active" : ""} href="#admin">
              <ShieldCheck size={20} />
              Administración
            </a>
          )}
        </nav>
        <div className="sidebar-coach">
          <Bot size={28} />
          <h3>
            Una práctica.
            <br />
            Un paso adelante.
          </h3>
          <a href="#roleplay">
            Entrenar ahora <ChevronRight size={15} />
          </a>
        </div>
        <div className="account">
          <span className="avatar">{user.display_name.slice(0, 1)}</span>
          <div>
            <strong>{user.display_name}</strong>
            <small>{roleLabel(user)}</small>
          </div>
          <button aria-label="Cerrar sesión" onClick={logout}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <a className="mobile-brand brand" href="#home">
            <span className="brand-mark">SA</span><span>Sales Academy<small className="pilot-brand-subtitle">Edición Top Producer</small></span>
          </a>
          <span className="top-label">TU MÉTODO. TU CRECIMIENTO.</span>
          <div className="top-actions"><InstallButton /><a className="pilot-method-link" href="#roadmap">Método</a>
            <a href="#agenda" aria-label="Abrir agenda">
              <CalendarDays size={20} />
            </a>
            <button
              aria-label="Cambiar tema"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <a className="avatar" href="#profile" aria-label="Abrir perfil">
              {user.display_name.slice(0, 1)}
            </a>
          </div>
        </header>
        <div className="content" key={user.id}>
          <ErrorBox error={error} retry={refresh} />
          {loading && (
            <div className="refreshing" role="status">
              Actualizando…
            </div>
          )}
          {content}
        </div>
        <footer className="app-footer">
          Sales Academy <span>by AgenticOS</span>
        </footer>
      </main>
      {guideOpen && guide && (
        <GuideSheet user={user} data={data} guide={guide} setGuide={setGuide} onClose={() => setGuideOpen(false)} />
      )}
      {unlock && (
        <UnlockSheet
          api={api}
          signedIn
          level={unlock.level}
          onClose={() => setUnlock(null)}
          onUnlocked={() => {
            setUnlock(null);
            refresh();
          }}
        />
      )}
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
createRoot(document.getElementById("root")).render(<App />);
