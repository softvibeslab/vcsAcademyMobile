// User-requested persistent synthetic example. Tokens remain in the isolated browser.
const { chromium, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { login, apiCall, navigate } = require('../2026-11-22-v1-tour-learning/verify-tours.cjs');
const directory = path.join(__dirname, 'evidence');
const payloadFile = path.join(directory, 'demo-request.json');
const resultFile = path.join(directory, 'demo-result.json');

async function main() {
  assert.equal(process.env.TOUR_QA_URL, 'https://aisalesv1.softvibes.pro/');
  await fs.mkdir(directory, { recursive: true });
  let payload;
  try { payload = JSON.parse(await fs.readFile(payloadFile, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    payload = {
      request_id: crypto.randomUUID(), intent: 'reflect',
      title: 'DEMO · Bienvenida y descubrimiento',
      scheduled_at: new Date(Date.now() - 20 * 60000).toISOString(),
      context: 'SIMULACIÓN: pareja completamente ficticia que busca vacaciones tranquilas en familia. Este ejemplo no corresponde a clientes ni a una venta real. Objetivo de práctica: dar una bienvenida breve, aclarar la duración y acordar la agenda antes de presentar.',
      feedback: {
        happened: 'En la simulación saludé a la pareja y pregunté qué vacaciones disfrutan. Empecé la presentación antes de explicar la duración del recorrido. La pareja preguntó cuánto tardaría la visita.',
        worked: 'Escuché su pregunta, respondí con calma y confirmé su interés en vacaciones tranquilas en familia.',
        improve_next: 'Practicar una bienvenida breve: presentarme, confirmar cuánto tiempo tienen y acordar la agenda antes de presentar.',
      },
    };
    await fs.writeFile(payloadFile, JSON.stringify(payload, null, 2) + '\n');
  }
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-MX', timezoneId: 'America/Cancun' });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  const result = { passed: false, synthetic: true, account: 'rep@vcsa.local' };
  try {
    await login(page, 'dark');
    const before = await apiCall(page, '/api/goalsheet/metrics');
    assert.equal(before.status, 200);
    const saved = await apiCall(page, '/api/tour-visits', 'POST', payload);
    assert([200, 201].includes(saved.status), 'Create/replay the one requested demonstration visit');
    const visit = saved.body.data.visit;
    Object.assign(result, { visitId: visit.id, title: visit.title, eventDate: visit.event_date, url: 'https://aisalesv1.softvibes.pro/#agenda/' + visit.id, status: visit.status });
    await fs.writeFile(resultFile, JSON.stringify(result, null, 2) + '\n');
    if (visit.analysis?.status !== 'ready') {
      const analyzed = await apiCall(page, '/api/tour-visits/' + visit.id + '/analysis', 'POST', { request_id: crypto.randomUUID(), expected_revision: visit.revision });
      result.analysisHttpStatus = analyzed.status;
      assert.equal(analyzed.status, 200, 'Hermes must return the real analysis');
    }
    const recovered = await apiCall(page, '/api/tour-visits/' + visit.id);
    assert.equal(recovered.status, 200);
    const analysis = recovered.body.data.visit.analysis;
    assert.equal(analysis.status, 'ready');
    assert.equal(analysis.provider, 'hermes');
    assert(analysis.summary.trim());
    result.analysis = { status: analysis.status, provider: analysis.provider, summary: analysis.summary, recommendedSteps: analysis.recommended_steps };
    const after = await apiCall(page, '/api/goalsheet/metrics');
    assert.equal(after.status, 200);
    assert.deepEqual(after.body.data, before.body.data);
    result.goalSheetUnchanged = true;
    await navigate(page, 'agenda/' + visit.id);
    const detail = page.getByRole('article', { name: 'Detalle de visita', exact: true });
    await expect(detail).toContainText(payload.title);
    await expect(detail).toContainText('SIMULACIÓN');
    await expect(detail.getByText('Generado por IA', { exact: false })).toBeVisible();
    await page.screenshot({ path: path.join(directory, 'demo-detail.png'), fullPage: true });
    const course = detail.getByRole('link', { name: /Abrir lección/ }).first();
    if (analysis.recommended_steps.length) {
      await course.scrollIntoViewIfNeeded();
      await expect(course).toBeInViewport();
    } else {
      await detail.getByText('Generado por IA', { exact: false }).scrollIntoViewIfNeeded();
    }
    await page.screenshot({ path: path.join(directory, 'demo-learning.png'), fullPage: true });
    result.passed = true;
    console.log(JSON.stringify({ passed: true, url: result.url, title: result.title, recommendations: analysis.recommended_steps.length }));
  } finally {
    await fs.writeFile(resultFile, JSON.stringify(result, null, 2) + '\n');
    await apiCall(page, '/api/auth/logout', 'POST', {}).catch(() => {});
    await context.close();
    await browser.close();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
