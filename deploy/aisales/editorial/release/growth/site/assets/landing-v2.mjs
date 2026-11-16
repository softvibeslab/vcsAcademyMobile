/* Decorative motion only. Content is readable before JS and without animation. */
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let observer;
function applyMotionPreference() {
  observer?.disconnect();
  document.body.classList.remove('motion-ready');
  if (reduceMotion.matches || !('IntersectionObserver' in window)) return;
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    }
  }, {threshold: 0.08});
  for (const element of document.querySelectorAll('[data-reveal]')) {
    if (element.getBoundingClientRect().top < innerHeight) element.classList.add('is-revealed');
    else observer.observe(element);
  }
  document.body.classList.add('motion-ready');
}
applyMotionPreference();
reduceMotion.addEventListener('change', applyMotionPreference);
