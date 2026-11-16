import {journeyState} from './journey-math.mjs';

// Progressive enhancement: native scrolling and all chapter text work without JS.
const root = document.querySelector('[data-journey]');
if (root) {
  const chapters = [...root.querySelectorAll('[data-chapter]')];
  const links = [...root.querySelectorAll('a[href^="#"]')];
  const toggle = root.querySelector('[data-motion-toggle]');
  const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 980px) and (pointer: fine)');
  const preferenceKey = 'sa-journey-motion';
  let userReduced = false;
  try { userReduced = localStorage.getItem(preferenceKey) === 'reduced'; } catch { /* Private storage may be unavailable. */ }
  let enhanced = false, inView = true, frame = 0, geometry = [];

  function paint() {
    frame = 0;
    if (!enhanced || !inView || document.hidden) return;
    // Batch geometry reads before style writes. No perpetual animation loop.
    geometry = chapters.map(chapter => {
      const rect = chapter.getBoundingClientRect();
      return {id: chapter.dataset.chapter, top: rect.top + scrollY, height: rect.height};
    });
    const state = journeyState(scrollY, innerHeight, geometry);
    root.dataset.active = state.id;
    root.style.setProperty('--journey-progress', state.progress.toFixed(5));
    root.style.setProperty('--chapter-progress', state.chapterProgress.toFixed(5));
    for (const link of links) {
      if (link.getAttribute('href') === `#${state.id}`) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    }
  }
  function schedule() {
    if (enhanced && inView && !document.hidden && !frame) frame = requestAnimationFrame(paint);
  }
  function setPreference() {
    const reduced = systemMotion.matches || userReduced;
    enhanced = !reduced && desktop.matches;
    root.classList.toggle('journey-enhanced', enhanced);
    root.classList.toggle('journey-reduced', reduced);
    if (toggle) {
      toggle.hidden = false;
      toggle.disabled = systemMotion.matches;
      toggle.setAttribute('aria-pressed', String(reduced));
      toggle.textContent = systemMotion.matches ? 'Movimiento reducido' : userReduced ? 'Activar movimiento' : 'Reducir movimiento';
    }
    if (!enhanced) {
      cancelAnimationFrame(frame); frame = 0;
      root.style.removeProperty('--journey-progress');
      root.style.removeProperty('--chapter-progress');
      for (const link of links) link.removeAttribute('aria-current');
    } else schedule();
  }
  toggle?.addEventListener('click', () => {
    userReduced = !userReduced;
    try { localStorage.setItem(preferenceKey, userReduced ? 'reduced' : 'full'); } catch { /* The current page still honors the preference. */ }
    setPreference();
  });
  systemMotion.addEventListener('change', setPreference);
  desktop.addEventListener('change', setPreference);
  window.addEventListener('scroll', schedule, {passive: true});
  window.addEventListener('resize', schedule, {passive: true});
  window.addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else schedule();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (inView) schedule();
      else { cancelAnimationFrame(frame); frame = 0; }
    }).observe(root);
  }
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(root);
  setPreference();
}
