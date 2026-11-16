// Measured document geometry, independent of DOM, scrolling direction and time.
const clamp = value => Math.min(1, Math.max(0, value));
export function journeyState(scrollY, viewportHeight, chapters) {
  const empty = {index: 0, id: '', progress: 0, chapterProgress: 0};
  if (!Array.isArray(chapters) || !chapters.length || chapters.some(chapter =>
    !chapter || typeof chapter.id !== 'string' || !Number.isFinite(chapter.top) ||
    !Number.isFinite(chapter.height) || chapter.height <= 0)) return empty;
  if (!Number.isFinite(scrollY) || !Number.isFinite(viewportHeight)) {
    return {...empty, id: chapters[0].id};
  }
  const focus = scrollY + Math.max(0, viewportHeight) / 2;
  let index = 0;
  for (let cursor = 1; cursor < chapters.length; cursor++) {
    if (focus >= chapters[cursor].top) index = cursor;
  }
  const current = chapters[index];
  const first = chapters[0], last = chapters.at(-1);
  return {
    index, id: current.id,
    progress: clamp((focus - first.top) / Math.max(1, last.top + last.height - first.top)),
    chapterProgress: clamp((focus - current.top) / current.height),
  };
}
