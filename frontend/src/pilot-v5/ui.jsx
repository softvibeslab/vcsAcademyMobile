import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  X,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";
import { api } from "./api.mjs";
export const Context = createContext({});
export const useApp = () => useContext(Context);
export const useT = () => {
  const { locale } = useApp();
  return (en, es) => (locale === "es" ? es : en);
};
export function useData(path, dependencies = []) {
  const [state, setState] = useState({
      data: null,
      loading: true,
      error: null,
    }),
    [reload, setReload] = useState(0);
  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    api(path, { signal: controller.signal })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => {
        if (error.name !== "AbortError")
          setState((s) => ({ ...s, loading: false, error }));
      });
    return () => controller.abort();
  }, [path, reload, ...dependencies]);
  return { ...state, reload: () => setReload((n) => n + 1) };
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(null);
  return {
    busy,
    error,
    clear: () => setError(null),
    run: async (fn) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        return await fn();
      } catch (e) {
        setError(e);
        return undefined;
      } finally {
        setBusy(false);
      }
    },
  };
}
const errors = {
  network_error: [
    "Your changes were not saved. Keep this screen open and retry when you reconnect.",
    "No se guardaron tus cambios. Mantén esta pantalla abierta y reintenta cuando tengas conexión.",
  ],
  access_not_available: [
    "This email does not have access yet. Ask your manager to add you.",
    "Este correo todavía no tiene acceso. Pídele a tu gerente que te dé de alta.",
  ],
  temporary_password_expired: [
    "Your temporary password has expired. Ask your academy administrator for a new one.",
    "Tu contraseña temporal venció. Pídele una nueva al administrador de tu academia.",
  ],
  login_rate_limited: [
    "Too many attempts. Wait a moment before trying again.",
    "Demasiados intentos. Espera un momento antes de reintentar.",
  ],
  current_password_incorrect: [
    "Your current password is incorrect.",
    "Tu contraseña actual es incorrecta.",
  ],
  password_must_change: [
    "Choose a new password different from the current one.",
    "Elige una contraseña nueva diferente a la actual.",
  ],
  invalid_credentials: [
    "Check your email and password.",
    "Revisa tu correo y contraseña.",
  ],
  invalid_login: [
    "Check your email and password.",
    "Revisa tu correo y contraseña.",
  ],
  access_not_allowed: [
    "This email does not have access yet. Ask your manager to add you.",
    "Este correo no tiene acceso todavía. Pídele a tu gerente que te dé de alta.",
  ],
  not_allowlisted: [
    "This email does not have access yet. Ask your manager to add you.",
    "Este correo no tiene acceso todavía. Pídele a tu gerente que te dé de alta.",
  ],
  account_not_authorized: [
    "This email does not have access yet. Ask your manager to add you.",
    "Este correo no tiene acceso todavía. Pídele a tu gerente que te dé de alta.",
  ],
  session_expired: [
    "Your session expired. Sign in again.",
    "Tu sesión venció. Inicia sesión de nuevo.",
  ],
  conflict: [
    "This record changed. Reload it before trying again.",
    "Este registro cambió. Recárgalo antes de volver a intentar.",
  ],
  version_conflict: [
    "This record changed on another device. Reload it to continue.",
    "Este registro cambió en otro dispositivo. Recárgalo para continuar.",
  ],
  goal_exists: [
    "Your goal for this month has already been confirmed.",
    "Tu meta de este mes ya está confirmada.",
  ],
  goal_immutable: [
    "A confirmed monthly goal cannot be changed.",
    "Una meta mensual confirmada no puede cambiarse.",
  ],
  access_denied: [
    "You do not have permission to open this content.",
    "No tienes permiso para abrir este contenido.",
  ],
  lesson_access_required: [
    "Ask your academy owner for access to this lesson.",
    "Solicita acceso a esta lección al dueño de tu academia.",
  ],
  invalid_money: [
    "Enter an amount with up to two decimal places, without thousands separators.",
    "Escribe un monto con hasta dos decimales, sin separadores de miles.",
  ],
  invalid_number: [
    "Check that the numbers are within the limits shown.",
    "Revisa que los números estén dentro de los límites indicados.",
  ],
  validation_error: [
    "Review the highlighted fields and try again.",
    "Revisa los campos indicados e inténtalo de nuevo.",
  ],
  rate_limited: [
    "Too many attempts. Please wait before trying again.",
    "Demasiados intentos. Espera antes de volver a intentar.",
  ],
  password_change_required: [
    "Set your personal password to continue.",
    "Define tu contraseña personal para continuar.",
  ],
  csrf_invalid: [
    "Your session needs to be refreshed. Reload this page and try again.",
    "Tu sesión necesita actualizarse. Recarga esta página y reintenta.",
  ],
  upload_too_large: [
    "The PDF must be 10 MiB or smaller.",
    "El PDF debe pesar 10 MiB o menos.",
  ],
  invalid_pdf: [
    "Choose a valid PDF document.",
    "Elige un documento PDF válido.",
  ],
  invalid_video_url: [
    "Use a valid HTTPS YouTube or Vimeo video link.",
    "Usa un enlace HTTPS válido de YouTube o Vimeo.",
  ],
  lesson_not_found: [
    "This lesson is no longer available. Return to your route.",
    "Esta lección ya no está disponible. Vuelve a tu ruta.",
  ],
  lesson_not_published: [
    "This lesson is not published yet.",
    "Esta lección todavía no está publicada.",
  ],
  lesson_access_denied: [
    "You do not have access to this lesson. Request it from your academy owner.",
    "No tienes acceso a esta lección. Solicítalo al dueño de tu academia.",
  ],
  request_failed: [
    "We could not complete this action. Your changes have not been confirmed. Please retry.",
    "No pudimos completar esta acción. Tus cambios no están confirmados. Reintenta.",
  ],
};
export function errorText(error, locale = "en") {
  const pair = errors[error?.code || error?.message] || errors.request_failed;
  return pair[locale === "es" ? 1 : 0];
}
export function ErrorBox({ error, retry }) {
  const { locale } = useApp();
  const t = useT();
  if (!error) return null;
  return (
    <div className="v-error" role="alert">
      <AlertCircle size={19} />
      <div>
        {errorText(error, locale)}
        {Object.keys(error.fields || {}).length > 0 && (
          <p>
            {t("Please check: ", "Revisa: ")}
            {Object.keys(error.fields)
              .map(
                (k) =>
                  ({
                    email: t("email", "correo"),
                    password: t("password", "contraseña"),
                    new_password: t("new password", "nueva contraseña"),
                    occurred_on: t("date", "fecha"),
                    net_volume_cents: t("net volume", "volumen neto"),
                    video_url: t("video link", "enlace del video"),
                    title_en: t("English title", "título en inglés"),
                  })[k] || t("form fields", "campos del formulario"),
              )
              .join(", ")}
          </p>
        )}
        {retry && (
          <button className="v-link" onClick={retry}>
            <RefreshCw size={15} />
            {t("Try again", "Reintentar")}
          </button>
        )}
      </div>
    </div>
  );
}
export function Loading() {
  const t = useT();
  return (
    <div className="v-loading" role="status">
      <LoaderCircle className="spin" size={23} />
      {t("Loading…", "Cargando…")}
    </div>
  );
}
export function Empty({ title, children, action }) {
  return (
    <div className="v-empty">
      <div className="v-empty-mark">↗</div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Page({ title, eyebrow, description, back, actions, children }) {
  const { navigate } = useApp();
  const t = useT();
  return (
    <section className="v-page">
      {back && (
        <button className="v-link v-back" onClick={() => navigate(back)}>
          <ArrowLeft size={17} />
          {t("Back", "Volver")}
        </button>
      )}
      <header className="v-page-title">
        <div>
          {eyebrow && <span className="v-eyebrow">{eyebrow}</span>}
          <h1 tabIndex="-1">{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="v-actions">{actions}</div>}
      </header>
      {children}
    </section>
  );
}
export function Button({
  children,
  secondary = false,
  danger = false,
  busy = false,
  ...props
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={
        "v-button " +
        (secondary ? "secondary " : "") +
        (danger ? "danger " : "") +
        (props.className || "")
      }
    >
      {busy && <LoaderCircle size={17} className="spin" />}
      {children}
    </button>
  );
}
export function Field({ label, hint, children, ...props }) {
  const id = useId(),
    described = hint || props.maxLength ? id + "-help" : undefined;
  const controlProps = { ...props, id, "aria-describedby": described };
  delete controlProps.multiline;
  return (
    <div className="v-field">
      <label htmlFor={id}>{label}</label>
      {children ? (
        React.cloneElement(children, { id, "aria-describedby": described })
      ) : props.multiline ? (
        <textarea {...controlProps} />
      ) : (
        <input {...controlProps} />
      )}
      {(hint || props.maxLength) && (
        <small id={described} className="v-field-help">
          {hint && <span>{hint}</span>}
          {props.maxLength && typeof props.value === "string" && (
            <span className="v-field-count">
              {props.value.length} / {props.maxLength}
            </span>
          )}
        </small>
      )}
    </div>
  );
}
export function Modal({ title, onClose, children, dirty = false }) {
  const ref = useRef(),
    heading = useId();
  const t = useT();
  const close = () => {
    if (
      !dirty ||
      window.confirm(
        t(
          "You have unsaved changes. Leave without saving?",
          "Tienes cambios sin guardar. ¿Salir sin guardar?",
        ),
      )
    )
      onClose();
  };
  useEffect(() => {
    const d = ref.current;
    const trigger = document.activeElement;
    d.showModal();
    return () => {
      if (d.open) d.close();
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus();
    };
  }, []);
  return (
    <dialog
      className="v-modal"
      ref={ref}
      aria-labelledby={heading}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = [
          ...ref.current.querySelectorAll(
            'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
          ),
        ].filter((node) => node.getClientRects().length > 0);
        if (!controls.length) {
          event.preventDefault();
          return;
        }
        const first = controls[0],
          last = controls[controls.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            !ref.current.contains(document.activeElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !ref.current.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="v-modal-top">
        <h2 id={heading}>{title}</h2>
        <button
          className="v-icon"
          aria-label={t("Close", "Cerrar")}
          onClick={close}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Notice({ children }) {
  return (
    <div className="v-notice" role="status">
      <CheckCircle2 size={18} />
      {children}
    </div>
  );
}
export function LoadState({ load, children }) {
  if (load.loading && !load.data) return <Loading />;
  if (load.error) return <ErrorBox error={load.error} retry={load.reload} />;
  return children(load.data);
}
export function More({ cursor, onMore, busy }) {
  const t = useT();
  return cursor ? (
    <Button secondary busy={busy} onClick={onMore}>
      {t("Load more", "Cargar más")}
    </Button>
  ) : null;
}
export const list = (data) => data?.items || data?.entries || [];
