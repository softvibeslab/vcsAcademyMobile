// The complete story and anchor navigation work before this enhancement runs.
const index = document.querySelector('.chapter-index');
const chapters = [...document.querySelectorAll('article.scenario[id]')];
const links = index ? [...index.querySelectorAll('a[href^="#"]')] : [];
const progress = document.querySelector('[data-progress]');

if (index && chapters.length && links.length === chapters.length) {
  const setCurrent = id => {
    const current = chapters.findIndex(chapter => chapter.id === id);
    if (current < 0) return;
    for (const link of links) {
      if (link.hash === `#${id}`) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    }
    if (progress) progress.textContent = `${String(current + 1).padStart(2, '0')} / ${String(chapters.length).padStart(2, '0')}`;
  };

  let frame = 0;
  let anchoredUntil = 0;
  const updateFromViewport = () => {
    frame = 0;
    if (performance.now() < anchoredUntil) return;
    const threshold = Math.min(innerHeight * .4, 300);
    const current = [...chapters].reverse().find(chapter => chapter.getBoundingClientRect().top <= threshold) || chapters[0];
    setCurrent(current.id);
  };
  const scheduleUpdate = () => {
    if (!frame) frame = requestAnimationFrame(updateFromViewport);
  };
  const updateFromAnchor = () => {
    const id = location.hash.slice(1);
    if (chapters.some(chapter => chapter.id === id)) {
      anchoredUntil = performance.now() + 1100;
      setCurrent(id);
    }
  };

  addEventListener('scroll', scheduleUpdate, {passive: true});
  addEventListener('resize', scheduleUpdate, {passive: true});
  addEventListener('hashchange', updateFromAnchor);
  setCurrent(chapters[0].id);
  updateFromAnchor();
  scheduleUpdate();
}
