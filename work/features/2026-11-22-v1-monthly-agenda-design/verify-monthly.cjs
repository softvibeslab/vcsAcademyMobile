// Isolated local QA only. Uses the real legacy API and synthetic Goal Sheet data.
const { chromium, request, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const pageURL = process.env.MONTHLY_QA_URL || 'http://127.0.0.1:4198/v1.html';
const apiURL = process.env.MONTHLY_QA_API || 'http://127.0.0.1:18926';
const phase = process.env.MONTHLY_QA_PHASE || 'green';
const focus = process.env.MONTHLY_QA_FOCUS || '';
assert.equal(new URL(pageURL).hostname, '127.0.0.1', 'Fixture writes must stay local');
assert.equal(new URL(apiURL).hostname, '127.0.0.1', 'Fixture writes must stay local');
const directory = path.join(__dirname, 'evidence', `monthly-${phase}`);
const today = '2026-11-06';
const future = '2026-11-23';
const note = '[QA mensual] Revisar preguntas y material de la presentación.';
const followUpNote = '[QA mensual] Seguimiento de la visita.';
const report = { phase, pageURL, apiURL, startedAt: new Date().toISOString(), passed: false, checks: [], screenshots: [] };
const record = (name, detail = {}) => report.checks.push({ name, passed: true, ...detail });

async function success(response) {
  assert.equal(response.status(), 200, `Unexpected status for ${response.url()}`);
  const payload = await response.json();
  assert.equal(payload.success, true);
  return payload.data;
}

async function seed() {
  const api = await request.newContext({ baseURL: apiURL });
  try {
    assert.equal((await success(await api.get('/api/ready'))).status, 'ready');
    const login = await success(await api.post('/api/auth/login', { data: { email: 'rep@vcsa.local', password: 'demo123' } }));
    const headers = { Authorization: `Bearer ${login.token}` };
    await success(await api.post('/api/goalsheet', { headers, data: {
      date: today, tour_outcome: 'qualified', sales_outcome: 'sold', sales_volume: 8000,
      number_of_sales: 1, notes: note, follow_ups: [{ follow_up_date: future, note: followUpNote }],
    } }));
    const reminders = (await success(await api.get('/api/reminders/upcoming', { headers }))).reminders;
    assert(reminders.some(item => item.follow_up_date === future && item.note === followUpNote));
    record('Real local API has one USD8000 sale on Nov6, a note and one follow-up on Nov23');
  } finally { await api.dispose(); }
}

function dateLabel(date) {
  return new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00Z`));
}
function escaped(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function dayButton(region, date) { return region.getByRole('button', { name: new RegExp(`^${escaped(dateLabel(date))}(?:$| ·)`) }); }

async function login(page) {
  await page.goto(pageURL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Ya tengo una cuenta', exact: true }).click();
  await page.getByLabel('Correo electrónico', { exact: true }).fill('rep@vcsa.local');
  await page.getByLabel('Contraseña', { exact: true }).fill('demo123');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mi desempeño', exact: true })).toBeVisible();
  const guide = page.getByRole('dialog');
  await expect(guide).toBeVisible();
  await guide.getByRole('button', { name: 'Omitir guía', exact: true }).click();
  await page.goto(`${pageURL}#agenda`, { waitUntil: 'domcontentloaded' });
}

async function snapshot(page, name) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(directory, file), fullPage: true });
  report.screenshots.push({ name, file });
}

