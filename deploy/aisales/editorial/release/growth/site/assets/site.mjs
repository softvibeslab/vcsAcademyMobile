const PREVIEW = document.body.dataset.preview === "true";
let preference = null,
  flowId = null;
try {
  preference = localStorage.getItem("sa.growth.consent");
} catch {}
if (preference === "granted") flowId = crypto.randomUUID();
const panel = document.getElementById("consent-panel");
if (panel && !preference && !PREVIEW) panel.hidden = false;
export function track(event, placement = "hero", resourceId) {
  if (preference !== "granted" || PREVIEW) return;
  const payload = {
    eventId: crypto.randomUUID(),
    flowId: flowId || (flowId = crypto.randomUUID()),
    event,
    placement,
    consentVersion: "2026-11-07",
  };
  if (resourceId) payload.resourceId = resourceId;
  fetch("/growth-api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}
function pageEvent() {
  const type = document.body.dataset.page;
  if (type === "landing") track("landing_viewed", "hero");
  if (type === "resource")
    track(
      "resource_viewed",
      "resource",
      document.querySelector("[data-resource-id]")?.dataset.resourceId,
    );
}
document.querySelectorAll("[data-consent-settings]").forEach((b) =>
  b.addEventListener("click", () => {
    panel.hidden = false;
    panel.querySelector("button").focus();
  }),
);
document.querySelectorAll("[data-consent]").forEach((b) =>
  b.addEventListener("click", () => {
    const before = preference;
    preference = b.dataset.consent;
    try {
      localStorage.setItem("sa.growth.consent", preference);
    } catch {}
    flowId = preference === "granted" ? crypto.randomUUID() : null;
    panel.hidden = true;
    if (before !== "granted" && preference === "granted") pageEvent();
  }),
);
pageEvent();
const form = document.getElementById("demo-form");
if (form) {
  const status = document.getElementById("demo-status");
  form.querySelector("[type=submit]").disabled =
    form.dataset.enabled !== "true" || PREVIEW;
  let pending = null;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.dataset.enabled !== "true" || PREVIEW) return;
    if (!form.reportValidity()) return;
    const f = new FormData(form),
      payload = {
        email: f.get("email"),
        role: f.get("role"),
        roomCountBucket: f.get("roomCountBucket"),
        need: f.get("need"),
        contactConsent: f.get("contactConsent") === "on",
        marketingOptIn: f.get("marketingOptIn") === "on",
        privacyVersion: "2026-11-07",
      };
    const body = JSON.stringify(payload);
    if (!pending || pending.body !== body)
      pending = { body, key: crypto.randomUUID() };
    const submit = form.querySelector("[type=submit]");
    submit.disabled = true;
    status.className = "form-status";
    status.textContent = "Enviando tu solicitud…";
    try {
      const res = await fetch("/growth-api/demo-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": pending.key,
        },
        body,
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error?.message ||
            "No pudimos recibir tu solicitud. Inténtalo de nuevo.",
        );
      if (!data.received || !data.id)
        throw new Error(
          "No se pudo confirmar la recepción. Conservamos tus datos para reintentar.",
        );
      status.className = "form-status success";
      status.textContent =
        "Recibimos tu solicitud. La revisaremos para responder sobre Sales Academy. Tu referencia: " +
        data.id +
        ".";
      form.reset();
      pending = null;
    } catch (err) {
      status.className = "form-status error";
      status.textContent =
        err.message === "Failed to fetch"
          ? "No pudimos enviar tu solicitud. Tus datos siguen aquí para reintentar."
          : err.message;
    } finally {
      submit.disabled = false;
    }
  });
}
