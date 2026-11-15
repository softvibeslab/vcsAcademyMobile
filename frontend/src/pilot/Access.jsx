// Acceso Público / Gratis / Premium (historia HU-AISALES-ACCESO-01).
// Registro, hoja «Desbloquear acceso» (diseño C05), etiquetas de nivel, plan en Perfil y
// panel de administración «Acceso y planes». El servidor decide; aquí solo se pinta.
import React, { useState } from "react";
import { Lock, Sparkles, X, Copy, ShieldCheck, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button, Card, Field, Loading, ErrorBox, Empty, useAction, ActionStatus, useRemote } from "./ui";
import { LEVEL_LABEL, tierLabel, planSummary } from "./access-model.mjs";

export function LevelTag({ level, allowed = true }) {
  if (!level) return null;
  return (
    <span className={"pilot-level " + level + (allowed ? "" : " locked")}>
      {!allowed && <Lock size={12} aria-hidden="true" />}
      {LEVEL_LABEL[level] || level}
    </span>
  );
}

export function RegisterForm({ api, onLogin, destination = "roadmap", onBack, onSignIn }) {
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [consent, setConsent] = useState(false);
  const action = useAction();
  return (
    <>
      <span className="icon-badge">
        <Sparkles />
      </span>
      <h2>Crea tu cuenta gratis</h2>
      <p>Guarda tu progreso y desbloquea los pasos gratuitos del roadmap.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          action.run(async () => {
            const d = await api("/api/auth/register", {
              method: "POST",
              body: JSON.stringify({ display_name: name, email, password, accept_privacy: consent }),
            });
            onLogin(d.token, destination);
          }, "");
        }}
      >
        <Field label="Nombre" autoComplete="name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Correo electrónico" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Contraseña">
          <div className="password-field">
            <input
              aria-label="Contraseña"
              required
              minLength={8}
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setShow(!show)}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Field>
        <p className="fine-print">Mínimo 8 caracteres.</p>
        <label className="pilot-consent">
          <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>Acepto el aviso de privacidad: usamos tu nombre y correo solo para tu cuenta de práctica.</span>
        </label>
        <ActionStatus action={action} />
        <Button disabled={action.busy || !consent}>
          {action.busy ? "Creando tu cuenta…" : "Crear cuenta gratis"} <ArrowRight size={17} />
        </Button>
      </form>
      <div className="pilot-register-links">
        {onSignIn && (
          <button className="text-button" onClick={onSignIn}>
            ¿Ya tienes cuenta? Inicia sesión
          </button>
        )}
        {onBack && (
          <button className="text-button" onClick={onBack}>
            Volver
          </button>
        )}
      </div>
    </>
  );
}

/** Hoja inferior «Desbloquear acceso» (C05). Visitante: invita a registrarse. Con cuenta: canjea código. */
export function UnlockSheet({ api, level = "premium", signedIn, onClose, onUnlocked, onRegister }) {
  const [code, setCode] = useState("");
  const action = useAction();
  const needsAccount = !signedIn;
  return (
    <div className="pilot-sheet-backdrop" role="presentation" onClick={onClose}>
      <section className="pilot-sheet" role="dialog" aria-modal="true" aria-labelledby="unlock-title" onClick={(e) => e.stopPropagation()}>
        <button className="pilot-sheet-close" aria-label="Cerrar" onClick={onClose}>
          <X size={20} />
        </button>
        <span className="icon-badge">
          <Lock />
        </span>
        {needsAccount ? (
          <>
            <h2 id="unlock-title">{level === "gratis" ? "Crea tu cuenta gratis" : "Primero crea tu cuenta gratis"}</h2>
            <p>
              {level === "gratis"
                ? "Este módulo es gratis con tu cuenta. Regístrate y continúa justo aquí."
                : "Este módulo es Premium. Crea tu cuenta gratis y después activa Premium con tu código."}
            </p>
            <Button onClick={onRegister}>Crear cuenta gratis</Button>
          </>
        ) : (
          <>
            <h2 id="unlock-title">Desbloquear Premium</h2>
            <p>Activa tu licencia con el código que te dio tu academia.</p>
            <div className="pilot-plan-box">
              <strong>Plan Premium</strong>
              <small>Los 11 pasos, roleplays y la biblioteca completa. Precio por confirmar con tu academia.</small>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                action.run(async () => {
                  const d = await api("/api/me/redeem", { method: "POST", body: JSON.stringify({ code }) });
                  onUnlocked(d.user);
                }, "¡Listo! Premium activado.");
              }}
            >
              <Field label="Código de licencia" required autoComplete="off" placeholder="SA-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value)} />
              <ActionStatus action={action} />
              <Button disabled={action.busy || code.trim().length < 4}>{action.busy ? "Verificando…" : "Activar Premium"}</Button>
            </form>
          </>
        )}
        <button className="text-button" onClick={onClose}>
          Ahora no
        </button>
      </section>
    </div>
  );
}

