// Botón «Instalar app» (FTD instalar-app, aisales). Solo se ve si la app no está instalada.
import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { INSTALL_HELP, installMode, isIOS, isStandalone } from "./install-model.mjs";

// El evento puede llegar antes de que React monte el botón: se guarda aquí.
let deferredPrompt = null;
let installed = false;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());
if (typeof window !== "undefined") {
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });
  addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
    notify();
  });
  if ("serviceWorker" in navigator && location.protocol === "https:")
    addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

function currentMode() {
  return installMode({
    standalone: isStandalone(window),
    installed,
    canPrompt: Boolean(deferredPrompt),
    ios: isIOS(navigator.userAgent, navigator.maxTouchPoints || 0),
  });
}

export function InstallButton({ compact = false, className = "" }) {
  const [mode, setMode] = useState(currentMode),
    [help, setHelp] = useState(false);
  useEffect(() => {
    const update = () => setMode(currentMode());
    listeners.add(update);
    const media = window.matchMedia?.("(display-mode: standalone)");
    media?.addEventListener?.("change", update);
    return () => {
      listeners.delete(update);
      media?.removeEventListener?.("change", update);
    };
  }, []);
  if (mode === "hidden") return null;
  async function install() {
    if (mode === "prompt" && deferredPrompt) {
      const event = deferredPrompt;
      deferredPrompt = null;
      event.prompt();
      const choice = await event.userChoice.catch(() => null);
      if (choice?.outcome === "accepted") installed = true;
      notify();
      return;
    }
    setHelp(!help);
  }
  return (
    <span className={"pilot-install " + className}>
      <button type="button" className={compact ? "pilot-install-btn compact" : "pilot-install-btn"} data-testid="install-app" aria-label="Instalar app" onClick={install} aria-expanded={mode === "prompt" ? undefined : help}>
        <Download size={16} aria-hidden="true" />
        <span>Instalar app</span>
      </button>
      {help && (
        <span className="pilot-install-help" role="status">
          {mode === "ios" ? INSTALL_HELP.ios : INSTALL_HELP.manual}
          <button type="button" aria-label="Cerrar ayuda" onClick={() => setHelp(false)}>
            <X size={14} />
          </button>
        </span>
      )}
    </span>
  );
}
