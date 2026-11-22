import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Target,
  TrendingUp,
  CalendarDays,
  CheckCircle2,
  Route,
  Bot,
  Plus,
  Users,
  ShieldCheck,
} from "lucide-react";
import {
  Header,
  Card,
  Button,
  Field,
  Empty,
  Back,
  useAction,
  ActionStatus,
  Tile,
} from "./ui";
import { PlanCard } from "./Access";
import { SmartAgenda } from "./SmartAgenda";
import { isDateKey } from "../components/calendar/calendar-model.mjs";
import {
  periodEntries,
  metricsFor,
  localDate,
  money,
  goalPayload,
  canManage,
  roleLabel,
} from "./model.mjs";
function readGoal(id) {
  try {
    return JSON.parse(localStorage.getItem("sa.pilot.goal." + id) || "{}");
  } catch {
    return {};
  }
}
export function HomeView({ user, data }) {
 const [period,setPeriod]=useState('month');
 const entries=periodEntries(data.entries,period), metrics=metricsFor(entries),goal=readGoal(user.id);
 const activeGoal=goal.month===localDate().slice(0,7)?Number(goal.amount)||0:0;
 const monthVolume=metricsFor(periodEntries(data.entries,'month')).volume;
 const percent=activeGoal?Math.round(monthVolume/activeGoal*100):0;
 const insight=data.entries.find(e=>e.smart_agent_insight)?.smart_agent_insight;
 const completed=data.steps.filter(s=>s.status==='completed').length;
 return <div className="pilot-home-page">
  <Header title="Mi desempeño" subtitle="Tu actividad y resultados del Goal Sheet"/>
  <div className="segmented pilot-periods">{[['today','Hoy'],['week','Semana'],['month','Mes']].map(([value,label])=><button key={value} className={period===value?'selected':''} onClick={()=>setPeriod(value)}>{label}</button>)}</div>
  <div className="pilot-period-label"><span>Periodo visualizado:</span><span className="chip">{period==='today'?'Hoy':period==='week'?'Semana actual':'Mes actual'}</span></div>
  <Card className="pilot-goal-summary"><div className="section-heading"><h2>MI GOAL</h2><a href="#profile" className="chip">{activeGoal?'Ajustar meta':'Definir meta'}</a></div><div className="pilot-goal-values"><div><small>META MENSUAL</small><strong>{activeGoal?money(activeGoal):'Sin definir'}</strong></div><div><small>ACTUAL DEL MES</small><strong>{money(monthVolume)}</strong></div><div><small>AVANCE</small><strong>{activeGoal?percent+'%':'—'}</strong></div></div><div className="progress"><span style={{width:Math.min(100,percent)+'%'}}/></div><p>Volumen en USD · Tu meta y los registros de tu cuenta.</p></Card>
  <div className="pilot-home-metrics">{[['Tours / Qs',metrics.qualifiedTours,'Tours calificados'],['Ventas',metrics.salesCount,'Ventas del periodo'],['Cierre',metrics.closingPercent+'%','Ventas / tours calificados'],['VPG',money(metrics.vpg),'Volumen por tour · USD']].map(([label,value,caption])=><Card key={label}><h2>{label}</h2><p>{caption}</p><strong>{value}</strong><small>Registros del Goal Sheet</small></Card>)}</div>
  <Card className="pilot-channel-card"><div className="section-heading"><div><h2>Distribución por canal</h2><p>Agencia vs. Socios</p></div><span className="chip">Canal / Origen</span></div><div className="pilot-channel-empty"><span>Agencia <strong>—</strong></span><span>Socios <strong>—</strong></span></div><p className="fine-print">Tus registros actuales no incluyen canal de origen. No se atribuyen ventas a un canal sin ese dato.</p><div className="pilot-home-total">Totales del periodo: {metrics.qualifiedTours} tours · {metrics.salesCount} ventas · {money(metrics.volume)} USD</div></Card>
  <Card className="pilot-activity-card"><div className="section-heading"><h2>Actividad del periodo</h2><small>{entries.length} registros</small></div>{entries.length?<div className="bar-chart">{entries.slice().sort((a,b)=>a.date.localeCompare(b.date)).slice(-10).map(e=><div key={e.id||e.date}><div className="bar-track"><span style={{height:Math.max(5,Number(e.number_of_sales)/Math.max(1,...entries.map(x=>Number(x.number_of_sales)))*100)+'%'}}/></div><small>{e.date.slice(5)}</small></div>)}</div>:<p className="muted">Tu actividad aparecerá aquí cuando registres tu primer Goal Sheet.</p>}</Card>
  <Card className="pilot-followups"><div className="section-heading"><div><h2>Follow-ups pendientes</h2><p>Tus siguientes pasos</p></div><a href="#agenda" className="chip">Ver agenda</a></div>{data.reminders.length?data.reminders.slice(0,3).map(r=><div className="list-row" key={r.id}><CalendarDays size={18}/><div><strong>{r.note||'Seguimiento pendiente'}</strong><small>{r.follow_up_date}</small></div></div>):<p className="muted">No tienes seguimientos pendientes. Puedes agregarlos desde el Goal Sheet.</p>}</Card>
  <Card className="pilot-home-coach"><div className="section-heading"><div><h2>Recomendaciones del AI Coach</h2><p>A partir de tu práctica y reflexión</p></div><span className="pilot-tag">AI COACH</span></div><div className="pilot-coach-flow">Tu feedback en Smart Diary → AI Sales Coach → Siguiente práctica</div><section className="pilot-coach-recommendation"><h3>{insight?'Tu siguiente mejora':'Prepara tu próxima conversación'}</h3><p>{insight||'Comparte una objeción o una situación de tu última presentación para practicar con el coach.'}</p><a className="button secondary" href="#coach">Practicar con AI Coach <ArrowRight size={16}/></a></section><a className="pilot-vault-link" href="#roadmap">Continuar entrenamiento · {completed} de {data.steps.length} módulos <ArrowRight size={16}/></a></Card>
  <Card className="pilot-home-goalsheet"><div className="pilot-vault-heading"><span className="tile-icon"><Target size={22}/></span><div><h2>Completar Smart Goal Sheet</h2><p>Cuestionarios en Bóveda → Smart Goal Sheet</p></div></div><a className="button" href="#goalsheet">Ir a Smart Goal Sheet <ArrowRight size={18}/></a></Card>
 </div>;
}
export function GoalSheet({ api, data, refresh, initialDate, followupDate }) {
  const initial = (date) => ({
    ...{
      date,
      tour_outcome: "qualified",
      sales_outcome: "no_sale",
      sales_volume: 0,
      number_of_sales: 1,
      manager_to_name: "",
      no_sale_reason: "",
      notes: "",
      follow_ups: [],
    },
    ...data.entries.find((e) => e.date === date),
  });
  const [form, setForm] = useState(() => initial(/^\d{4}-\d{2}-\d{2}$/.test(initialDate || "") ? initialDate : localDate())),
    [followDate, setFollowDate] = useState(isDateKey(followupDate) ? followupDate : ""),
    [followNote, setFollowNote] = useState("");
  const followupInput = useRef(null);
  useEffect(() => {
    if (isDateKey(followupDate)) {
      setFollowDate(followupDate);
      followupInput.current?.focus();
      followupInput.current?.scrollIntoView({ block: "center" });
    }
  }, [followupDate]);
  const action = useAction();
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  async function submit(e) {
    e.preventDefault();
    await action.run(async () => {
      const payload = goalPayload(form);
      if (followNote.trim()) {
        if (!followDate)
          throw Error("Selecciona una fecha para el seguimiento.");
        payload.follow_ups = [
          ...payload.follow_ups,
          { follow_up_date: followDate, note: followNote.trim() },
        ];
      }
      await api("/api/goalsheet", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setForm(payload);
      setFollowDate("");
      setFollowNote("");
      refresh();
    }, "Actividad guardada. Tu desempeño ya está actualizado.");
  }
  return (
    <>
      <Back to="vault">Bóveda</Back>
      <Header
        eyebrow="SMART GOAL SHEET"
        title="Haz que cada día cuente."
        subtitle="Registra tu actividad y consulta los resultados en Home."
      />
      <div className="form-layout">
        <Card>
          <form onSubmit={submit}>
            <Field
              label="Fecha"
              type="date"
              required
              max={localDate()}
              value={form.date}
              onChange={(e) => {
                setForm(initial(e.target.value));
                setFollowNote("");
                setFollowDate("");
              }}
            />
            <div className="notice">
              Se guarda un registro por día. Si ya existe, actualizarás su
              información.
            </div>
            <Field label="Tipo de tour">
              <div className="segmented wrap">
                {[
                  ["qualified", "Q · Calificado"],
                  ["close_today", "CT · Cierra hoy"],
                  ["not_qualified", "NQ · No calificado"],
                  ["no_tour", "Sin tour"],
                ].map(([v, l]) => (
                  <button
                    type="button"
                    key={v}
                    className={form.tour_outcome === v ? "selected" : ""}
                    onClick={() => set("tour_outcome", v)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="¿Hubo venta?">
              <div className="segmented">
                <button
                  type="button"
                  className={form.sales_outcome === "sold" ? "selected" : ""}
                  onClick={() => {
                    set("sales_outcome", "sold");
                    if (!form.number_of_sales) set("number_of_sales", 1);
                  }}
                >
                  Sí
                </button>
                <button
                  type="button"
                  className={form.sales_outcome === "no_sale" ? "selected" : ""}
                  onClick={() => set("sales_outcome", "no_sale")}
                >
                  No
                </button>
              </div>
            </Field>
            {form.sales_outcome === "sold" ? (
              <div className="two-col">
                <Field
                  label="Volumen · USD"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.sales_volume}
                  onChange={(e) => set("sales_volume", e.target.value)}
                />
                <Field
                  label="Número de ventas"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={form.number_of_sales}
                  onChange={(e) => set("number_of_sales", e.target.value)}
                />
              </div>
            ) : (
              <Field label="Motivo de no venta">
                <textarea
                  value={form.no_sale_reason || ""}
                  onChange={(e) => set("no_sale_reason", e.target.value)}
                  placeholder="¿Cuál fue la principal objeción?"
                />
              </Field>
            )}
            <Field
              label="Manager / T.O. · opcional"
              value={form.manager_to_name || ""}
              onChange={(e) => set("manager_to_name", e.target.value)}
            />
            <Field label="Notas">
              <textarea
                value={form.notes || ""}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Tu aprendizaje del día"
              />
            </Field>
            <h3>Próximo seguimiento</h3>
            <Field label="Acción">
              <input
                ref={followupInput}
                value={followNote}
                onChange={(e) => setFollowNote(e.target.value)}
                placeholder="Confirmar el siguiente paso"
              />
            </Field>
            <Field
              label="Fecha de seguimiento"
              type="date"
              value={followDate}
              onChange={(e) => setFollowDate(e.target.value)}
            />
            {form.follow_ups.map((f, i) => (
              <div className="list-row" key={i}>
                <div>
                  {f.note}
                  <small>{f.follow_up_date}</small>
                </div>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    set(
                      "follow_ups",
                      form.follow_ups.filter((_, n) => n !== i),
                    )
                  }
                >
                  Quitar
                </button>
              </div>
            ))}
            <ActionStatus action={action} />
            <Button disabled={action.busy}>
              {action.busy ? "Guardando…" : "Guardar registro"}
              <CheckCircle2 size={18} />
            </Button>
          </form>
        </Card>
        <Card className="aside-card">
          <span className="icon-badge">
            <TrendingUp />
          </span>
          <h2>
            El hábito hace
            <br />
            la diferencia.
          </h2>
          <p>
            Una captura honesta conecta tus resultados con tu entrenamiento.
          </p>
          <p className="fine-print">
            El historial usa las categorías del sistema actual. Tours / Qs
            cuenta Q y CT; no se añade una clasificación de canal que el
            servidor no admite.
          </p>
          <a className="inline-link" href="#home">
            Ver mi desempeño <ArrowRight size={16} />
          </a>
        </Card>
      </div>
    </>
  );
}
export function Agenda(props) {
  return <SmartAgenda {...props} />;
}
export function Profile({ user, data, api, logout, onUnlock, guideSlot }) {
  const [goal, setGoal] = useState(() => ({
      month: localDate().slice(0, 7),
      amount: "",
      ...readGoal(user.id),
    })),
    [oldPassword, setOldPassword] = useState(""),
    [newPassword, setNewPassword] = useState("");
  const action = useAction(),
    goalAction = useAction();
  return (
    <>
      <Header
        eyebrow="TU ESPACIO"
        title="Perfil y progreso"
        subtitle="Personaliza tu objetivo y administra tu acceso."
      />
      <PlanCard user={user} data={data} onUnlock={onUnlock} />
      {guideSlot}
      <div className="two-col">
        <Card>
          <div className="profile-identity">
            <span className="avatar large">
              {user.display_name.slice(0, 1)}
            </span>
            <h2>{user.display_name}</h2>
            <p>{user.email}</p>
            <span className="chip">{roleLabel(user)}</span>
          </div>
          <div className="list-row">
            <span>Módulos completados</span>
            <strong>
              {data.steps.filter((s) => s.status === "completed").length} / 11
            </strong>
          </div>
          <div className="list-row">
            <span>Prácticas enviadas</span>
            <strong>{data.submissions.length}</strong>
          </div>
          <div className="list-row">
            <span>Certificación</span>
            <strong>{data.decisions[0]?.status || "En progreso"}</strong>
          </div>
          {canManage(user) && (
            <a className="button secondary" href="#team">
              <Users size={18} /> Abrir mi equipo
            </a>
          )}
          {user.roles.includes("admin") && (
            <a className="button secondary" href="#admin">
              <ShieldCheck size={18} /> Administración
            </a>
          )}
          <Button secondary onClick={logout}>
            Cerrar sesión
          </Button>
        </Card>
        <div className="stack">
          <Card>
            <h2>Meta del mes</h2>
            <p className="muted">
              Se conserva en este navegador para tu cuenta.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                goalAction.run(async () => {
                  if (Number(goal.amount) <= 0)
                    throw Error("La meta debe ser mayor a cero.");
                  localStorage.setItem(
                    "sa.pilot.goal." + user.id,
                    JSON.stringify(goal),
                  );
                }, "Meta guardada en este navegador.");
              }}
            >
              <Field
                label="Mes"
                type="month"
                required
                value={goal.month}
                onChange={(e) => setGoal({ ...goal, month: e.target.value })}
              />
              <Field
                label="Volumen objetivo · USD"
                type="number"
                min="1"
                step="0.01"
                required
                value={goal.amount}
                onChange={(e) => setGoal({ ...goal, amount: e.target.value })}
              />
              <ActionStatus action={goalAction} />
              <Button disabled={goalAction.busy}>Guardar meta</Button>
            </form>
          </Card>
          <Card>
            <h2>Cambiar contraseña</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                action.run(async () => {
                  await api("/api/auth/change-password", {
                    method: "POST",
                    body: JSON.stringify({
                      current_password: oldPassword,
                      new_password: newPassword,
                    }),
                  });
                  setOldPassword("");
                  setNewPassword("");
                }, "Contraseña actualizada.");
              }}
            >
              <Field
                label="Contraseña actual"
                type="password"
                autoComplete="current-password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <Field
                label="Nueva contraseña"
                type="password"
                autoComplete="new-password"
                minLength="8"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <ActionStatus action={action} />
              <Button secondary disabled={action.busy}>
                Actualizar contraseña
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
export function Calculators() {
  const [tours, setTours] = useState(""),
    [sales, setSales] = useState(""),
    [volume, setVolume] = useState("");
  const t = Number(tours),
    s = Number(sales),
    v = Number(volume);
  return (
    <>
      <Back to="vault">Bóveda</Back>
      <Header
        eyebrow="SMART CALCULADORAS"
        title="Entiende tus números."
        subtitle="Explora el cierre y el volumen por tour, sin modificar tus resultados."
      />
      <Card>
        <div className="three-col">
          <Field
            label="Tours calificados"
            type="number"
            min="0"
            value={tours}
            onChange={(e) => setTours(e.target.value)}
          />
          <Field
            label="Ventas"
            type="number"
            min="0"
            value={sales}
            onChange={(e) => setSales(e.target.value)}
          />
          <Field
            label="Volumen · USD"
            type="number"
            min="0"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
          />
        </div>
        <div className="metrics-grid">
          <div className="metric-block">
            <span>Cierre</span>
            <strong>
              {t > 0 && s >= 0 ? Math.round((s / t) * 100) + "%" : "—"}
            </strong>
            <small>Ventas / tours calificados</small>
          </div>
          <div className="metric-block">
            <span>VPG</span>
            <strong>{t > 0 && v >= 0 ? money(v / t) : "—"}</strong>
            <small>Volumen / tours calificados</small>
          </div>
        </div>
        <p className="fine-print">
          Cálculos exploratorios. No se guardan en Goal Sheet.
        </p>
      </Card>
    </>
  );
}
