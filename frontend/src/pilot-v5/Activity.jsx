import React, { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Plus,
  Target,
  CalendarDays,
  ClipboardList,
  Check,
  Edit3,
  Clock,
  RotateCcw,
  Archive,
  ArrowDownRight,
} from "lucide-react";
import { api } from "./api.mjs";
import {
  useApp,
  useT,
  Page,
  Button,
  Field,
  Modal,
  ErrorBox,
  Empty,
  LoadState,
  Notice,
  useData,
  useAction,
  list,
} from "./ui.jsx";
import {
  localDay,
  money,
  percent,
  tourPayload,
  monthGoal,
  initialTour,
  newKey,
} from "./model.mjs";
export function Kpis({ metrics }) {
  const { locale } = useApp(),
    t = useT(),
    k = metrics?.kpis || {};
  const rows = [
    [
      t("Closing rate", "Cierre"),
      percent(k.closing_percent),
      t("Sales ÷ effective Q tours", "Ventas ÷ tours Q efectivos"),
    ],
    [
      t("VPG", "VPG"),
      money(k.vpg_cents, locale),
      t("Net volume ÷ effective Q tours", "Volumen neto ÷ tours Q efectivos"),
    ],
    [
      t("Average sale", "Ticket promedio"),
      money(k.average_ticket_cents, locale),
      t("Net volume ÷ active sales", "Volumen neto ÷ ventas activas"),
    ],
    [
      t("Budget attainment", "Cumplimiento"),
      percent(k.budget_attainment_percent),
      t("Month to date · Net volume ÷ goal", "Acumulado mensual · Neto ÷ meta"),
    ],
    [
      t("Variance to budget", "Diferencia vs. presupuesto"),
      money(k.budget_difference_cents, locale),
      t("Month to date · Net volume − goal", "Acumulado mensual · Neto − meta"),
    ],
    [
      t("Closing variance", "Diferencia de cierre"),
      k.closing_difference_pp == null
        ? "—"
        : (Number(k.closing_difference_pp) > 0 ? "+" : "") +
          percent(k.closing_difference_pp, " pp"),
      t(
        "Month to date · Actual − target",
        "Acumulado mensual · Real − objetivo",
      ),
    ],
  ];
  return (
    <div className="v-kpis">
      {rows.map(([title, value, caption], i) => (
        <article className="v-kpi" key={title}>
          <div>
            <span className="v-kpi-index">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="v-kpi-icon">
              {i === 0 ? (
                <ArrowUpRight size={17} />
              ) : i === 3 ? (
                <Target size={17} />
              ) : (
                <span>↗</span>
              )}
            </span>
          </div>
          <h2>{title}</h2>
          <strong
            className={value.length > 12 ? "v-compact-number" : undefined}
          >
            {value.startsWith("USD") ? value.replace(/^USD\s*/, "$") : value}
          </strong>
          <p>
            {caption}
            {value.startsWith("USD") ? " · USD" : ""}
          </p>
          {value === "—" && (
            <small>
              {t(
                "Not enough activity or no goal set.",
                "Sin actividad suficiente o sin meta definida.",
              )}
            </small>
          )}
        </article>
      ))}
    </div>
  );
}
export function Periods({ period, setPeriod }) {
  const t = useT();
  return (
    <div
      className="v-segment"
      aria-label={t("Activity period", "Periodo de actividad")}
    >
      {[
        ["today", t("Today", "Hoy")],
        ["week", t("Week", "Semana")],
        ["month", t("Month", "Mes")],
      ].map(([value, label]) => (
        <button
          key={value}
          aria-pressed={period === value}
          onClick={() => setPeriod(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
export function HomePage() {
  const t = useT(),
    { user, locale, navigate, version, openGuide } = useApp(),
    [period, setPeriod] = useState("month");
  const load = useData(
    "/api/pilot/metrics?period=" + period + "&anchor_date=" + localDay(),
    [version],
  );
  return (
    <Page
      eyebrow={t("MAKE TODAY COUNT", "HAZ QUE HOY CUENTE")}
      title={t("Hello, ", "Hola, ") + user.display_name.split(" ")[0] + "."}
      description={t(
        "A clear view of your day. A steady path forward.",
        "Una vista clara de tu día. Un camino para avanzar.",
      )}
      actions={
        <Button onClick={() => navigate("day")}>
          <Plus size={18} />
          {t("Record my day", "Registrar mi día")}
        </Button>
      }
    >
      <div className="v-toolbar">
        <Periods period={period} setPeriod={setPeriod} />
        <span className="v-muted">{localDay()} · Cancún</span>
      </div>
      <LoadState load={load}>
        {(metrics) => (
          <>
            <div className="v-goal-banner">
              <div>
                <span className="v-eyebrow">
                  {t("YOUR MONTHLY DIRECTION", "TU DIRECCIÓN DEL MES")}
                </span>
                <h2>
                  {metrics?.goal
                    ? money(metrics.goal.budget_volume_cents, locale)
                    : t("Start with a goal.", "Comienza con una meta.")}
                </h2>
                <p>
                  {metrics?.goal
                    ? t("Net volume goal · ", "Meta de volumen neto · ") +
                      metrics.budget_month
                    : t(
                        "Set a reference for your progress this month.",
                        "Define una referencia para tu avance de este mes.",
                      )}
                </p>
              </div>
              <button
                className="v-circle"
                aria-label={t("Open monthly goal", "Abrir meta mensual")}
                onClick={() => navigate("goals")}
              >
                <ArrowUpRight />
              </button>
              {metrics?.goal && (
                <div className="v-progress">
                  <span
                    style={{
                      width:
                        Math.min(
                          100,
                          Math.max(
                            0,
                            Number(metrics.kpis?.budget_attainment_percent) ||
                              0,
                          ),
                        ) + "%",
                    }}
                  />
                </div>
              )}
            </div>
            <Kpis metrics={metrics} />
            <div className="v-activity-summary">
              {[
                [
                  t("Effective Q tours", "Tours Q efectivos"),
                  metrics?.activity_totals?.qualified_tours ?? 0,
                ],
                [
                  t("Active sales", "Ventas activas"),
                  metrics?.activity_totals?.sales ?? 0,
                ],
                [
                  t("Net volume", "Volumen neto"),
                  money(
                    metrics?.activity_totals?.net_volume_cents ?? 0,
                    locale,
                  ),
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </>
        )}
      </LoadState>
      <div className="v-shortcut-grid">
        <button className="v-shortcut" onClick={() => navigate("route")}>
          <MapIcon />
          <span>
            <strong>{t("Continue your route", "Continúa tu ruta")}</strong>
            <small>
              {t(
                "One lesson. One step forward.",
                "Una lección. Un paso adelante.",
              )}
            </small>
          </span>
          <ArrowUpRight size={20} />
        </button>
        <button className="v-shortcut" onClick={() => navigate("notebook")}>
          <Edit3 size={25} />
          <span>
            <strong>{t("Capture an idea", "Captura una idea")}</strong>
            <small>{t("Your private notebook", "Tu notebook privado")}</small>
          </span>
          <ArrowUpRight size={20} />
        </button>
      </div>
      <Followups />
      <div className="v-footer-links">
        <button className="v-link" onClick={openGuide}>
          {t("View start guide", "Ver guía de inicio")}
        </button>
        <button className="v-link" onClick={() => navigate("legacy")}>
          {t("Previous daily summaries", "Resúmenes diarios anteriores")}
        </button>
      </div>
    </Page>
  );
}
function MapIcon() {
  return <Target size={25} />;
}
export function Followups() {
  const t = useT(),
    { version, refresh } = useApp(),
    load = useData("/api/pilot/followups?status=pending&limit=25", [version]),
    action = useAction(),
    [editing, setEditing] = useState(null),
    [extra, setExtra] = useState([]),
    [cursor, setCursor] = useState("");
  useEffect(() => {
    setExtra([]);
    setCursor("");
  }, [version]);
  const update = (item, status) =>
    action.run(async () => {
      if (
        status === "cancelled" &&
        !window.confirm(
          t("Cancel this follow-up?", "¿Cancelar este seguimiento?"),
        )
      )
        return;
      await api("/api/pilot/followups/" + item.id, {
        method: "PATCH",
        body: { expected_version: item.version, status },
      });
      refresh();
    });
  return (
    <section className="v-card">
      <div className="v-section-heading">
        <div>
          <span className="v-eyebrow">
            {t("WHAT COMES NEXT", "LO QUE SIGUE")}
          </span>
          <h2>{t("Follow-ups", "Seguimientos")}</h2>
        </div>
        <Clock size={22} />
      </div>
      <ErrorBox error={action.error} />
      <LoadState load={load}>
        {(data) => {
          const entries = [...list(data), ...extra];
          return entries.length ? (
            <>
              <div className="v-rows">
                {entries.map((item) => (
                  <div className="v-row v-followup" key={item.id}>
                    <div>
                      <strong>{item.action_text}</strong>
                      <small>
                        {new Intl.DateTimeFormat(t("en-US", "es-MX"), {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "America/Cancun",
                        }).format(new Date(item.due_at))}{" "}
                        · Cancún
                      </small>
                    </div>
                    <div className="v-actions wrap">
                      <Button
                        secondary
                        busy={action.busy}
                        onClick={() => update(item, "done")}
                      >
                        <Check size={16} />
                        {t("Done", "Listo")}
                      </Button>
                      <button
                        className="v-link"
                        onClick={() => setEditing(item)}
                      >
                        {t("Reschedule", "Reprogramar")}
                      </button>
                      <button
                        className="v-link warning"
                        disabled={action.busy}
                        onClick={() => update(item, "cancelled")}
                      >
                        {t("Cancel", "Cancelar")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {(cursor || data.next_cursor) && cursor !== "end" && (
                <Button
                  secondary
                  busy={action.busy}
                  onClick={() =>
                    action.run(async () => {
                      const part = await api(
                        "/api/pilot/followups?status=pending&limit=25&cursor=" +
                          encodeURIComponent(cursor || data.next_cursor),
                      );
                      setExtra((old) => [...old, ...list(part)]);
                      setCursor(part.next_cursor || "end");
                    })
                  }
                >
                  {t("Load more", "Cargar más")}
                </Button>
              )}
            </>
          ) : (
            <p className="v-muted">
              {t(
                "No pending follow-ups. Add one after a sale.",
                "No tienes seguimientos pendientes. Agrega uno después de una venta.",
              )}
            </p>
          );
        }}
      </LoadState>
      {editing && (
        <FollowupEditor existing={editing} onClose={() => setEditing(null)} />
      )}
    </section>
  );
}
export function DayPage() {
  const t = useT(),
    { locale, version, refresh } = useApp(),
    [day, setDay] = useState(localDay()),
    [editing, setEditing] = useState(undefined),
    [following, setFollowing] = useState(null),
    [cursor, setCursor] = useState(""),
    [extra, setExtra] = useState([]);
  const load = useData(
      "/api/pilot/tours?from=" + day + "&to=" + day + "&limit=100",
      [version],
    ),
    action = useAction();
  useEffect(() => {
    setExtra([]);
    setCursor("");
  }, [day, version]);
  const act = (item, kind) =>
    action.run(async () => {
      if (
        !window.confirm(
          t(
            "This will update your results and any pending follow-ups. Continue?",
            "Esto actualizará tus resultados y seguimientos pendientes. ¿Continuar?",
          ),
        )
      )
        return;
      const body = { expected_version: item.version };
      if (kind === "cancel-sale") body.reason_code = "customer_cancelled";
      if (kind === "void") body.reason_code = "entry_error";
      await api("/api/pilot/tours/" + item.id + "/" + kind, {
        method: "POST",
        body,
      });
      refresh();
    });
  return (
    <Page
      back="home"
      title={t("My day", "Mi día")}
      description={t(
        "Every tour, recorded once. Your results stay clear.",
        "Cada tour, registrado una vez. Tus resultados siempre claros.",
      )}
      actions={
        <Button onClick={() => setEditing(null)}>
          <Plus size={18} />
          {t("Add tour", "Agregar tour")}
        </Button>
      }
    >
      <div className="v-toolbar">
        <Field
          label={t("Date · Cancún", "Fecha · Cancún")}
          type="date"
          max={localDay()}
          value={day}
          onChange={(e) => setDay(e.target.value)}
        />
        <span className="v-muted">
          {t(
            "No customer personal information",
            "Sin datos personales de clientes",
          )}
        </span>
      </div>
      <ErrorBox error={action.error} />
      <LoadState load={load}>
        {(data) => {
          const entries = [...list(data), ...extra];
          return entries.length ? (
            <>
              <div className="v-tour-list">
                {entries.map((item) => (
                  <article
                    className={
                      "v-card v-tour " +
                      (item.record_status === "voided" ? "muted" : "")
                    }
                    key={item.id}
                  >
                    <div className="v-tour-top">
                      <span className="v-type">
                        {item.tour_kind === "no_tour"
                          ? "No Tour"
                          : item.tour_kind?.toUpperCase()}
                      </span>
                      <span
                        className={
                          "v-tag " +
                          (item.sale_status === "sold" ? "green" : "")
                        }
                      >
                        {item.record_status === "voided"
                          ? t("Voided", "Anulado")
                          : item.sale_status === "sold"
                            ? t("Sale", "Venta")
                            : item.sale_status === "cancelled"
                              ? t("Sale cancelled", "Venta cancelada")
                              : item.tour_kind === "no_tour"
                                ? t("No tour", "Sin tour")
                                : t("No sale", "No venta")}
                      </span>
                      <span className="v-muted">
                        {item.channel === "agency"
                          ? t("Agency", "Agencia")
                          : item.channel === "member"
                            ? t("Members", "Socios")
                            : "—"}
                      </span>
                    </div>
                    <div className="v-tour-amount">
                      {item.sale_status === "sold"
                        ? money(item.net_volume_cents, locale)
                        : "—"}
                    </div>
                    {item.effective_q &&
                      ["ct", "nq"].includes(item.tour_kind) && (
                        <small className="v-positive">
                          {t(
                            "Counts as Q for your KPIs",
                            "Cuenta como Q para tus KPIs",
                          )}
                        </small>
                      )}
                    <div className="v-actions wrap">
                      {item.record_status !== "voided" ? (
                        <>
                          <Button secondary onClick={() => setEditing(item)}>
                            <Edit3 size={16} />
                            {t("Edit", "Editar")}
                          </Button>
                          {item.sale_status === "sold" && (
                            <>
                              <Button
                                secondary
                                onClick={() => setFollowing(item)}
                              >
                                <CalendarDays size={16} />
                                {t("Follow up", "Seguimiento")}
                              </Button>
                              <button
                                className="v-link warning"
                                disabled={action.busy}
                                onClick={() => act(item, "cancel-sale")}
                              >
                                {t("Cancel sale", "Cancelar venta")}
                              </button>
                            </>
                          )}
                          {item.sale_status === "cancelled" && (
                            <Button
                              secondary
                              busy={action.busy}
                              onClick={() => act(item, "restore-sale")}
                            >
                              <RotateCcw size={16} />
                              {t("Restore sale", "Restaurar venta")}
                            </Button>
                          )}
                          <button
                            className="v-link warning"
                            disabled={action.busy}
                            onClick={() => act(item, "void")}
                          >
                            {t("Void record", "Anular registro")}
                          </button>
                        </>
                      ) : (
                        <Button
                          secondary
                          busy={action.busy}
                          onClick={() => act(item, "restore")}
                        >
                          <RotateCcw size={16} />
                          {t("Restore record", "Restaurar registro")}
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              {(cursor || data.next_cursor) && cursor !== "end" && (
                <Button
                  secondary
                  busy={action.busy}
                  onClick={() =>
                    action.run(async () => {
                      const more = await api(
                        "/api/pilot/tours?from=" +
                          day +
                          "&to=" +
                          day +
                          "&limit=100&cursor=" +
                          encodeURIComponent(cursor || data.next_cursor),
                      );
                      setExtra((e) => [...e, ...list(more)]);
                      setCursor(more.next_cursor || "end");
                    })
                  }
                  disabled={cursor === "end"}
                >
                  {t("Load more", "Cargar más")}
                </Button>
              )}
            </>
          ) : (
            <Empty
              title={t("A fresh start.", "Un nuevo comienzo.")}
              action={
                <Button onClick={() => setEditing(null)}>
                  {t("Record your first tour", "Registra tu primer tour")}
                </Button>
              }
            >
              {t(
                "Add each tour or a No Tour record for this date.",
                "Agrega cada tour o un registro No Tour para esta fecha.",
              )}
            </Empty>
          );
        }}
      </LoadState>
      {editing !== undefined && (
        <TourEditor
          tour={editing}
          day={day}
          onClose={() => setEditing(undefined)}
        />
      )}
      {following && (
        <FollowupEditor tour={following} onClose={() => setFollowing(null)} />
      )}
    </Page>
  );
}
function TourEditor({ tour, day, onClose }) {
  const t = useT(),
    { refresh, setUnsaved } = useApp(),
    [form, setForm] = useState(() =>
      tour
        ? {
            ...tour,
            amount:
              tour.sale_status === "sold"
                ? String(tour.net_volume_cents / 100)
                : "",
          }
        : { ...initialTour(), occurred_on: day },
    ),
    action = useAction(),
    key = useRef(newKey()),
    [dirty, setDirty] = useState(false);
  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setDirty(true);
  };
  useEffect(() => {
    setUnsaved(dirty);
    const leave = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => {
      setUnsaved(false);
      window.removeEventListener("beforeunload", leave);
    };
  }, [dirty]);
  const noTour = form.tour_kind === "no_tour";
  return (
    <Modal
      title={
        tour
          ? t("Edit tour", "Editar tour")
          : t("Record a tour", "Registrar un tour")
      }
      dirty={dirty}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          action.run(async () => {
            if (
              tour?.sale_status === "sold" &&
              (form.sale_status !== "sold" || noTour) &&
              !window.confirm(
                t(
                  "This correction will cancel pending follow-ups and update your KPIs. Continue?",
                  "Esta corrección cancelará seguimientos pendientes y actualizará tus KPIs. ¿Continuar?",
                ),
              )
            )
              return;
            const payload = tourPayload(form);
            if (tour?.sale_status === "cancelled" && !noTour) {
              delete payload.sale_status;
              delete payload.net_volume_cents;
            }
            await api("/api/pilot/tours" + (tour ? "/" + tour.id : ""), {
              method: tour ? "PATCH" : "POST",
              body: {
                ...payload,
                ...(tour
                  ? { expected_version: tour.version }
                  : { client_request_id: key.current }),
              },
            });
            setUnsaved(false);
            refresh();
            onClose();
          });
        }}
      >
        <Field
          label={t("Date", "Fecha")}
          type="date"
          required
          max={localDay()}
          value={form.occurred_on}
          onChange={(e) => set("occurred_on", e.target.value)}
        />
        <Field label={t("Tour type", "Tipo de tour")}>
          <select
            value={form.tour_kind}
            onChange={(e) => set("tour_kind", e.target.value)}
          >
            {[
              ["q", "Q"],
              ["ct", "CT"],
              ["nq", "NQ"],
              ["no_tour", "No Tour"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label={
            t("Channel", "Canal") +
            (noTour ? t(" · Optional", " · Opcional") : "")
          }
        >
          <select
            required={!noTour}
            value={form.channel || ""}
            onChange={(e) => set("channel", e.target.value)}
          >
            {noTour && (
              <option value="">{t("Not specified", "Sin especificar")}</option>
            )}
            <option value="agency">{t("Agency", "Agencia")}</option>
            <option value="member">{t("Members", "Socios")}</option>
          </select>
        </Field>
        {!noTour && (
          <>
            <Field
              label={t("Result", "Resultado")}
              hint={
                tour?.sale_status === "cancelled"
                  ? t(
                      "Use Restore sale on the tour card to reactivate this sale.",
                      "Usa Restaurar venta en la tarjeta del tour para reactivar esta venta.",
                    )
                  : undefined
              }
            >
              <select
                disabled={tour?.sale_status === "cancelled"}
                value={form.sale_status || "no_sale"}
                onChange={(e) => set("sale_status", e.target.value)}
              >
                {tour?.sale_status === "cancelled" && (
                  <option value="cancelled">
                    {t("Sale cancelled", "Venta cancelada")}
                  </option>
                )}
                <option value="no_sale">{t("No sale", "No venta")}</option>
                <option value="sold">{t("Sale", "Venta")}</option>
              </select>
            </Field>
            {form.sale_status === "sold" && (
              <Field
                label={t(
                  "Net sales volume · USD",
                  "Volumen neto de venta · USD",
                )}
                hint={t(
                  "Enter the final net amount. One sale per tour.",
                  "Captura el monto neto final. Una venta por tour.",
                )}
                type="number"
                step=".01"
                min=".01"
                max="1000000"
                required
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
            )}
          </>
        )}
        {noTour && (
          <p className="v-muted">
            {t(
              "This record will not count as a Q, sale, or sales volume.",
              "Este registro no contará como Q, venta ni volumen.",
            )}
          </p>
        )}
        <ErrorBox error={action.error} />
        <div className="v-actions">
          <Button busy={action.busy} type="submit">
            {t("Save tour", "Guardar tour")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function FollowupEditor({ tour, existing, onClose }) {
  const t = useT(),
    { refresh } = useApp(),
    action = useAction(),
    [due, setDue] = useState(() =>
      existing
        ? new Date(new Date(existing.due_at).getTime() - 5 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 16)
        : "",
    ),
    [text, setText] = useState(existing?.action_text || ""),
    key = useRef(newKey());
  return (
    <Modal
      title={
        existing
          ? t("Reschedule follow-up", "Reprogramar seguimiento")
          : t("Plan a follow-up", "Planear seguimiento")
      }
      onClose={onClose}
      dirty={existing ? text !== existing.action_text : !!text || !!due}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          action.run(async () => {
            await api(
              existing
                ? "/api/pilot/followups/" + existing.id
                : "/api/pilot/tours/" + tour.id + "/followups",
              {
                method: existing ? "PATCH" : "POST",
                body: {
                  ...(existing
                    ? { expected_version: existing.version }
                    : { client_request_id: key.current }),
                  due_at: new Date(due + "-05:00").toISOString(),
                  action_text: text,
                },
              },
            );
            refresh();
            onClose();
          });
        }}
      >
        <Field
          label={t("When · Cancún time", "Cuándo · Hora de Cancún")}
          type="datetime-local"
          required
          value={due}
          onChange={(e) => setDue(e.target.value)}
        />
        <Field
          label={t("Next action", "Siguiente acción")}
          hint={t(
            "Do not include customer personal information.",
            "No incluyas datos personales del cliente.",
          )}
          multiline
          rows={4}
          required
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <ErrorBox error={action.error} />
        <Button type="submit" busy={action.busy}>
          {t("Save follow-up", "Guardar seguimiento")}
        </Button>
      </form>
    </Modal>
  );
}
export function GoalsPage() {
  const t = useT(),
    { locale, version, refresh } = useApp(),
    month = localDay().slice(0, 7),
    load = useData("/api/pilot/monthly-goals/" + month, [version]),
    action = useAction(),
    [form, setForm] = useState({ month, amount: "", target: "" }),
    [review, setReview] = useState(false);
  return (
    <Page
      back="home"
      eyebrow="GOAL SHEET"
      title={t("Give your month a direction.", "Dale dirección a tu mes.")}
      description={t(
        "One clear goal. A reference you can return to.",
        "Una meta clara. Una referencia a la que puedes volver.",
      )}
    >
      <LoadState load={load}>
        {(data) =>
          data?.goal ? (
            <section className="v-card v-goal-confirmed">
              <div className="v-section-icon">
                <Check />
              </div>
              <span className="v-eyebrow">
                {t("CONFIRMED · ", "CONFIRMADA · ") + month}
              </span>
              <h2>{money(data.goal.budget_volume_cents, locale)}</h2>
              <p>
                {t("Monthly net volume goal", "Meta mensual de volumen neto")}
              </p>
              <div className="v-activity-summary">
                <div>
                  <small>{t("Closing target", "Objetivo de cierre")}</small>
                  <strong>
                    {data.goal.target_close_bps == null
                      ? "—"
                      : percent(data.goal.target_close_bps / 100)}
                  </strong>
                </div>
              </div>
              <Notice>
                {t(
                  "Your goal is confirmed for this month and cannot be changed. Set a new goal when next month begins.",
                  "Tu meta está confirmada para este mes y no se puede cambiar. Define una nueva cuando comience el siguiente mes.",
                )}
              </Notice>
            </section>
          ) : (
            <form
              className="v-card v-narrow"
              onSubmit={(e) => {
                e.preventDefault();
                action.run(async () => {
                  const payload = monthGoal(form);
                  if (!review) {
                    setReview(true);
                    return;
                  }
                  await api("/api/pilot/monthly-goals", {
                    method: "POST",
                    body: payload,
                  });
                  refresh();
                });
              }}
            >
              <div className="v-section-icon">
                <Target />
              </div>
              <h2>{month}</h2>
              {review ? (
                <>
                  <p>
                    {t(
                      "Review before confirming. This goal will remain fixed for the month.",
                      "Revisa antes de confirmar. Esta meta quedará fija durante el mes.",
                    )}
                  </p>
                  <dl className="v-detail-list">
                    <dt>{t("Net volume goal", "Meta de volumen neto")}</dt>
                    <dd>{money(Number(form.amount) * 100, locale)}</dd>
                    <dt>{t("Closing target", "Objetivo de cierre")}</dt>
                    <dd>{form.target === "" ? "—" : percent(form.target)}</dd>
                  </dl>
                </>
              ) : (
                <>
                  <Field
                    label={t(
                      "Net volume budget · USD",
                      "Presupuesto de volumen neto · USD",
                    )}
                    type="number"
                    step=".01"
                    min=".01"
                    max="100000000"
                    required
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                  />
                  <Field
                    label={t(
                      "Closing target · % · Optional",
                      "Objetivo de cierre · % · Opcional",
                    )}
                    type="number"
                    min="0"
                    max="100"
                    step=".01"
                    value={form.target}
                    onChange={(e) =>
                      setForm({ ...form, target: e.target.value })
                    }
                  />
                  <p className="v-muted">
                    {t(
                      "You confirm this once per month. Your daily tours are recorded separately in My day.",
                      "La confirmas una vez por mes. Tus tours diarios se registran por separado en Mi día.",
                    )}
                  </p>
                </>
              )}
              <ErrorBox
                error={action.error}
                retry={action.error?.status === 409 ? load.reload : undefined}
              />
              <div className="v-actions">
                {review && (
                  <Button
                    secondary
                    type="button"
                    onClick={() => setReview(false)}
                  >
                    {t("Edit before confirming", "Editar antes de confirmar")}
                  </Button>
                )}
                <Button type="submit" busy={action.busy}>
                  {review
                    ? t("Confirm monthly goal", "Confirmar meta mensual")
                    : t("Review goal", "Revisar meta")}
                </Button>
              </div>
            </form>
          )
        }
      </LoadState>
    </Page>
  );
}
export function LegacyPage() {
  const t = useT(),
    { locale } = useApp(),
    load = useData("/api/pilot/legacy/goalsheets?limit=100"),
    action = useAction(),
    [extra, setExtra] = useState([]),
    [cursor, setCursor] = useState("");
  return (
    <Page
      back="home"
      title={t("Previous daily summaries", "Resúmenes diarios anteriores")}
      description={t(
        "Read-only history. These summaries are not individual tours and are excluded from pilot KPIs.",
        "Histórico de consulta. Estos resúmenes no son tours individuales y no se incluyen en los KPIs del piloto.",
      )}
    >
      <ErrorBox error={action.error} />
      <LoadState load={load}>
        {(data) =>
          list(data).length ? (
            <>
              <div className="v-rows">
                {[...list(data), ...extra].map((entry, i) => {
                  const item = entry.payload || entry;
                  return (
                    <article className="v-card" key={entry.id || i}>
                      <h2>{entry.entry_date || item.date}</h2>
                      <p>
                        {t("Previous summary", "Resumen anterior")} ·{" "}
                        {item.sales_volume == null
                          ? "—"
                          : money(Number(item.sales_volume) * 100, locale)}
                      </p>
                      <small>
                        {t("Recorded sales: ", "Ventas registradas: ")}
                        {item.number_of_sales ?? "—"}
                      </small>
                    </article>
                  );
                })}
              </div>
              {(cursor || data.next_cursor) && cursor !== "end" && (
                <Button
                  secondary
                  busy={action.busy}
                  onClick={() =>
                    action.run(async () => {
                      const part = await api(
                        "/api/pilot/legacy/goalsheets?limit=100&cursor=" +
                          encodeURIComponent(cursor || data.next_cursor),
                      );
                      setExtra((old) => [...old, ...list(part)]);
                      setCursor(part.next_cursor || "end");
                    })
                  }
                >
                  {t("Load more", "Cargar más")}
                </Button>
              )}
            </>
          ) : (
            <Empty
              title={t("No previous summaries", "Sin resúmenes anteriores")}
            >
              {t(
                "Your new activity is available in My day.",
                "Tu nueva actividad está disponible en Mi día.",
              )}
            </Empty>
          )
        }
      </LoadState>
    </Page>
  );
}
