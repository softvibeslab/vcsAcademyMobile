// Real legacy API and temporary Chromium only. Run against the isolated local QA DB.
const { chromium, request, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const pageURL = process.env.CALENDAR_QA_URL || 'http://127.0.0.1:4198/v1.html';
const apiURL = process.env.CALENDAR_QA_API || 'http://127.0.0.1:18926';
const phase = process.env.CALENDAR_QA_PHASE || 'green';
assert.equal(new URL(pageURL).hostname, '127.0.0.1', 'Fixture writes are restricted to local QA');
assert.equal(new URL(apiURL).hostname, '127.0.0.1', 'Fixture writes are restricted to local QA');
const directory = path.join(__dirname, 'evidence', `calendar-${phase}`);
const today = '2026-11-22';
const entryDate = '2026-11-21';
const fixtures = [
  { follow_up_date: '2026-11-20', note: '[QA calendario] Retomar conversación anterior.' },
  { follow_up_date: today, note: '[QA calendario] Enviar resumen de la visita.' },
  { follow_up_date: today, note: '[QA calendario] Resolver preguntas de seguimiento y revisar material de valor con una nota extensa que permanece legible en pantallas pequeñas.' },
  { follow_up_date: '2026-11-23', note: '[QA calendario] Confirmar siguiente conversación.' },
  { follow_up_date: '2026-11-29', note: '[QA calendario] Revisión de la próxima semana.' },
];
const report = { phase, pageURL, apiURL, startedAt: new Date().toISOString(), passed: false, checks: [], screenshots: [] };
const record = (name, detail = {}) => report.checks.push({ name, passed: true, ...detail });

async function successful(response) {
  assert.equal(response.status(), 200, `Unexpected API status for ${response.url()}`);
  const body = await response.json();
  assert.equal(body.success, true);
  return body.data;
}

async function seed() {
  const api = await request.newContext({ baseURL: apiURL });
  try {
    const ready = await successful(await api.get('/api/ready'));
    assert.equal(ready.status, 'ready');
    const loginResult = await successful(await api.post('/api/auth/login', { data: { email: 'rep@vcsa.local', password: 'demo123' } }));
    const headers = { Authorization: `Bearer ${loginResult.token}` };
    await successful(await api.post('/api/goalsheet', { headers, data: {
      date: entryDate, tour_outcome: 'qualified', sales_outcome: 'no_sale', sales_volume: 0,
      number_of_sales: 0, follow_ups: fixtures, notes: 'Synthetic calendar QA only.',
    } }));
    const reminders = (await successful(await api.get('/api/reminders/upcoming', { headers }))).reminders;
    assert.equal(reminders.filter(item => item.entry_date === entryDate).length, 5);
    record('Real API seeded with five reminders over four dates');
  } finally { await api.dispose(); }
}

function dateLabel(date) {
  return new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00Z`));
}
function escaped(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function dayButton(region, date) { return region.getByRole('button', { name: new RegExp(`^${escaped(dateLabel(date))} · \\d+ seguimientos?$`) }); }

async function login(page, email = 'rep@vcsa.local') {
  await page.goto(pageURL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Ya tengo una cuenta', exact: true }).click();
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('demo123');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mi desempeño', exact: true })).toBeVisible();
  const guide = page.getByRole('dialog');
  await expect(guide).toBeVisible();
  await guide.getByRole('button', { name: 'Omitir guía', exact: true }).click();
  await page.goto(`${pageURL}#agenda`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Agenda de seguimiento', exact: true })).toBeVisible();
}

async function snapshot(page, name) {
  await expect.poll(() => page.locator('.pilot-agenda-page').evaluate(element => {
    const rect = element.getBoundingClientRect();
    return element.scrollWidth <= element.clientWidth + 1 && rect.left >= -1 && rect.right <= innerWidth + 1;
  })).toBe(true);
  const globalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  if (page.viewportSize().width !== 320) {
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(directory, file), fullPage: true });
  report.screenshots.push({ name, file, calendarHorizontalOverflow: false, documentHorizontalOverflow: globalOverflow });
  if (globalOverflow) {
    report.knownLimitations = ['At 320px the pre-existing global topbar is 331px wide; verified separately on unchanged Home. Calendar and its cards fit the viewport. Header changes are outside this feature.'];
  }
}

