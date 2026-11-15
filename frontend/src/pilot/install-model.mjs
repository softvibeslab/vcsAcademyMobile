// Botón «Instalar app» (FTD instalar-app, aisales). Solo aparece si la app no está instalada.
// Android y escritorio (Chrome/Edge): diálogo nativo vía `beforeinstallprompt`.
// iOS y navegadores sin diálogo: instrucciones para agregarla a mano.

export const INSTALL_HELP = {
  ios: "Toca Compartir (el cuadro con la flecha hacia arriba) y luego «Agregar a pantalla de inicio».",
  manual: "Abre el menú del navegador y elige «Instalar app» o «Agregar a la pantalla principal». En Safari para Mac: Archivo › Agregar al Dock.",
};

/** ¿Se está ejecutando como app instalada? */
export function isStandalone(win = globalThis) {
  const display = win.matchMedia?.("(display-mode: standalone)")?.matches === true;
  return display || win.navigator?.standalone === true;
}

/** iPhone/iPad, incluido iPadOS que se anuncia como Mac con pantalla táctil. */
export function isIOS(ua = "", maxTouchPoints = 0) {
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return /Macintosh/i.test(ua) && maxTouchPoints > 1;
}

/** "hidden" (ya instalada) · "prompt" (diálogo nativo) · "ios" · "manual". */
export function installMode({ standalone = false, installed = false, canPrompt = false, ios = false } = {}) {
  if (standalone || installed) return "hidden";
  if (canPrompt) return "prompt";
  return ios ? "ios" : "manual";
}
