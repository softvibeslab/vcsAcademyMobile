import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Home,
  Map,
  Layers3,
  Users,
  UserRound,
  ArrowUpRight,
  BookOpen,
  Check,
  Eye,
  EyeOff,
  LogOut,
  KeyRound,
  Globe,
  Target,
  ClipboardList,
} from "lucide-react";
import { api, setCsrf, setExpiredHandler } from "./api.mjs";
import {
  Context,
  useApp,
  useT,
  Button,
  Field,
  ErrorBox,
  Loading,
  Modal,
  Notice,
  useAction,
} from "./ui.jsx";
import { routeForRole } from "./model.mjs";
import { HomePage, DayPage, GoalsPage, LegacyPage } from "./Activity.jsx";
import {
  RoutePage,
  LessonPage,
  OwnerPage,
  EditorPage,
  RequestsPage,
  TeamPage,
  SettingsPage,
} from "./Learning.jsx";
import { ResourcesPage, NotesPage, CalculatorsPage } from "./Resources.jsx";
import "../pilot/fonts.css";
import "./styles.css";
const currentRoute = () => {
  const [route = "home", id = ""] = window.location.hash
    .replace(/^#\/?/, "")
    .split("/");
  return { route: route || "home", id };
};
function App() {
  const [session, setSession] = useState(null),
    [checking, setChecking] = useState(true),
    [locale, setLocale] = useState(
      () => localStorage.getItem("sa.pilot-v5.locale") || "en",
    ),
    [location, setLocation] = useState(currentRoute),
    [version, setVersion] = useState(0),
    [account, setAccount] = useState(false),
    [guide, setGuide] = useState(false),
    [expired, setExpired] = useState(false),
    [preview, setPreview] = useState(false);
  const dirty = useRef(false),
    routeRef = useRef(window.location.hash),
    sessionRef = useRef(session);
  sessionRef.current = session;
  const t = (en, es) => (locale === "es" ? es : en);
  const refresh = () => setVersion((n) => n + 1);
  const onSession = useCallback((data) => {
    setSession(data);
    if (data.user?.locale) setLocale(data.user.locale);
    setExpired(false);
  }, []);
  const navigate = useCallback(
    (route, id = "") => {
      if (
        dirty.current &&
        !window.confirm(
          locale === "es"
            ? "Tienes cambios sin guardar. ¿Salir sin guardar?"
            : "You have unsaved changes. Leave without saving?",
        )
      )
        return;
      dirty.current = false;
      window.location.hash = route + (id ? "/" + encodeURIComponent(id) : "");
    },
    [locale],
  );
  useEffect(() => {
    setExpiredHandler(() => {
      setSession(null);
      setCsrf("");
      setExpired(true);
      setAccount(false);
      setPreview(false);
    });
    api("/api/mobile/me")
      .then(onSession)
      .catch(() => {})
      .finally(() => setChecking(false));
    return () => setExpiredHandler(() => {});
  }, []);
  useEffect(() => {
    const onHash = () => {
      if (
        dirty.current &&
        !window.confirm(
          locale === "es"
            ? "Tienes cambios sin guardar. ¿Salir sin guardar?"
            : "You have unsaved changes. Leave without saving?",
        )
      ) {
        history.replaceState(null, "", routeRef.current || "#home");
        return;
      }
      dirty.current = false;
      routeRef.current = window.location.hash;
      setLocation(currentRoute());
      window.scrollTo({ top: 0 });
      requestAnimationFrame(() => document.querySelector("main h1")?.focus());
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [locale]);
  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem("sa.pilot-v5.locale", locale);
    document.title =
      (session?.organization?.app_name || "Sales Academy") +
      " · " +
      t("Your next level", "Tu siguiente nivel");
  }, [locale, session]);
  useEffect(() => {
    if (
      !session?.user ||
      session.must_change_password ||
      session.user.must_change_password
    )
      return;
    const key = "sa.pilot-v5.guide." + session.user.id;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, "seen");
      setGuide(true);
    }
  }, [
    session?.user?.id,
    session?.must_change_password,
    session?.user?.must_change_password,
  ]);
  const logout = async () => {
    if (
      dirty.current &&
      !window.confirm(
        t(
          "You have unsaved changes. Sign out without saving?",
          "Tienes cambios sin guardar. ¿Cerrar sesión sin guardar?",
        ),
      )
    )
      return;
    await api("/api/auth/logout", { method: "POST" });
    setSession(null);
    setCsrf("");
    setAccount(false);
    setGuide(false);
    setPreview(false);
    window.location.hash = "home";
  };
  const changeLocale = async (value) => {
    if (!session) {
      setLocale(value);
      return;
    }
    await api("/api/pilot/me/preferences", {
      method: "PATCH",
      body: { locale: value },
    });
    setLocale(value);
    setSession((s) => ({ ...s, user: { ...s.user, locale: value } }));
  };
  const role = session?.user?.role || session?.user?.pilot_role;
  const route = routeForRole(role, location.route),
    id = decodeURIComponent(location.id);
  const owner = role === "owner" && !preview;
  const context = {
    session,
    user: session?.user,
    organization: session?.organization,
    locale,
    t,
    changeLocale,
    navigate,
    refresh,
    version,
    logout,
    setSession: onSession,
    role,
    preview,
    setPreview,
    setUnsaved: (v) => {
      dirty.current = v;
    },
    openGuide: () => setGuide(true),
  };
  let page;
  if (route === "home") page = <HomePage />;
  else if (route === "day") page = <DayPage />;
  else if (route === "goals") page = <GoalsPage />;
  else if (route === "route") page = <RoutePage />;
  else if (route === "lesson") page = <LessonPage id={id} />;
  else if (route === "notebook" || route === "diary")
    page = <NotesPage kind={route} />;
  else if (route === "resources") page = <ResourcesPage />;
  else if (route === "calculators") page = <CalculatorsPage />;
  else if (route === "owner") page = <OwnerPage />;
  else if (route === "editor") page = <EditorPage id={id} />;
  else if (route === "requests") page = <RequestsPage />;
  else if (route === "team") page = <TeamPage id={id} />;
  else if (route === "settings") page = <SettingsPage />;
  else if (route === "legacy") page = <LegacyPage />;
  return (
    <Context.Provider value={context}>
      <div className="v-app">
        {checking ? (
          <Loading />
        ) : !session ? (
          <Access expired={expired} />
        ) : session.must_change_password ||
          session.user?.must_change_password ? (
          <div className="v-access">
            <PasswordForm required />
          </div>
        ) : (
          <>
            <a
              className="v-skip"
              href="#main-content"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector("main h1")?.focus();
              }}
            >
              {t("Skip to content", "Ir al contenido")}
            </a>
            <header className="v-topbar">
              <button
                className="v-brand"
                onClick={() => navigate(owner ? "owner" : "home")}
              >
                <span className="v-brand-mark">
                  <ArrowUpRight size={23} />
                </span>
                <span>
                  {session.organization?.app_name || "Sales Academy"}
                  <small>
                    {owner
                      ? t("Your academy", "Tu academia")
                      : t("Your next level", "Tu siguiente nivel")}
                  </small>
                </span>
              </button>
              <div className="v-top-actions">
                <LocaleControl />
                <button
                  className="v-icon"
                  aria-label={t("My account", "Mi cuenta")}
                  onClick={() => setAccount(true)}
                >
                  <UserRound size={21} />
                </button>
              </div>
            </header>
            {preview && (
              <div className="v-preview">
                {t("Representative preview", "Vista previa del vendedor")}
                <button
                  className="v-link"
                  onClick={() => {
                    setPreview(false);
                    navigate("owner");
                  }}
                >
                  {t("Return to my academy", "Volver a mi academia")}
                </button>
              </div>
            )}
            <main
              id="main-content"
              className="v-main"
              data-route={route + (id ? "/" + id : "")}
              key={route + "/" + id}
            >
              {page}
            </main>
            <nav
              className="v-dock"
              aria-label={t("Main navigation", "Navegación principal")}
            >
              {(owner
                ? [
                    [Map, "owner", t("My roadmap", "Mi roadmap")],
                    [Users, "team", t("My team", "Mi equipo")],
                  ]
                : [
                    [Home, "home", t("Home", "Inicio")],
                    [Map, "route", t("Route", "Ruta")],
                    [Layers3, "resources", t("Resources", "Recursos")],
                  ]
              ).map(([Icon, dest, label]) => (
                <button
                  key={dest}
                  className={
                    route === dest ||
                    (dest === "home" &&
                      ["day", "goals", "legacy"].includes(route)) ||
                    (dest === "route" && route === "lesson") ||
                    (dest === "resources" &&
                      ["notebook", "diary", "calculators"].includes(route)) ||
                    (dest === "owner" &&
                      ["editor", "requests", "settings"].includes(route))
                      ? "active"
                      : ""
                  }
                  aria-current={route === dest ? "page" : undefined}
                  onClick={() => navigate(dest)}
                >
                  <Icon size={22} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
            {account && (
              <Modal
                title={t("My account", "Mi cuenta")}
                onClose={() => setAccount(false)}
              >
                <Account onDone={() => setAccount(false)} />
              </Modal>
            )}
            {guide && <Guide onClose={() => setGuide(false)} />}
          </>
        )}
      </div>
    </Context.Provider>
  );
}
function LocaleControl() {
  const { locale, changeLocale } = useApp();
  const action = useAction();
  return (
    <div>
      <div className="v-languages" aria-label="Language / Idioma">
        {[
          ["en", "English"],
          ["es", "Español"],
        ].map(([code, label]) => (
          <button
            key={code}
            disabled={action.busy}
            aria-pressed={locale === code}
            onClick={() => action.run(() => changeLocale(code))}
          >
            {label}
          </button>
        ))}
      </div>
      <ErrorBox error={action.error} />
    </div>
  );
}
function Access({ expired }) {
  const t = useT(),
    { setSession } = useApp(),
    [mode, setMode] = useState("welcome"),
    [perspective, setPerspective] = useState("representative"),
    [step, setStep] = useState(0),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [recoverySent, setRecoverySent] = useState(false),
    action = useAction();
  const submit = (e) => {
    e.preventDefault();
    action.run(async () => {
      if (mode === "recover") {
        await api("/api/auth/forgot-password", {
          method: "POST",
          body: { email },
        });
        setRecoverySent(true);
      } else {
        const data = await api("/api/auth/login", {
          method: "POST",
          body: { email, password },
        });
        setPassword("");
        setSession(data);
        if (
          (data.user.role || data.user.pilot_role) === "owner" &&
          !window.location.hash.includes("lesson")
        )
          window.location.hash = "owner";
      }
    });
  };
  return (
    <div className="v-access">
      <div className="v-access-top">
        <span className="v-brand">
          <span className="v-brand-mark">
            <ArrowUpRight />
          </span>
          Sales Academy
        </span>
        <LocaleControl />
      </div>
      {mode === "welcome" ? (
        <div className="v-welcome">
          <span className="v-eyebrow">
            {t("LEARN. APPLY. GROW.", "APRENDE. APLICA. CRECE.")}
          </span>
          <div className="v-welcome-art" aria-hidden="true">
            <div className="v-orbit" />
            <div className="v-art-tile a">
              <Map size={34} />
              <span>01</span>
            </div>
            <div className="v-art-tile b">
              <Target size={52} />
            </div>
            <div className="v-art-tile c">
              <Check size={28} />
              <span>↗</span>
            </div>
          </div>
          <h1>
            {t("Your next sale starts here.", "Tu próxima venta empieza aquí.")}
          </h1>
          <p>
            {t(
              "Learn your sales route, track your day, and work toward your goals.",
              "Aprende tu ruta de venta, registra tu día y avanza hacia tus metas.",
            )}
          </p>
          {expired && (
            <Notice>
              {t(
                "Your session expired. Sign in again to continue.",
                "Tu sesión venció. Inicia sesión de nuevo para continuar.",
              )}
            </Notice>
          )}
          <Button
            onClick={() => {
              setStep(0);
              setMode("intro");
            }}
          >
            {t("Get started", "Comenzar")}
            <ArrowUpRight size={18} />
          </Button>
          <Button secondary onClick={() => setMode("login")}>
            {t("Sign in", "Iniciar sesión")}
          </Button>
          <small>
            {t(
              "Your private learning workspace",
              "Tu espacio privado de aprendizaje",
            )}
          </small>
        </div>
      ) : mode === "intro" ? (
        <div className="v-auth-card">
          <span className="v-eyebrow">
            {t("YOUR FIRST STEP", "TU PRIMER PASO")}
          </span>
          <h1>
            {step === 0
              ? t("A better way to grow.", "Una mejor forma de crecer.")
              : step === 1
                ? t("Choose your perspective.", "Elige tu perspectiva.")
                : t(
                    "Where do you want to begin?",
                    "¿Por dónde quieres comenzar?",
                  )}
          </h1>
          <p>
            {t(
              "Your lessons, results, and tools in one place. Sign in with the account provided by your academy.",
              "Tus lecciones, resultados y herramientas en un lugar. Inicia sesión con la cuenta que te proporcionó tu academia.",
            )}
          </p>
          {step === 0 ? (
            <>
              <div className="v-feature-list">
                {[
                  [Map, t("Learn your route", "Aprende tu ruta")],
                  [ClipboardList, t("Record your day", "Registra tu día")],
                  [
                    Target,
                    t("Work toward your goals", "Avanza hacia tus metas"),
                  ],
                ].map(([Icon, label]) => (
                  <div key={label}>
                    <Icon />
                    <strong>{label}</strong>
                  </div>
                ))}
              </div>
              <Button onClick={() => setStep(1)}>
                {t("Continue", "Continuar")}
              </Button>
            </>
          ) : step === 1 ? (
            <>
              <div
                className="v-perspectives"
                role="group"
                aria-label={t("Your perspective", "Tu perspectiva")}
              >
                {[
                  ["representative", t("Representative", "Vendedor")],
                  ["manager", t("Manager", "Gerente")],
                  ["director", t("Director", "Dirección")],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={perspective === value}
                    onClick={() => setPerspective(value)}
                  >
                    {label}
                    <ArrowUpRight size={17} />
                  </button>
                ))}
              </div>
              <p className="v-muted">
                {perspective === "representative"
                  ? t(
                      "Your account opens your private learning and daily activity.",
                      "Tu cuenta abre tu aprendizaje privado y actividad diaria.",
                    )
                  : t(
                      "Sales Academy provides owner access. Ask your contact to enable your account.",
                      "Tu acceso de dueño te lo da Sales Academy. Pide a tu contacto que habilite tu cuenta.",
                    )}
              </p>
              <Button onClick={() => setStep(2)}>
                {t("Continue", "Continuar")}
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => {
                  window.location.hash = "route";
                  setMode("login");
                }}
              >
                <Map size={20} />
                {t("Route", "Ruta")}
              </Button>
              <Button
                secondary
                onClick={() => {
                  window.location.hash = "resources";
                  setMode("login");
                }}
              >
                <Layers3 size={20} />
                {t("Resources", "Recursos")}
              </Button>
            </>
          )}
          <p className="v-muted">
            {t(
              "Manager or director? Sales Academy provides owner access. Ask your contact to enable your account.",
              "¿Gerente o dirección? Tu acceso de dueño te lo da Sales Academy. Pide a tu contacto que habilite tu cuenta.",
            )}
          </p>
          <button className="v-link" onClick={() => setMode("welcome")}>
            {t("Back", "Volver")}
          </button>
        </div>
      ) : (
        <form className="v-auth-card" onSubmit={submit}>
          <span className="v-eyebrow">
            {t("WELCOME BACK", "BIENVENIDO DE NUEVO")}
          </span>
          <h1>
            {mode === "recover"
              ? t("Recover access", "Recuperar acceso")
              : t("Your next level awaits.", "Tu siguiente nivel te espera.")}
          </h1>
          <p>
            {mode === "recover"
              ? t(
                  "Ask your academy administrator to restore your access. Recovery is handled personally; no automatic email will be sent.",
                  "Pídele al administrador de tu academia que restablezca tu acceso. La recuperación es personal; no se enviará un correo automático.",
                )
              : t("Sign in to your academy.", "Entra a tu academia.")}
          </p>
          <Field
            label={t("Email", "Correo")}
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {mode !== "recover" && (
            <>
              <div className="v-password">
                <Field
                  label={t("Password", "Contraseña")}
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="v-icon"
                  type="button"
                  aria-label={
                    show
                      ? t("Hide password", "Ocultar contraseña")
                      : t("Show password", "Mostrar contraseña")
                  }
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff /> : <Eye />}
                </button>
              </div>
              <button
                className="v-link"
                type="button"
                onClick={() => {
                  setMode("recover");
                  action.clear();
                }}
              >
                {t("Forgot your password?", "¿Olvidaste tu contraseña?")}
              </button>
            </>
          )}
          <ErrorBox error={action.error} />
          {recoverySent && mode === "recover" && (
            <Notice>
              {t(
                "Contact your manager or academy administrator to restore access.",
                "Contacta a tu gerente o administrador de la academia para recuperar tu acceso.",
              )}
            </Notice>
          )}
          <Button busy={action.busy} type="submit">
            {mode === "recover"
              ? t(
                  "Show recovery instructions",
                  "Ver instrucciones de recuperación",
                )
              : t("Sign in", "Iniciar sesión")}
            <ArrowUpRight size={18} />
          </Button>
          <button
            type="button"
            className="v-link"
            onClick={() => {
              setMode(mode === "recover" ? "login" : "welcome");
              action.clear();
            }}
          >
            {t("Back", "Volver")}
          </button>
        </form>
      )}
      <footer>
        Sales Academy · {t("Learn with intention.", "Aprende con intención.")}
      </footer>
    </div>
  );
}
function PasswordForm({ required = false, onDone }) {
  const t = useT(),
    { setSession } = useApp(),
    action = useAction(),
    [current, setCurrent] = useState(""),
    [next, setNext] = useState(""),
    [confirm, setConfirm] = useState(""),
    [mismatch, setMismatch] = useState(false),
    [show, setShow] = useState(false);
  return (
    <form
      className={required ? "v-auth-card" : ""}
      onSubmit={(e) => {
        e.preventDefault();
        if (next !== confirm) {
          setMismatch(true);
          return;
        }
        action.run(async () => {
          const data = await api("/api/auth/change-password", {
            method: "POST",
            body: { current_password: current, new_password: next },
          });
          setCurrent("");
          setNext("");
          setConfirm("");
          if (data.user) setSession(data);
          else setSession(await api("/api/mobile/me"));
          onDone?.();
        });
      }}
    >
      <div className="v-section-icon">
        <KeyRound />
      </div>
      <h2>
        {required
          ? t("Set your personal password", "Define tu contraseña personal")
          : t("Change password", "Cambiar contraseña")}
      </h2>
      <p>
        {required
          ? t(
              "Replace your temporary password before entering your academy.",
              "Reemplaza tu contraseña temporal antes de entrar a tu academia.",
            )
          : t(
              "Other sessions will be signed out.",
              "Las otras sesiones se cerrarán.",
            )}
      </p>
      <Field
        label={
          required
            ? t("Temporary password", "Contraseña temporal")
            : t("Current password", "Contraseña actual")
        }
        type={show ? "text" : "password"}
        required
        autoComplete="current-password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
      />
      <Field
        label={t("New password", "Nueva contraseña")}
        hint={t("12–128 characters.", "De 12 a 128 caracteres.")}
        type={show ? "text" : "password"}
        required
        minLength={12}
        maxLength={128}
        autoComplete="new-password"
        value={next}
        onChange={(e) => {
          setNext(e.target.value);
          setMismatch(false);
        }}
      />
      <Field
        label={t("Confirm new password", "Confirmar nueva contraseña")}
        type={show ? "text" : "password"}
        required
        minLength={12}
        maxLength={128}
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => {
          setConfirm(e.target.value);
          setMismatch(false);
        }}
      />
      {mismatch && (
        <div className="v-error" role="alert">
          {t("The passwords do not match.", "Las contraseñas no coinciden.")}
        </div>
      )}
      <button type="button" className="v-link" onClick={() => setShow(!show)}>
        {show
          ? t("Hide passwords", "Ocultar contraseñas")
          : t("Show passwords", "Mostrar contraseñas")}
      </button>
      <ErrorBox error={action.error} />
      <Button type="submit" busy={action.busy}>
        {t("Save password", "Guardar contraseña")}
      </Button>
    </form>
  );
}
function Account({ onDone }) {
  const { user, logout, openGuide } = useApp(),
    t = useT(),
    [change, setChange] = useState(false),
    action = useAction();
  return (
    <>
      <p className="v-account-name">{user.display_name}</p>
      {change ? (
        <PasswordForm onDone={() => setChange(false)} />
      ) : (
        <div className="v-account-actions">
          <LocaleControl />
          <Button secondary onClick={() => setChange(true)}>
            <KeyRound size={18} />
            {t("Change password", "Cambiar contraseña")}
          </Button>
          <Button
            secondary
            onClick={() => {
              onDone();
              openGuide();
            }}
          >
            <BookOpen size={18} />
            {t("View start guide", "Ver guía de inicio")}
          </Button>
          <Button
            secondary
            busy={action.busy}
            onClick={() => action.run(logout)}
          >
            <LogOut size={18} />
            {t("Sign out", "Cerrar sesión")}
          </Button>
          <ErrorBox error={action.error} />
        </div>
      )}
    </>
  );
}
function Guide({ onClose }) {
  const t = useT(),
    { user, organization, navigate, role, locale } = useApp(),
    [step, setStep] = useState(0);
  const cards = [
    [
      Target,
      t("Give your month a direction.", "Dale dirección a tu mes."),
      t(
        "Confirm your monthly volume goal once. It becomes the reference for your budget indicators.",
        "Confirma una vez tu meta mensual de volumen. Será la referencia de tus indicadores de presupuesto.",
      ),
      "goals",
    ],
    [
      ClipboardList,
      t("Every tour has a place.", "Cada tour tiene su lugar."),
      t(
        "Record Q, CT, NQ, or No Tour. Keep customer personal information outside this workspace.",
        "Registra Q, CT, NQ o No Tour. Mantén los datos personales de clientes fuera de este espacio.",
      ),
      "day",
    ],
    [
      Map,
      t("Turn learning into progress.", "Convierte aprendizaje en avance."),
      t(
        "Open a lesson, watch its video, review the script, and mark it completed.",
        "Abre una lección, mira su video, revisa el guion y márcala como completada.",
      ),
      "route",
    ],
  ];
  const [Icon, title, body, dest] = cards[step];
  return (
    <Modal
      title={t("Your first steps", "Tus primeros pasos")}
      onClose={onClose}
    >
      <div className="v-guide">
        <span className="v-eyebrow">
          {(locale === "es"
            ? organization?.welcome_title_es || organization?.welcome_title_en
            : organization?.welcome_title_en) ||
            t("WELCOME, ", "HOLA, ") + user.display_name}
        </span>
        <div className="v-guide-icon">
          <Icon size={45} />
        </div>
        <h3>{title}</h3>
        <p>{body}</p>
        <div className="v-dots">
          {cards.map((_, i) => (
            <button
              key={i}
              aria-label={t("Step ", "Paso ") + (i + 1)}
              aria-current={step === i ? "step" : undefined}
              className={step === i ? "active" : ""}
              onClick={() => setStep(i)}
            />
          ))}
        </div>
        <Button
          onClick={() => {
            onClose();
            navigate(role === "owner" ? "owner" : dest);
          }}
        >
          {role === "owner"
            ? t("Open my academy", "Abrir mi academia")
            : t("Try this step", "Ir a este paso")}
          <ArrowUpRight size={17} />
        </Button>
        {step < 2 && (
          <Button secondary onClick={() => setStep(step + 1)}>
            {t("Next", "Siguiente")}
          </Button>
        )}
        <button className="v-link" onClick={onClose}>
          {t("Skip guide", "Omitir guía")}
        </button>
      </div>
    </Modal>
  );
}
createRoot(document.getElementById("root")).render(<App />);
