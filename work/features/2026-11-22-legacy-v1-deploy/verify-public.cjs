// Run only after confirming/deploying legacy release 20261116a on its isolated DB.
// node work/features/2026-11-22-legacy-v1-deploy/verify-public.cjs
// Existing Playwright dependencies only. No persistent browser profile or real accounts.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const dns = require('node:dns');
const { isIP } = require('node:net');

const baseURL = process.env.LEGACY_QA_URL || 'https://aisalesv1.softvibes.pro/';
const productionURL = 'https://aisales.softvibes.pro/';
const expectedBundle = 'assets/pilot-BbSXMpJ7.js';
const evidenceDirectory = path.join(__dirname, 'evidence', 'public-qa');
const target = new URL(baseURL);
assert.equal(target.origin, 'https://aisalesv1.softvibes.pro', 'QA must target the isolated legacy hostname');
assert.equal(target.pathname, '/', 'QA must start at the app root');
const explicitAddress = process.env.QA_TARGET_IP || '';
if (explicitAddress) {
  assert.equal(isIP(explicitAddress), 4, 'QA_TARGET_IP must be an IPv4 address verified through public DNS');
  const originalLookup = dns.lookup;
  dns.lookup = (hostname, options, callback) => {
    if (hostname !== target.hostname) return originalLookup(hostname, options, callback);
    if (typeof options === 'function') [callback, options] = [options, {}];
    queueMicrotask(() => options?.all
      ? callback(null, [{ address: explicitAddress, family: 4 }])
      : callback(null, explicitAddress, 4));
  };
  const originalPromiseLookup = dns.promises.lookup;
  dns.promises.lookup = async (hostname, options = {}) => {
    if (hostname !== target.hostname) return originalPromiseLookup(hostname, options);
    const address = { address: explicitAddress, family: 4 };
    return options.all ? (options.family === 6 ? [] : [address]) : address;
  };
}
// Load Playwright after the optional process-local resolver so its HTTP agent uses it.
const { chromium, request, expect } = require('@playwright/test');

const report = {
  target: target.origin,
  release: '20261116a',
  startedAt: new Date().toISOString(),
  passed: false,
  resolution: explicitAddress
    ? { mode: 'process-local DNS override', hostname: target.hostname, address: explicitAddress, reason: 'macOS negative DNS cache; public DNS verified separately; TLS and SNI unchanged' }
    : { mode: 'system DNS' },
  checks: [],
  screens: [],
};

function check(name, details = {}) {
  report.checks.push({ name, passed: true, ...details });
}

async function productionSnapshot() {
  // This separate HTTP client never logs in or sends mutations to current production.
  const client = await request.newContext({ baseURL: productionURL, ignoreHTTPSErrors: false });
  try {
    const home = await client.get('/', { failOnStatusCode: true });
    assert.equal(home.status(), 200);
    const html = await home.text();
    const ready = await client.get('/api/ready', { failOnStatusCode: true });
    assert.equal(ready.status(), 200);
    const body = await ready.json();
    assert.equal(body.data?.status, 'ready');
    assert.equal(body.data?.mode, 'private_pilot');
    return {
      origin: new URL(home.url()).origin,
      htmlSha256: createHash('sha256').update(html).digest('hex'),
      mode: body.data.mode,
      version: body.data.version,
    };
  } finally {
    await client.dispose();
  }
}

async function snapshot(page, viewportName, screenName) {
  await expect.poll(
    () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    { message: `${viewportName}/${screenName}: horizontal overflow`, timeout: 10000 },
  ).toBe(true);
  const filename = `${viewportName}-${screenName}.png`;
  await page.screenshot({ path: path.join(evidenceDirectory, filename), fullPage: true });
  report.screens.push({ viewport: viewportName, screen: screenName, file: filename, horizontalOverflow: false });
}

