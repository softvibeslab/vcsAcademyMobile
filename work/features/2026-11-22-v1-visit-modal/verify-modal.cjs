// Real API; read the existing synthetic demo without changing or deleting it.
const { chromium, webkit, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { login, apiCall, navigate } = require('../2026-11-22-v1-tour-learning/verify-tours.cjs');
const fixture = require('../2026-11-22-v1-tour-demo/evidence/demo-result.json');
const phase = process.env.MODAL_QA_PHASE || 'green';
const directory = path.join(__dirname, 'evidence', phase);
const report = { passed: true, phase, cases: [] };
const selectedCases = process.env.MODAL_QA_CASES?.split(',');

async function measure(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('dialog[aria-label="Detalle de visita"], dialog.sa-visit-dialog');
    const scroll = document.querySelector('[aria-label="Contenido de la visita"]');
    const oldPanel = document.querySelector('.sa-detail-scroll');
    return { width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight, pageScroll: scrollY,
      dialog: dialog?.getBoundingClientRect().toJSON(), nativeModal: !!dialog?.matches(':modal'),
      content: scroll?.getBoundingClientRect().toJSON(), contentScroll: scroll?.scrollTop,
      oldPanel: oldPanel?.getBoundingClientRect().toJSON() };
  });
}

async function runCase(browser, name, viewport, theme) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 600 ? 2 : 1,
    isMobile: viewport.width < 600, hasTouch: viewport.width < 600, locale: 'es-MX', timezoneId: 'America/Cancun', reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const item = { name, viewport, theme, passed: false };
  const writes = [], errors = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/tour-visits') && request.method() !== 'GET') writes.push(request.method()); });
  page.on('pageerror', error => errors.push(error.message));
  try {
    await login(page, theme);
    const before = await apiCall(page, '/api/tour-visits/' + fixture.visitId);
    assert.equal(before.status, 200);
    await navigate(page, 'agenda/' + fixture.visitId);
    await expect(page.getByRole('article', { name: 'Detalle de visita', exact: true })).toContainText(fixture.title);
    item.opened = await measure(page);
    await page.screenshot({ path: path.join(directory, name + '-opened.png'), fullPage: true });
    assert(item.opened.nativeModal, 'Visit details must open in a real full-size modal, not the short day panel');
    const dialog = page.getByRole('dialog', { name: 'Detalle de visita', exact: true });
    const content = dialog.getByRole('region', { name: 'Contenido de la visita', exact: true });
    const close = dialog.getByRole('button', { name: 'Cerrar detalle de visita', exact: true });
    await expect(dialog).toBeVisible();
    assert(item.opened.dialog.height >= viewport.height * .8, 'Detail uses most of the available height');
    if (viewport.width < 600) assert(item.opened.dialog.width >= viewport.width * .95, 'Mobile detail uses the screen width');
    assert(item.opened.content.height >= viewport.height * .65, 'Readable body is not confined to the day panel');
    assert(item.opened.documentWidth <= viewport.width + 1 && item.opened.documentHeight <= viewport.height + 1, 'No global overflow');
    await expect(close).toBeInViewport();
    const lastAction = dialog.getByRole('button', { name: 'Eliminar visita', exact: true });
    // The catalog is fetched independently from the saved analysis. Wait for its
    // recommendation cards before measuring the final action's stable position.
    const recommendationCount = before.body.data.visit.analysis.recommended_steps.length;
    await expect(dialog.locator('.tour-recommendations a')).toHaveCount(recommendationCount);
    await expect(dialog.getByText('Comprobando lecciones disponibles…', { exact: true })).toBeHidden();
    item.catalogReadyBeforeScroll = { recommendationCount };
    await lastAction.scrollIntoViewIfNeeded();
    await expect(lastAction).toBeInViewport();
    await expect(close).toBeInViewport();
    item.scrolled = await measure(page);
    assert(item.scrolled.contentScroll > 0, 'Long detail scrolls internally');
    assert.equal(item.scrolled.pageScroll, item.opened.pageScroll, 'Background remains stationary');
    await page.screenshot({ path: path.join(directory, name + '-actions.png'), fullPage: true });

    await dialog.getByRole('button', { name: 'Editar visita', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Editar visita', exact: true });
    await expect(editor).toBeVisible();
    await expect(editor.getByRole('button', { name: 'Guardar cambios', exact: true })).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(editor).toBeHidden();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Editar visita', exact: true })).toBeFocused();
    if (name === 'reduced-height') {
      // This case approximates the keyboard. Dismissing the editor restores the
      // normal phone viewport before returning to the underlying calendar.
      await page.setViewportSize({ width: 390, height: 844 });
      item.restoredViewport = await measure(page);
      await expect(close).toBeInViewport();
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/#agenda$/);

    const trigger = page.getByRole('button', { name: 'Ver visita ' + fixture.title, exact: true });
    await trigger.click();
    await expect(dialog).toBeVisible();
    await close.click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.reload();
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(fixture.title);
    const lesson = dialog.getByRole('link', { name: /Abrir lección/ }).first();
    await lesson.scrollIntoViewIfNeeded();
    await expect(lesson).toBeInViewport();
    await expect(close).toBeInViewport();
    await page.screenshot({ path: path.join(directory, name + '-learning.png'), fullPage: true });
    await dialog.getByRole('link', { name: 'Continuar con el Coach', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('region', { name: 'Contexto de visita' })).toContainText(fixture.title);
    await expect(page.getByLabel('Tu mensaje', { exact: true })).toBeEditable();
    const after = await apiCall(page, '/api/tour-visits/' + fixture.visitId);
    assert.deepEqual(after.body.data.visit, before.body.data.visit);
    assert.deepEqual(writes, []);
    assert.deepEqual(errors, []);
    item.passed = true;
  } catch (error) {
    report.passed = false; item.error = error.message;
    await page.screenshot({ path: path.join(directory, name + '-failure.png'), fullPage: true });
  } finally {
    report.cases.push(item);
    await apiCall(page, '/api/auth/logout', 'POST', {}).catch(() => {});
    await context.close();
  }
}

(async () => {
  await fs.mkdir(directory, { recursive: true });
  const chrome = await chromium.launch(), safari = await webkit.launch();
  try {
    for (const theme of ['dark', 'light']) {
      for (const [device, browser, viewport] of [['android', chrome, { width: 360, height: 800 }], ['iphone', safari, { width: 390, height: 844 }], ['desktop', chrome, { width: 1440, height: 900 }]]) {
        const name = device + '-' + theme;
        if (!selectedCases || selectedCases.includes(name)) await runCase(browser, name, viewport, theme);
      }
    }
    if (!selectedCases || selectedCases.includes('reduced-height')) await runCase(safari, 'reduced-height', { width: 390, height: 460 }, 'dark');
  } finally {
    await chrome.close(); await safari.close();
    await fs.writeFile(path.join(directory, 'results.json'), JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, phase }));
  if (!report.passed) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