async function exercise(browser, name, viewport) {
  const context = await browser.newContext({ viewport, locale: 'es-MX', timezoneId: 'America/Cancun', reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date('2026-11-06T17:00:00-05:00'));
  page.setDefaultTimeout(10000);
  const runtimeErrors = [];
  const mutations = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('request', outgoing => {
    const url = new URL(outgoing.url());
    if (url.pathname.startsWith('/api/') && !['GET', 'HEAD'].includes(outgoing.method())) mutations.push({ path: url.pathname, method: outgoing.method() });
  });
  try {
    await login(page);
    await snapshot(page, `${name}-before-monthly-assertion`);
    const calendar = page.getByRole('region', { name: 'Calendario mensual', exact: true });
    // RED must fail here against the weekly agenda after successful real API setup/login.
    await expect(calendar).toBeVisible();
    if (focus === 'regression') {
      const accessibleCount = await dayButton(calendar, today).getAttribute('aria-label');
      await dayButton(calendar, future).scrollIntoViewIfNeeded();
      await dayButton(calendar, future).click();
      const followupLink = page.locator('[data-purpose="selected-day-preview-sheet"]').getByRole('link', { name: 'Seguimiento', exact: true });
      const regression = {
        accessibleCount,
        countIncluded: accessibleCount === `${dateLabel(today)} · 1 registro`,
        followupLinkExists: await followupLink.count() === 1,
      };
      if (regression.followupLinkExists) regression.originHref = await followupLink.getAttribute('href');
      report.regression = regression;
      await snapshot(page, `${name}-regression`);
      assert.equal(regression.followupLinkExists, true, 'Existing follow-up must link to its original Goal Sheet');
      assert.equal(regression.originHref, `#goalsheet/${today}`);
      assert.equal(regression.countIncluded, true, 'Day accessible name must include record count');
      record('Existing follow-up preserves original Goal Sheet and date labels announce record count');
      return;
    }
    await expect(dayButton(calendar, today)).toHaveAttribute('aria-pressed', 'true');
    await expect(dayButton(calendar, today)).toHaveAccessibleName(`${dateLabel(today)} · 1 registro`);
    const dateButtons = calendar.getByRole('button', { name: /^(domingo|lunes|martes|miércoles|jueves|viernes|sábado), \d{1,2} de .+ de \d{4}/ });
    await expect(dateButtons).toHaveCount(42);
    await expect(dateButtons.nth(0)).toHaveAccessibleName(new RegExp(`^${escaped(dateLabel('2026-11-01'))}`));
    await expect(dateButtons.nth(5)).toHaveAccessibleName(new RegExp(`^${escaped(dateLabel(today))}`));
    await expect(dateButtons.nth(41)).toHaveAccessibleName(new RegExp(`^${escaped(dateLabel('2026-12-12'))}`));
    const firstBox = await dateButtons.nth(0).boundingBox();
    const fridayBox = await dateButtons.nth(5).boundingBox();
    assert(Math.abs(firstBox.y - fridayBox.y) < 2 && fridayBox.x > firstBox.x, 'Nov6 must occupy Friday in the first Sunday-start row');
    await expect(page.locator('.topbar')).toBeHidden();
    await expect(page.locator('.bottom-nav')).toBeHidden();
    await expect(page.locator('.app-footer')).toBeHidden();
    const main = page.locator('.sa-device');
    await expect(main).toHaveCount(1);
    const frame = await main.boundingBox();
    assert(frame.width <= 431, 'Monthly design must retain a narrow mobile frame');
    if (viewport.width > 430) assert(Math.abs(frame.x - (viewport.width - frame.width) / 2) < 2, 'Desktop frame must be centered');
    const sheet = page.locator('[data-purpose="selected-day-preview-sheet"]');
    const header = page.locator('[data-purpose="calendar-top-header"]');
    await expect(header.getByRole('heading', { name: /noviembre/i })).toBeVisible();
    await expect(header).toContainText(/1 tour/);
    await expect(header).toContainText(/USD\s*(?:8[,\.]?000|8k)/i);
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText(/viernes,?\s*6\s*nov/i);
    await expect(sheet).toContainText(/1 venta/);
    await expect(sheet).toContainText(/USD\s*(?:8[,\.]?000|8k)/i);
    await expect(sheet.getByText(note, { exact: false })).toBeVisible();
    const sheetText = await sheet.innerText();
    assert(!/Lead\s*#4920|09:30|USD\s*500|\$1,600|\$250|Platino|20%/.test(sheetText), 'Mockup example money, lead, time and notes must not become live data');
    assert((sheetText.match(/—/g) || []).length >= 3, 'Commission, down payment and Spiff must remain unavailable');
    await expect(page.getByRole('button', { name: 'Agregar seguimiento', exact: true })).toHaveCount(1);
    await snapshot(page, `${name}-monthly-reference`);
    record(`${name}: 42 civil dates, Sunday start, Friday Nov6, narrow reference shell and only real amounts`, { viewport, frame });

    const monthTrigger = calendar.getByRole('button', { name: 'Elegir mes y año', exact: true });
    await monthTrigger.click();
    const monthDialog = page.getByRole('dialog', { name: 'Elegir mes y año', exact: true });
    await expect(monthDialog.getByLabel('Mes', { exact: true })).toBeFocused();
    await monthDialog.getByLabel('Mes', { exact: true }).fill('2026-12');
    await monthDialog.getByRole('button', { name: 'Ver mes', exact: true }).click();
    await expect(dayButton(calendar, '2026-12-01')).toHaveAttribute('aria-pressed', 'true');
    await expect(monthTrigger).toBeFocused();
    await expect(header.getByRole('heading', { name: /diciembre/i })).toBeVisible();
    await monthTrigger.click();
    await page.keyboard.press('Escape');
    await expect(monthDialog).toHaveCount(0);
    await expect(monthTrigger).toBeFocused();
    await sheet.getByRole('button', { name: 'Hoy', exact: true }).click();
    await dayButton(calendar, today).focus();
    for (const [key, selected] of [['ArrowRight', '2026-11-07'], ['Home', '2026-11-01'], ['End', '2026-11-07'], ['PageDown', '2026-12-07'], ['PageUp', '2026-11-07'], ['ArrowLeft', today]]) {
      await page.keyboard.press(key);
      await expect(dayButton(calendar, selected)).toHaveAttribute('aria-pressed', 'true');
      await expect(dayButton(calendar, selected)).toBeFocused();
    }
    record(`${name}: month picker, Escape/focus return, civil-date keyboard navigation and Today work`);

    await calendar.getByRole('button', { name: 'Buscar eventos', exact: true }).click();
    const search = calendar.getByRole('searchbox', { name: 'Buscar en el mes', exact: true });
    await expect(search).toBeFocused();
    await search.fill('preguntas');
    await expect(sheet.getByText(note, { exact: false })).toBeVisible();
    await search.fill('no-such-fixture');
    await expect(sheet).toContainText('Sin registros para este día.');
    await calendar.getByRole('button', { name: 'Cerrar búsqueda', exact: true }).click();
    await expect(sheet.getByText(note, { exact: false })).toBeVisible();
    await calendar.getByRole('button', { name: 'Cambiar vista', exact: true }).click();
    const history = calendar.locator('[aria-label="Historial del mes"]');
    await expect(history.getByRole('button')).toHaveCount(2);
    await history.getByRole('button').filter({ hasText: followUpNote }).click();
    await expect(dayButton(calendar, future)).toHaveAttribute('aria-pressed', 'true');
    await expect(sheet.getByText(followUpNote, { exact: false })).toBeVisible();
    const nav = calendar.getByRole('navigation', { name: 'Navegación de agenda', exact: true });
    await expect(nav.getByRole('link', { name: 'Hoy', exact: true })).toHaveAttribute('href', '#home');
    await expect(nav.getByRole('link', { name: 'Coaching', exact: true })).toHaveAttribute('href', '#coach');
    await nav.getByRole('button', { name: 'Historial', exact: true }).click();
    await expect(history).toBeVisible();
    await nav.getByRole('button', { name: 'GoalSheet', exact: true }).click();
    await expect(dateButtons).toHaveCount(42);
    await sheet.getByRole('button', { name: 'Hoy', exact: true }).click();
    await sheet.getByRole('button', { name: 'Contraer detalle del día', exact: true }).click();
    await expect(sheet.getByText(note, { exact: false })).toHaveCount(0);
    await sheet.getByRole('button', { name: 'Expandir detalle del día', exact: true }).click();
    await expect(sheet.getByText(note, { exact: false })).toBeVisible();
    record(`${name}: search, existing month history, reference navigation and collapsible detail work`);

    await sheet.getByRole('button', { name: 'Ventas', exact: true }).click();
    await expect(sheet.getByText(note, { exact: false })).toBeVisible();
    const spiffs = sheet.getByRole('button', { name: /Spiffs/ });
    await spiffs.click();
    await expect(spiffs).toHaveAttribute('aria-pressed', 'true');
    await expect(sheet.getByText(note, { exact: false })).toHaveCount(0);
    await expect(sheet).toContainText('Sin registros para este día.');
    await sheet.getByRole('button', { name: 'Todos', exact: true }).click();
    await expect(sheet.getByText(note, { exact: false })).toBeVisible();
    record(`${name}: sale filter keeps real record; Spiffs filter is empty without invented rewards`);

    const lastDay = dayButton(calendar, '2026-12-12');
    await lastDay.scrollIntoViewIfNeeded();
    await lastDay.click();
    await expect(dayButton(calendar, '2026-12-12')).toHaveAttribute('aria-pressed', 'true');
    await sheet.getByRole('button', { name: 'Hoy', exact: true }).click();
    await expect(dayButton(calendar, today)).toHaveAttribute('aria-pressed', 'true');
    await expect(dayButton(calendar, today)).toBeInViewport();
    record(`${name}: scrolling reaches final month-grid cells beyond the bottom sheet`);

    await dayButton(calendar, future).scrollIntoViewIfNeeded();
    await dayButton(calendar, future).click();
    await expect(dayButton(calendar, future)).toHaveAttribute('aria-pressed', 'true');
    await expect(sheet.getByText(followUpNote, { exact: false })).toBeVisible();
    const followupLink = sheet.getByRole('link', { name: 'Seguimiento', exact: true });
    await expect(followupLink).toHaveAttribute('href', `#goalsheet/${today}`);
    await followupLink.click();
    await expect(page).toHaveURL(new RegExp(`#goalsheet/${today}$`));
    await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue(today);
    await expect(page.getByLabel('Acción', { exact: true })).toHaveValue('');
    await page.goto(`${pageURL}#agenda`);
    await dayButton(calendar, future).scrollIntoViewIfNeeded();
    await dayButton(calendar, future).click();
    record(`${name}: existing follow-up opens its original record without implicit writes`);
    const writesBefore = mutations.filter(item => item.path !== '/api/auth/login').length;
    const add = page.getByRole('button', { name: 'Agregar seguimiento', exact: true });
    const addBox = await add.boundingBox();
    const frameBefore = await main.boundingBox();
    assert(addBox.x > frameBefore.x + frameBefore.width / 2, 'FAB must sit on the right of the reference frame');
    assert(addBox.y > frameBefore.y + frameBefore.height / 2, 'FAB must sit in the lower half of the frame');
    await add.click();
    await expect(page).toHaveURL(new RegExp(`#goalsheet/${today}(?:\\?|$)`));
    await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue(today);
    await expect(page.getByLabel('Fecha de seguimiento', { exact: true })).toHaveValue(future);
    await expect(page.getByLabel('Acción', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('Acción', { exact: true })).toBeFocused();
    await expect(page.getByRole('menu')).toHaveCount(0);
    assert.equal(mutations.filter(item => item.path !== '/api/auth/login').length, writesBefore, 'Opening follow-up must not autosave any record');
    record(`${name}: sole FAB opens existing form directly, uses today as record date and selected future follow-up date, focuses Action without saving`);
    await page.goto(`${pageURL}#agenda`);
    await expect(dayButton(page.getByRole('region', { name: 'Calendario mensual', exact: true }), today)).toHaveAttribute('aria-pressed', 'true');
    await snapshot(page, `${name}-final`);
    assert.deepEqual(runtimeErrors, []);
    assert(mutations.every(item => item.path === '/api/auth/login'), 'Calendar UI must not mutate business data without explicit save');
    record(`${name}: no JavaScript errors, no horizontal overflow and no implicit data writes`);
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
    if (!focus) {
      await exercise(browser, 'mobile320', { width: 320, height: 740 });
      await exercise(browser, 'desktop1440', { width: 1440, height: 1000 });
    }
    report.passed = true;
    console.log('PASS: monthly reference shell, real data, 42 dates, filters, full grid access, direct future-date follow-up and no implicit writes at three viewports.');
  } catch (error) {
    report.error = error.message;
    process.exitCode = 1;
    console.error('FAIL:', error.message);
  } finally {
    if (browser) await browser.close();
    report.finishedAt = new Date().toISOString();
    await fs.writeFile(path.join(directory, 'results.json'), JSON.stringify(report, null, 2) + '\n');
  }
})();
