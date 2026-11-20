import React, { useEffect, useRef, useState } from "react";
import {
  Map,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Plus,
  Check,
  LockKeyhole,
  BookOpen,
  Download,
  Play,
  FileText,
  Eye,
  Archive,
  Settings,
  Inbox,
  Users,
  RotateCcw,
  Save,
} from "lucide-react";
import { api, downloadFile } from "./api.mjs";
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
  Loading,
  useData,
  useAction,
  list,
} from "./ui.jsx";
import {
  newKey,
  localDay,
  safeVideo,
  money,
  accessVersion,
  editorDraft,
} from "./model.mjs";
import { Kpis, Periods } from "./Activity.jsx";
const title = (item, locale) =>
  locale === "es"
    ? item.title_es || item.title_en || item.title
    : item.title_en || item.title;
const description = (item, locale) =>
  locale === "es"
    ? item.description_es || item.description_en || item.description
    : item.description_en || item.description;
function useAll(path, dependencies = []) {
  const [data, setData] = useState(null),
    [error, setError] = useState(null),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    (async () => {
      let items = [],
        cursor = "",
        meta = {};
      do {
        const part = await api(
          path +
            (path.includes("?") ? "&" : "?") +
            "limit=100" +
            (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
          { signal: controller.signal },
        );
        items.push(...list(part));
        meta = part;
        cursor = part.next_cursor;
      } while (cursor && active);
      if (active) {
        setData({ ...meta, items, next_cursor: null });
        setLoading(false);
      }
    })().catch((e) => {
      if (active && e.name !== "AbortError") {
        setError(e);
        setLoading(false);
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [path, version, ...dependencies]);
  return { data, error, loading, reload: () => setVersion((v) => v + 1) };
}
export function RoutePage() {
  const t = useT(),
    { locale, version, navigate, refresh } = useApp(),
    load = useAll("/api/pilot/lessons", [version]),
    action = useAction(),
    [request, setRequest] = useState(null);
  return (
    <Page
      eyebrow={t("LEARN AT YOUR PACE", "APRENDE A TU RITMO")}
      title={t("Your route", "Tu ruta")}
      description={t(
        "Build your confidence, one lesson at a time.",
        "Construye confianza, una lección a la vez.",
      )}
    >
      <LoadState load={load}>
        {(data) => {
          const lessons = list(data),
            allowed = lessons.filter((l) => l.allowed),
            done = allowed.filter((l) => l.completed);
          return lessons.length ? (
            <>
              <div className="v-route-summary">
                <div
                  className="v-progress-ring"
                  style={{
                    "--progress":
                      (allowed.length
                        ? (done.length / allowed.length) * 100
                        : 0) + "%",
                  }}
                >
                  <span>
                    <strong>{done.length}</strong>
                    <small>/ {allowed.length}</small>
                  </span>
                </div>
                <div>
                  <span className="v-eyebrow">
                    {t("YOUR LEARNING PROGRESS", "TU AVANCE DE APRENDIZAJE")}
                  </span>
                  <h2>{t("Every step counts.", "Cada paso cuenta.")}</h2>
                  <p>
                    {t(
                      "Completed lessons out of those available to you.",
                      "Lecciones completadas de las que tienes disponibles.",
                    )}
                  </p>
                </div>
              </div>
              <div className="v-section-heading">
                <h2>{t("Your lessons", "Tus lecciones")}</h2>
                <span className="v-tag">
                  {lessons.length} {t("published", "publicadas")}
                </span>
              </div>
              <div className="v-lesson-list">
                {lessons.map((lesson, i) => (
                  <article
                    className={
                      "v-lesson " +
                      (lesson.completed
                        ? "completed"
                        : lesson.allowed
                          ? "available"
                          : "locked")
                    }
                    key={lesson.id}
                  >
                    <span className="v-step-number">
                      {lesson.completed ? (
                        <Check size={20} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    <div>
                      <span className="v-eyebrow">
                        {lesson.completed
                          ? t("COMPLETED", "COMPLETADA")
                          : lesson.allowed
                            ? t("AVAILABLE", "DISPONIBLE")
                            : lesson.request_status === "pending"
                              ? t("ACCESS REQUESTED", "ACCESO SOLICITADO")
                              : t("ACCESS REQUIRED", "REQUIERE ACCESO")}
                      </span>
                      <h2>{title(lesson, locale)}</h2>
                      <p>{description(lesson, locale)}</p>
                      {locale === "es" && !lesson.title_es && (
                        <small className="v-muted">
                          {t("Content in English", "Contenido en inglés")}
                        </small>
                      )}
                    </div>
                    <button
                      className={
                        "v-lesson-action " + (lesson.allowed ? "open" : "")
                      }
                      disabled={
                        lesson.request_status === "pending" && !lesson.allowed
                      }
                      onClick={() =>
                        lesson.allowed
                          ? navigate("lesson", lesson.id)
                          : setRequest(lesson)
                      }
                      aria-label={
                        (lesson.allowed
                          ? t("Open ", "Abrir ")
                          : t("Request access to ", "Solicitar acceso a ")) +
                        title(lesson, locale)
                      }
                    >
                      {lesson.allowed ? (
                        <ArrowUpRight size={22} />
                      ) : (
                        <LockKeyhole size={18} />
                      )}
                    </button>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <Empty
              title={t(
                "Your route is taking shape.",
                "Tu ruta está tomando forma.",
              )}
            >
              {t(
                "Your academy owner will publish lessons here.",
                "El dueño de tu academia publicará aquí las lecciones.",
              )}
            </Empty>
          );
        }}
      </LoadState>
      {request && (
        <Modal
          title={t("Request access", "Quiero acceso")}
          onClose={() => setRequest(null)}
        >
          <div className="v-section-icon">
            <LockKeyhole />
          </div>
          <h3>{title(request, locale)}</h3>
          <p>
            {t(
              "Your academy owner will receive your request in the app. You will see access here when it is approved.",
              "El dueño de tu academia recibirá tu solicitud en la app. Verás el acceso aquí cuando sea aprobada.",
            )}
          </p>
          <ErrorBox error={action.error} />
          <Button
            busy={action.busy}
            onClick={() =>
              action.run(async () => {
                await api(
                  "/api/pilot/lessons/" + request.id + "/access-requests",
                  { method: "POST", body: {} },
                );
                refresh();
                setRequest(null);
              })
            }
          >
            {t("Send request", "Enviar solicitud")}
          </Button>
        </Modal>
      )}
    </Page>
  );
}
export function LessonPage({ id }) {
  const t = useT(),
    { locale, version, refresh } = useApp(),
    load = useData("/api/pilot/lessons/" + encodeURIComponent(id), [version]),
    action = useAction(),
    [completed, setCompleted] = useState(false);
  return (
    <Page back="route" title={t("Your lesson", "Tu lección")}>
      <LoadState load={load}>
        {(data) => {
          const lesson = data?.lesson || {},
            revision = data?.revision || lesson,
            video = data?.video,
            embed = safeVideo(video?.embed_url);
          return (
            <article className="v-lesson-detail">
              <span className="v-eyebrow">
                {t("LEARN. APPLY. REPEAT.", "APRENDE. APLICA. REPITE.")}
              </span>
              <h2>{title(revision, locale)}</h2>
              <p className="v-lead">{description(revision, locale)}</p>
              {locale === "es" && !revision.title_es && (
                <span className="v-tag">
                  {t("Content in English", "Contenido en inglés")}
                </span>
              )}
              <div className="v-video">
                {embed ? (
                  <iframe
                    title={
                      title(revision, locale) +
                      " · " +
                      t("lesson video", "video de la lección")
                    }
                    src={embed}
                    allow="fullscreen; picture-in-picture"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                ) : (
                  <div className="v-empty">
                    <Play size={40} />
                    <p>
                      {t(
                        "This video is not available to embed. Use the provider link below.",
                        "Este video no está disponible para reproducir aquí. Usa el enlace al proveedor.",
                      )}
                    </p>
                  </div>
                )}
              </div>
              {video?.watch_url && (
                <a
                  className="v-link"
                  href={video.watch_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t(
                    "Open video provider in a new tab",
                    "Abrir proveedor de video en otra pestaña",
                  )}
                  <ArrowUpRight size={17} />
                </a>
              )}
              <div className="v-card v-script">
                <div className="v-section-icon">
                  <FileText />
                </div>
                <div>
                  <h3>{t("Your lesson script", "Guion de tu lección")}</h3>
                  <p>
                    {data?.pdf?.name || "PDF"}
                    {data?.pdf?.bytes
                      ? " · " +
                        (data.pdf.bytes / 1024 / 1024).toFixed(1) +
                        " MB"
                      : ""}
                  </p>
                  <small>
                    {t(
                      "Downloads privately to your device.",
                      "Se descarga de forma privada a tu dispositivo.",
                    )}
                  </small>
                </div>
                <Button
                  secondary
                  busy={action.busy}
                  onClick={() =>
                    action.run(() =>
                      downloadFile(
                        "/api/pilot/lessons/" + id + "/pdf",
                        data.pdf?.name || "script.pdf",
                      ),
                    )
                  }
                >
                  <Download size={17} />
                  {t("Open script", "Abrir guion")}
                </Button>
              </div>
              <ErrorBox error={action.error} />
              <div className="v-complete-card">
                <div>
                  <h3>
                    {completed || lesson.completed
                      ? t("A step forward.", "Un paso adelante.")
                      : t(
                          "Ready to mark your progress?",
                          "¿Listo para marcar tu avance?",
                        )}
                  </h3>
                  <p>
                    {t(
                      "Mark this lesson once you have reviewed the material.",
                      "Marca esta lección cuando hayas revisado el material.",
                    )}
                  </p>
                </div>
                <Button
                  disabled={completed || lesson.completed}
                  busy={action.busy}
                  onClick={() =>
                    action.run(async () => {
                      await api("/api/pilot/lessons/" + id + "/complete", {
                        method: "POST",
                        body: {},
                      });
                      setCompleted(true);
                      refresh();
                    })
                  }
                >
                  <Check size={18} />
                  {completed || lesson.completed
                    ? t("Completed", "Completada")
                    : t("Lesson completed", "Lección completada")}
                </Button>
              </div>
            </article>
          );
        }}
      </LoadState>
    </Page>
  );
}
export function OwnerPage() {
  const t = useT(),
    { locale, version, navigate, refresh, setPreview } = useApp(),
    load = useAll("/api/pilot/owner/lessons", [version]),
    requests = useData(
      "/api/pilot/owner/access-requests?status=pending&limit=1",
      [version],
    ),
    action = useAction(),
    [showCreate, setShowCreate] = useState(false),
    [name, setName] = useState(""),
    createKey = useRef(newKey()),
    [filter, setFilter] = useState("active");
  const move = (lesson, direction) =>
    action.run(async () => {
      const active = list(load.data).filter((l) => l.status !== "archived"),
        index = active.findIndex((l) => l.id === lesson.id),
        next = index + direction;
      if (next < 0 || next >= active.length) return;
      [active[index], active[next]] = [active[next], active[index]];
      await api("/api/pilot/owner/lessons/reorder", {
        method: "POST",
        body: {
          lesson_ids: active.map((l) => l.id),
          expected_catalog_version: load.data.catalog_version,
        },
      });
      refresh();
    });
  const statusAction = (lesson, actionName) =>
    action.run(async () => {
      if (
        !window.confirm(
          actionName === "archive"
            ? t(
                "Archive this lesson? Learners will no longer have access, but their progress history stays.",
                "¿Archivar esta lección? Los alumnos perderán acceso, pero su historial se conserva.",
              )
            : t(
                "Restore this lesson as a draft?",
                "¿Restaurar esta lección como borrador?",
              ),
        )
      )
        return;
      await api("/api/pilot/owner/lessons/" + lesson.id + "/" + actionName, {
        method: "POST",
        body: { expected_version: lesson.version },
      });
      refresh();
    });
  return (
    <Page
      eyebrow={t("YOUR ACADEMY", "TU ACADEMIA")}
      title={t("My roadmap", "Mi roadmap")}
      description={t(
        "Create the learning experience your team needs.",
        "Crea la experiencia de aprendizaje que tu equipo necesita.",
      )}
      actions={
        <Button
          onClick={() => {
            createKey.current = newKey();
            setShowCreate(true);
          }}
        >
          <Plus size={18} />
          {t("New lesson", "Nueva lección")}
        </Button>
      }
    >
      <div className="v-owner-toolbar">
        <button className="v-shortcut" onClick={() => navigate("requests")}>
          <Inbox />
          <span>
            {t("Access requests", "Solicitudes de acceso")}{" "}
            {requests.data?.total_pending > 0 && (
              <b className="v-count">{requests.data.total_pending}</b>
            )}
          </span>
          <ArrowUpRight size={18} />
        </button>
        <button className="v-shortcut" onClick={() => navigate("settings")}>
          <Settings />
          <span>{t("Academy settings", "Ajustes de academia")}</span>
          <ArrowUpRight size={18} />
        </button>
        <button
          className="v-shortcut"
          onClick={() => {
            setPreview(true);
            navigate("route");
          }}
        >
          <Eye />
          <span>
            {t(
              "View representative experience",
              "Ver experiencia del vendedor",
            )}
          </span>
          <ArrowUpRight size={18} />
        </button>
      </div>
      <div className="v-toolbar">
        <div className="v-segment">
          {[
            ["active", t("Active lessons", "Lecciones activas")],
            ["archived", t("Archived", "Archivadas")],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="v-muted">
          {t(
            "Only published lessons reach your team.",
            "Solo las lecciones publicadas llegan a tu equipo.",
          )}
        </span>
      </div>
      <ErrorBox error={action.error} />
      <LoadState load={load}>
        {(data) => {
          const lessons = list(data).filter((l) =>
            filter === "archived"
              ? l.status === "archived"
              : l.status !== "archived",
          );
          return lessons.length ? (
            <div className="v-owner-lessons">
              {lessons.map((lesson, index) => (
                <article className="v-card v-owner-lesson" key={lesson.id}>
                  <div className="v-owner-position">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="v-grow">
                    <div className="v-actions wrap">
                      <span
                        className={
                          "v-tag " +
                          (lesson.status === "published" ? "green" : "")
                        }
                      >
                        {lesson.status === "published"
                          ? t("Published", "Publicada")
                          : lesson.status === "archived"
                            ? t("Archived", "Archivada")
                            : t("Draft", "Borrador")}
                      </span>
                      <span className="v-tag">
                        {lesson.team_access === "open"
                          ? t("Team access open", "Acceso al equipo abierto")
                          : t("Access by request", "Acceso por solicitud")}
                      </span>
                    </div>
                    <h2>{title(lesson, locale)}</h2>
                    {requests.data?.pending_by_lesson?.find(
                      (item) => item.lesson_id === lesson.id,
                    )?.count > 0 && (
                      <span className="v-tag green">
                        {
                          requests.data.pending_by_lesson.find(
                            (item) => item.lesson_id === lesson.id,
                          ).count
                        }{" "}
                        {t("pending requests", "solicitudes pendientes")}
                      </span>
                    )}
                    <p>{description(lesson, locale)}</p>
                    <div className="v-actions wrap">
                      {lesson.status !== "archived" ? (
                        <>
                          <Button
                            secondary
                            onClick={() => navigate("editor", lesson.id)}
                          >
                            {t("Edit lesson", "Editar lección")}
                            <ArrowUpRight size={16} />
                          </Button>
                          <button
                            className="v-link warning"
                            disabled={action.busy}
                            onClick={() => statusAction(lesson, "archive")}
                          >
                            {t("Archive", "Archivar")}
                          </button>
                        </>
                      ) : (
                        <Button
                          secondary
                          onClick={() => statusAction(lesson, "restore")}
                        >
                          {t("Restore draft", "Restaurar borrador")}
                        </Button>
                      )}
                    </div>
                  </div>
                  {lesson.status !== "archived" && (
                    <div className="v-reorder">
                      <button
                        className="v-icon"
                        disabled={index === 0 || action.busy}
                        aria-label={
                          t("Move up: ", "Subir: ") + title(lesson, locale)
                        }
                        onClick={() => move(lesson, -1)}
                      >
                        <ArrowUp size={18} />
                      </button>
                      <button
                        className="v-icon"
                        disabled={index === lessons.length - 1 || action.busy}
                        aria-label={
                          t("Move down: ", "Bajar: ") + title(lesson, locale)
                        }
                        onClick={() => move(lesson, 1)}
                      >
                        <ArrowDown size={18} />
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title={t(
                "Build a path worth following.",
                "Construye una ruta que valga la pena seguir.",
              )}
            >
              {t(
                "Create a lesson, add its video and PDF, then publish it for your team.",
                "Crea una lección, agrega su video y PDF y publícala para tu equipo.",
              )}
            </Empty>
          );
        }}
      </LoadState>
      {showCreate && (
        <Modal
          title={t("Create a lesson", "Crear una lección")}
          onClose={() => setShowCreate(false)}
          dirty={!!name}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              action.run(async () => {
                const data = await api("/api/pilot/owner/lessons", {
                  method: "POST",
                  body: {
                    client_request_id: createKey.current,
                    title_en: name,
                  },
                });
                setShowCreate(false);
                setName("");
                refresh();
                navigate("editor", data.lesson.id);
              });
            }}
          >
            <Field
              label={t(
                "Lesson title · English",
                "Título de la lección · Inglés",
              )}
              required
              maxLength={160}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="v-muted">
              {t(
                "It starts as a private draft. Add your approved material before publishing.",
                "Comienza como borrador privado. Agrega tu material aprobado antes de publicar.",
              )}
            </p>
            <ErrorBox error={action.error} />
            <Button type="submit" busy={action.busy}>
              {t("Create draft", "Crear borrador")}
            </Button>
          </form>
        </Modal>
      )}
    </Page>
  );
}
export function EditorPage({ id }) {
  const t = useT(),
    { version } = useApp(),
    load = useData("/api/pilot/owner/lessons/" + id + "/draft", [version]);
  return (
    <Page
      back="owner"
      title={t("Lesson editor", "Editor de lección")}
      description={t(
        "Save privately. Preview carefully. Publish with confidence.",
        "Guarda en privado. Revisa con cuidado. Publica con confianza.",
      )}
    >
      <LoadState load={load}>
        {(data) => (
          <EditorForm key={id} id={id} data={data} reload={load.reload} />
        )}
      </LoadState>
    </Page>
  );
}
function EditorForm({ id, data, reload }) {
  const t = useT(),
    { refresh, setUnsaved } = useApp(),
    action = useAction(),
    [lesson, setLesson] = useState(data.lesson),
    [draft, setDraft] = useState(() => editorDraft(data)),
    [file, setFile] = useState(null),
    [fileName, setFileName] = useState(""),
    [dirty, setDirty] = useState(false),
    [preview, setPreview] = useState(false),
    [saved, setSaved] = useState(false),
    uploadKey = useRef(newKey());
  useEffect(() => {
    if (!dirty) {
      setLesson(data.lesson);
      setDraft(editorDraft(data));
    }
  }, [data]);
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
  const set = (field, value) => {
    setDraft((d) => ({ ...d, [field]: value }));
    setDirty(true);
    setSaved(false);
  };
  const save = () =>
    action.run(async () => {
      let assetId = draft.pdf_asset_id;
      if (file) {
        if (file.size > 10 * 1024 * 1024)
          throw Object.assign(new Error("upload_too_large"), {
            code: "upload_too_large",
          });
        const uploaded = await api("/api/pilot/owner/assets/pdf", {
          method: "POST",
          body: file,
          headers: {
            "Content-Type": "application/pdf",
            "X-Client-Request-ID": uploadKey.current,
            "X-File-Name": encodeURIComponent(file.name),
          },
        });
        assetId = uploaded.asset.id;
        setFileName(uploaded.asset.name);
        setDraft((d) => ({ ...d, pdf_asset_id: assetId }));
        setFile(null);
      }
      const result = await api("/api/pilot/owner/lessons/" + id + "/draft", {
        method: "PATCH",
        body: {
          expected_version: lesson.version,
          title_en: draft.title_en || "",
          title_es: draft.title_es || "",
          description_en: draft.description_en || "",
          description_es: draft.description_es || "",
          video_url: draft.video_url || "",
          pdf_asset_id: assetId || null,
        },
      });
      setLesson(result.lesson);
      setDraft(result.draft);
      setFile(null);
      setDirty(false);
      setUnsaved(false);
      setSaved(true);
      return result;
    });
  const publish = () =>
    action.run(async () => {
      if (
        !window.confirm(
          t(
            "Publish this reviewed lesson to your team?",
            "¿Publicar esta lección revisada para tu equipo?",
          ),
        )
      )
        return;
      const result = await api("/api/pilot/owner/lessons/" + id + "/publish", {
        method: "POST",
        body: { expected_version: lesson.version, revision_id: draft.id },
      });
      setSaved(false);
      setDirty(false);
      refresh();
      reload();
    });
  return (
    <>
      <div className="v-editor-layout">
        <form
          className="v-card"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="v-section-heading">
            <h2>{t("Lesson content", "Contenido de lección")}</h2>
            <span className="v-tag">
              {draft.id
                ? t("Draft", "Borrador")
                : t("Published version", "Versión publicada")}
            </span>
          </div>
          {!draft.id && data.published_revision && (
            <p className="v-muted">
              {t(
                "You are viewing the published content. Save your edits to create a new draft.",
                "Estás viendo el contenido publicado. Guarda tus cambios para crear un nuevo borrador.",
              )}
            </p>
          )}
          <Field
            label={t("Title · English", "Título · Inglés")}
            required
            maxLength={160}
            value={draft.title_en || ""}
            onChange={(e) => set("title_en", e.target.value)}
          />
          <Field
            label={t("Description · English", "Descripción · Inglés")}
            multiline
            rows={3}
            maxLength={1000}
            value={draft.description_en || ""}
            onChange={(e) => set("description_en", e.target.value)}
          />
          <details>
            <summary>
              {t("Optional Spanish version", "Versión opcional en español")}
            </summary>
            <Field
              label={t("Title · Spanish", "Título · Español")}
              maxLength={160}
              value={draft.title_es || ""}
              onChange={(e) => set("title_es", e.target.value)}
            />
            <Field
              label={t("Description · Spanish", "Descripción · Español")}
              multiline
              rows={3}
              maxLength={1000}
              value={draft.description_es || ""}
              onChange={(e) => set("description_es", e.target.value)}
            />
          </details>
          <Field
            label={t("YouTube or Vimeo link", "Enlace de YouTube o Vimeo")}
            hint={t(
              "Use a video that allows embedded playback.",
              "Usa un video que permita reproducción incrustada.",
            )}
            type="url"
            value={draft.video_url || ""}
            onChange={(e) => set("video_url", e.target.value)}
          />
          <div className="v-upload">
            <FileText size={26} />
            <strong>
              {file?.name ||
                fileName ||
                (draft.pdf_asset_id
                  ? t("PDF uploaded", "PDF cargado")
                  : t(
                      "Upload the lesson script",
                      "Sube el guion de la lección",
                    ))}
            </strong>
            <small>
              {file
                ? t(
                    "Selected · save draft to upload",
                    "Seleccionado · guarda el borrador para cargarlo",
                  )
                : t("PDF · maximum 10 MiB", "PDF · máximo 10 MiB")}
            </small>
            <Field
              label={t("Choose or replace PDF", "Elegir o reemplazar PDF")}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                uploadKey.current = newKey();
                setDirty(true);
                setSaved(false);
              }}
            />
            {draft.pdf_asset_id && !file && (
              <button
                type="button"
                className="v-link"
                onClick={() =>
                  action.run(() =>
                    downloadFile(
                      "/api/pilot/owner/assets/" +
                        draft.pdf_asset_id +
                        "/download",
                      fileName || "script.pdf",
                    ),
                  )
                }
              >
                <Download size={16} />
                {t("Download saved PDF", "Descargar PDF guardado")}
              </button>
            )}
          </div>
          <ErrorBox
            error={action.error}
            retry={
              action.error?.status === 409
                ? () => {
                    if (
                      dirty &&
                      !window.confirm(
                        t(
                          "Reload the latest version and discard these unsaved changes?",
                          "¿Recargar la última versión y descartar estos cambios sin guardar?",
                        ),
                      )
                    )
                      return;
                    setDirty(false);
                    setUnsaved(false);
                    setFile(null);
                    action.clear();
                    reload();
                  }
                : undefined
            }
          />
          {saved && (
            <Notice>
              {t(
                "Draft saved. Your team still sees the last published version.",
                "Borrador guardado. Tu equipo sigue viendo la última versión publicada.",
              )}
            </Notice>
          )}
          <div className="v-actions wrap">
            <Button type="submit" busy={action.busy}>
              <Save size={17} />
              {t("Save draft", "Guardar borrador")}
            </Button>
            <Button type="button" secondary onClick={() => setPreview(true)}>
              <Eye size={17} />
              {t("Preview", "Vista previa")}
            </Button>
          </div>
        </form>
        <aside>
          <section className="v-card">
            <span className="v-eyebrow">
              {t("READY FOR YOUR TEAM", "LISTO PARA TU EQUIPO")}
            </span>
            <h2>
              {t("Review before publishing.", "Revisa antes de publicar.")}
            </h2>
            <p>
              {t(
                "Check your video and PDF. Publishing makes the reviewed version available according to your access settings.",
                "Revisa tu video y PDF. Publicar hace disponible la versión revisada según tus permisos de acceso.",
              )}
            </p>
            <ul className="v-checklist">
              <li>
                <Check size={16} />
                {t("English title", "Título en inglés")}
              </li>
              <li>
                <Play size={16} />
                {t("Working video link", "Enlace de video funcional")}
              </li>
              <li>
                <FileText size={16} />
                {t("Uploaded PDF script", "Guion PDF cargado")}
              </li>
            </ul>
            <Button
              disabled={
                dirty ||
                !!file ||
                !draft.video_url ||
                !draft.pdf_asset_id ||
                !draft.id
              }
              busy={action.busy}
              onClick={publish}
            >
              {t("Approve & publish", "Aprobar y publicar")}
              <ArrowUpRight size={17} />
            </Button>
            {dirty && (
              <small className="v-muted">
                {t(
                  "Save your changes before publishing.",
                  "Guarda tus cambios antes de publicar.",
                )}
              </small>
            )}
          </section>
          <LessonPermissions
            id={id}
            lesson={lesson}
            exceptions={data.access_exceptions || []}
            onChange={(updated) => {
              if (updated) setLesson(updated);
              reload();
            }}
          />
        </aside>
      </div>
      {preview && (
        <Modal
          title={t(
            "Draft preview · not published",
            "Vista previa de borrador · sin publicar",
          )}
          onClose={() => setPreview(false)}
        >
          <h3>{draft.title_en}</h3>
          <p>{draft.description_en}</p>
          {draft.video_url && (
            <a
              className="v-button secondary"
              target="_blank"
              rel="noopener noreferrer"
              href={safeWatch(draft.video_url) || "#"}
            >
              {t("Check video in a new tab", "Revisar video en otra pestaña")}
              <ArrowUpRight size={17} />
            </a>
          )}
          <p>
            {draft.pdf_asset_id
              ? t(
                  "The saved PDF can be downloaded from the editor.",
                  "Puedes descargar el PDF guardado desde el editor.",
                )
              : t(
                  "Add a PDF before publishing.",
                  "Agrega un PDF antes de publicar.",
                )}
          </p>
        </Modal>
      )}
    </>
  );
}
function safeWatch(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      [
        "youtube.com",
        "www.youtube.com",
        "youtu.be",
        "vimeo.com",
        "www.vimeo.com",
        "player.vimeo.com",
      ].includes(u.hostname)
      ? u.href
      : null;
  } catch {
    return null;
  }
}
function LessonPermissions({ id, lesson, exceptions, onChange }) {
  const t = useT(),
    action = useAction(),
    [individual, setIndividual] = useState(""),
    [decision, setDecision] = useState("allow"),
    [saved, setSaved] = useState(false),
    team = useAll(
      "/api/pilot/owner/team?period=month&anchor_date=" + localDay(),
    );
  const existing = exceptions.find((item) => item.user_id === individual);
  const choose = (value) => {
    setIndividual(value);
    setDecision(
      exceptions.find((item) => item.user_id === value)?.decision || "inherit",
    );
    setSaved(false);
  };
  const apply = () =>
    action.run(async () => {
      const expected = accessVersion(exceptions, individual);
      if (decision === "inherit" && !expected) return;
      await api("/api/pilot/owner/lessons/" + id + "/access/" + individual, {
        method: decision === "inherit" ? "DELETE" : "PUT",
        ...(decision === "inherit"
          ? { headers: { "If-Match": String(expected) } }
          : { body: { decision, expected_version: expected } }),
      });
      setSaved(true);
      onChange();
    });
  return (
    <section className="v-card">
      <h2>{t("Lesson access", "Acceso a la lección")}</h2>
      <p>
        {t(
          "Team settings apply unless you set a personal exception.",
          "La regla del equipo aplica salvo que definas una excepción personal.",
        )}
      </p>
      <Field label={t("Team access", "Acceso del equipo")}>
        <select
          value={lesson.team_access || "closed"}
          disabled={action.busy}
          onChange={(e) =>
            action.run(async () => {
              const data = await api(
                "/api/pilot/owner/lessons/" + id + "/access",
                {
                  method: "PATCH",
                  body: {
                    team_access: e.target.value,
                    expected_version: lesson.version,
                  },
                },
              );
              onChange(data.lesson);
            })
          }
        >
          <option value="closed">
            {t("Closed · access by request", "Cerrado · acceso por solicitud")}
          </option>
          <option value="open">
            {t("Open to my team", "Abierto a mi equipo")}
          </option>
        </select>
      </Field>
      <details>
        <summary>
          {t("Personal exceptions", "Excepciones personales")} ·{" "}
          {exceptions.length}
        </summary>
        {exceptions.map((item) => (
          <button
            className="v-permission-row"
            key={item.user_id}
            onClick={() => choose(item.user_id)}
          >
            <span>{item.display_name}</span>
            <span className="v-tag">
              {item.decision === "allow"
                ? t("Allowed", "Permitido")
                : t("Denied", "Denegado")}
            </span>
          </button>
        ))}
        <Field label={t("Representative", "Vendedor")}>
          <select value={individual} onChange={(e) => choose(e.target.value)}>
            <option value="">
              {t("Choose a person", "Elige una persona")}
            </option>
            {list(team.data).map((item) => (
              <option key={item.user.id} value={item.user.id}>
                {item.user.display_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Permission", "Permiso")}>
          <select
            value={decision}
            onChange={(e) => {
              setDecision(e.target.value);
              setSaved(false);
            }}
          >
            <option value="allow">{t("Allow", "Permitir")}</option>
            <option value="deny">{t("Deny", "Denegar")}</option>
            <option value="inherit">
              {t("Use team setting", "Usar regla del equipo")}
            </option>
          </select>
        </Field>
        <Button
          secondary
          disabled={!individual || (decision === "inherit" && !existing)}
          busy={action.busy}
          onClick={apply}
        >
          {t("Save permission", "Guardar permiso")}
        </Button>
        {saved && (
          <Notice>{t("Permission saved.", "Permiso guardado.")}</Notice>
        )}
      </details>
      <ErrorBox error={team.error || action.error} />
    </section>
  );
}
export function RequestsPage() {
  const t = useT(),
    { version, refresh, locale } = useApp(),
    [status, setStatus] = useState("pending"),
    load = useAll("/api/pilot/owner/access-requests?status=" + status, [
      version,
    ]),
    action = useAction();
  return (
    <Page
      back="owner"
      title={t("Access requests", "Solicitudes de acceso")}
      description={t(
        "See where your team wants to grow next.",
        "Descubre qué quiere aprender tu equipo después.",
      )}
    >
      <div className="v-segment">
        {[
          ["pending", t("Pending", "Pendientes")],
          ["approved", t("Approved", "Aprobadas")],
          ["rejected", t("Rejected", "Rechazadas")],
          ["resolved_by_team_access", t("Team opened", "Equipo abierto")],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={status === value}
            onClick={() => setStatus(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <ErrorBox error={action.error} />
      <LoadState load={load}>
        {(data) =>
          list(data).length ? (
            <div className="v-rows">
              {list(data).map((item) => (
                <article className="v-card v-request" key={item.id}>
                  <div>
                    <h2>
                      {item.user?.display_name ||
                        item.display_name ||
                        item.user_name ||
                        t("Team member", "Miembro del equipo")}
                    </h2>
                    <p>
                      {item.lesson
                        ? title(item.lesson, locale)
                        : item.lesson_title ||
                          t("Lesson access", "Acceso a lección")}
                    </p>
                    <small>{(item.created_at || "").slice(0, 10)}</small>
                  </div>
                  {status === "pending" ? (
                    <div className="v-actions">
                      <Button
                        busy={action.busy}
                        onClick={() =>
                          action.run(async () => {
                            await api(
                              "/api/pilot/owner/access-requests/" +
                                item.id +
                                "/resolve",
                              {
                                method: "POST",
                                body: {
                                  decision: "approved",
                                  expected_version: item.version,
                                },
                              },
                            );
                            refresh();
                          })
                        }
                      >
                        <Check size={17} />
                        {t("Allow access", "Dar acceso")}
                      </Button>
                      <Button
                        secondary
                        busy={action.busy}
                        onClick={() =>
                          action.run(async () => {
                            await api(
                              "/api/pilot/owner/access-requests/" +
                                item.id +
                                "/resolve",
                              {
                                method: "POST",
                                body: {
                                  decision: "rejected",
                                  expected_version: item.version,
                                },
                              },
                            );
                            refresh();
                          })
                        }
                      >
                        {t("Decline", "Rechazar")}
                      </Button>
                    </div>
                  ) : (
                    <span className="v-tag">
                      {status === "approved"
                        ? t("Approved", "Aprobada")
                        : status === "resolved_by_team_access"
                          ? t("Opened for team", "Abierta al equipo")
                          : t("Rejected", "Rechazada")}
                    </span>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <Empty title={t("All caught up.", "Todo al día.")}>
              {t(
                "Requests will appear here when a representative asks for a lesson.",
                "Las solicitudes aparecerán cuando un vendedor pida acceso a una lección.",
              )}
            </Empty>
          )
        }
      </LoadState>
    </Page>
  );
}
export function TeamPage({ id }) {
  const t = useT(),
    { locale, version, navigate } = useApp(),
    [period, setPeriod] = useState("month"),
    load = useAll(
      "/api/pilot/owner/team" +
        (id ? "/" + id : "") +
        "?period=" +
        period +
        "&anchor_date=" +
        localDay(),
      [version],
    );
  return (
    <Page
      back={id ? "team" : undefined}
      eyebrow={t("PROGRESS TOGETHER", "AVANCEN JUNTOS")}
      title={
        id
          ? t("Representative progress", "Avance del vendedor")
          : t("My team", "Mi equipo")
      }
      description={t(
        "Performance and learning, with private notes kept private.",
        "Desempeño y aprendizaje, manteniendo privadas las notas personales.",
      )}
    >
      <Periods period={period} setPeriod={setPeriod} />
      <LoadState load={load}>
        {(data) =>
          id ? (
            <>
              <h2 className="v-team-name">{data.user?.display_name}</h2>
              <div className="v-card">
                <h2>{t("Monthly reference", "Referencia mensual")}</h2>
                <p>
                  {data.metrics?.goal
                    ? money(data.metrics.goal.budget_volume_cents, locale) +
                      " · " +
                      data.metrics.budget_month
                    : t(
                        "No monthly goal has been confirmed.",
                        "No se ha confirmado una meta mensual.",
                      )}
                </p>
              </div>
              <Kpis metrics={data.metrics} />
              <div className="v-card">
                <h2>{t("Learning progress", "Avance de aprendizaje")}</h2>
                <p>
                  {data.progress?.completed ??
                    data.progress?.completed_lessons ??
                    0}{" "}
                  /{" "}
                  {data.progress?.available ??
                    data.progress?.accessible_lessons ??
                    data.progress?.total ??
                    0}{" "}
                  {t(
                    "available lessons completed",
                    "lecciones disponibles completadas",
                  )}
                </p>
                <div className="v-rows">
                  {(data.lessons || []).map((l) => (
                    <div className="v-row" key={l.id || l.lesson_id}>
                      <strong>{title(l, locale)}</strong>
                      <span className="v-tag">
                        {l.completed || l.completed_at
                          ? t("Completed", "Completada")
                          : t("In progress", "En progreso")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="v-card">
                <h2>{t("Access requests", "Solicitudes de acceso")}</h2>
                <p>
                  {data.progress?.pending_requests || 0}{" "}
                  {t("pending", "pendientes")} ·{" "}
                  {data.progress?.requested_lessons || 0}{" "}
                  {t("lessons requested", "lecciones solicitadas")}
                </p>
                {(data.requests || []).map((request) => (
                  <div className="v-row" key={request.id}>
                    <span>
                      {request.lesson_title ||
                        t("Lesson access", "Acceso a lección")}
                      <small>{request.created_at?.slice(0, 10)}</small>
                    </span>
                    <span className="v-tag">
                      {request.status === "pending"
                        ? t("Pending", "Pendiente")
                        : request.status === "approved"
                          ? t("Approved", "Aprobada")
                          : request.status === "rejected"
                            ? t("Rejected", "Rechazada")
                            : t("Opened for team", "Abierta al equipo")}
                    </span>
                  </div>
                ))}
                <button className="v-link" onClick={() => navigate("requests")}>
                  {t("Manage requests", "Gestionar solicitudes")}
                  <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="v-card">
                <h2>{t("Tour activity", "Actividad de tours")}</h2>
                {(data.tours || []).length ? (
                  (data.tours || []).map((item) => (
                    <div className="v-row" key={item.id}>
                      <span>
                        {item.occurred_on} ·{" "}
                        {item.tour_kind === "no_tour"
                          ? "No Tour"
                          : item.tour_kind?.toUpperCase()}
                      </span>
                      <span>
                        {item.sale_status === "sold"
                          ? money(item.net_volume_cents, locale)
                          : t("No active sale", "Sin venta activa")}
                      </span>
                    </div>
                  ))
                ) : (
                  <p>
                    {t(
                      "No activity in this period.",
                      "Sin actividad en este periodo.",
                    )}
                  </p>
                )}
              </div>
            </>
          ) : list(data).length ? (
            <div className="v-team-list">
              {list(data).map((item) => (
                <button
                  className="v-card v-team-card"
                  key={item.user.id}
                  onClick={() => navigate("team", item.user.id)}
                >
                  <span className="v-avatar">
                    {item.user.display_name?.slice(0, 1)}
                  </span>
                  <div className="v-grow">
                    <h2>{item.user.display_name}</h2>
                    <p>
                      {item.metrics?.activity_totals?.qualified_tours ?? 0} Q ·{" "}
                      {item.metrics?.activity_totals?.sales ?? 0}{" "}
                      {t("sales", "ventas")} ·{" "}
                      {money(
                        item.metrics?.activity_totals?.net_volume_cents,
                        locale,
                      )}
                    </p>
                    <small>
                      {item.progress?.pending_requests || 0}{" "}
                      {t("pending requests", "solicitudes pendientes")}
                    </small>
                    <div className="v-team-metrics">
                      <span>
                        <small>{t("Closing", "Cierre")}</small>
                        <strong>
                          {item.metrics?.kpis?.closing_percent == null
                            ? "—"
                            : item.metrics.kpis.closing_percent + "%"}
                        </strong>
                      </span>
                      <span>
                        <small>VPG</small>
                        <strong>
                          {money(item.metrics?.kpis?.vpg_cents, locale)}
                        </strong>
                      </span>
                      <span>
                        <small>{t("Completed", "Completadas")}</small>
                        <strong>
                          {item.progress?.completed ??
                            item.progress?.completed_lessons ??
                            0}{" "}
                          /{" "}
                          {item.progress?.available ??
                            item.progress?.accessible_lessons ??
                            item.progress?.total ??
                            0}
                        </strong>
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight size={22} />
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title={t("Your team starts here.", "Tu equipo comienza aquí.")}
            >
              {t(
                "Ask your operator to add the representatives in your academy.",
                "Pide a tu operador que dé de alta a los vendedores de tu academia.",
              )}
            </Empty>
          )
        }
      </LoadState>
    </Page>
  );
}
export function SettingsPage() {
  const t = useT(),
    { version } = useApp(),
    load = useData("/api/pilot/owner/settings", [version]);
  return (
    <Page
      back="owner"
      title={t("Make it your academy.", "Hazla tu academia.")}
      description={t(
        "A familiar name. A welcome that sounds like you.",
        "Un nombre familiar. Una bienvenida que suene a ti.",
      )}
    >
      <LoadState load={load}>
        {(data) => <SettingsForm data={data.settings || data} />}
      </LoadState>
    </Page>
  );
}
function SettingsForm({ data }) {
  const t = useT(),
    { refresh, setSession } = useApp(),
    [form, setForm] = useState(data),
    [saved, setSaved] = useState(false),
    action = useAction();
  return (
    <form
      className="v-card v-narrow"
      onSubmit={(e) => {
        e.preventDefault();
        action.run(async () => {
          const result = await api("/api/pilot/owner/settings", {
            method: "PATCH",
            body: {
              expected_version: form.version,
              app_name: form.app_name,
              welcome_title_en: form.welcome_title_en,
              welcome_title_es: form.welcome_title_es || "",
            },
          });
          setForm(result.settings || result);
          setSaved(true);
          setSession(await api("/api/mobile/me"));
          refresh();
        });
      }}
    >
      <Field
        label={t("Academy name", "Nombre de la academia")}
        required
        minLength={1}
        maxLength={60}
        value={form.app_name || ""}
        onChange={(e) => {
          setForm({ ...form, app_name: e.target.value });
          setSaved(false);
        }}
      />
      <Field
        label={t("Welcome title · English", "Título de bienvenida · Inglés")}
        required
        maxLength={140}
        value={form.welcome_title_en || ""}
        onChange={(e) => {
          setForm({ ...form, welcome_title_en: e.target.value });
          setSaved(false);
        }}
      />
      <Field
        label={t(
          "Welcome title · Spanish · Optional",
          "Título de bienvenida · Español · Opcional",
        )}
        maxLength={140}
        value={form.welcome_title_es || ""}
        onChange={(e) => {
          setForm({ ...form, welcome_title_es: e.target.value });
          setSaved(false);
        }}
      />
      <div className="v-brand-preview">
        <span className="v-eyebrow">
          {t("SIGNED-IN PREVIEW", "VISTA DESPUÉS DE INGRESAR")}
        </span>
        <strong>{form.app_name}</strong>
        <p>{form.welcome_title_en}</p>
        <small>
          {t(
            "The public sign-in screen keeps the platform identity.",
            "La pantalla pública de acceso conserva la identidad de la plataforma.",
          )}
        </small>
      </div>
      <ErrorBox error={action.error} />
      {saved && (
        <Notice>
          {t(
            "Your academy settings are saved.",
            "Los ajustes de tu academia están guardados.",
          )}
        </Notice>
      )}
      <Button type="submit" busy={action.busy}>
        {t("Save settings", "Guardar ajustes")}
      </Button>
    </form>
  );
}
