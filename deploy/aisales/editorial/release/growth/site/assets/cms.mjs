const $ = (selector) => document.querySelector(selector);
const h = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const clone = (value) => structuredClone(value);
const videoCatalog = JSON.parse(document.querySelector("#video-catalog").textContent);
const videoOptions = { "": "Sin video local", ...Object.fromEntries(Object.entries(videoCatalog).map(([id, clip]) => [id, clip.title])) };
const labels = {
  role: { rep: "Representante", leader: "Líder", director: "Dirección" },
  type: {
    guide: "Guía",
    template: "Plantilla",
    matrix: "Matriz",
    video: "Video",
    audio: "Audio",
  },
  topic: {
    coordination: "Coordinación",
    practice: "Práctica",
    evidence: "Evidencia",
  },
  status: {
    draft: "Borrador",
    review: "En revisión",
    published: "Publicado",
    archived: "Archivado",
  },
  access: { owner: "Propietario", editor: "Editor" },
  request: {
    new: "Nueva",
    contacted: "Contactada",
    qualified: "Calificada",
    closed: "Cerrada",
  },
  advisorStatus: {
    pending_confirmation: "Pendiente de confirmar",
    contacted: "Contactada",
    qualified: "Calificada",
    closed: "Cerrada",
  },
};
const state = {
  user: null,
  csrf: null,
  document: null,
  revision: 0,
  publishedRevision: null,
  page: "home",
  navigationGeneration: 0,
  mediaGeneration: 0,
  dirty: false,
  resource: null,
  isNew: false,
  media: [],
  mediaCursor: null,
  mediaQuery: "",
  selectedMedia: null,
  requestCursor: null,
  revisionCursor: null,
  userCursor: null,
};
const content = $("#cms-content");
function notice(message, kind = "success") {
  const box = $("#cms-status");
  box.textContent = message;
  box.className = "cms-toast " + kind;
  box.hidden = false;
}
function clearNotice() {
  $("#cms-status").hidden = true;
}
function dirty(value = true) {
  state.dirty = value;
  $("#save-indicator").textContent = value
    ? "Cambios sin guardar"
    : `Borrador guardado · versión ${state.revision}`;
  $("#publish-button").disabled = value;
}
function options(items, value) {
  return Object.entries(items)
    .map(
      ([key, label]) =>
        `<option value="${h(key)}"${value === key ? " selected" : ""}>${h(label)}</option>`,
    )
    .join("");
}
function input(
  label,
  name,
  value,
  {
    area = false,
    max = 500,
    required = true,
    type = "text",
    full = false,
    help = "",
    readOnly = false,
  } = {},
) {
  return `<label${full ? ' class="full"' : ""}>${h(label)}${area ? `<textarea name="${h(name)}" aria-label="${h(label)}" maxlength="${max}"${required ? " required" : ""}>${h(value)}</textarea>` : `<input name="${h(name)}" aria-label="${h(label)}" type="${type}" value="${h(value)}" maxlength="${max}"${required ? " required" : ""}${readOnly ? " readonly" : ""}>`}${help ? `<small>${h(help)}</small>` : ""}</label>`;
}
function select(label, name, items, value, help = "") {
  return `<label>${h(label)}<select name="${h(name)}" aria-label="${h(label)}">${options(items, value)}</select>${help ? `<small>${h(help)}</small>` : ""}</label>`;
}
function heading(eyebrow, title, description, action = "") {
  return `<div class="cms-heading"><div><p class="eyebrow">${h(eyebrow)}</p><h1>${h(title)}</h1><p>${h(description)}</p></div>${action}</div>`;
}
function button(label, action, extra = "", outline = true) {
  return `<button type="button" class="button button-small${outline ? " button-outline" : ""}" data-action="${action}" ${extra}>${label}</button>`;
}
function empty(title, description) {
  return `<div class="cms-empty"><h2>${h(title)}</h2><p>${h(description)}</p></div>`;
}
function date(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.valueOf())
    ? String(value)
    : new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
}
function bytes(value) {
  return (
    new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(
      (value || 0) / 1048576,
    ) + " MB"
  );
}
async function api(path, method = "GET", payload) {
  const headers = {};
  let body;
  if (payload instanceof FormData) {
    body = payload;
  } else if (payload !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(payload);
  }
  if (method !== "GET" && state.csrf) headers["X-CSRF-Token"] = state.csrf;
  let res;
  try {
    res = await fetch("/cms/api/" + path, {
      method,
      headers,
      body,
      credentials: "same-origin",
    });
  } catch {
    throw new Error(
      "No se pudo conectar. Tus cambios siguen en el editor; vuelve a intentar.",
    );
  }
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("El servidor no devolvió una respuesta válida.");
  }
  if (!res.ok) {
    const error = new Error(
      data.error?.message || "No se pudo completar la acción.",
    );
    error.status = res.status;
    error.code = data.error?.code;
    throw error;
  }
  return data;
}
function failure(error) {
  if (error.status === 409) {
    notice(
      "Otro editor guardó una versión más reciente. Tus cambios siguen aquí. Copia lo que necesites y usa «Recargar borrador» para revisar la versión actual.",
      "warn",
    );
  } else if (error.status === 401) {
    notice(
      "Tu sesión venció. Abre el CMS en otra pestaña e inicia sesión; después vuelve aquí para guardar los cambios.",
      "error",
    );
  } else notice(error.message || "No se pudo completar la acción.", "error");
}
function acceptDraft(data) {
  state.document = data.document;
  state.revision = data.revision;
  state.publishedRevision = data.publishedRevision;
  dirty(false);
}
async function loadDraft() {
  acceptDraft(await api("draft"));
}
function navigation() {
  const items = [
    ["home", "⌂", "Inicio"],
    ["landing", "▤", "Landing"],
    ["resources", "▱", "Recursos"],
    ["media", "▧", "Medios"],
  ];
  if (state.user.role === "owner")
    items.push(
      ["requests", "↗", "Solicitudes"],
      ["advisor", "✦", "Asesor IA"],
      ["publications", "◷", "Publicaciones"],
      ["users", "♙", "Usuarios"],
    );
  $("#cms-nav").innerHTML = items
    .map(
      ([key, icon, label]) =>
        `<button type="button" data-page="${key}" class="${state.page === key ? "active" : ""}"${state.page === key ? ' aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${icon}</span>${label}</button>`,
    )
    .join("");
  $("#cms-user").innerHTML =
    `<p class="user-badge"><span class="user-avatar">${h(state.user.username.slice(0, 1).toUpperCase())}</span><span>${h(state.user.username)}<small>${h(labels.access[state.user.role])}</small></span></p>`;
  $("#publish-button").hidden = state.user.role !== "owner";
}
async function enter(session) {
  state.user = session.user;
  state.csrf = session.csrf;
  await loadDraft();
  $("#login-view").hidden = true;
  $("#cms-shell").hidden = false;
  await navigate("home", true);
}
function currentView(generation, page) {
  return generation === state.navigationGeneration && state.page === page;
}
async function navigate(page, force = false) {
  if (
    state.dirty &&
    !force &&
    !confirm(
      "Hay cambios sin guardar. ¿Quieres descartarlos y cambiar de sección?",
    )
  )
    return;
  const generation = ++state.navigationGeneration;
  ++state.mediaGeneration;
  dirty(false);
  state.page = page;
  state.resource = null;
  state.selectedMedia = null;
  navigation();
  clearNotice();
  content.innerHTML = '<p class="cms-loading">Cargando tu espacio…</p>';
  $("#preview-link").href =
    page === "resources" ? "/cms/preview/?page=hub" : "/cms/preview/";
  try {
    if (page === "home") await home();
    else if (page === "landing") landing();
    else if (page === "resources") resourceList();
    else if (page === "media") await mediaLibrary();
    else if (page === "requests") await requests();
    else if (page === "advisor") await advisorLeads();
    else if (page === "publications") await publications();
    else if (page === "users") await users();
  } catch (error) {
    if (!currentView(generation, page)) return;
    content.innerHTML = empty(
      "No pudimos cargar esta sección.",
      "Vuelve a elegirla en el menú para intentarlo de nuevo.",
    );
    failure(error);
  }
}
async function home() {
  const generation = state.navigationGeneration;
  let metrics = null;
  if (state.user.role === "owner") metrics = await api("metrics");
  if (!currentView(generation, "home")) return;
  const resources = state.document.resources;
  content.innerHTML =
    heading(
      "VISTA GENERAL",
      "Una buena sala empieza aquí.",
      "Contenido útil, revisión editorial y una publicación consciente.",
    ) +
    `<div class="cms-stats"><div class="stat-box"><span>RECURSOS EN EL BORRADOR</span><strong>${resources.length}</strong><small>${resources.filter((r) => r.status === "published").length} marcados para publicación</small></div><div class="stat-box"><span>VERSIÓN DEL BORRADOR</span><strong>${state.revision}</strong><small>Guardado independiente del sitio</small></div>${metrics ? `<div class="stat-box"><span>SOLICITUDES RECIBIDAS</span><strong>${h(metrics.requests.total)}</strong><small>${h(metrics.requests.new)} por revisar</small></div><div class="stat-box"><span>PUBLICACIONES</span><strong>${h(metrics.publications)}</strong><small>Versiones recuperables</small></div>` : `<div class="stat-box"><span>TU ROL</span><strong class="role-stat">Editor</strong><small>Prepara y revisa contenido</small></div><div class="stat-box"><span>PREGUNTAS FRECUENTES</span><strong>${state.document.faqs.length}</strong><small>Respuestas en la landing</small></div>`}</div><div class="cms-panels"><section class="cms-panel"><p class="eyebrow">CADA CAMBIO TIENE SU MOMENTO</p><h2>Del borrador al sitio.</h2><div class="workflow-line"><span>01</span><div><h3>Escribe con claridad</h3><p>Edita la landing, organiza recursos y añade medios con origen y derechos documentados.</p></div></div><div class="workflow-line"><span>02</span><div><h3>Revisa en contexto</h3><p>Guarda tus cambios y abre la vista previa privada. Comprueba contenido, enlaces y lectura móvil.</p></div></div><div class="workflow-line"><span>03</span><div><h3>Publica una versión completa</h3><p>Un propietario publica el borrador. Puedes recuperar una versión anterior sin publicarla automáticamente.</p></div></div></section><section class="cms-panel"><p class="eyebrow">SIGUIENTE ACCIÓN</p><h2>Entra al contenido.</h2><div class="cms-shortcuts"><button data-page="landing">Editar la landing <span>→</span></button><button data-page="resources">Organizar los recursos <span>→</span></button><button data-page="media">Gestionar la biblioteca <span>→</span></button></div><p class="cms-note">Los números reflejan datos guardados en este entorno. Las visitas solo se registran con consentimiento.</p></section></div>${
      metrics
        ? `<section class="cms-panel"><p class="eyebrow">SEÑALES CON CONSENTIMIENTO</p><h2>Lo que ocurre en el recorrido.</h2>${diagnosticMetric(metrics.diagnostic)}${Object.entries(
            metrics.events,
          )
            .map(
              ([k, v]) =>
                `<div class="metric-detail"><span>${h({ demo_requested: "Solicitudes recibidas", landing_viewed: "Visitas a la landing", resource_viewed: "Lecturas de recursos", diagnostic_started: "Diagnósticos iniciados", diagnostic_completed: "Diagnósticos completados", recommendation_opened: "Recomendaciones abiertas" }[k] || k)}</span><strong>${h(v)}</strong></div>`,
            )
            .join(
              "",
            )}<p class="caption">Conteos de eventos; no representan visitantes únicos ni resultados comerciales.</p></section>`
        : ""
    }`;
}

