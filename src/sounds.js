// ─── CLICK SOUND ────────────────────────────────────────
const clickAudio = new Audio('/sound/btn_click.mp3');
clickAudio.volume = 0.35;

export let isMuted = false;

export function toggleMute() {
  isMuted = !isMuted;
  bgAudio.muted = isMuted;
  return isMuted;
}

export function playClick() {
  if (isMuted) return;
  try {
    const clone = clickAudio.cloneNode();
    clone.volume = clickAudio.volume;
    clone.play().catch(() => {});
  } catch (_) {}
}

// ─── HOVER SOUND (silent — reserved for future use) ─────
export function playHover() {}

// ─── BACKGROUND MUSIC ───────────────────────────────────
const bgAudio = new Audio('/sound/background.mp3');
bgAudio.loop = true;
bgAudio.volume = 0;

let bgFadeInterval = null;
let isPlaying = false;

export function startBgMusic(targetVolume = 0.22) {
  if (isPlaying) return;
  if (isMuted) return;
  const playPromise = bgAudio.play();
  if (playPromise) {
    playPromise.then(() => {
      isPlaying = true;
      let vol = Math.min(bgAudio.volume, targetVolume);
      if (bgFadeInterval) clearInterval(bgFadeInterval);
      bgFadeInterval = setInterval(() => {
        vol += targetVolume / 40;
        if (vol >= targetVolume) {
          vol = targetVolume;
          clearInterval(bgFadeInterval);
          bgFadeInterval = null;
        }
        bgAudio.volume = Math.max(0, Math.min(1, vol));
      }, 50);
    }).catch((e) => {
      console.warn('Autoplay prevented:', e);
      isPlaying = false;
    });
  }
}

export function stopBgMusic() {
  if (!isPlaying) return;
  if (bgFadeInterval) { clearInterval(bgFadeInterval); bgFadeInterval = null; }
  let vol = bgAudio.volume;
  const fadeOut = setInterval(() => {
    vol -= 0.01;
    if (vol <= 0) {
      vol = 0;
      clearInterval(fadeOut);
      bgAudio.pause();
      isPlaying = false;
    }
    bgAudio.volume = Math.max(0, vol);
  }, 50);
}

export function pauseBgMusic() {
  if (bgFadeInterval) { clearInterval(bgFadeInterval); bgFadeInterval = null; }
  bgAudio.pause();
  isPlaying = false;
}

export function resumeBgMusic(targetVolume = 0.22) {
  if (isMuted) return;
  startBgMusic(targetVolume);
}

export function initAudio() {
  // Ensures AudioContext is ready on first user gesture (required by browsers)
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch (_) {}
}
