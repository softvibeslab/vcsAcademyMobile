const CONTRIBUTION_LABEL = 'Aporte para el análisis:\n';
const textLength = value => [...value].length;
const byteLength = value => new TextEncoder().encode(value).length;
const feedbackText = visit => Object.values(visit.feedback || {}).join('');
const contributionPrefix = visit => `${visit.context ? '\n\n' : ''}${CONTRIBUTION_LABEL}`;

export function contributionCapacity(visit) {
  const context = visit.context || '', feedback = feedbackText(visit), prefix = contributionPrefix(visit);
  return Math.max(0, Math.min(6000 - textLength(context + prefix), 10000 - textLength(context + prefix + feedback), 24000 - byteLength(context + prefix + feedback)));
}

export function analysisContributionContext(visit, contribution) {
  const extra = contribution.trim();
  if (!extra) return visit.context || '';
  const context = `${visit.context || ''}${contributionPrefix(visit)}${extra}`;
  const combined = context + feedbackText(visit);
  if ([...combined].some(character => { const point = character.codePointAt(0); return point >= 0xd800 && point <= 0xdfff; })) throw Error('El aporte debe contener caracteres Unicode válidos.');
  if (textLength(context) > 6000) throw Error('El contexto con tu aporte admite hasta 6000 caracteres. Reduce el aporte o edita el contexto.');
  if (textLength(combined) > 10000) throw Error('El contexto y el feedback juntos admiten hasta 10 000 caracteres. Reduce el aporte.');
  if (byteLength(combined) > 24000) throw Error('El contexto y feedback admiten hasta 24 000 bytes UTF-8. Reduce el aporte.');
  return context;
}

export function createAnalysisTask(visit, contribution, uuid = () => crypto.randomUUID()) {
  const extra = contribution.trim();
  if (visit.status === 'cancelled') throw Error('Una visita cancelada sólo se puede consultar o eliminar.');
  if (!extra && visit.analysis?.status === 'ready' && visit.analysis.context_revision === visit.revision) throw Error('Añade un aporte o edita la visita antes de generar otro análisis.');
  const context = analysisContributionContext(visit, extra);
  return {
    visit: { ...visit }, contribution: extra,
    patchBody: extra ? { action: 'edit', context, expected_revision: visit.revision, request_id: uuid() } : null,
    analysisRequestId: uuid(), savedVisit: null, saveUncertain: false, conflict: false, finished: false, result: null, inFlight: null,
  };
}

export function analysisTaskForVisit(previous, visit, contribution, uuid) {
  const extra = contribution.trim();
  if (previous?.conflict) throw Object.assign(Error('Actualiza el detalle antes de analizar.'), { status: 409 });
  if (previous?.saveUncertain && extra !== previous.contribution) throw Error('Reintenta para confirmar el guardado antes de cambiar tu aporte.');
  const retrySaved = previous?.savedVisit && !previous.finished && !extra && visit.revision <= previous.savedVisit.revision;
  // A refresh can reveal the PATCH's new revision before its lost response is
  // confirmed. Reuse that original UUID/body; never append to the refreshed text.
  const retryOriginal = previous && !previous.savedVisit && !previous.finished && (previous.patchBody || previous.visit.revision === visit.revision) && previous.contribution === extra;
  return retrySaved || retryOriginal ? previous : createAnalysisTask(visit, extra, uuid);
}

export function runAnalysisTask(api, task, { onSaved, onPhase } = {}) {
  if (task.inFlight) return task.inFlight;
  if (task.finished) return Promise.resolve(task.result);
  if (task.conflict) return Promise.reject(Object.assign(Error('Actualiza el detalle antes de analizar.'), { status: 409 }));
  task.inFlight = (async () => {
    if (task.patchBody && !task.savedVisit) {
      onPhase?.('saving');
      let saved;
      try {
        saved = await api(`/api/tour-visits/${task.visit.id}`, { method: 'PATCH', body: JSON.stringify(task.patchBody) });
      } catch (error) {
        task.saveUncertain = !error.status || error.status >= 500 || error.status === 408;
        throw error;
      }
      // A successful replay confirms this contribution was submitted, even if
      // another editor subsequently changed the record. Clear its draft once.
      task.savedVisit = saved.visit;
      task.saveUncertain = false;
      onSaved?.(saved.visit);
      // A replay may return the current record after another device edited it.
      // Require the exact saved revision/context before starting inference.
      if (saved.visit.revision !== task.visit.revision + 1 || saved.visit.context !== task.patchBody.context) throw Object.assign(Error('La visita cambió. Actualiza el detalle antes de analizar.'), { status: 409 });
    }
    const target = task.savedVisit || task.visit;
    onPhase?.('analyzing');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      task.result = await api(`/api/tour-visits/${target.id}/analysis`, { method: 'POST', signal: controller.signal, body: JSON.stringify({ expected_revision: target.revision, request_id: task.analysisRequestId }) });
      task.finished = true;
      return task.result;
    } finally { clearTimeout(timer); }
  })().catch(error => { if (error.status === 409) task.conflict = true; throw error; }).finally(() => { task.inFlight = null; });
  return task.inFlight;
}
