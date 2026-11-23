// Local, isolated browser QA; real temporary API and synthetic records only.
const { chromium, request, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const phase = process.env.THEME_QA_PHASE || 'green';
const pageURL = 'http://127.0.0.1:4198/v1.html';
const apiURL = 'http://127.0.0.1:18926';
const directory = path.join(__dirname, 'evidence', phase);
const today = '2026-11-06';
const note = '[QA tema] Nota sintética de seguimiento.';
const report = { phase, startedAt: new Date().toISOString(), passed: false, checks: [], screenshots: [] };
const record = (name, detail = {}) => report.checks.push({ name, passed: true, ...detail });

async function success(response) {
  assert.equal(response.status(), 200);
  const body = await response.json();
  assert.equal(body.success, true);
  return body.data;
}
async function seed() {
  const api = await request.newContext({ baseURL: apiURL });
  try {
    assert.equal((await success(await api.get('/api/ready'))).status, 'ready');
    const login = await success(await api.post('/api/auth/login', { data: { email: 'rep@vcsa.local', password: 'demo123' } }));
    await success(await api.post('/api/goalsheet', { headers: { Authorization: `Bearer ${login.token}` }, data: {
      date: today, tour_outcome: 'qualified', sales_outcome: 'sold', sales_volume: 8000,
      number_of_sales: 1, notes: note, follow_ups: [{ follow_up_date: '2026-11-23', note: '[QA tema] Revisar propuesta.' }],
    } }));
    record('Real temporary local API contains synthetic sale/note/follow-up');
  } finally { await api.dispose(); }
}
function luminance(color) {
  const rgb = color.match(/[\d.]+/g).slice(0, 3).map(value => {
    const channel = Number(value) / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
}
async function palette(locator) {
  return locator.evaluate(element => {
    const styles = getComputedStyle(element);
    return { background: styles.backgroundColor, color: styles.color, scheme: styles.colorScheme };
  });
}
async function snapshot(page, name) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(directory, file), fullPage: true });
  report.screenshots.push(file);
}
async function login(page) {
  await page.goto(pageURL);
  await page.getByRole('button', { name: 'Ya tengo una cuenta', exact: true }).click();
  await page.getByLabel('Correo electrónico', { exact: true }).fill('rep@vcsa.local');
  await page.getByLabel('Contraseña', { exact: true }).fill('demo123');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mi desempeño', exact: true })).toBeVisible();
  const guide = page.getByRole('dialog');
  await expect(guide).toBeVisible();
  await guide.getByRole('button', { name: 'Omitir guía', exact: true }).click();
}
async function chooseThemeFromHome(page, theme) {
  await page.goto(`${pageURL}#home`);
  if (await page.locator('html').getAttribute('data-theme') !== theme) {
    await page.getByRole('button', { name: 'Cambiar tema', exact: true }).filter({ visible: true }).click();
  }
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await page.getByRole('link', { name: 'Abrir agenda', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Calendario mensual', exact: true })).toBeVisible();
}
function day(page, label) { return page.getByRole('button', { name: new RegExp(`^${label} · \\d+ registros?$`) }); }

async function exercise(browser, name, viewport) {
  const context = await browser.newContext({ viewport, locale: 'es-MX', timezoneId: 'America/Cancun', reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date('2026-11-06T17:00:00-05:00'));
  const runtimeErrors = [], mutations = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('request', outgoing => { if (new URL(outgoing.url()).pathname.startsWith('/api/') && !['GET', 'HEAD'].includes(outgoing.method())) mutations.push({ method: outgoing.method(), path: new URL(outgoing.url()).pathname }); });
  try {
    await login(page);
    if (phase === 'red') {
      await chooseThemeFromHome(page, 'dark');
      await snapshot(page, `${name}-dark-before`);
      const baseline = { theme: await page.locator('html').getAttribute('data-theme'), statusBars: await page.locator('[data-purpose="ios-status-bar"]').count(), device: await palette(page.locator('.sa-device')), route: await palette(page.locator('.smart-agenda-route')) };
      report.baseline = baseline;
      assert.equal(baseline.statusBars, 0, 'Decorative 9:41/island/status bar must be removed');
      assert(luminance(baseline.device.background) < .2, 'Dark theme must not force a white calendar');
      return;
    }
    const colors = {};
    for (const theme of ['light', 'dark']) {
      await chooseThemeFromHome(page, theme);
      const calendar = page.getByRole('region', { name: 'Calendario mensual', exact: true });
      const sheet = page.locator('[data-purpose="selected-day-preview-sheet"]');
      await expect(page.locator('[data-purpose="ios-status-bar"]')).toHaveCount(0);
      await expect(page.getByText('9:41', { exact: true })).toHaveCount(0);
      await expect(sheet).toContainText(note);
      await expect(calendar.getByRole('button', { name: /de \d{4} · \d+ registros?$/ })).toHaveCount(42);
      const frame = await calendar.boundingBox();
      const header = await page.locator('[data-purpose="calendar-top-header"]').boundingBox();
      assert(header.y - frame.y <= 10, 'No reserved space may remain for removed decorative bar');
      assert(frame.width <= 431);
      if (viewport.width > 430) assert(Math.abs(frame.x - (viewport.width - frame.width) / 2) < 2);
      const surfaces = {};
      for (const selector of ['.smart-agenda-route', '.sa-device', '.sa-day-sheet', '.sa-detail-card', '.sa-app-nav']) {
        surfaces[selector] = await palette(page.locator(selector).first());
        const lightness = luminance(surfaces[selector].background);
        assert(theme === 'dark' ? lightness < .2 : lightness > .7, `${selector} must use ${theme} surfaces, got ${surfaces[selector].background}`);
      }
      colors[theme] = surfaces;
      await snapshot(page, `${name}-${theme}`);
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      assert.equal(await page.evaluate(() => localStorage.getItem('sa.pilot.theme')), theme);
      await expect(calendar).toBeVisible();
      assert.deepEqual(await palette(page.locator('.sa-device')), surfaces['.sa-device']);
      await calendar.getByRole('button', { name: 'Buscar eventos', exact: true }).click();
      const search = calendar.getByRole('searchbox', { name: 'Buscar en el mes', exact: true });
      await expect(search).toBeFocused();
      await search.fill('Nota sintética');
      await expect(sheet).toContainText(note);
      const searchPalette = await palette(search);
      assert(theme === 'dark' ? luminance(searchPalette.background) < .2 : luminance(searchPalette.background) > .7, 'Search must follow theme');
      await snapshot(page, `${name}-${theme}-search`);
      await calendar.getByRole('button', { name: 'Cerrar búsqueda', exact: true }).click();
      await calendar.getByRole('button', { name: 'Elegir mes y año', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Elegir mes y año', exact: true });
      const monthInput = dialog.getByLabel('Mes', { exact: true });
      await expect(monthInput).toBeFocused();
      for (const control of [dialog, monthInput]) {
        const style = await palette(control);
        assert(theme === 'dark' ? luminance(style.background) < .2 : luminance(style.background) > .7, 'Month dialog and input must follow theme');
      }
      await snapshot(page, `${name}-${theme}-dialog`);
      await monthInput.fill('2026-12');
      await dialog.getByRole('button', { name: 'Ver mes', exact: true }).click();
      await expect(calendar.getByRole('button', { name: 'Elegir mes y año', exact: true })).toBeFocused();
      await expect(day(page, 'martes, 1 de diciembre de 2026')).toHaveAttribute('aria-pressed', 'true');
      await sheet.getByRole('button', { name: 'Hoy', exact: true }).click();
      await expect(day(page, 'viernes, 6 de noviembre de 2026')).toHaveAttribute('aria-pressed', 'true');
      await sheet.getByRole('button', { name: /Spiffs/ }).click();
      await expect(sheet).toContainText('Sin registros para este día.');
      await sheet.getByRole('button', { name: 'Todos', exact: true }).click();
      await day(page, 'lunes, 23 de noviembre de 2026').scrollIntoViewIfNeeded();
      await day(page, 'lunes, 23 de noviembre de 2026').click();
      await expect(sheet.getByRole('link', { name: 'Seguimiento', exact: true })).toHaveAttribute('href', '#goalsheet/2026-11-06');
      await page.getByRole('button', { name: 'Agregar seguimiento', exact: true }).click();
      await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue(today);
      await expect(page.getByLabel('Fecha de seguimiento', { exact: true })).toHaveValue('2026-11-23');
      await expect(page.getByLabel('Acción', { exact: true })).toBeFocused();
      record(`${name}/${theme}: no status bar/gap, themed surfaces/search/dialog, Home toggle/reload persistence and calendar/FAB regression pass`, { viewport, frame, surfaces, searchPalette });
    }
    assert.notEqual(colors.light['.sa-device'].background, colors.dark['.sa-device'].background);
    assert.deepEqual(runtimeErrors, []);
    assert(mutations.every(item => item.path === '/api/auth/login'), 'UI must not implicitly save business records');
    record(`${name}: no runtime errors, no horizontal overflow and no business writes`);
  } catch (error) {
    await snapshot(page, `${name}-failure`).catch(() => {});
    report.failure = { name, message: error.message, runtimeErrors, mutations };
    throw error;
  } finally { await context.close(); }
}
(async () => {
  await fs.mkdir(directory, { recursive: true });
  let browser;
  try {
    await seed();
    browser = await chromium.launch({ headless: true });
    await exercise(browser, 'mobile390', { width: 390, height: 884 });
    if (phase !== 'red') {
      await exercise(browser, 'mobile320', { width: 320, height: 740 });
      await exercise(browser, 'desktop1440', { width: 1440, height: 1000 });
    }
    report.passed = true;
    console.log('PASS: removed status bar, light/dark theme and persistence, mobile/desktop controls and no implicit writes.');
  } catch (error) { report.error = error.message; process.exitCode = 1; console.error('FAIL:', error.message); }
  finally {
    if (browser) await browser.close();
    report.finishedAt = new Date().toISOString();
    await fs.writeFile(path.join(directory, 'results.json'), JSON.stringify(report, null, 2) + '\n');
  }
})();
