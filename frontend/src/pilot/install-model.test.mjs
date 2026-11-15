// FTD instalar-app (aisales): detección de «ya instalada» y modo del botón en cualquier dispositivo.
import test from "node:test";
import assert from "node:assert/strict";
import { isStandalone, isIOS, installMode, INSTALL_HELP } from "./install-model.mjs";

const mm = (standalone) => (q) => ({ matches: standalone && q === "(display-mode: standalone)" });

test("detecta app instalada (Android/escritorio e iOS)", () => {
  assert.equal(isStandalone({ matchMedia: mm(true), navigator: {} }), true);
  assert.equal(isStandalone({ matchMedia: mm(false), navigator: { standalone: true } }), true);
  assert.equal(isStandalone({ matchMedia: mm(false), navigator: {} }), false);
  assert.equal(isStandalone({}), false);
});

test("detecta iOS, incluido iPadOS que se anuncia como Mac táctil", () => {
  assert.equal(isIOS("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari", 5), true);
  assert.equal(isIOS("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari", 5), true);
  assert.equal(isIOS("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari", 0), false);
  assert.equal(isIOS("Mozilla/5.0 (Linux; Android 15) Chrome/130", 5), false);
});

test("modo del botón e instrucciones en español", () => {
  assert.equal(installMode({ standalone: true, canPrompt: true }), "hidden");
  assert.equal(installMode({ installed: true }), "hidden");
  assert.equal(installMode({ canPrompt: true }), "prompt");
  assert.equal(installMode({ ios: true }), "ios");
  assert.equal(installMode({}), "manual");
  assert.match(INSTALL_HELP.ios, /Compartir/);
  assert.match(INSTALL_HELP.manual, /menú del navegador/);
});
