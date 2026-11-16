/* Native controls remain usable without JavaScript. Media loads only after a gesture. */
const players = [...document.querySelectorAll('[data-film-player]')];
const videos = players.map(player => player.querySelector('video'));

for (const player of players) {
  const video = player.querySelector('video');
  const error = player.querySelector('[data-video-error]');
  const retry = player.querySelector('[data-video-retry]');
  const play = player.querySelector('[data-video-play]');
  function syncPlayButton() {
    if (!play) return;
    play.hidden = !video.paused || !error.hidden;
    play.querySelector('[data-play-text]').textContent = video.ended ? 'Volver a ver' : 'Ver película';
  }
  function setError(visible) {
    error.hidden = !visible;
    retry.hidden = !visible;
    syncPlayButton();
  }
  video.addEventListener('play', () => {
    syncPlayButton();
    for (const other of videos) {
      if (other !== video && !other.paused) other.pause();
    }
  });
  video.addEventListener('pause', syncPlayButton);
  video.addEventListener('ended', syncPlayButton);
  video.addEventListener('loadeddata', () => setError(false));
  video.addEventListener('error', () => setError(true));
  for (const source of video.querySelectorAll('source')) {
    source.addEventListener('error', () => setError(true));
  }
  async function startPlayback(reload = false) {
    setError(false);
    if (play) play.disabled = true;
    if (reload) video.load();
    video.focus({preventScroll:true});
    try {
      await video.play();
    } catch (failure) {
      // A pause or another player can legitimately interrupt a pending play request.
      if (failure?.name !== 'AbortError') {
        setError(true);
        retry.focus({preventScroll:true});
      }
    } finally {
      if (play) play.disabled = false;
      syncPlayButton();
    }
  }
  play?.addEventListener('click', () => startPlayback());
  retry.addEventListener('click', () => startPlayback(true));
  syncPlayButton();
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  for (const video of videos) video.pause();
});
