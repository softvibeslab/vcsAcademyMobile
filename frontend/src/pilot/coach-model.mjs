// State and presentation rules for the Coach conversation.
const ACTION_ROUTES = Object.freeze({
  Roadmap: '#roadmap', RoleplayLive: '#roleplay', GoalSheet: '#goalsheet', Resources: '#resources',
});

export function boundedHistory(turns) {
  const completed = turns.filter(turn => turn.status === 'sent'
    && typeof turn.question === 'string' && turn.question.trim()
    && typeof turn.answer === 'string' && turn.answer.trim()
    && turn.question.length <= 1200 && turn.answer.length <= 6000).slice(-6);
  let size = completed.reduce((sum, turn) => sum + turn.question.length + turn.answer.length, 0);
  while (completed.length && size > 12000) {
    const oldest = completed.shift();
    size -= oldest.question.length + oldest.answer.length;
  }
  return completed.flatMap(turn => [
    { role: 'user', content: turn.question }, { role: 'assistant', content: turn.answer },
  ]);
}

export function updateCoachTurn(turns, update) {
  return turns.some(turn => turn.id === update.id)
    ? turns.map(turn => turn.id === update.id ? { ...turn, ...update } : turn)
    : [...turns, update];
}

export function safeCoachActions(actions) {
  const seen = new Set();
  return (Array.isArray(actions) ? actions : []).flatMap(action => {
    if (!action || !Object.hasOwn(ACTION_ROUTES, action.route)
      || typeof action.label !== 'string' || !action.label.trim() || action.label.length > 80) return [];
    const href = ACTION_ROUTES[action.route];
    if (seen.has(href)) return [];
    seen.add(href);
    return [{ label: action.label.trim(), href }];
  }).slice(0, 3);
}

export function compactReply(content) {
  const full = typeof content === 'string' ? content.trim() : '';
  if (full.split(/\s+/).length <= 90) return { preview: full, detail: null };
  const sentences = full.match(/[\s\S]*?[.!?](?:["”')\]]*)(?=\s|$)/g) || [];
  let preview = '';
  for (const sentence of sentences) {
    const next = preview + sentence;
    if (next.trim().split(/\s+/).length > 90) break;
    preview = next;
  }
  return { preview: preview.trim() || 'Consulta la respuesta completa del Coach.', detail: full };
}
