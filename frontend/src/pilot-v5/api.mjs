let csrf = "";
let expired = () => {};
export const setExpiredHandler = (fn) => {
  expired = fn;
};
export const setCsrf = (value) => {
  csrf = value || "";
};
export async function api(path, options = {}) {
  const method = options.method || "GET",
    headers = { ...options.headers };
  if (!["GET", "HEAD"].includes(method) && csrf) headers["X-CSRF-Token"] = csrf;
  let body = options.body;
  if (body != null && !(body instanceof Blob)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetch(path, {
      ...options,
      method,
      body,
      headers,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw Object.assign(new Error("network_error"), { code: "network_error" });
  }
  let result;
  try {
    result = await response.json();
  } catch {
    result = {};
  }
  if (!response.ok || result.success === false) {
    const raw = result.error || result.detail || {};
    const code =
      raw.code ||
      (response.status === 401
        ? "session_expired"
        : response.status === 403
          ? "access_denied"
          : response.status === 409
            ? "conflict"
            : response.status === 422
              ? "validation_error"
              : "request_failed");
    if (
      response.status === 401 &&
      !["/api/auth/login", "/api/mobile/me"].includes(path)
    )
      expired();
    throw Object.assign(new Error(code), {
      code,
      status: response.status,
      fields: raw.field_errors || {},
      requestId: raw.request_id,
    });
  }
  const data = result.data ?? result;
  if (data.csrf_token) setCsrf(data.csrf_token);
  return data;
}
export async function downloadFile(path, name = "script.pdf") {
  let response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw Object.assign(new Error("network_error"), { code: "network_error" });
  }
  if (!response.ok) {
    let result = {};
    try {
      result = await response.json();
    } catch {}
    throw Object.assign(new Error("request_failed"), {
      code:
        result.error?.code ||
        (response.status === 403 ? "access_denied" : "request_failed"),
      status: response.status,
    });
  }
  const blob = await response.blob(),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