async function verifyViewport(browser, viewportName, viewport) {
  const context = await browser.newContext({
    baseURL,
    viewport,
    ignoreHTTPSErrors: false,
    locale: 'es-MX',
    timezoneId: 'America/Cancun',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const runtimeErrors = [];
  const apiRequests = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('request', (outgoing) => {
    const url = new URL(outgoing.url());
    if (url.pathname.startsWith('/api/')) {
      // Only URL/method are recorded; never cookies, tokens, credentials or bodies.
      apiRequests.push({ origin: url.origin, path: url.pathname, method: outgoing.method() });
    }
  });
  try {
    const entry = await page.goto('/', { waitUntil: 'domcontentloaded' });
    assert.equal(entry.status(), 200);
    assert.equal(new URL(entry.url()).origin, target.origin);
    assert((await entry.text()).includes(expectedBundle), 'Expected the Nov16 legacy bundle');
    const tls = await entry.securityDetails();
    assert(tls?.protocol.startsWith('TLS'), 'Trusted HTTPS must negotiate TLS');
    await expect(page.getByRole('heading', { name: 'Practica tus ventas. Gana confianza.' })).toBeVisible();
    await snapshot(page, viewportName, 'welcome');

    await page.getByRole('button', { name: 'Ya tengo una cuenta', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo.', exact: true })).toBeVisible();
    await snapshot(page, viewportName, 'login');
    // Public synthetic account already included by this release's seed data.
    await page.getByLabel('Correo electrónico', { exact: true }).fill('rep@vcsa.local');
    await page.getByLabel('Contraseña', { exact: true }).fill('demo123');
    const loginResponsePromise = page.waitForResponse((response) =>
      response.url() === new URL('/api/auth/login', baseURL).href && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    const loginResponse = await loginResponsePromise;
    assert.equal(loginResponse.status(), 200);
    const loginResult = await loginResponse.json();
    assert.equal(loginResult.data?.user?.id, 'user_demo_rep');
    assert(loginResult.data.user.roles.includes('sales_rep'));
    const sessionCookie = (await context.cookies(baseURL)).find((cookie) => cookie.name === 'vcsa_session');
    assert(sessionCookie?.secure && sessionCookie.httpOnly && sessionCookie.sameSite === 'Lax');

    const guide = page.getByRole('dialog');
    await expect(guide).toBeVisible();
    await expect(guide.getByRole('heading', { name: /Así te ayuda Sales Academy/ })).toBeVisible();
    await snapshot(page, viewportName, 'guide-use-cases');
    await guide.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await expect(guide.getByRole('heading', { name: 'Lo que vas a ver en Home', exact: true })).toBeVisible();
    await guide.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await expect(guide.getByRole('heading', { name: 'Define tus metas', exact: true })).toBeVisible();
    await guide.getByRole('button', { name: 'Omitir metas', exact: true }).click();
    await expect(guide.getByRole('heading', { name: 'Tus primeros pasos', exact: true })).toBeVisible();
    await guide.getByRole('button', { name: 'Empezar', exact: true }).click();
    await expect(guide).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Mi desempeño', exact: true })).toBeVisible();
    for (const label of ['Tours / Qs', 'Ventas', 'Cierre', 'VPG']) {
      await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
    }
    await snapshot(page, viewportName, 'home');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Mi desempeño', exact: true })).toBeVisible();
    await expect(guide).toHaveCount(0);
    check(`${viewportName}: login, four-screen guide, Home and guide persistence`);

    await page.getByRole('link', { name: 'Roadmap', exact: true }).filter({ visible: true }).click();
    await expect(page.getByRole('heading', { name: 'Top Producer Roadmap', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'TU BLUEPRINT DE 11 MÓDULOS', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^\d+\. / })).toHaveCount(11);
    await snapshot(page, viewportName, 'roadmap');
    check(`${viewportName}: all 11 roadmap steps`);

    await page.getByRole('link', { name: 'AI Coach', exact: true }).filter({ visible: true }).click();
    await expect(page.getByRole('heading', { name: 'Entrena para tu próxima conversación.', exact: true })).toBeVisible();
    await page.getByLabel('Tu mensaje', { exact: true }).fill('Help me practice Step 5 commitment.');
    const coachResponsePromise = page.waitForResponse((response) =>
      response.url() === new URL('/api/smart-agent/chat', baseURL).href && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Enviar mensaje', exact: true }).click();
    const coachResponse = await coachResponsePromise;
    assert.equal(coachResponse.status(), 200);
    const coachResult = await coachResponse.json();
    assert.match(coachResult.data?.response || '', /^Step 5 is a commitment-setting moment/);
    assert(coachResult.data.citations.length > 0);
    await expect(page.getByText(coachResult.data.response, { exact: true })).toBeVisible();
    await snapshot(page, viewportName, 'coach');
    check(`${viewportName}: real local Coach response rendered`);

    // The top-bar avatar is intentionally hidden on mobile; the main Perfil nav is available at both sizes.
    await page.getByRole('link', { name: 'Perfil', exact: true }).filter({ visible: true }).click();
    await expect(page.getByRole('heading', { name: 'Perfil y progreso', exact: true })).toBeVisible();
    await expect(page.getByText('rep@vcsa.local', { exact: true })).toBeVisible();
    await snapshot(page, viewportName, 'profile');
    await page.getByRole('button', { name: 'Ver la guía', exact: true }).click();
    await expect(guide).toBeVisible();
    await guide.getByRole('button', { name: 'Omitir guía', exact: true }).click();
    await expect(guide).toHaveCount(0);
    const logoutResponsePromise = page.waitForResponse((response) =>
      response.url() === new URL('/api/auth/logout', baseURL).href && response.request().method() === 'POST');
    await page.getByRole('main').getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    assert.equal((await logoutResponsePromise).status(), 200);
    await expect(page.getByRole('button', { name: 'Ya tengo una cuenta', exact: true })).toBeVisible();
    assert(!(await context.cookies(baseURL)).some((cookie) => cookie.name === 'vcsa_session'));
    assert.equal(await page.evaluate(() => localStorage.getItem('sa.pilot.session')), null);
    await snapshot(page, viewportName, 'logout');
    assert.deepEqual(runtimeErrors, [], 'Unexpected JavaScript runtime errors');
    assert(apiRequests.length > 0);
    assert(apiRequests.every((call) => call.origin === target.origin), 'App API calls must stay on isolated hostname');
    check(`${viewportName}: profile, guide reopening, logout, no runtime errors and isolated API`, {
      viewport,
      apiRequests: apiRequests.length,
    });
  } catch (error) {
    await page.screenshot({ path: path.join(evidenceDirectory, `${viewportName}-failure.png`), fullPage: true }).catch(() => {});
    report.checks.push({ name: `${viewportName}: browser flow`, passed: false, error: error.message, runtimeErrors });
    throw error;
  } finally {
    await context.close();
  }
}

(async () => {
  await fs.mkdir(evidenceDirectory, { recursive: true });
  let browser;
  try {
    const before = await productionSnapshot();
    check('Current production remains a ready private pilot before QA', before);
    const legacyClient = await request.newContext({ baseURL, ignoreHTTPSErrors: false });
    try {
      const readyResponse = await legacyClient.get('/api/ready');
      assert.equal(readyResponse.status(), 200);
      const ready = await readyResponse.json();
      assert.equal(ready.data?.status, 'ready');
      assert(ready.data.checks?.database && ready.data.checks?.seed_users && ready.data.checks?.seed_resources);
      const catalog = await legacyClient.get('/api/public/catalog');
      assert.equal(catalog.status(), 200);
      assert.equal((await catalog.json()).data?.tier, 'visitante');
      check('Legacy readiness and visitor catalog');
    } finally {
      await legacyClient.dispose();
    }
    browser = await chromium.launch({
      headless: true,
      args: explicitAddress ? [`--host-resolver-rules=MAP ${target.hostname} ${explicitAddress}`] : [],
    });
    await verifyViewport(browser, 'mobile', { width: 390, height: 844 });
    await verifyViewport(browser, 'desktop', { width: 1440, height: 900 });
    const after = await productionSnapshot();
    assert.deepEqual(after, before, 'Current production HTML and private API version must remain unchanged');
    check('Current production unchanged after QA', after);
    report.passed = true;
    console.log('PASS: isolated legacy HTTPS, login, guide, Home, 11-step Roadmap, local Coach, profile/logout, mobile/desktop; current production unchanged.');
  } catch (error) {
    report.failure = error.message;
    console.error('FAIL:', error.message);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    report.finishedAt = new Date().toISOString();
    await fs.writeFile(path.join(evidenceDirectory, 'results.json'), JSON.stringify(report, null, 2) + '\n');
  }
})();
