import test from 'node:test';
import assert from 'node:assert/strict';
import { analysisContributionContext, analysisTaskForVisit, contributionCapacity, createAnalysisTask, runAnalysisTask } from './tour-analysis.mjs';

const visit = () => ({ id: 'visit-a', revision: 1, status: 'completed', context: 'Contexto ficticio', feedback: { happened: 'Escuché sus prioridades', worked: '', improve_next: '' }, analysis: null });
const ids = () => { let value = 0; return () => `request-${++value}`; };
const unavailable = () => Object.assign(Error('Proveedor no disponible'), { status: 503 });

test('optional contribution preserves context and uses its existing storage contract', () => {
  assert.equal(analysisContributionContext(visit(), '   '), 'Contexto ficticio');
  assert.equal(analysisContributionContext(visit(), '  Una pregunta abierta  '), 'Contexto ficticio\n\nAporte para el análisis:\nUna pregunta abierta');
  assert.equal(analysisContributionContext({ ...visit(), context: '' }, 'Escuchar'), 'Aporte para el análisis:\nEscuchar');
});

test('contribution enforces context, combined characters, UTF-8 bytes and valid Unicode before writing', () => {
  assert.throws(() => analysisContributionContext({ ...visit(), context: 'a'.repeat(5999) }, 'b'), /6000/);
  assert.throws(() => analysisContributionContext({ ...visit(), context: 'a'.repeat(5000), feedback: { happened: 'b'.repeat(4000), worked: 'c'.repeat(1000) } }, 'd'), /10.?000/);
  assert.throws(() => analysisContributionContext({ ...visit(), context: '界'.repeat(5000), feedback: { happened: '界'.repeat(3000) } }, 'd'), /bytes/);
  assert.throws(() => analysisContributionContext(visit(), '\ud800'), /Unicode/);
  // Python's API counts Unicode code points, not UTF-16 code units.
  assert.equal([...analysisContributionContext({ ...visit(), context: '😀'.repeat(3000) }, '😀')].length, 3028);
  assert.equal(contributionCapacity({ ...visit(), context: 'a'.repeat(6000) }), 0);
});

test('blank contribution analyzes explicitly without a PATCH, and finished tasks replay locally', async () => {
  const calls = [];
  const task = createAnalysisTask(visit(), '', ids());
  const api = async (url, options) => { calls.push({ url, ...options, body: JSON.parse(options.body) }); return { analysis: { status: 'ready' } }; };
  await runAnalysisTask(api, task);
  await runAnalysisTask(api, task);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].url, '/api/tour-visits/visit-a/analysis');
  assert.equal(calls[0].body.expected_revision, 1);
});

test('contribution is saved before inference, which receives the returned revision and a separate UUID', async () => {
  const calls = [], phases = [], saved = [];
  const original = visit();
  const task = createAnalysisTask(original, 'Quiero practicar preguntas abiertas', ids());
  const api = async (url, options) => {
    const body = JSON.parse(options.body); calls.push({ url, method: options.method, body });
    if (options.method === 'PATCH') return { visit: { ...original, context: body.context, revision: 2 } };
    return { analysis: { status: 'ready' } };
  };
  await runAnalysisTask(api, task, { onSaved: value => saved.push(value), onPhase: value => phases.push(value) });
  assert.deepEqual(calls.map(c => c.method), ['PATCH', 'POST']);
  assert.equal(calls[0].body.action, 'edit');
  assert.equal(calls[0].body.expected_revision, 1);
  assert.match(calls[0].body.context, /Aporte para el análisis:\nQuiero practicar/);
  assert.equal(calls[1].body.expected_revision, 2);
  assert.notEqual(calls[0].body.request_id, calls[1].body.request_id);
  assert.equal(saved.length, 1);
  assert.deepEqual(phases, ['saving', 'analyzing']);
  assert.equal(original.context, 'Contexto ficticio');
});

test('a provider retry keeps the saved contribution and repeats only analysis with the same UUID', async () => {
  const task = createAnalysisTask(visit(), 'Confirmar prioridades', ids()), calls = [];
  let analyses = 0;
  const api = async (url, options) => {
    const body = JSON.parse(options.body); calls.push({ method: options.method, body });
    if (options.method === 'PATCH') return { visit: { ...visit(), revision: 2, context: body.context } };
    if (++analyses === 1) throw unavailable();
    return { analysis: { status: 'ready' } };
  };
  await assert.rejects(runAnalysisTask(api, task), /Proveedor/);
  assert.equal(task.savedVisit.revision, 2);
  await runAnalysisTask(api, task);
  assert.deepEqual(calls.map(c => c.method), ['PATCH', 'POST', 'POST']);
  assert.deepEqual(calls[1].body, calls[2].body);
});

