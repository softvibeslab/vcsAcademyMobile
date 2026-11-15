import React, { useEffect, useState, useId } from "react";
import {
  ArrowRight,
  LoaderCircle,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";
export function Button({ children, secondary = false, ...props }) {
  return (
    <button className={secondary ? "button secondary" : "button"} {...props}>
      {children}
    </button>
  );
}
export function Card({ children, className = "" }) {
  return <section className={"card " + className}>{children}</section>;
}
export function Field({ label, children, ...props }) {
  const id = useId();
  const direct =
    !children || ["input", "textarea", "select"].includes(children.type);
  return (
    <div className="field">
      {direct ? <label htmlFor={id}>{label}</label> : <span>{label}</span>}
      {children ? (
        direct ? (
          React.cloneElement(children, { id })
        ) : (
          children
        )
      ) : (
        <input id={id} {...props} />
      )}
    </div>
  );
}
export function Header({ eyebrow, title, subtitle, action }) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
export function Empty({ title = "Todavía no hay información", children }) {
  return (
    <div className="empty">
      <span className="empty-orbit">✦</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function ErrorBox({ error, retry }) {
  return error ? (
    <div className="error" role="alert">
      <AlertCircle size={17} />
      <span>{error}</span>
      {retry && <button onClick={retry}>Reintentar</button>}
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" /> Cargando tu espacio…
    </div>
  );
}
export function Back({ to = "home", children = "Volver" }) {
  return (
    <a className="back-link" href={"#" + to}>
      <ChevronLeft size={16} />
      {children}
    </a>
  );
}
export function Tile({ icon: Icon, title, description, to, badge }) {
  return (
    <a className="tile" href={"#" + to}>
      <span className="tile-icon">
        <Icon size={22} />
      </span>
      <div>
        {badge && <small>{badge}</small>}
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <ArrowRight size={18} />
    </a>
  );
}
export function useRemote(api, path, revision = 0) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [retry, setRetry] = useState(0),
    [loadedPath, setLoadedPath] = useState("");
  useEffect(() => {
    let live = true;
    setData(null);
    setBusy(true);
    setError("");
    api(path)
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) {
          setLoadedPath(path);
          setBusy(false);
        }
      });
    return () => {
      live = false;
    };
  }, [api, path, revision, retry]);
  return {
    data,
    error,
    busy: busy || loadedPath !== path,
    retry: () => setRetry((x) => x + 1),
  };
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  async function run(fn, message = "Cambios guardados.") {
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await fn();
      setSuccess(message);
      return result;
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return {
    busy,
    error,
    success,
    run,
    reset: () => {
      setError("");
      setSuccess("");
    },
  };
}
export function ActionStatus({ action }) {
  return (
    <>
      <ErrorBox error={action.error} />
      {action.success && (
        <p className="success" role="status">
          {action.success}
        </p>
      )}
    </>
  );
}