function diagnosticMetric(metric) {
  const rate = metric?.completionRate;
  const display =
    rate === null || rate === undefined
      ? "Sin datos"
      : new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(
          rate,
        ) + " %";
  return `<section class="cms-diagnostic-metric" aria-labelledby="diagnostic-metric-title"><div><p class="eyebrow">TASA DE FINALIZACIÓN · ÚLTIMOS 30 DÍAS</p><h3 id="diagnostic-metric-title">Diagnósticos completados</h3><p>${h(metric?.completedFlows ?? "—")} de ${h(metric?.startedFlows ?? "—")} recorridos consentidos.</p></div><strong data-diagnostic-rate>${h(display)}</strong><p class="caption">Se cuenta cada recorrido iniciado una sola vez y se comprueba si terminó. Un recorrido se reinicia al cambiar de página o recargar; no se enlazan páginas. No representa visitantes únicos ni conversión comercial.</p></section>`;
}

function landing() {
  const d = state.document;
  content.innerHTML =
    heading(
      "LANDING",
      "Palabras que abren la conversación.",
      "Todos los cambios se guardan como borrador antes de publicarse.",
    ) +
    `<form id="landing-form"><div class="cms-editor-layout"><div class="editor-main"><section class="cms-panel"><h2>Primera impresión</h2><div class="cms-field-grid">${input("Antetítulo", "hero.eyebrow", d.hero.eyebrow, { max: 140 })}${input("Texto del botón principal", "hero.primaryLabel", d.hero.primaryLabel, { max: 70 })}${input("Título principal", "hero.title", d.hero.title, { max: 200, area: true, full: true })}${input("Descripción", "hero.description", d.hero.description, { max: 1000, area: true, full: true })}</div></section><section class="cms-panel"><h2>El recorrido de la página</h2><div class="cms-field-grid">${[
      ["problem", "El problema"],
      ["practice", "La práctica"],
      ["stages", "Implementación en tres salas"],
      ["cta", "Invitación a la demo"],
    ]
      .map(
        ([key, label]) =>
          input(
            label + " · título",
            "sections." + key + "Title",
            d.sections[key + "Title"],
            { max: 400, full: true },
          ) +
          input(
            label + " · descripción",
            "sections." + key + "Body",
            d.sections[key + "Body"],
            { max: 2000, area: true, full: true },
          ),
      )
      .join(
        "",
      )}</div></section><section class="cms-panel"><h2>Preguntas frecuentes</h2><div id="faq-fields">${d.faqs.map((faq, i) => faqFields(faq, i)).join("")}</div>${button("+ Añadir pregunta", "add-faq")}</section><section class="cms-panel"><h2>Título y descripción en buscadores</h2><div class="cms-field-grid">${input("Título", "seo.title", d.seo.title, { max: 100, full: true })}${input("Descripción", "seo.description", d.seo.description, { max: 300, area: true, full: true })}</div></section></div><aside class="cms-panel editor-aside"><p class="eyebrow">BORRADOR EDITORIAL</p><button class="button" type="submit">Guardar landing</button>${button("Recargar borrador", "reload")}<p>Guardar conserva tus cambios en el CMS. La versión pública cambia cuando un propietario publica.</p></aside></div></form>`;
}
function faqFields(faq, i) {
  return `<div class="faq-editor-item" data-faq>${input("Pregunta " + (i + 1), "question", faq.question, { max: 300 })}${input("Respuesta", "answer", faq.answer, { max: 2000, area: true })}<button type="button" class="delete-button" data-action="remove-faq">Quitar pregunta</button></div>`;
}
async function saveLanding(form) {
  const doc = clone(state.document);
  for (const field of form.elements) {
    if (field.name?.includes(".")) {
      const [group, key] = field.name.split(".");
      doc[group][key] = field.value;
    }
  }
  doc.faqs = [...form.querySelectorAll("[data-faq]")].map((el) => ({
    question: el.querySelector("[name=question]").value,
    answer: el.querySelector("[name=answer]").value,
  }));
  acceptDraft(
    await api("draft", "PUT", { document: doc, revision: state.revision }),
  );
  notice("Landing guardada. Ya puedes revisar la vista previa.");
}
function resourceList(query = "") {
  const results = state.document.resources.filter((r) =>
    `${r.title} ${r.slug}`.toLowerCase().includes(query.toLowerCase()),
  );
  content.innerHTML =
    heading(
      "MEDIAHUB",
      "Herramientas que sí se usan.",
      "Crea recursos completos y organiza su momento de publicación.",
      button("Crear recurso +", "new-resource", "", false),
    ) +
    `<form id="resource-search" class="cms-filterbar"><label>Buscar en el catálogo<input name="q" value="${h(query)}" placeholder="Título o dirección del recurso"></label><button class="button button-small">Buscar</button></form>` +
    (results.length
      ? `<div class="cms-table-wrap"><table class="cms-table"><thead><tr><th>Recurso</th><th>Formato / rol</th><th>Estado en borrador</th><th>Acciones</th></tr></thead><tbody>${results.map((r) => `<tr><td><strong>${h(r.title)}</strong><small>/mediahub/${h(r.slug)}/</small></td><td>${h(labels.type[r.type])}<small>${h(labels.role[r.role])}</small></td><td><span class="badge ${h(r.status)}">${h(labels.status[r.status])}</span></td><td>${button("Editar →", "edit-resource", `data-id="${h(r.id)}"`)}</td></tr>`).join("")}</tbody></table></div>`
      : empty(
          "El catálogo está listo para una idea.",
          "Crea un recurso o prueba otra búsqueda.",
        )) +
    `<p class="cms-note">El estado «Publicado» indica que el recurso se incluirá en la siguiente publicación del borrador. Archivar retira el recurso al publicar y conserva su historial.</p>`;
}
async function fetchMedia(reset = true) {
  const generation = ++state.mediaGeneration;
  if (reset) {
    state.media = [];
    state.mediaCursor = 0;
  }
  if (state.mediaCursor === null) return;
  const data = await api(
    "media?limit=50&cursor=" +
      state.mediaCursor +
      "&q=" +
      encodeURIComponent(state.mediaQuery),
  );
  if (generation !== state.mediaGeneration) return;
  state.media.push(...data.items);
  state.mediaCursor = data.nextCursor;
}
async function editResource(id) {
  const generation = state.navigationGeneration;
  if (state.dirty && !confirm("¿Descartar los cambios sin guardar?")) return;
  state.isNew = !id;
  state.resource = id
    ? clone(state.document.resources.find((r) => r.id === id))
    : {
        id: "resource-" + crypto.randomUUID().slice(0, 8),
        slug: "",
        title: "",
        excerpt: "",
        body: [{ type: "paragraph", text: "" }],
        type: "guide",
        role: "rep",
        topic: "practice",
        level: "start",
        coverId: null,
        attachments: [],
        externalMediaUrl: "",
        videoId: null,
        duration: "",
        status: "draft",
        evidenceLabel: "Recurso original",
        sourceNote: "Sales Academy · contenido editorial",
        reviewedAt: "",
      };
  if (!state.resource)
    throw new Error(
      "El recurso ya no está en el borrador. Recarga el contenido.",
    );
  state.mediaQuery = "";
  await fetchMedia();
  if (!currentView(generation, "resources")) return;
  dirty(false);
  resourceEditor();
  $("#preview-link").href =
    "/cms/preview/?resource=" + encodeURIComponent(state.resource.slug);
}
function blockEditor(block, index) {
  let fields;
  if (block.type === "heading" || block.type === "paragraph")
    fields = input(
      block.type === "heading" ? "Título" : "Párrafo",
      "block-text",
      block.text,
      { area: block.type === "paragraph", max: 10000 },
    );
  else if (block.type === "list")
    fields = input(
      "Un elemento por línea",
      "block-list",
      block.items.join("\n"),
      { area: true, max: 150000, help: "Las líneas vacías se omiten." },
    );
  else
    fields = `<div class="block-table"><table><thead><tr>${block.headers.map((v, col) => `<th><label class="sr-only">Título de columna ${col + 1}</label><input data-column="${col}" value="${h(v)}" maxlength="200" required aria-label="Título de columna ${col + 1}"></th>`).join("")}<th>Fila</th></tr></thead><tbody>${block.rows.map((row, ri) => `<tr data-row>${row.map((v, ci) => `<td><input value="${h(v)}" maxlength="2000" aria-label="Fila ${ri + 1}, columna ${ci + 1}"></td>`).join("")}<td><button type="button" class="delete-button" data-action="remove-row" data-block-index="${index}" data-row-index="${ri}">Quitar</button></td></tr>`).join("")}</tbody></table></div><div class="block-tools"><button type="button" data-action="add-row" data-index="${index}">+ Fila</button><button type="button" data-action="add-column" data-index="${index}">+ Columna</button>${block.headers.length > 1 ? `<button type="button" data-action="remove-column" data-index="${index}">Quitar última columna</button>` : ""}</div>`;
  return `<div class="block-editor" data-block="${block.type}"><div class="block-top"><strong>${index + 1}. ${h({ heading: "Título de sección", paragraph: "Párrafo", list: "Lista", table: "Tabla" }[block.type])}</strong><div>${index > 0 ? `<button type="button" class="delete-button" data-action="move-block" data-index="${index}" aria-label="Mover bloque ${index + 1} hacia arriba">↑</button> ` : ""}<button type="button" class="delete-button" data-action="remove-block" data-index="${index}">Quitar</button></div></div>${fields}</div>`;
}
function resourceEditor() {
  const r = state.resource,
    available = state.media.filter(
      (m) => !m.archived || m.id === r.coverId || r.attachments.includes(m.id),
    );
  const images = available.filter((m) => m.mime.startsWith("image/"));
  content.innerHTML =
    heading(
      "EDITOR DE RECURSOS",
      state.isNew ? "Una herramienta nueva." : r.title,
      "Estructura el contenido para que alguien pueda usarlo hoy.",
      button("← Volver al catálogo", "back-resources"),
    ) +
    `<form id="resource-form"><div class="cms-editor-layout"><div class="editor-main"><section class="cms-panel"><h2>La idea</h2><div class="cms-field-grid">${input("Título", "title", r.title, { max: 180, full: true })}${input("Dirección del recurso", "slug", r.slug, { max: 100, full: true, help: "Minúsculas, números y guiones. La dirección se conserva después de la primera publicación." })}${input("Descripción breve", "excerpt", r.excerpt, { max: 500, area: true, full: true })}${select("Formato", "type", labels.type, r.type)}${select("Para quién", "role", labels.role, r.role)}${select("Tema", "topic", labels.topic, r.topic)}${input("Nivel", "level", r.level, { max: 40 })}${input("Tiempo de lectura o duración", "duration", r.duration, { max: 80, required: false })}${select("Estado en el borrador", "status", labels.status, r.status)}</div></section><section class="cms-panel"><h2>Contenido del recurso</h2><p class="body-editor-note">Añade texto, listas o tablas. En audio y video, incluye aquí la transcripción o un resumen útil. El contenido se guarda como bloques seguros.</p><div id="body-blocks">${r.body.map(blockEditor).join("")}</div><div class="block-tools">${Object.entries(
      {
        heading: "Título",
        paragraph: "Párrafo",
        list: "Lista",
        table: "Tabla",
      },
    )
      .map(
        ([type, label]) =>
          `<button type="button" data-action="add-block" data-type="${type}">+ ${label}</button>`,
      )
      .join(
        "",
      )}</div></section><section class="cms-panel"><h2>Medios y archivos</h2><div class="cms-field-grid"><label class="full">Portada<select name="coverId" aria-label="Portada"><option value="">Composición tipográfica, sin imagen</option>${images.map((m) => `<option value="${h(m.id)}"${r.coverId === m.id ? " selected" : ""}>${h(m.title)}${m.archived ? " · archivada" : ""}</option>`).join("")}</select><small>Las imágenes necesitan revisión y derechos aprobados antes de publicar.</small></label>${select("Video de la colección", "videoId", videoOptions, r.videoId || "", "Elige formato Video y deja vacío el enlace externo. Estos archivos forman parte de la colección pública; retirar la ficha no elimina el archivo.")}${input("Enlace de video o audio", "externalMediaUrl", r.externalMediaUrl, { type: "url", max: 500, required: false, full: true, help: "YouTube (watch?v= o youtu.be) o Vimeo. El visitante decide cuándo abrirlo." })}<div class="full"><label>Adjuntos descargables</label><div class="media-attachments">${available.length ? available.map((m) => `<label><input type="checkbox" name="attachment" value="${h(m.id)}"${r.attachments.includes(m.id) ? " checked" : ""}>${h(m.title)} · ${h(m.mime === "application/pdf" ? "PDF" : "Imagen")}${m.archived ? " · archivado" : ""}</label>`).join("") : '<p class="caption">Todavía no hay medios. Guarda el recurso y sube un archivo desde Medios.</p>'}</div>${state.mediaCursor !== null ? button("Cargar más medios", "resource-more-media") : ""}</div></div></section><section class="cms-panel"><h2>Fuente y revisión</h2><div class="cms-field-grid">${input("Etiqueta de evidencia", "evidenceLabel", r.evidenceLabel, { max: 140, full: true, help: "Ejemplo: Recurso original. Evita atribuir resultados que no estén documentados." })}${input("Fuente o nota editorial", "sourceNote", r.sourceNote, { max: 600, area: true, full: true, required: false })}${input("Fecha de revisión", "reviewedAt", r.reviewedAt, { type: "date", max: 10, required: false })}</div></section></div><aside class="cms-panel editor-aside"><p class="eyebrow">${state.isNew ? "RECURSO NUEVO" : "REVISIÓN EDITORIAL"}</p><button class="button" type="submit">Guardar recurso</button>${button("Recargar borrador", "reload")}<p>Guarda antes de abrir la vista previa. Para retirar este recurso, cambia el estado a «Archivado» y publica el borrador.</p></aside></div></form>`;
}
function collectResource() {
  const form = $("#resource-form");
  if (!form) return state.resource;
  const r = clone(state.resource),
    f = new FormData(form);
  for (const key of [
    "slug",
    "title",
    "excerpt",
    "type",
    "role",
    "topic",
    "level",
    "externalMediaUrl",
    "duration",
    "status",
    "evidenceLabel",
    "sourceNote",
    "reviewedAt",
  ])
    r[key] = String(f.get(key) || "");
  r.coverId = f.get("coverId") || null;
  r.videoId = f.get("videoId") || null;
  r.attachments = f.getAll("attachment");
  r.body = [...form.querySelectorAll("[data-block]")].map((el) => {
    const type = el.dataset.block;
    if (type === "heading" || type === "paragraph")
      return { type, text: el.querySelector("[name=block-text]").value };
    if (type === "list")
      return {
        type,
        items: el
          .querySelector("[name=block-list]")
          .value.split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      };
    return {
      type,
      headers: [...el.querySelectorAll("[data-column]")].map((e) => e.value),
      rows: [...el.querySelectorAll("[data-row]")].map((row) =>
        [...row.querySelectorAll("input")].map((e) => e.value),
      ),
    };
  });
  state.resource = r;
  return r;
}
async function saveResource() {
  const r = collectResource();
  const data = await api(
    "resources" + (state.isNew ? "" : "/" + encodeURIComponent(r.id)),
    state.isNew ? "POST" : "PATCH",
    { resource: r, revision: state.revision },
  );
  acceptDraft(data);
  state.isNew = false;
  state.resource = clone(state.document.resources.find((x) => x.id === r.id));
  $("#preview-link").href =
    "/cms/preview/?resource=" + encodeURIComponent(r.slug);
  notice("Recurso guardado. La vista previa muestra este borrador.");
}
async function mediaLibrary(more = false) {
  const generation = state.navigationGeneration;
  if (!more) {
    state.mediaQuery = "";
    await fetchMedia();
  } else await fetchMedia(false);
  if (!currentView(generation, "media")) return;
  const storage = await api("media-storage");
  if (!currentView(generation, "media")) return;
  content.innerHTML =
    heading(
      "BIBLIOTECA",
      "Cada archivo, con contexto.",
      "Imágenes y PDF con procedencia, accesibilidad y revisión.",
      button("Subir archivo +", "upload-media", "", false),
    ) +
    `<p class="cms-note">${h(storage.count)} archivos · ${bytes(storage.bytes)} de ${bytes(storage.quotaBytes)} utilizados. Los medios archivados se conservan si están referenciados por una publicación.</p><form id="media-search" class="cms-filterbar"><label>Buscar medios<input name="q" value="${h(state.mediaQuery)}" placeholder="Título, archivo o descripción"></label><button class="button button-small">Buscar</button></form><div id="media-grid">${mediaCards()}</div>${state.mediaCursor !== null ? `<div class="cms-pagination">${button("Cargar más medios", "more-media")}</div>` : ""}`;
}
function mediaCards() {
  return state.media.length
    ? `<div class="media-grid">${state.media.map((m) => `<article class="media-item"><div class="media-thumb">${m.mime.startsWith("image/") ? `<img src="/media/${encodeURIComponent(m.id)}/thumbnail" alt="${h(m.alt)}" loading="lazy">` : '<span class="media-file-icon" aria-label="Archivo PDF">PDF</span>'}</div><div class="media-info"><h3>${h(m.title)}</h3><p>${h(m.filename)} · ${bytes(m.bytes)}</p><span class="badge ${h(m.reviewStatus)}">${m.reviewStatus === "approved" ? "Revisado" : "Por revisar"}</span><span class="badge ${h(m.rightsStatus)}">${m.rightsStatus === "approved" ? "Derechos aprobados" : "Derechos pendientes"}</span>${m.archived ? '<span class="badge archived">Archivado</span>' : ""}${button("Editar detalles →", "edit-media", `data-id="${h(m.id)}"`)}</div></article>`).join("")}</div>`
    : empty(
        "Tu biblioteca empieza aquí.",
        "Sube una imagen o un PDF. Añade su origen y revisa los derechos antes de publicarlo.",
      );
}
function mediaFields(m) {
  return `<div class="cms-field-grid">${input("Título del archivo", "title", m.title, { max: 180, full: true })}${input("Texto alternativo", "alt", m.alt, { max: 500, area: true, full: true, required: m.mime !== "application/pdf", help: "Describe lo relevante de la imagen sin repetir “imagen de”. Para PDF es opcional." })}${input("Origen y procedencia", "origin", m.origin, { max: 1000, area: true, full: true, help: "Autor, fuente o creación propia y evidencia que respalda el uso." })}${select("Derechos de uso", "rightsStatus", { pending: "Pendiente de verificar", approved: "Aprobados" }, m.rightsStatus)}${select("Revisión editorial", "reviewStatus", { pending: "Pendiente", approved: "Aprobada" }, m.reviewStatus)}</div>`;
}
function uploadMedia() {
  state.selectedMedia = null;
  content.innerHTML =
    heading(
      "BIBLIOTECA",
      "Una pieza nueva.",
      "Sube imágenes JPEG, PNG o WebP, o un documento PDF.",
      button("← Biblioteca", "back-media"),
    ) +
    `<form id="upload-form" class="cms-panel"><label>Archivo<input type="file" name="file" aria-label="Archivo" accept="image/jpeg,image/png,image/webp,application/pdf" required><small>Hasta 10 MB por archivo. Los documentos se comprueban antes de aceptarse.</small></label><div class="cms-note">Revisa que tengas permiso de usar este material. La aprobación de derechos es una declaración editorial, no una licencia automática.</div>${mediaFields({ title: "", alt: "", origin: "", rightsStatus: "pending", reviewStatus: "pending", mime: "image/" })}<div class="editor-actions"><button class="button" type="submit">Subir y guardar</button></div></form>`;
}
async function editMedia(id) {
  const generation = state.navigationGeneration;
  state.selectedMedia = state.media.find((m) => m.id === id);
  if (!state.selectedMedia)
    throw new Error(
      "El medio no está en esta lista. Vuelve a cargar la biblioteca.",
    );
  const m = state.selectedMedia;
  const usage = await api("media/" + encodeURIComponent(id) + "/usage");
  if (!currentView(generation, "media")) return;
  content.innerHTML =
    heading(
      "DETALLE DEL MEDIO",
      m.title,
      "Conserva su procedencia y revisa dónde se utiliza.",
      button("← Biblioteca", "back-media"),
    ) +
    `<div class="media-detail-grid"><div><div class="media-detail-preview">${m.mime.startsWith("image/") ? `<img src="/media/${encodeURIComponent(m.id)}/web" alt="${h(m.alt)}">` : `<a class="button button-outline" href="/media/${encodeURIComponent(m.id)}/download" target="_blank" rel="noopener">Abrir PDF ↗</a>`}</div><p class="caption">${h(m.filename)} · ${h(m.mime)} · ${bytes(m.bytes)}</p><section class="cms-panel"><h2>Dónde se utiliza</h2>${usage.uses?.length ? usage.uses.map((u) => `<div class="metric-detail"><span>${h(typeof u === "string" ? u : u.title)}<small class="caption">${h(typeof u === "string" ? "" : u.label)}${u.revisionId ? " · " + h(u.revisionId) : ""}</small></span></div>`).join("") : "<p>Este archivo todavía no está referenciado por un recurso.</p>"}<p class="caption">Archivar no elimina los archivos de las versiones conservadas.</p></section></div><form id="media-edit-form" class="cms-panel">${mediaFields(m)}${select("Disponibilidad", "archived", { false: "Disponible en biblioteca", true: "Archivado" }, String(m.archived))}<div class="editor-actions"><button class="button" type="submit">Guardar detalles</button></div></form></div>`;
}
async function saveMedia(form) {
  const f = new FormData(form);
  const payload = Object.fromEntries(
    ["title", "alt", "origin", "rightsStatus", "reviewStatus"].map((k) => [
      k,
      f.get(k),
    ]),
  );
  payload.archived = f.get("archived") === "true";
  await api(
    "media/" + encodeURIComponent(state.selectedMedia.id),
    "PATCH",
    payload,
  );
  dirty(false);
  await mediaLibrary();
  notice("Detalles del medio guardados.");
}
async function requests(cursor = 0) {
  const generation = state.navigationGeneration;
  const data = await api("demo-requests?limit=20&cursor=" + cursor);
  if (!currentView(generation, "requests")) return;
  state.requestCursor = data.nextCursor;
  content.innerHTML =
    heading(
      "CONVERSACIONES",
      "Solicitudes con intención.",
      "Revisa el contexto y actualiza el seguimiento. Las solicitudes no envían correos automáticamente.",
    ) +
    (data.items.length
      ? `<div class="cms-table-wrap"><table class="cms-table"><thead><tr><th>Contacto</th><th>Contexto</th><th>Consentimiento</th><th>Seguimiento</th></tr></thead><tbody>${data.items.map((r) => `<tr><td><strong>${h(r.email)}</strong><small>${h(date(r.createdAt))}</small><small>Referencia ${h(r.id)}</small></td><td>${h(labels.role[r.role] || "Otro rol")}<small>${h({ one: "1 sala", two: "2 salas", three: "3 salas", more: "Más de 3 salas" }[r.roomCountBucket])} · ${h({ coordination: "Coordinación", practice: "Práctica", coaching: "Coaching", pilot: "Piloto" }[r.need])}</small></td><td><small>Contacto: ${h(date(r.contactConsentAt))}</small><small>Comunicaciones opcionales: ${r.marketingOptIn ? "Sí" : "No"}</small><small>Aviso ${h(r.privacyVersion)}</small></td><td><form data-request-form="${h(r.id)}"><label class="sr-only" for="request-${h(r.id)}">Estado de ${h(r.email)}</label><select id="request-${h(r.id)}" name="status">${options(labels.request, r.status)}</select><button class="button button-small button-outline" type="submit">Guardar estado</button></form></td></tr>`).join("")}</tbody></table></div>`
      : empty(
          "Aún no hay solicitudes.",
          "Cuando una persona envíe el formulario con su consentimiento, aparecerá aquí.",
        )) +
    pagination("requests", cursor, data.nextCursor);
}
async function advisorLeads(cursor = 0) {
  const generation = state.navigationGeneration;
  const [data, metrics] = await Promise.all([
    api("advisor-leads?limit=20&cursor=" + cursor),
    api("advisor-metrics"),
  ]);
  if (!currentView(generation, "advisor")) return;
  content.innerHTML = heading(
    "ASESOR IA · SEGUIMIENTO HUMANO",
    "De la conversación al siguiente paso.",
    "Solicitudes guardadas con consentimiento. Chris confirma la fecha por WhatsApp; abrir un enlace no significa una cita reservada.",
  ) + `<div class="cms-stats"><div class="stat-box"><span>SESIONES SIN EXPIRAR (1 H)</span><strong>${h(metrics.sessions)}</strong></div><div class="stat-box"><span>MENSAJES EN ESAS SESIONES</span><strong>${h(metrics.messages)}</strong></div><div class="stat-box"><span>SOLICITUDES</span><strong>${h(metrics.leads)}</strong><small>${h(metrics.pendingConfirmation)} pendientes de confirmación</small></div><div class="stat-box"><span>CALIFICADAS</span><strong>${h(metrics.qualified)}</strong></div></div><p class="cms-note">Las sesiones y sus mensajes corresponden a conversaciones sin expirar, no a un acumulado histórico. Las solicitudes se conservan durante 90 días sin actividad, con eliminación automática periódica. El conocimiento del asesor usa el contenido publicado del MediaHub y la ficha comercial revisada.</p>` +
    (data.items.length ? `<div class="cms-table-wrap"><table class="cms-table"><thead><tr><th>Persona y contexto</th><th>Solicitud revisada</th><th>Preferencia de horario</th><th>Seguimiento</th></tr></thead><tbody>${data.items.map(r => `<tr><td><strong>${h(r.name || "Sin nombre indicado")}</strong><small>${h(r.contact || "Sin contacto adicional")}</small><small>${h(labels.role[r.role] || "Otro rol")} · ${h({"1":"1 sala","2-3":"2–3 salas","4+":"4 o más salas",unknown:"Salas por definir"}[r.roomCountBucket])}</small><small>${h(r.teamSize || "Equipo por definir")}</small><small>${h(date(r.createdAt))}</small></td><td><p class="advisor-lead-summary">${h(r.summary)}</p><small>Necesidad: ${h(r.need || "Por explorar")}</small><small>Plazo: ${h(r.timeframe || "Por acordar")}</small><small>Consentimiento de seguimiento · ${h(r.privacyVersion)}</small></td><td>${r.preferredDate && r.preferredTime ? `<strong>${h(r.preferredDate)} · ${h(r.preferredTime)}</strong><small>${h(r.timezone)}</small>` : "Por acordar con Chris"}<small>Preferencia, no reserva</small></td><td><form data-advisor-lead-form="${h(r.id)}"><label class="sr-only" for="advisor-lead-${h(r.id)}">Estado de solicitud ${h(r.id)}</label><select id="advisor-lead-${h(r.id)}" name="status">${options(labels.advisorStatus, r.status)}</select><button class="button button-small button-outline" type="submit">Guardar seguimiento</button></form><small>Actualizada ${h(date(r.updatedAt))}</small><small>Referencia ${h(r.id)}</small></td></tr>`).join("")}</tbody></table></div>` : empty("Aún no hay solicitudes del asesor.", "Aparecerán aquí cuando el visitante elija guardar su resumen para seguimiento.")) + pagination("advisor", cursor, data.nextCursor);
}
function pagination(type, cursor, next) {
  return `<div class="cms-pagination">${cursor ? button("← Primera página", "page-list", `data-list="${type}" data-cursor="0"`) : ""}${next !== null ? button("Siguiente página →", "page-list", `data-list="${type}" data-cursor="${next}"`) : ""}</div>`;
}
async function publications(cursor = 0) {
  const generation = state.navigationGeneration;
  const data = await api("revisions?limit=20&cursor=" + cursor);
  if (!currentView(generation, "publications")) return;
  content.innerHTML =
    heading(
      "HISTORIAL",
      "El contenido tiene memoria.",
      "Recupera cualquier publicación como borrador y revísala antes de publicarla otra vez.",
    ) +
    `<p class="cms-note">Borrador actual: versión ${state.revision}. Restaurar reemplaza el borrador, conserva las publicaciones anteriores y no cambia el sitio público.</p>` +
    (data.items.length
      ? data.items
          .map(
            (p) =>
              `<article class="publication-item"><div><strong>Publicación ${h(p.id)}</strong><small>${h(date(p.createdAt))} · ${h(p.author)}</small><p>${h(p.summary)}</p></div>${button("Recuperar como borrador", "restore", `data-id="${h(p.id)}"`)}</article>`,
          )
          .join("")
      : empty(
          "Todavía no hay publicaciones.",
          "Un propietario puede publicar el borrador cuando el contenido esté revisado.",
        )) +
    pagination("publications", cursor, data.nextCursor);
}
async function users(cursor = 0) {
  const generation = state.navigationGeneration;
  const data = await api("users?limit=20&cursor=" + cursor);
  if (!currentView(generation, "users")) return;
  state.users = data.items;
  content.innerHTML =
    heading(
      "EQUIPO EDITORIAL",
      "Cada persona, el acceso que necesita.",
      "Los editores preparan contenido; los propietarios gestionan publicaciones, solicitudes y cuentas.",
      button("Crear usuario +", "new-user", "", false),
    ) +
    `<div class="cms-table-wrap"><table class="cms-table"><thead><tr><th>Usuario</th><th>Rol</th><th>Acceso</th><th>Acciones</th></tr></thead><tbody>${data.items.map((u) => `<tr><td><strong>${h(u.username)}</strong><small>${u.id === state.user.id ? "Tu cuenta" : "Equipo editorial"}</small></td><td>${h(labels.access[u.role])}</td><td><span class="badge ${u.active ? "approved" : "archived"}">${u.active ? "Activo" : "Desactivado"}</span></td><td>${button("Gestionar →", "edit-user", `data-id="${u.id}"`)}</td></tr>`).join("")}</tbody></table></div>` +
    pagination("users", cursor, data.nextCursor);
}
function userEditor(id) {
  const u = id ? state.users.find((u) => u.id === Number(id)) : null;
  state.editUser = u;
  content.innerHTML =
    heading(
      "ACCESOS",
      u ? "Gestionar " + u.username : "Una nueva cuenta.",
      "Las contraseñas no se muestran ni se envían por correo.",
      button("← Usuarios", "back-users"),
    ) +
    `<form id="user-form" class="cms-panel"><div class="cms-field-grid">${input("Nombre de usuario", "username", u?.username || "", { max: 64, readOnly: !!u })}${select("Rol editorial", "role", labels.access, u?.role || "editor")}${input(u ? "Nueva contraseña (opcional)" : "Contraseña inicial", "password", "", { type: "password", max: 128, required: !u, full: true, help: "Al menos 12 caracteres. Compártela por un canal privado." })}${u ? select("Acceso", "active", { true: "Activo", false: "Desactivado" }, String(u.active)) : ""}</div><p class="cms-note">Cambiar el rol, el acceso o la contraseña cierra las sesiones de esa cuenta. El sistema conserva al menos un propietario activo.</p><button class="button" type="submit">${u ? "Guardar acceso" : "Crear cuenta"}</button></form>`;
  const p = $("#user-form [name=password]");
  p.minLength = 12;
  p.autocomplete = "new-password";
}
async function saveUser(form) {
  const f = new FormData(form);
  const u = state.editUser;
  const payload = u
    ? { role: f.get("role"), active: f.get("active") === "true" }
    : {
        username: f.get("username"),
        role: f.get("role"),
        password: f.get("password"),
      };
  if (u && f.get("password")) payload.password = f.get("password");
  await api("users" + (u ? "/" + u.id : ""), u ? "PATCH" : "POST", payload);
  dirty(false);
  if (u?.id === state.user.id) {
    state.user = null;
    $("#cms-shell").hidden = true;
    $("#login-view").hidden = false;
    $("#login-status").textContent =
      "Acceso actualizado. Vuelve a iniciar sesión con tus credenciales.";
    $("#login-form [name=password]").value = "";
    return;
  }
  await users();
  notice(u ? "Acceso actualizado." : "Usuario creado.");
}
async function publish() {
  if (state.dirty) {
    notice("Guarda tus cambios antes de publicar.", "warn");
    return;
  }
  if (
    !confirm(
      "¿Publicar el borrador completo en el sitio de este entorno? La landing y los recursos marcados como publicados quedarán disponibles.",
    )
  )
    return;
  const result = await api("publish", "POST", { revision: state.revision });
  await loadDraft();
  notice(
    "Publicación " +
      result.publicationId +
      " creada. La landing y el mediahub ya muestran esta versión en este entorno.",
  );
  if (state.page === "home") await home();
  if (state.page === "publications") await publications();
}
async function restore(id) {
  if (
    !confirm(
      "¿Recuperar esta publicación como borrador? Reemplazará el borrador actual, sin modificar el sitio público.",
    )
  )
    return;
  acceptDraft(
    await api("restore", "POST", {
      publicationId: Number(id),
      revision: state.revision,
    }),
  );
  await publications();
  notice(
    "Versión recuperada como borrador. Revisa la vista previa antes de publicar.",
  );
}
async function action(name, target) {
  if (name === "reload") {
    if (
      state.dirty &&
      !confirm("¿Descartar tus cambios y cargar el último borrador guardado?")
    )
      return;
    await loadDraft();
    await navigate(state.page, true);
    notice("Borrador actualizado desde el servidor.");
  } else if (name === "add-faq") {
    const fields = $("#faq-fields");
    if (fields.children.length >= 20)
      throw new Error("Puedes añadir hasta 20 preguntas.");
    fields.insertAdjacentHTML(
      "beforeend",
      faqFields({ question: "", answer: "" }, fields.children.length),
    );
    dirty();
    fields.lastElementChild.querySelector("input").focus();
  } else if (name === "remove-faq") {
    if ($("#faq-fields").children.length < 2)
      throw new Error("Conserva al menos una pregunta frecuente.");
    target.closest("[data-faq]").remove();
    dirty();
  } else if (name === "new-resource") await editResource();
  else if (name === "edit-resource") await editResource(target.dataset.id);
  else if (name === "back-resources") await navigate("resources");
  else if (
    [
      "add-block",
      "remove-block",
      "move-block",
      "add-row",
      "remove-row",
      "add-column",
      "remove-column",
    ].includes(name)
  ) {
    const r = collectResource(),
      i = Number(target.dataset.index ?? target.dataset.blockIndex);
    if (name === "add-block") {
      if (r.body.length >= 100)
        throw new Error("El recurso admite hasta 100 bloques.");
      const type = target.dataset.type;
      r.body.push(
        type === "list"
          ? { type, items: [""] }
          : type === "table"
            ? { type, headers: ["Campo", "Nota"], rows: [["", ""]] }
            : { type, text: "" },
      );
    } else if (name === "remove-block") {
      if (r.body.length === 1)
        throw new Error("Conserva al menos un bloque de contenido.");
      r.body.splice(i, 1);
    } else if (name === "move-block") {
      [r.body[i - 1], r.body[i]] = [r.body[i], r.body[i - 1]];
    } else if (name === "add-row") {
      if (r.body[i].rows.length >= 100)
        throw new Error("La tabla admite hasta 100 filas.");
      r.body[i].rows.push(Array(r.body[i].headers.length).fill(""));
    } else if (name === "remove-row") {
      if (r.body[i].rows.length === 1)
        throw new Error("Conserva al menos una fila.");
      r.body[i].rows.splice(Number(target.dataset.rowIndex), 1);
    } else if (name === "add-column") {
      if (r.body[i].headers.length >= 8)
        throw new Error("La tabla admite hasta 8 columnas.");
      r.body[i].headers.push("Columna");
      r.body[i].rows.forEach((row) => row.push(""));
    } else {
      r.body[i].headers.pop();
      r.body[i].rows.forEach((row) => row.pop());
    }
    resourceEditor();
    dirty();
  } else if (name === "resource-more-media") {
    collectResource();
    await fetchMedia(false);
    resourceEditor();
  } else if (name === "upload-media") uploadMedia();
  else if (name === "edit-media") await editMedia(target.dataset.id);
  else if (name === "back-media") await navigate("media");
  else if (name === "more-media") await mediaLibrary(true);
  else if (name === "page-list") {
    const fn = { requests, advisor: advisorLeads, publications, users }[target.dataset.list];
    await fn(Number(target.dataset.cursor));
  } else if (name === "restore") await restore(target.dataset.id);
  else if (name === "new-user") userEditor();
  else if (name === "edit-user") userEditor(target.dataset.id);
  else if (name === "back-users") await navigate("users");
}
document.addEventListener("click", async (event) => {
  const pageButton = event.target.closest("[data-page]");
  if (pageButton) {
    await navigate(pageButton.dataset.page);
    return;
  }
  const target = event.target.closest("[data-action]");
  if (!target) return;
  target.disabled = true;
  try {
    await action(target.dataset.action, target);
  } catch (error) {
    failure(error);
  } finally {
    if (target.isConnected) target.disabled = false;
  }
});
content.addEventListener("input", (event) => {
  if (
    event.target.closest(
      "#landing-form,#resource-form,#media-edit-form,#upload-form,#user-form",
    )
  )
    dirty();
});
content.addEventListener("change", (event) => {
  if (
    event.target.closest(
      "#landing-form,#resource-form,#media-edit-form,#upload-form,#user-form",
    )
  )
    dirty();
  if (event.target.matches("#upload-form [name=file]")) {
    const file = event.target.files[0];
    const alt = $("#upload-form [name=alt]");
    alt.required = file?.type !== "application/pdf";
    if (file && !$("#upload-form [name=title]").value)
      $("#upload-form [name=title]").value = file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[_-]/g, " ");
  }
});
content.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  if (!form.reportValidity()) return;
  const submit =
    form.querySelector("[type=submit]") ||
    form.querySelector("button:not([type=button])");
  if (submit) submit.disabled = true;
  clearNotice();
  try {
    if (form.id === "landing-form") await saveLanding(form);
    else if (form.id === "resource-form") await saveResource();
    else if (form.id === "resource-search")
      resourceList(new FormData(form).get("q"));
    else if (form.id === "media-search") {
      state.mediaQuery = String(new FormData(form).get("q"));
      await fetchMedia();
      content.querySelector("#media-grid").innerHTML = mediaCards();
      const more = content.querySelector("[data-action=more-media]");
      if (more) more.parentElement.remove();
      if (state.mediaCursor !== null)
        content.insertAdjacentHTML(
          "beforeend",
          `<div class="cms-pagination">${button("Cargar más medios", "more-media")}</div>`,
        );
    } else if (form.id === "upload-form") {
      await api("media", "POST", new FormData(form));
      dirty(false);
      await mediaLibrary();
      notice("Archivo subido y guardado. Ya puedes usarlo en un recurso.");
    } else if (form.id === "media-edit-form") await saveMedia(form);
    else if (form.id === "user-form") await saveUser(form);
    else if (form.dataset.requestForm) {
      await api("demo-requests", "PATCH", {
        id: form.dataset.requestForm,
        status: new FormData(form).get("status"),
      });
      notice("Seguimiento actualizado.");
    } else if (form.dataset.advisorLeadForm) {
      await api("advisor-leads", "PATCH", {
        id: form.dataset.advisorLeadForm,
        status: new FormData(form).get("status"),
      });
      await advisorLeads();
      notice("Seguimiento del asesor actualizado. La fecha se confirma con Chris.");
    }
  } catch (error) {
    failure(error);
  } finally {
    if (submit?.isConnected) submit.disabled = false;
  }
});
$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target,
    submit = form.querySelector("button"),
    status = $("#login-status");
  submit.disabled = true;
  status.textContent = "Comprobando acceso…";
  try {
    const f = new FormData(form),
      session = await api("login", "POST", {
        username: f.get("username"),
        password: f.get("password"),
      });
    form.reset();
    await enter(session);
    status.textContent = "";
  } catch (error) {
    status.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});
$("#logout-button").addEventListener("click", async () => {
  if (
    state.dirty &&
    !confirm("Hay cambios sin guardar. ¿Cerrar sesión y descartarlos?")
  )
    return;
  try {
    await api("logout", "POST", {});
    state.user = null;
    state.csrf = null;
    state.document = null;
    dirty(false);
    $("#cms-shell").hidden = true;
    $("#login-view").hidden = false;
    $("#login-status").textContent = "Sesión cerrada.";
    $("#login-form [name=username]").focus();
  } catch (error) {
    failure(error);
  }
});
$("#publish-button").addEventListener("click", async (event) => {
  event.target.disabled = true;
  try {
    await publish();
  } catch (error) {
    failure(error);
  } finally {
    event.target.disabled = state.dirty;
  }
});
$("#preview-link").addEventListener("click", (event) => {
  if (
    state.dirty &&
    !confirm(
      "La vista previa muestra el último borrador guardado. ¿Abrirla con cambios aún sin guardar?",
    )
  )
    event.preventDefault();
});
window.addEventListener("beforeunload", (event) => {
  if (state.dirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});
try {
  const session = await api("session");
  await enter(session);
} catch (error) {
  if (error.status !== 401) $("#login-status").textContent = error.message;
}
