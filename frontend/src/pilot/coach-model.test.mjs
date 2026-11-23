import test from 'node:test';
import assert from 'node:assert/strict';
import { boundedHistory, compactReply, safeCoachActions, updateCoachTurn } from './coach-model.mjs';

test('history contains only complete successful exchanges, in chronological order', () => {
  const turns = [
    { id: 'a', question: 'Primera pregunta', answer: 'Primera respuesta', status: 'sent' },
    { id: 'b', question: 'Pendiente', status: 'pending' },
    { id: 'c', question: 'Falló', status: 'failed' },
  ];
  assert.deepEqual(boundedHistory(turns), [
    { role: 'user', content: 'Primera pregunta' }, { role: 'assistant', content: 'Primera respuesta' },
  ]);
});

test('history drops whole oldest exchanges to keep six turns and 12000 characters', () => {
  const turns = Array.from({ length: 10 }, (_, i) => ({ id: String(i), question: `Pregunta ${i}`, answer: `Respuesta ${i}`, status: 'sent' }));
  const recent = boundedHistory(turns);
  assert.equal(recent.length, 12);
  assert.equal(recent[0].content, 'Pregunta 4');
  const long = boundedHistory(turns.map(t => ({ ...t, answer: 'a'.repeat(5000) })));
  assert.equal(long.length, 4);
  assert.equal(long[0].content, 'Pregunta 8');
  assert(long.reduce((sum, m) => sum + m.content.length, 0) <= 12000);
});

test('retry updates the same optimistic turn without duplicating it', () => {
  let turns = updateCoachTurn([], { id: 'a', question: 'Una duda', status: 'pending' });
  turns = updateCoachTurn(turns, { id: 'a', status: 'failed', error: 'Sin conexión' });
  turns = updateCoachTurn(turns, { id: 'a', status: 'pending', error: '' });
  turns = updateCoachTurn(turns, { id: 'a', status: 'sent', answer: 'Una respuesta' });
  assert.equal(turns.length, 1);
  assert.equal(turns[0].question, 'Una duda');
  assert.equal(turns[0].answer, 'Una respuesta');
  assert.equal(turns[0].status, 'sent');
});

test('navigation accepts only local approved actions, ignoring model URLs and params', () => {
  const actions = safeCoachActions([
    { label: 'Practicar', route: 'RoleplayLive', params: { url: 'https://evil.invalid' } },
    { label: 'Ver ruta', route: 'Roadmap' },
    { label: 'Abrir', route: 'https://evil.invalid' },
    { label: 'Abrir', route: 'constructor' },
    { label: 'Otro', route: 'RoleplayLive' },
  ]);
  assert.deepEqual(actions, [{ label: 'Practicar', href: '#roleplay' }, { label: 'Ver ruta', href: '#roadmap' }]);
  assert.deepEqual(safeCoachActions(null), []);
});

test('short replies stay intact; long replies keep complete sentences and full detail', () => {
  const short = 'Escucha primero. No prometas beneficios no aprobados.';
  assert.deepEqual(compactReply(short), { preview: short, detail: null });
  const sentence = 'Escucha lo que la pareja necesita y confirma su principal inquietud antes de responder. ';
  const full = sentence.repeat(9).trim();
  const result = compactReply(full);
  assert(result.preview.split(/\s+/).length <= 90);
  assert(result.preview.endsWith('.'));
  assert.equal(result.detail, full);
  assert(full.startsWith(result.preview));
  const unbroken = 'palabra '.repeat(110).trim();
  assert.equal(compactReply(unbroken).detail, unbroken);
  assert.equal(compactReply(unbroken).preview, 'Consulta la respuesta completa del Coach.');
});