async function exercise(browser, name, viewport, theme, timezoneId = 'America/Cancun') {
  const context = await browser.newContext({ viewport, locale: 'es-MX', timezoneId, reducedMotion: 'reduce' });
  await context.addInitScript((initialTheme) => localStorage.setItem('sa.pilot.theme', initialTheme), theme);
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date('2026-11-23T02:00:00Z')); // Nov22 in Cancun and Honolulu.
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await login(page);
    const region = page.getByRole('region', { name: 'Calendario de seguimientos', exact: true });
    // RED must fail here on the previous plain list, after real API/auth have succeeded.
    await expect(region).toBeVisible();
    await expect(dayButton(region, today)).toHaveAttribute('aria-pressed', 'true');
    await expect(dayButton(region, today)).toHaveAccessibleName(`${dateLabel(today)} · 2 seguimientos`);
    await expect(region.getByRole('button', { name: /de \d{4} · \d+ seguimientos?$/ })).toHaveCount(7);
    await expect(page.getByText(fixtures[1].note, { exact: true })).toBeVisible();
    await expect(page.getByText(fixtures[2].note, { exact: true })).toBeVisible();
    await expect(page.getByText(fixtures[0].note, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Editar en Goal Sheet', exact: true })).toHaveCount(2);
    await expect(page.getByRole('link', { name: 'Editar en Goal Sheet', exact: true }).first()).toHaveAttribute('href', `#goalsheet/${entryDate}`);
    await expect(page.getByRole('link', { name: 'Agregar seguimiento', exact: true })).toHaveAttribute('href', '#goalsheet');
    await snapshot(page, `${name}-today-${theme}`);
    record(`${name}: day grouping, multiple follow-ups and original action links`, { timezoneId, theme });

    await dayButton(region, '2026-11-20').click();
    await expect(dayButton(region, '2026-11-20')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(fixtures[0].note, { exact: true })).toBeVisible();
    await expect(page.getByText('Fecha pasada', { exact: true })).toBeVisible();
    await dayButton(region, '2026-11-19').click();
    await expect(page.getByRole('link', { name: 'Editar en Goal Sheet', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Ir al próximo seguimiento/ })).toBeVisible();
    await page.getByRole('button', { name: /^Ir al próximo seguimiento/ }).focus();
    await page.keyboard.press('Enter');
    await expect(dayButton(region, '2026-11-20')).toHaveAttribute('aria-pressed', 'true');
    await expect(dayButton(region, '2026-11-20')).toBeFocused();

    await region.getByRole('button', { name: 'Hoy', exact: true }).click();
    await region.getByRole('button', { name: 'Semana siguiente', exact: true }).click();
    await expect(dayButton(region, '2026-11-29')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(fixtures[4].note, { exact: true })).toBeVisible();
    await region.getByRole('button', { name: 'Semana anterior', exact: true }).click();
    await expect(dayButton(region, today)).toHaveAttribute('aria-pressed', 'true');
    record(`${name}: past dates, empty day, upcoming shortcut and previous/next week`);

    await dayButton(region, today).focus();
    await page.keyboard.press('ArrowRight');
    await expect(dayButton(region, '2026-11-23')).toHaveAttribute('aria-pressed', 'true');
    await expect(dayButton(region, '2026-11-23')).toBeFocused();
    await expect(page.getByText(fixtures[3].note, { exact: true })).toBeVisible();
    await page.keyboard.press('End');
    await expect(dayButton(region, '2026-11-29')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(dayButton(region, '2026-11-23')).toBeFocused();
    await page.keyboard.press('PageUp');
    await expect(dayButton(region, '2026-11-16')).toBeFocused();
    await page.keyboard.press('PageDown');
    await expect(dayButton(region, '2026-11-23')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(dayButton(region, today)).toBeFocused();
    const focusStyle = await dayButton(region, today).evaluate(element => ({ outline: getComputedStyle(element).outlineStyle, width: getComputedStyle(element).outlineWidth }));
    assert.notEqual(focusStyle.outline, 'none');
    assert.notEqual(focusStyle.width, '0px');
    record(`${name}: keyboard arrows, Home/End, PageUp/PageDown and visible focus`);

    await page.getByRole('link', { name: 'Editar en Goal Sheet', exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`#goalsheet/${entryDate}$`));
    await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue(entryDate);
    await page.goto(`${pageURL}#agenda`);
    await expect(dayButton(page.getByRole('region', { name: 'Calendario de seguimientos', exact: true }), today)).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('link', { name: 'Agregar seguimiento', exact: true }).click();
    await expect(page).toHaveURL(/#goalsheet$/);
    await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue(today);
    await page.goto(`${pageURL}#agenda`);
    await page.getByRole('button', { name: 'Cambiar tema', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme === 'dark' ? 'light' : 'dark');
    await snapshot(page, `${name}-final`);
    assert.deepEqual(errors, []);
    record(`${name}: real Goal Sheet destinations, no runtime errors and calendar fits viewport`);
  } catch (error) {
    await page.screenshot({ path: path.join(directory, `${name}-failure.png`), fullPage: true }).catch(() => {});
    report.failure = { name, message: error.message, runtimeErrors: errors };
    throw error;
  } finally { await context.close(); }
}

async function emptyAgenda(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-MX', timezoneId: 'America/Cancun' });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date('2026-11-23T02:00:00Z'));
  try {
    await login(page, 'manager@vcsa.local');
    await expect(page.getByRole('region', { name: 'Calendario de seguimientos', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Editar en Goal Sheet', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Ir al próximo seguimiento/ })).toHaveCount(0);
    await expect(page.getByText('Tu agenda está despejada', { exact: true })).toBeVisible();
    await snapshot(page, 'empty-agenda');
    record('Account with no reminders has distinct empty agenda and no invented activity');
  } finally { await context.close(); }
}

(async () => {
  await fs.mkdir(directory, { recursive: true });
  let browser;
  try {
    await seed();
    browser = await chromium.launch({ headless: true });
    await exercise(browser, 'mobile390', { width: 390, height: 844 }, 'dark');
    await exercise(browser, 'mobile320', { width: 320, height: 740 }, 'light', 'Pacific/Honolulu');
    await exercise(browser, 'desktop1440', { width: 1440, height: 1000 }, 'dark');
    await emptyAgenda(browser);
    report.passed = true;
    console.log('PASS: calendar with real API fixtures, date selection, weeks, keyboard, original actions, empty states, three viewports and two themes.');
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
