import React, { useEffect, useRef, useState } from "react";
import {
  Target,
  NotebookPen,
  BookOpen,
  Calculator,
  ArrowUpRight,
  Plus,
  Search,
  Trash2,
  Pin,
  Save,
  ArrowRight,
} from "lucide-react";
import { api } from "./api.mjs";
import {
  useApp,
  useT,
  Page,
  Button,
  Field,
  ErrorBox,
  Empty,
  LoadState,
  Notice,
  useData,
  useAction,
  list,
} from "./ui.jsx";
import {
  anywayMoney,
  loanPayment,
  amountMoney,
  localDay,
  newKey,
} from "./model.mjs";
export function ResourcesPage() {
  const t = useT(),
    { navigate } = useApp();
  const cards = [
    [
      Target,
      "goals",
      "Goal Sheet",
      t(
        "One goal. Your reference for the month.",
        "Una meta. Tu referencia para el mes.",
      ),
      t("View my goal", "Ver mi meta"),
    ],
    [
      Calculator,
      "calculators",
      t("Calculators", "Calculadoras"),
      t("Make the numbers clear, together.", "Haz claros los números, juntos."),
      t("Explore tools", "Explorar herramientas"),
    ],
    [
      BookOpen,
      "diary",
      t("Journal", "Diario"),
      t(
        "Three questions to learn from your experience.",
        "Tres preguntas para aprender de tu experiencia.",
      ),
      t("Reflect on my day", "Reflexionar sobre mi día"),
    ],
    [
      NotebookPen,
      "notebook",
      "Notebook",
      t(
        "A private place for your ideas and learning.",
        "Un lugar privado para tus ideas y aprendizajes.",
      ),
      t("Write a note", "Escribir una nota"),
    ],
  ];
  return (
    <Page
      eyebrow={t("YOUR WORKING TOOLKIT", "TUS HERRAMIENTAS DE TRABAJO")}
      title={t("Resources", "Recursos")}
      description={t(
        "A little structure. More room to grow.",
        "Un poco de estructura. Más espacio para crecer.",
      )}
    >
      <div className="v-resource-grid">
        {cards.map(([Icon, route, title, copy, cta], i) => (
          <article className="v-resource-card" key={route}>
            <div className="v-resource-top">
              <div className="v-section-icon">
                <Icon size={27} />
              </div>
              <span>{String(i + 1).padStart(2, "0")}</span>
            </div>
            <h2>{title}</h2>
            <p>{copy}</p>
            <Button secondary onClick={() => navigate(route)}>
              {cta}
              <ArrowUpRight size={18} />
            </Button>
          </article>
        ))}
      </div>
      <div className="v-private-strip">
        <span className="v-dot" />
        {t(
          "Your notebook and journal are private. Only you can read them.",
          "Tu notebook y diario son privados. Solo tú puedes leerlos.",
        )}
      </div>
    </Page>
  );
}
export function NotesPage({ kind }) {
  const diary = kind === "diary",
    t = useT(),
    { version, refresh, setUnsaved } = useApp(),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [editing, setEditing] = useState(null),
    [draft, setDraft] = useState(null),
    [saved, setSaved] = useState(false),
    [extra, setExtra] = useState([]),
    [cursor, setCursor] = useState(""),
    action = useAction(),
    requestKey = useRef(newKey()),
    base = diary ? "/api/pilot/diary" : "/api/pilot/notes";
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const load = useData(
    base +
      "?limit=25" +
      (!diary && search ? "&q=" + encodeURIComponent(search) : ""),
    [version],
  );
  useEffect(() => {
    setExtra([]);
    setCursor("");
  }, [search, version]);
  const initial = () =>
    diary
      ? { entry_date: localDay(), answer_1: "", answer_2: "", answer_3: "" }
      : { title: "", body: "", pinned: false };
  const original = useRef(null),
    dirty = draft && JSON.stringify(draft) !== JSON.stringify(original.current);
  useEffect(() => {
    setUnsaved(!!dirty);
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
  const open = (entry) => {
    if (
      dirty &&
      !window.confirm(
        t(
          "Discard your unsaved changes?",
          "¿Descartar tus cambios sin guardar?",
        ),
      )
    )
      return;
    const next = entry
      ? diary
        ? {
            entry_date: entry.entry_date,
            answer_1: entry.answer_1,
            answer_2: entry.answer_2,
            answer_3: entry.answer_3,
          }
        : { title: entry.title, body: entry.body, pinned: !!entry.pinned }
      : initial();
    original.current = next;
    setDraft(next);
    setEditing(entry);
    requestKey.current = newKey();
    setSaved(false);
    action.clear();
  };
  const close = () => {
    if (
      dirty &&
      !window.confirm(
        t(
          "Discard your unsaved changes?",
          "¿Descartar tus cambios sin guardar?",
        ),
      )
    )
      return;
    setDraft(null);
    setEditing(null);
    setUnsaved(false);
  };
  const remove = (entry) =>
    action.run(async () => {
      if (
        !window.confirm(
          t(
            "Delete this private entry? This cannot be undone.",
            "¿Eliminar esta entrada privada? No se puede deshacer.",
          ),
        )
      )
        return;
      await api(base + "/" + entry.id, {
        method: "DELETE",
        body: { expected_version: entry.version },
      });
      if (editing?.id === entry.id) {
        setDraft(null);
        setEditing(null);
      }
      refresh();
    });
  const save = (e) => {
    e.preventDefault();
    action.run(async () => {
      const data = await api(base + (editing ? "/" + editing.id : ""), {
        method: editing ? "PATCH" : "POST",
        body: {
          ...draft,
          ...(editing
            ? { expected_version: editing.version }
            : { client_request_id: requestKey.current }),
        },
      });
      const entry = data.note || data.entry || data;
      setEditing(entry);
      original.current = draft;
      setSaved(true);
      setUnsaved(false);
      refresh();
    });
  };
  const prompts = [
    ["What went well?", "¿Qué salió bien?"],
    ["Where did you get stuck?", "¿Dónde te atoraste?"],
    [
      "What will you do differently next time?",
      "¿Qué harás diferente la próxima vez?",
    ],
  ];
  return (
    <Page
      back="resources"
      eyebrow={t("JUST FOR YOU", "SOLO PARA TI")}
      title={
        diary
          ? t("Your journal", "Tu diario")
          : t("Your notebook", "Tu notebook")
      }
      description={
        diary
          ? t(
              "Reflect, learn, and give tomorrow a direction.",
              "Reflexiona, aprende y dale dirección a mañana.",
            )
          : t(
              "Keep your ideas, learning, and next steps together.",
              "Conserva tus ideas, aprendizajes y siguientes pasos.",
            )
      }
      actions={
        <Button onClick={() => open(null)}>
          <Plus size={18} />
          {diary
            ? t("New reflection", "Nueva reflexión")
            : t("New note", "Nueva nota")}
        </Button>
      }
    >
      <div className={"v-notes-layout " + (draft ? "editing" : "")}>
        <section>
          {!diary && (
            <Field
              label={t("Search your notes", "Buscar en tus notas")}
              type="search"
              maxLength={100}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(
                "Search by title or text…",
                "Busca por título o texto…",
              )}
            />
          )}
          <LoadState load={load}>
            {(data) => {
              const entries = [...list(data), ...extra];
              return entries.length ? (
                <>
                  <div className="v-note-list">
                    {entries.map((entry) => (
                      <article
                        className={
                          "v-note-card " +
                          (editing?.id === entry.id ? "active" : "")
                        }
                        key={entry.id}
                      >
                        <button
                          className="v-note-open"
                          onClick={() => open(entry)}
                        >
                          {!diary && entry.pinned && <Pin size={14} />}
                          <small>
                            {diary
                              ? entry.entry_date
                              : (entry.updated_at || "").slice(0, 10)}
                          </small>
                          <h2>{diary ? entry.answer_1 : entry.title}</h2>
                          <p>{diary ? entry.answer_2 : entry.body}</p>
                        </button>
                        <button
                          className="v-icon warning"
                          aria-label={t("Delete entry", "Eliminar entrada")}
                          onClick={() => remove(entry)}
                          disabled={action.busy}
                        >
                          <Trash2 size={17} />
                        </button>
                      </article>
                    ))}
                  </div>
                  {(cursor || data.next_cursor) && cursor !== "end" && (
                    <Button
                      secondary
                      busy={action.busy}
                      onClick={() =>
                        action.run(async () => {
                          const data = await api(
                            base +
                              "?limit=25&cursor=" +
                              encodeURIComponent(
                                cursor || load.data.next_cursor,
                              ) +
                              (!diary && search
                                ? "&q=" + encodeURIComponent(search)
                                : ""),
                          );
                          setExtra((prev) => [...prev, ...list(data)]);
                          setCursor(data.next_cursor || "end");
                        })
                      }
                    >
                      {t("Load more", "Cargar más")}
                    </Button>
                  )}
                </>
              ) : (
                <Empty
                  title={
                    diary
                      ? t(
                          "Make space for reflection.",
                          "Haz espacio para reflexionar.",
                        )
                      : t(
                          "Good ideas begin here.",
                          "Las buenas ideas comienzan aquí.",
                        )
                  }
                >
                  {t(
                    "Create your first private entry.",
                    "Crea tu primera entrada privada.",
                  )}
                </Empty>
              );
            }}
          </LoadState>
        </section>
        {draft && (
          <form className="v-card v-note-editor" onSubmit={save}>
            <div className="v-section-heading">
              <h2>
                {editing
                  ? t("Edit entry", "Editar entrada")
                  : t("New entry", "Nueva entrada")}
              </h2>
              <button type="button" className="v-link" onClick={close}>
                {t("Close", "Cerrar")}
              </button>
            </div>
            {diary ? (
              <>
                <Field
                  label={t("Date", "Fecha")}
                  type="date"
                  required
                  max={localDay()}
                  value={draft.entry_date}
                  onChange={(e) => {
                    setDraft({ ...draft, entry_date: e.target.value });
                    setSaved(false);
                  }}
                />
                {prompts.map(([en, es], i) => (
                  <Field
                    key={i}
                    label={i + 1 + ". " + t(en, es)}
                    multiline
                    rows={4}
                    required
                    maxLength={2000}
                    value={draft["answer_" + (i + 1)]}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        ["answer_" + (i + 1)]: e.target.value,
                      });
                      setSaved(false);
                    }}
                  />
                ))}
              </>
            ) : (
              <>
                <Field
                  label={t("Title", "Título")}
                  required
                  maxLength={120}
                  value={draft.title}
                  onChange={(e) => {
                    setDraft({ ...draft, title: e.target.value });
                    setSaved(false);
                  }}
                />
                <Field
                  label={t("Your note", "Tu nota")}
                  multiline
                  rows={12}
                  required
                  maxLength={10000}
                  value={draft.body}
                  onChange={(e) => {
                    setDraft({ ...draft, body: e.target.value });
                    setSaved(false);
                  }}
                />
                <label className="v-check">
                  <input
                    type="checkbox"
                    checked={draft.pinned}
                    onChange={(e) => {
                      setDraft({ ...draft, pinned: e.target.checked });
                      setSaved(false);
                    }}
                  />
                  {t("Pin this note", "Fijar esta nota")}
                </label>
              </>
            )}
            <small className="v-muted">
              {t(
                "Private to you. Do not include customer personal information.",
                "Privado para ti. No incluyas datos personales de clientes.",
              )}
            </small>
            <ErrorBox error={action.error} />
            {saved && !dirty && (
              <Notice>
                {t("Saved to your account.", "Guardado en tu cuenta.")}
              </Notice>
            )}
            <Button type="submit" busy={action.busy}>
              <Save size={17} />
              {t("Save entry", "Guardar entrada")}
            </Button>
          </form>
        )}
      </div>
      {!draft && <ErrorBox error={action.error} />}
    </Page>
  );
}
export function CalculatorsPage() {
  const t = useT(),
    { locale } = useApp(),
    [kind, setKind] = useState("anyway"),
    [form, setForm] = useState({
      amount: "3000",
      years: "20",
      inflation: "4",
      price: "20000",
      down: "20",
      rate: "12",
      months: "48",
    }),
    [result, setResult] = useState(null),
    [error, setError] = useState(null);
  const set = (key, value) => {
    setForm({ ...form, [key]: value });
    setResult(null);
    setError(null);
  };
  const compute = (e) => {
    e.preventDefault();
    try {
      setResult(
        kind === "anyway"
          ? anywayMoney(form.amount, form.years, form.inflation)
          : loanPayment(form.price, form.down, form.rate, form.months),
      );
      setError(null);
    } catch (e) {
      setResult(null);
      setError(e);
    }
  };
  return (
    <Page
      back="resources"
      eyebrow={t("MAKE THE NUMBERS CLEAR", "HAZ CLAROS LOS NÚMEROS")}
      title={t("Calculators", "Calculadoras")}
      description={t(
        "Explore the possibilities using your own numbers.",
        "Explora las posibilidades con tus propios números.",
      )}
    >
      <div className="v-calculator-tabs">
        <button
          aria-pressed={kind === "anyway"}
          className={kind === "anyway" ? "active" : ""}
          onClick={() => {
            setKind("anyway");
            setResult(null);
            setError(null);
          }}
        >
          <ArrowUpRight />
          <span>
            Anyway money
            <small>{t("Future spending", "Gasto proyectado")}</small>
          </span>
        </button>
        <button
          aria-pressed={kind === "loan"}
          className={kind === "loan" ? "active" : ""}
          onClick={() => {
            setKind("loan");
            setResult(null);
            setError(null);
          }}
        >
          <Calculator />
          <span>
            {t("Down payment & monthly payment", "Enganche y mensualidades")}
            <small>
              {t("A financing estimate", "Una estimación de financiamiento")}
            </small>
          </span>
        </button>
      </div>
      <div className="v-calculator">
        <form className="v-card" onSubmit={compute}>
          <h2>
            {kind === "anyway"
              ? "Anyway money"
              : t("Your payment estimate", "Tu estimación de pago")}
          </h2>
          {kind === "anyway" ? (
            <>
              <Field
                label={t(
                  "Current annual spending · USD",
                  "Gasto anual actual · USD",
                )}
                type="number"
                min=".01"
                max="10000000"
                step=".01"
                required
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
              />
              <Field
                label={t("Number of years", "Número de años")}
                type="number"
                min="1"
                max="50"
                step="1"
                required
                value={form.years}
                onChange={(e) => set("years", e.target.value)}
              />
              <Field
                label={t(
                  "Assumed annual increase · %",
                  "Incremento anual supuesto · %",
                )}
                hint={t(
                  "An assumption you can change, not a forecast.",
                  "Un supuesto que puedes cambiar, no un pronóstico.",
                )}
                type="number"
                min="0"
                max="30"
                step=".01"
                required
                value={form.inflation}
                onChange={(e) => set("inflation", e.target.value)}
              />
            </>
          ) : (
            <>
              <Field
                label={t("Price · USD", "Precio · USD")}
                type="number"
                min=".01"
                max="100000000"
                step=".01"
                required
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
              />
              <Field
                label={t("Down payment · %", "Enganche · %")}
                type="number"
                min="0"
                max="100"
                step=".01"
                required
                value={form.down}
                onChange={(e) => set("down", e.target.value)}
              />
              <Field
                label={t("Nominal annual rate · %", "Tasa nominal anual · %")}
                type="number"
                min="0"
                max="100"
                step=".01"
                required
                value={form.rate}
                onChange={(e) => set("rate", e.target.value)}
              />
              <Field
                label={t("Term · months", "Plazo · meses")}
                type="number"
                min="1"
                max="600"
                step="1"
                required
                value={form.months}
                onChange={(e) => set("months", e.target.value)}
              />
            </>
          )}
          <ErrorBox error={error} />
          <div className="v-actions">
            <Button type="submit">
              {t("Calculate", "Calcular")}
              <ArrowRight size={18} />
            </Button>
            <button
              type="button"
              className="v-link"
              onClick={() => {
                setResult(null);
                setError(null);
                setForm({
                  amount: "",
                  years: "",
                  inflation: "4",
                  price: "",
                  down: "",
                  rate: "",
                  months: "",
                });
              }}
            >
              {t("Reset", "Limpiar")}
            </button>
          </div>
        </form>
        <section className="v-calculator-result" aria-live="polite">
          <span className="v-eyebrow">
            {t("BASED ON YOUR INPUTS", "SEGÚN TUS VALORES")}
          </span>
          {result === null ? (
            <>
              <div className="v-result-placeholder">↗</div>
              <h2>
                {t(
                  "A clearer picture starts with your numbers.",
                  "Una visión más clara comienza con tus números.",
                )}
              </h2>
              <p>
                {t(
                  "Complete the fields and calculate your estimate.",
                  "Completa los campos y calcula tu estimación.",
                )}
              </p>
            </>
          ) : kind === "anyway" ? (
            <>
              <p>{t("Projected spending", "Gasto proyectado")}</p>
              <strong>{amountMoney(result, locale)}</strong>
              <span className="v-tag">
                {form.years} {t("years", "años")}
              </span>
            </>
          ) : (
            <>
              <p>{t("Balance to finance", "Saldo a financiar")}</p>
              <strong>{amountMoney(result.principal, locale)}</strong>
              <hr />
              <p>{t("Estimated monthly payment", "Mensualidad estimada")}</p>
              <strong>{amountMoney(result.monthly, locale)}</strong>
            </>
          )}
          <small>
            {kind === "anyway"
              ? t(
                  "The first year uses your current spending. The annual increase applies from the second year.",
                  "El primer año usa tu gasto actual. El aumento anual aplica desde el segundo año.",
                )
              : t(
                  "Equal payments at the end of each month. Annual nominal rate divided by 12. Excludes fees and insurance. This is an estimate, not a quote.",
                  "Pagos iguales al final de cada mes. Tasa nominal anual dividida entre 12. Sin comisiones ni seguros. Es una estimación, no una cotización.",
                )}
          </small>
        </section>
      </div>
    </Page>
  );
}
