// Public smoke only: no fixtures, Goal Sheet writes, or private production login.
// Run after activating the V1 frontend release, with frontend/dist-v1 available locally.
const { chromium, request, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');

const baseURL = 'https://aisalesv1.softvibes.pro/';
const productionURL = 'https://aisales.softvibes.pro/';
const buildDirectory = path.resolve(__dirname, '../../../frontend/dist-v1');
const evidenceDirectory = path.join(__dirname, 'evidence', 'live');
const report = { target: baseURL, startedAt: new Date().toISOString(), resolution: 'system DNS', passed: false, checks: [], screenshots: [] };
const digest = value => createHash('sha256').update(value).digest('hex');
const record = (name, detail = {}) => report.checks.push({ name, passed: true, ...detail });

async function currentProductionSnapshot() {
  const client = await request.newContext({ baseURL: productionURL, ignoreHTTPSErrors: false });
  try {
    const html = await client.get('/');
    assert.equal(html.status(), 200);
    const ready = await client.get('/api/ready');
    assert.equal(ready.status(), 200);
    const data = (await ready.json()).data;
    assert.equal(data.status, 'ready');
    assert.equal(data.mode, 'private_pilot');
    return { htmlSha256: digest(await html.body()), mode: data.mode, version: data.version };
  } finally { await client.dispose(); }
}

async function verifyPublishedBuild() {
  const html = await fs.readFile(path.join(buildDirectory, 'v1.html'));
  const assets = [...html.toString().matchAll(/(?:src|href)="(\/assets\/[A-Za-z0-9_.-]+\.(?:js|css))"/g)].map(match => match[1]);
  assert(assets.some(asset => asset.endsWith('.js')), 'Built V1 entry must include JS');
  assert(assets.some(asset => asset.endsWith('.css')), 'Built V1 entry must include CSS');
  const client = await request.newContext({ baseURL, ignoreHTTPSErrors: false });
  try {
    const root = await client.get('/');
    assert.equal(root.status(), 200);
    assert.equal(digest(await root.body()), digest(html), 'Published root must be the exact V1 build entry');
    record('Public V1 HTML exactly matches local build', { htmlSha256: digest(html) });
    for (const asset of assets) {
      const local = await fs.readFile(path.join(buildDirectory, asset.slice(1)));
      const remote = await client.get(asset);
      assert.equal(remote.status(), 200, `Missing public asset: ${asset}`);
      assert.equal(digest(await remote.body()), digest(local), `Published asset differs: ${asset}`);
      record('Public asset exactly matches local V1 build', { asset, sha256: digest(local) });
    }
    const ready = await client.get('/api/ready');
    assert.equal(ready.status(), 200);
    const data = (await ready.json()).data;
    assert.equal(data.status, 'ready');
    assert(data.checks?.database && data.checks?.seed_users && data.checks?.seed_resources);
    record('V1 legacy API remains ready');
  } finally { await client.dispose(); }
}

function dateLabel(date) {
  return new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00Z`));
}
function escaped(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function dayButton(region, date) { return region.getByRole('button', { name: new RegExp(`^${escaped(dateLabel(date))} · \\d+ seguimientos?$`) }); }
function addDays(date, amount) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

async function smoke(browser, name, viewport) {
  const context = await browser.newContext({ baseURL, viewport, locale: 'es-MX', timezoneId: 'America/Cancun', reducedMotion: 'reduce', ignoreHTTPSErrors: false });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const runtimeErrors = [];
  const apiCalls = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('request', outgoing => {
    const url = new URL(outgoing.url());
    if (url.pathname.startsWith('/api/')) apiCalls.push({ origin: url.origin, path: url.pathname, method: outgoing.method() });
  });
  try {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    const tls = await response.securityDetails();
    assert(tls?.protocol.startsWith('TLS'), 'Normal public HTTPS must negotiate TLS');
    await page.getByRole('button', { name: 'Ya tengo una cuenta', exact: true }).click();
    await page.getByLabel('Correo electrónico', { exact: true }).fill('rep@vcsa.local');
    await page.getByLabel('Contraseña', { exact: true }).fill('demo123');
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Mi desempeño', exact: true })).toBeVisible();
    const guide = page.getByRole('dialog');
    await expect(guide).toBeVisible();
    await guide.getByRole('button', { name: 'Omitir guía', exact: true }).click();
    await page.getByRole('link', { name: 'Abrir agenda', exact: true }).click();
    await expect(page).toHaveURL(/#agenda$/);
    const region = page.getByRole('region', { name: 'Calendario de seguimientos', exact: true });
    await expect(region).toBeVisible();
    const today = await page.evaluate(() => {
      const date = new Date();
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    });
    await expect(dayButton(region, today)).toHaveAttribute('aria-pressed', 'true');
    await expect(region.getByRole('button', { name: /de \d{4} · \d+ seguimientos?$/ })).toHaveCount(7);
    await region.getByRole('button', { name: 'Semana siguiente', exact: true }).click();
    await expect(dayButton(region, addDays(today, 7))).toHaveAttribute('aria-pressed', 'true');
    await region.getByRole('button', { name: 'Semana anterior', exact: true }).click();
    await expect(dayButton(region, today)).toHaveAttribute('aria-pressed', 'true');
    const dateButtons = region.getByRole('button', { name: /de \d{4} · \d+ seguimientos?$/ });
    const firstIsSelected = await dateButtons.first().getAttribute('aria-pressed') === 'true';
    const alternative = dateButtons.nth(firstIsSelected ? 1 : 0);
    await alternative.click();
    await expect(alternative).toHaveAttribute('aria-pressed', 'true');
    await region.getByRole('button', { name: 'Hoy', exact: true }).click();
    await expect(dayButton(region, today)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('link', { name: 'Agregar seguimiento', exact: true })).toHaveAttribute('href', '#goalsheet');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const filename = `${name}-agenda.png`;
    await page.screenshot({ path: path.join(evidenceDirectory, filename), fullPage: true });
    report.screenshots.push({ name, file: filename, horizontalOverflow: false });
    await page.getByRole('link', { name: 'Perfil', exact: true }).filter({ visible: true }).click();
    await expect(page.getByRole('heading', { name: 'Perfil y progreso', exact: true })).toBeVisible();
    const logout = page.waitForResponse(result => new URL(result.url()).pathname === '/api/auth/logout' && result.request().method() === 'POST');
    await page.getByRole('main').getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    assert.equal((await logout).status(), 200);
    await expect(page.getByRole('button', { name: 'Ya tengo una cuenta', exact: true })).toBeVisible();
    assert.equal(await page.evaluate(() => localStorage.getItem('sa.pilot.session')), null);
    assert.deepEqual(runtimeErrors, []);
    assert(apiCalls.every(call => call.origin === new URL(baseURL).origin), 'All V1 app API calls must remain on its origin');
    assert(apiCalls.every(call => ['GET', 'HEAD'].includes(call.method) || (call.method === 'POST' && ['/api/auth/login', '/api/auth/logout'].includes(call.path))), 'Smoke must not mutate business data');
    record(`${name}: trusted HTTPS, public demo login, calendar selection/weeks/Today and logout`, { viewport, today, apiRequests: apiCalls.length, mutationPaths: apiCalls.filter(call => call.method === 'POST').map(call => call.path), runtimeErrors: [] });
  } catch (error) {
    await page.screenshot({ path: path.join(evidenceDirectory, `${name}-failure.png`), fullPage: true }).catch(() => {});
    report.browserFailure = { name, error: error.message, runtimeErrors };
    throw error;
  } finally { await context.close(); }
}

(async () => {
  await fs.mkdir(evidenceDirectory, { recursive: true });
  let browser;
  try {
    const before = await currentProductionSnapshot();
    record('Private V5 baseline via GET only', before);
    await verifyPublishedBuild();
    browser = await chromium.launch({ headless: true });
    await smoke(browser, 'mobile390', { width: 390, height: 844 });
    await smoke(browser, 'desktop1440', { width: 1440, height: 1000 });
    const after = await currentProductionSnapshot();
    assert.deepEqual(after, before, 'Private V5 HTML and ready API mode/version must remain unchanged');
    record('Private V5 unchanged after public smoke', after);
    report.passed = true;
    console.log('PASS: V1 HTML/JS/CSS match build, normal DNS and HTTPS, calendar mobile/desktop, no business-data writes; V5 unchanged.');
  } catch (error) {
    report.failure = error.message;
    process.exitCode = 1;
    console.error('FAIL:', error.message);
  } finally {
    if (browser) await browser.close();
    report.finishedAt = new Date().toISOString();
    await fs.writeFile(path.join(evidenceDirectory, 'results.json'), JSON.stringify(report, null, 2) + '\n');
  }
})();