export function PlanCard({ user, data, onUnlock }) {
  const summary = planSummary(data?.catalog);
  return (
    <Card className="pilot-plan-card">
      <span className="pilot-tag">TU PLAN</span>
      <h2>{tierLabel(user.tier)}</h2>
      {summary && <p>Tienes acceso a {summary.open} de {summary.total} módulos.</p>}
      {user.tier === "premium" && <p>{user.plan_expires_at ? "Premium vence el " + user.plan_expires_at + "." : "Premium sin vencimiento."}</p>}
      {user.tier === "gratis" && (
        <Button onClick={onUnlock}>
          <Sparkles size={16} /> Tengo un código premium
        </Button>
      )}
    </Card>
  );
}

const KIND_LABEL = { leccion: "Lección", escenario: "Escenario", funcion: "Función", recurso: "Recurso" };

/** Panel de administración: niveles por elemento, códigos premium y plan por usuario. */
export function AccessAdmin({ api }) {
  const [tab, setTab] = useState("items"),
    [version, setVersion] = useState(0),
    [kind, setKind] = useState(""),
    [query, setQuery] = useState(""),
    [newCode, setNewCode] = useState(null),
    [codeForm, setCodeForm] = useState({ plan_days: 90, max_uses: 1, expires_at: "" });
  const action = useAction();
  const path = { items: "/api/admin/access-items", codes: "/api/admin/license-codes", users: "/api/admin/users" }[tab];
  const r = useRemote(api, path, version);
  const reload = () => setVersion((v) => v + 1);
  const save = (id, body, label) =>
    action.run(async () => {
      await api("/api/admin/access-items/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify(body) });
      reload();
    }, label);
  return (
    <section className="pilot-access-admin" aria-label="Acceso y planes">
      <div className="pilot-access-head">
        <ShieldCheck size={20} />
        <h2>Acceso y planes</h2>
      </div>
      <div className="segmented tabs">
        {[["items", "Contenido"], ["codes", "Códigos"], ["users", "Planes de usuarios"]].map(([v, l]) => (
          <button key={v} className={tab === v ? "selected" : ""} onClick={() => { setTab(v); setNewCode(null); }}>
            {l}
          </button>
        ))}
      </div>
      <ActionStatus action={action} />
      {r.busy ? (
        <Loading />
      ) : r.error ? (
        <ErrorBox error={r.error} retry={r.retry} />
      ) : tab === "items" ? (
        <>
          <div className="pilot-access-filters">
            <Field label="Tipo">
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="">Todos</option>
                {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            <Field label="Buscar" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <p className="fine-print">
            Resumen visible: {r.data.summary.publico} públicos · {r.data.summary.gratis} gratis · {r.data.summary.premium} premium.
            Los cambios aplican en la siguiente carga de cada usuario.
          </p>
          <div className="pilot-access-table" role="table" aria-label="Niveles de acceso">
            <div className="row head" role="row"><span>Elemento</span><span>Tipo</span><span>Nivel</span><span>Visible</span></div>
            {r.data.items
              .filter((i) => (!kind || i.kind === kind) && i.title.toLowerCase().includes(query.toLowerCase()))
              .map((i) => (
                <div className="row" role="row" key={i.id}>
                  <span>{i.title}</span>
                  <span>{KIND_LABEL[i.kind] || i.kind}</span>
                  <select aria-label={"Nivel de " + i.title} value={i.level} disabled={action.busy}
                    onChange={(e) => save(i.id, { level: e.target.value }, i.title + ": nivel " + LEVEL_LABEL[e.target.value] + ".")}>
                    {Object.entries(LEVEL_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                  <label className="pilot-switch">
                    <input type="checkbox" aria-label={"Visible: " + i.title} checked={i.visible} disabled={action.busy}
                      onChange={(e) => save(i.id, { visible: e.target.checked }, i.title + (e.target.checked ? " visible." : " oculto."))} />
                    <span>{i.visible ? "Sí" : "No"}</span>
                  </label>
                </div>
              ))}
          </div>
        </>
      ) : tab === "codes" ? (
        <>
          <form
            className="pilot-access-filters"
            onSubmit={(e) => {
              e.preventDefault();
              action.run(async () => {
                const d = await api("/api/admin/license-codes", {
                  method: "POST",
                  body: JSON.stringify({ ...codeForm, plan_days: Number(codeForm.plan_days), max_uses: Number(codeForm.max_uses) }),
                });
                setNewCode(d.code.code);
                reload();
              }, "Código generado. Cópialo ahora: no se vuelve a mostrar.");
            }}
          >
            <Field label="Días de Premium" type="number" min={1} max={3650} required value={codeForm.plan_days} onChange={(e) => setCodeForm({ ...codeForm, plan_days: e.target.value })} />
            <Field label="Usos" type="number" min={1} max={1000} required value={codeForm.max_uses} onChange={(e) => setCodeForm({ ...codeForm, max_uses: e.target.value })} />
            <Field label="Canjear antes de" type="date" required value={codeForm.expires_at} onChange={(e) => setCodeForm({ ...codeForm, expires_at: e.target.value })} />
            <Button disabled={action.busy}>Generar código</Button>
          </form>
          {newCode && (
            <div className="notice pilot-new-code">
              <strong>{newCode}</strong>
              <button type="button" className="text-button" onClick={() => navigator.clipboard?.writeText(newCode)}>
                <Copy size={14} /> Copiar
              </button>
            </div>
          )}
          {r.data.codes.length ? (
            <div className="pilot-access-table codes" role="table" aria-label="Códigos premium">
              <div className="row head" role="row"><span>Código</span><span>Días</span><span>Usos</span><span>Vence</span><span>Estado</span><span /></div>
              {r.data.codes.map((c) => (
                <div className="row" role="row" key={c.id}>
                  <span>…{c.hint}</span><span>{c.plan_days}</span><span>{c.uses}/{c.max_uses}</span><span>{c.expires_at}</span>
                  <span className={"pilot-code-status " + c.status}>{c.status}</span>
                  <span>
                    {c.status === "activo" && (
                      <button className="text-button" disabled={action.busy}
                        onClick={() => action.run(async () => { await api("/api/admin/license-codes/" + c.id, { method: "DELETE" }); reload(); }, "Código revocado.")}>
                        Revocar
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="Aún no hay códigos">Genera uno para activar Premium a un usuario.</Empty>
          )}
        </>
      ) : (
        <div className="pilot-access-table users" role="table" aria-label="Planes de usuarios">
          <div className="row head" role="row"><span>Usuario</span><span>Rol</span><span>Plan</span><span>Vence</span></div>
          {r.data.users.map((u) => (
            <div className="row" role="row" key={u.id}>
              <span>{u.display_name}<small>{u.email}</small></span>
              <span>{u.tier === "staff" ? "Equipo" : "Rep"}</span>
              <select aria-label={"Plan de " + u.display_name} value={u.plan} disabled={action.busy || u.tier === "staff"}
                onChange={(e) => action.run(async () => {
                  await api("/api/admin/users/" + u.id + "/plan", { method: "PATCH", body: JSON.stringify({ plan: e.target.value, plan_expires_at: e.target.value === "premium" ? u.plan_expires_at : null }) });
                  reload();
                }, u.display_name + ": plan " + (e.target.value === "premium" ? "Premium" : "Gratis") + ".")}>
                <option value="gratis">Gratis</option>
                <option value="premium">Premium</option>
              </select>
              {u.tier === "staff" ? (
                <span>Acceso completo</span>
              ) : (
                <form className="pilot-expiry" onSubmit={(e) => {
                  e.preventDefault();
                  const value = new FormData(e.currentTarget).get("expires") || null;
                  action.run(async () => {
                    await api("/api/admin/users/" + u.id + "/plan", { method: "PATCH", body: JSON.stringify({ plan: u.plan, plan_expires_at: value }) });
                    reload();
                  }, u.display_name + ": " + (value ? "Premium hasta el " + value : "Premium sin vencimiento") + ".");
                }}>
                  <input type="date" name="expires" aria-label={"Vencimiento de " + u.display_name} disabled={action.busy || u.plan !== "premium"}
                    defaultValue={(u.plan_expires_at || "").slice(0, 10)} title="Vacío = Premium sin vencimiento" />
                  <button type="submit" className="text-button" aria-label={"Guardar vencimiento de " + u.display_name} disabled={action.busy || u.plan !== "premium"}>Guardar</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
