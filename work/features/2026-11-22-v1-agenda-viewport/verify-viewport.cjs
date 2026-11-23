// Isolated responsive QA. Fixtures are written only to the temporary loopback API.
const { chromium, webkit, request, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const phase = process.env.VIEWPORT_QA_PHASE || 'green';
const pageURL = 'http://127.0.0.1:4198/v1.html';
const apiURL = 'http://127.0.0.1:18926';
const directory = path.join(__dirname, 'evidence', phase);
const normalNote = '[QA viewport] Repasar propuesta.';
const longNote = '[QA viewport] ' + 'Detalle de la visita para lectura completa. '.repeat(30) + 'FIN DE NOTA EXTENSA';
const report = { phase, startedAt: new Date().toISOString(), passed: false, checks: [], screenshots: [] };
const record = (name, detail = {}) => report.checks.push({ name, passed: true, ...detail });
async function success(response) { assert.equal(response.status(), 200); const body = await response.json(); assert.equal(body.success, true); return body.data; }
async function seed() {
  const api = await request.newContext({ baseURL: apiURL });
  try {
    assert.equal((await success(await api.get('/api/ready'))).status, 'ready');
    const login = await success(await api.post('/api/auth/login', { data: { email: 'rep@vcsa.local', password: 'demo123' } }));
    const headers = { Authorization: `Bearer ${login.token}` };
    await success(await api.post('/api/goalsheet', { headers, data: { date: '2026-11-06', tour_outcome: 'qualified', sales_outcome: 'sold', sales_volume: 8000, number_of_sales: 1, notes: normalNote, follow_ups: [{ follow_up_date: '2026-11-23', note: '[QA viewport] Próximo seguimiento.' }] } }));
    await success(await api.post('/api/goalsheet', { headers, data: { date: '2026-11-07', tour_outcome: 'qualified', sales_outcome: 'no_sale', sales_volume: 0, number_of_sales: 0, notes: longNote, follow_ups: Array.from({ length: 4 }, (_, i) => ({ follow_up_date: '2026-11-08', note: `[QA viewport] Seguimiento múltiple ${i + 1}.` })) } }));
    record('Real temporary API contains normal, long-note and four-follow-up fixtures');
  } finally { await api.dispose(); }
}
async function login(page) {
  await page.goto(pageURL);
  await page.getByRole('button', { name: 'Ya tengo una cuenta', exact: true }).click();
  await page.getByLabel('Correo electrónico', { exact: true }).fill('rep@vcsa.local');
  await page.getByLabel('Contraseña', { exact: true }).fill('demo123');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mi desempeño', exact: true })).toBeVisible();
  const guide = page.getByRole('dialog'); await expect(guide).toBeVisible();
  await guide.getByRole('button', { name: 'Omitir guía', exact: true }).click();
}
async function openTheme(page, theme) {
  await page.goto(`${pageURL}#home`);
  if (await page.locator('html').getAttribute('data-theme') !== theme) await page.getByRole('button', { name: 'Cambiar tema', exact: true }).filter({ visible: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await page.getByRole('link', { name: 'Abrir agenda', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Calendario mensual', exact: true })).toBeVisible();
}
function day(page, label) { return page.getByRole('button', { name: new RegExp(`^${label} · \\d+ registros?$`) }); }
async function snapshot(page, name) { const file = `${name}.png`; await page.screenshot({ path: path.join(directory, file), fullPage: true }); report.screenshots.push(file); }
async function geometry(page) {
  return page.evaluate(() => {
    const box = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const scroll = element => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, top: element.scrollTop });
    const device = document.querySelector('.sa-device'), grid = document.querySelector('[data-purpose="calendar-month-grid"]'), sheet = document.querySelector('[data-purpose="selected-day-preview-sheet"]');
    const sheetBox = box(sheet), gridBox = box(grid);
    const dates = [...document.querySelectorAll('.sa-month-day')].map(element => {
      const r = box(element), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { label: element.getAttribute('aria-label'), ...r, fullyInGrid: r.y >= gridBox.y - 1 && r.bottom <= gridBox.bottom + 1, beforeSheet: r.bottom <= sheetBox.y + 1, hit: element === hit || element.contains(hit) };
    });
    const controls = [...document.querySelectorAll('.sa-utilities button, .sa-utilities a, .sa-year-button, .sa-today, .sa-filters button, .sa-followup-fab, .sa-app-nav > a, .sa-app-nav > button')].map(element => {
      const r = box(element), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { name: element.getAttribute('aria-label') || element.textContent.trim(), ...r, hit: element === hit || element.contains(hit) };
    });
    return { viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio }, document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, scrollX, scrollY }, device: box(device), grid: { ...gridBox, ...scroll(grid) }, sheet: sheetBox, reading: [...document.querySelectorAll('.sa-sheet-content, .sa-detail-scroll')].map(element => ({ selector: element.className, ...scroll(element), ...box(element) })), dates, controls, safeArea: { headerPaddingTop: getComputedStyle(document.querySelector('.sa-calendar-header')).paddingTop, navPaddingBottom: getComputedStyle(document.querySelector('.sa-app-nav')).paddingBottom } };
  });
}
function assertViewport(value, normal = true) {
  assert.equal(value.dates.length, 42);
  assert(value.document.width <= value.viewport.width + 1 && value.document.height <= value.viewport.height + 1, 'Whole agenda must fit the viewport without page scrolling');
  assert.equal(value.document.scrollY, 0, 'The viewport must not shift while reading day details');
  assert(Math.abs(value.device.width - value.viewport.width) <= 1 && Math.abs(value.device.height - value.viewport.height) <= 1, 'Agenda must fill the available viewport without a phone frame');
  assert(value.grid.scrollHeight <= value.grid.clientHeight + 1, '42-day calendar must fit without internal month scrolling');
  assert(value.dates.every(date => date.fullyInGrid && date.beforeSheet && date.hit), 'Every date must remain within the visible month, above the detail and directly hittable');
  assert(value.controls.every(control => control.hit), 'Primary controls and FAB must remain directly hittable');
  const fab = value.controls.find(control => control.name === 'Agregar seguimiento');
  assert(fab.width >= 44 && fab.height >= 44, 'Follow-up FAB requires a 44px touch target');
  assert(value.controls.every(control => control.y >= 0 && control.bottom <= value.viewport.height + 1), 'Controls must stay inside the usable viewport and above its bottom edge');
  if (normal) assert(value.reading.every(area => area.scrollHeight <= area.clientHeight + 1), 'Normal day detail must not require internal scrolling');
}
async function exercise(browser, config, theme) {
  const { name, viewport, deviceScaleFactor, isMobile } = config;
  const context = await browser.newContext({ viewport, deviceScaleFactor, isMobile, hasTouch: !!isMobile, locale: 'es-MX', timezoneId: 'America/Cancun', reducedMotion: 'reduce' });
  const page = await context.newPage(); await page.clock.setFixedTime(new Date('2026-11-06T17:00:00-05:00'));
  const runtimeErrors = [], mutations = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('request', outgoing => { const url = new URL(outgoing.url()); if (url.pathname.startsWith('/api/') && !['GET', 'HEAD'].includes(outgoing.method())) mutations.push({ method: outgoing.method(), path: url.pathname }); });
  try {
    await login(page); await openTheme(page, theme);
    await snapshot(page, `${name}-${theme}-normal`);
    const initial = await geometry(page);
    if (phase === 'red') {
      report.baseline = initial;
      const multipleDay = day(page, 'domingo, 8 de noviembre de 2026');
      await multipleDay.click();
      const multipleSheet = page.locator('[data-purpose="selected-day-preview-sheet"]');
      report.multiBaseline = { chips: await multipleDay.locator('.sa-event-chip').count(), more: await multipleDay.locator('.sa-day-more').innerText(), details: await multipleSheet.getByRole('link', { name: 'Seguimiento', exact: true }).count() };
      await snapshot(page, `${name}-${theme}-multiple-before`);
    }
    assertViewport(initial);
    record(`${name}/${theme}: all 42 dates, normal detail and controls fit without page/month scrolling`, initial);
    await expect(page.locator('[data-purpose="ios-status-bar"]')).toHaveCount(0);
    await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const calendar = page.getByRole('region', { name: 'Calendario mensual', exact: true });
    const sheet = page.locator('[data-purpose="selected-day-preview-sheet"]');
    await expect(sheet).toContainText(normalNote);
    await day(page, 'sábado, 7 de noviembre de 2026').click();
    await expect(sheet).toContainText('FIN DE NOTA EXTENSA');
    const longGeometry = await geometry(page); assertViewport(longGeometry, false);
    const longRead = await page.evaluate(() => {
      const areas = [...document.querySelectorAll('.sa-sheet-content, .sa-detail-scroll')];
      for (const area of areas) if (area.scrollHeight > area.clientHeight + 1) area.scrollTop = area.scrollHeight;
      const note = document.querySelector('.sa-detail-note em');
      const text = note.firstChild; const range = document.createRange();
      range.setStart(text, Math.max(0, text.textContent.length - 18)); range.setEnd(text, text.textContent.length);
      const end = range.getBoundingClientRect();
      return { endY: end.y, endBottom: end.bottom, visible: areas.every(area => { const bounds = area.getBoundingClientRect(); return end.y >= bounds.y - 1 && end.bottom <= bounds.bottom + 1; }) };
    });
    assert(longRead.visible, 'The end of a long note must be reachable inside its reading area');
    assertViewport(await geometry(page), false);
    await snapshot(page, `${name}-${theme}-long`);
    await day(page, 'domingo, 8 de noviembre de 2026').click();
    await expect(sheet.getByRole('link', { name: 'Seguimiento', exact: true })).toHaveCount(4);
    await expect(day(page, 'domingo, 8 de noviembre de 2026').locator('.sa-event-chip')).toHaveCount(1);
    await expect(day(page, 'domingo, 8 de noviembre de 2026').locator('.sa-day-more')).toHaveText('+3');
    const multiple = await geometry(page); assertViewport(multiple, false);
    await sheet.getByText('[QA viewport] Seguimiento múltiple 4.', { exact: false }).scrollIntoViewIfNeeded();
    const afterReading = await geometry(page); assertViewport(afterReading, false);
    assert.equal(afterReading.grid.top, 0, 'Reading records must not scroll the month');
    await snapshot(page, `${name}-${theme}-multiple`);
    await sheet.getByRole('button', { name: 'Hoy', exact: true }).click();
    await expect(day(page, 'viernes, 6 de noviembre de 2026')).toHaveAttribute('aria-pressed', 'true');
    await calendar.getByRole('button', { name: 'Elegir mes y año', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Elegir mes y año', exact: true });
    await dialog.getByLabel('Mes', { exact: true }).fill('2026-12');
    await dialog.getByRole('button', { name: 'Ver mes', exact: true }).click();
    await expect(day(page, 'martes, 1 de diciembre de 2026')).toHaveAttribute('aria-pressed', 'true');
    assertViewport(await geometry(page));
    await sheet.getByRole('button', { name: 'Hoy', exact: true }).click();
    await calendar.getByRole('button', { name: 'Buscar eventos', exact: true }).click();
    const search = calendar.getByRole('searchbox', { name: 'Buscar en el mes', exact: true });
    await expect(search).toBeFocused(); await search.fill('Repasar');
    await expect(sheet).toContainText(normalNote);
    await calendar.getByRole('button', { name: 'Cerrar búsqueda', exact: true }).click();
    assertViewport(await geometry(page));
    const nav = calendar.getByRole('navigation', { name: 'Navegación de agenda', exact: true });
    await nav.getByRole('button', { name: 'Historial', exact: true }).click();
    const history = calendar.locator('[aria-label="Historial del mes"]');
    await expect(history.getByRole('button')).toHaveCount(7);
    await history.getByRole('button').last().scrollIntoViewIfNeeded();
    await expect(history.getByRole('button').last()).toBeInViewport();
    assert.equal(await page.evaluate(() => scrollY), 0, 'Reading history must not shift the page');
    await expect(nav).toBeInViewport();
    await expect(calendar.getByRole('button', { name: 'Elegir mes y año', exact: true })).toBeInViewport();
    await nav.getByRole('button', { name: 'GoalSheet', exact: true }).click();
    assertViewport(await geometry(page));
    await day(page, 'lunes, 23 de noviembre de 2026').click();
    await page.getByRole('button', { name: 'Agregar seguimiento', exact: true }).click();
    await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue('2026-11-06');
    await expect(page.getByLabel('Fecha de seguimiento', { exact: true })).toHaveValue('2026-11-23');
    await expect(page.getByLabel('Acción', { exact: true })).toBeFocused();
    assert.deepEqual(runtimeErrors, []); assert(mutations.every(item => item.path === '/api/auth/login'));
    record(`${name}/${theme}: long/multiple records remain readable without moving the month; reload, month, search, history and FAB regressions pass`, { longReading: longGeometry.reading, multipleReading: multiple.reading, runtimeErrors, mutations });
  } catch (error) { await snapshot(page, `${name}-${theme}-failure`).catch(() => {}); report.failure = { name, theme, message: error.message, runtimeErrors, mutations }; throw error; }
  finally { await context.close(); }
}
(async () => {
  await fs.mkdir(directory, { recursive: true }); const browsers = {};
  try {
    await seed(); browsers.chromium = await chromium.launch({ headless: true });
    if (phase === 'red') await exercise(browsers.chromium, { name: 'android360x800', viewport: { width: 360, height: 800 }, deviceScaleFactor: 2, isMobile: true }, 'dark');
    else {
      browsers.webkit = await webkit.launch({ headless: true });
      const matrix = [
        { name: 'android360x800', engine: 'chromium', viewport: { width: 360, height: 800 }, deviceScaleFactor: 2, isMobile: true },
        { name: 'android360x720-bars', engine: 'chromium', viewport: { width: 360, height: 720 }, deviceScaleFactor: 2, isMobile: true },
        { name: 'iphone390x844', engine: 'webkit', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true },
        { name: 'iphone375x740-bars', engine: 'webkit', viewport: { width: 375, height: 740 }, deviceScaleFactor: 3, isMobile: true },
        { name: 'literal720x1600', engine: 'chromium', viewport: { width: 720, height: 1600 }, deviceScaleFactor: 1, isMobile: false },
        { name: 'desktop1440x900', engine: 'chromium', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false },
      ];
      const cases = process.env.VIEWPORT_QA_CASES?.split(',');
      const themes = process.env.VIEWPORT_QA_THEMES?.split(',') || ['light', 'dark'];
      for (const config of matrix.filter(item => !cases || cases.includes(item.name))) for (const theme of themes) await exercise(browsers[config.engine], config, theme);
    }
    report.passed = true; console.log('PASS: viewport, all 42 dates, normal/extended detail, themes and controls across Chromium/WebKit.');
  } catch (error) { report.error = error.message; process.exitCode = 1; console.error('FAIL:', error.message); }
  finally { for (const browser of Object.values(browsers)) await browser.close(); report.finishedAt = new Date().toISOString(); await fs.writeFile(path.join(directory, 'results.json'), JSON.stringify(report, null, 2) + '\n'); }
})();