test('a lost PATCH response replays exactly the same payload without appending again', async () => {
  const task = createAnalysisTask(visit(), 'Una pregunta abierta', ids()), calls = [];
  let saves = 0;
  const api = async (url, options) => {
    const body = JSON.parse(options.body); calls.push({ method: options.method, body });
    if (options.method === 'PATCH') {
      if (++saves === 1) throw Error('Respuesta perdida');
      return { visit: { ...visit(), revision: 2, context: body.context } };
    }
    return { analysis: { status: 'ready' } };
  };
  await assert.rejects(runAnalysisTask(api, task), /Respuesta perdida/);
  await runAnalysisTask(api, task);
  assert.deepEqual(calls.map(c => c.method), ['PATCH', 'PATCH', 'POST']);
  assert.deepEqual(calls[0].body, calls[1].body);
  assert.equal(calls[1].body.context.match(/Una pregunta abierta/g).length, 1);
});

test('a refresh after a lost PATCH response preserves the pending request instead of appending again', async () => {
  const previous = createAnalysisTask(visit(), 'Una pregunta abierta', ids());
  let refreshed;
  await assert.rejects(runAnalysisTask(async (url, options) => {
    const body = JSON.parse(options.body);
    refreshed = { ...visit(), context: body.context, revision: 2 };
    throw Error('Respuesta perdida después de guardar');
  }, previous), /Respuesta perdida/);
  assert.equal(analysisTaskForVisit(previous, refreshed, 'Una pregunta abierta', ids()), previous);
  assert.throws(() => analysisTaskForVisit(previous, refreshed, 'Un aporte editado', ids()), /confirmar/);
});

test('a concurrent save conflict never invokes analysis', async () => {
  const task = createAnalysisTask(visit(), 'Dato nuevo', ids()), calls = [];
  const api = async (url, options) => { calls.push(options.method); throw Object.assign(Error('La visita cambió'), { status: 409 }); };
  await assert.rejects(runAnalysisTask(api, task), error => error.status === 409);
  assert.deepEqual(calls, ['PATCH']);
});

test('a replay that now returns another edit stops before inference', async () => {
  const task = createAnalysisTask(visit(), 'Dato nuevo', ids()), calls = [], saved = [];
  const api = async (url, options) => { calls.push(options.method); return { visit: { ...visit(), revision: 3, context: 'Otra edición concurrente' } }; };
  await assert.rejects(runAnalysisTask(api, task, { onSaved: value => saved.push(value) }), error => error.status === 409);
  assert.deepEqual(calls, ['PATCH']);
  assert.equal(saved.length, 1, 'A successful replay acknowledges the contribution so its input is cleared');
  assert.equal(task.savedVisit.revision, 3);
  await assert.rejects(runAnalysisTask(api, task), error => error.status === 409);
  assert.deepEqual(calls, ['PATCH'], 'A conflicted replay requires a refresh before any inference');
});

test('double clicks share one in-flight operation', async () => {
  const task = createAnalysisTask(visit(), '', ids());
  let release, count = 0;
  const api = () => { count++; return new Promise(resolve => { release = resolve; }); };
  const one = runAnalysisTask(api, task), two = runAnalysisTask(api, task);
  assert.equal(count, 1);
  release({ analysis: { status: 'ready' } });
  await Promise.all([one, two]);
});

test('an existing ready result is preserved unless the user adds a contribution', () => {
  const previous = { ...visit(), analysis: { status: 'ready', context_revision: 1 } };
  assert.throws(() => createAnalysisTask(previous, '', ids()), /aporte/);
  assert.doesNotThrow(() => createAnalysisTask(previous, 'Nueva observación', ids()));
  assert.doesNotThrow(() => createAnalysisTask({ ...previous, revision: 2 }, '', ids()));
  assert.throws(() => createAnalysisTask({ ...visit(), status: 'cancelled' }, 'Hola', ids()), /cancelada/);
});
