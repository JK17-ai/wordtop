// Short synthetic cartoon reactions; no recording or external audio requests.
let context;
let resuming;
let lastAudioError = null;
export function unlockSound(userGesture = false) {
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return Promise.resolve(false);
    // Supported mobile browsers can route effects through the media audio session.
    try { if (window.navigator?.audioSession) window.navigator.audioSession.type = 'playback'; } catch { /* Optional API. */ }
    if (!context || context.state === 'closed') {
      context = new Audio({ latencyHint: 'interactive' });
      // Prime the output synchronously inside the initial user gesture.
      if (context.createBufferSource && context.createBuffer) {
        const source = context.createBufferSource();
        source.buffer = context.createBuffer(1, 1, context.sampleRate);
        source.connect(context.destination);
        source.onended = () => source.disconnect();
        source.start(0);
      }
    }
    if (context.state === 'running') return Promise.resolve(true);
    // A pending resume can remain unresolved on mobile. A new gesture must retry it.
    if (userGesture && resuming) {
      void context.resume().catch(error => { lastAudioError = { name:error.name, message:error.message }; });
    }
    if (!resuming) {
      resuming = context.resume().then(() => context.state === 'running', error => { lastAudioError = { name:error.name, message:error.message }; return false; })
        .finally(() => { resuming = null; });
    }
    return resuming;
  } catch (error) { lastAudioError = { name:error.name, message:error.message }; return Promise.resolve(false); }
}
export function installSoundUnlock(target = document) {
  prepareMedia();
  const unlock = () => { void unlockSound(true); };
  target.addEventListener('pointerdown', unlock, true);
  target.addEventListener('keydown', unlock, true);
  target.addEventListener('touchend', unlock, { capture: true, passive: true });
  return () => {
    target.removeEventListener('pointerdown', unlock, true);
    target.removeEventListener('keydown', unlock, true);
    target.removeEventListener('touchend', unlock, true);
  };
}
let soundGeneration = 0;
const activeTones = new Set();
async function playSynthReaction(correct, { streak = 0, badge = false } = {}) {
  const generation = ++soundGeneration;
  // Wait for the first gesture's resume, but never play stale feedback later.
  let timeout;
  const ready = await Promise.race([
    unlockSound(),
    new Promise(resolve => { timeout = setTimeout(() => resolve(false), 600); }),
  ]);
  clearTimeout(timeout);
  if (!ready || !context || context.state !== 'running') return { outcome:'activation-failed' };
  if (generation !== soundGeneration) return { outcome:'superseded' };
  if (window.speechSynthesis?.speaking) return { outcome:'speech-active' };
  for (const oscillator of activeTones) { try { oscillator.stop(); } catch { /* Already ended. */ } }
  activeTones.clear();
  const pitches = !correct ? [260,220] : badge ? [523.25,659.25,783.99,1046.5] : streak >= 5 && streak % 5 === 0 ? [523.25,659.25,783.99,987.77] : [659.25,783.99,987.77];
  const start = context.currentTime + .008;
  pitches.forEach((pitch,i) => {
    const oscillator=context.createOscillator(), gain=context.createGain();
    oscillator.type='sine';
    const time=start+i*(badge ? .11 : .065), duration=correct ? .15 : .12;
    oscillator.frequency.setValueAtTime(pitch,time);
    gain.gain.setValueAtTime(0,time);
    gain.gain.linearRampToValueAtTime(correct ? .14 : .10,time+.012);
    gain.gain.exponentialRampToValueAtTime(.001,time+duration);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(time); oscillator.stop(time+duration+.02);
    activeTones.add(oscillator);
    oscillator.onended=()=>{activeTones.delete(oscillator);oscillator.disconnect();gain.disconnect();};
  });
  return { outcome:'scheduled', engine:'web-audio' };
}

// Diagnostic only: browser state cannot establish whether the speaker is audible.
export async function diagnoseSound() {
  const started = performance.now();
  const gesture = window.navigator?.userActivation?.isActive ?? null;
  lastAudioError = null;
  void unlockSound(true);
  let result;
  try { result = await playReaction(true); }
  catch (error) { lastAudioError = { name:error.name, message:error.message }; result = { outcome:'exception' }; }
  const usingMedia = result?.engine === 'audio-file';
  const audio = usingMedia ? media : context;
  const before = audio?.currentTime ?? null;
  await new Promise(resolve => setTimeout(resolve, 300));
  return {
    version:'gesture-fallback-3',
    outcome:result?.outcome,
    state:usingMedia ? (media?.paused ? 'paused' : 'playing') : audio?.state ?? 'unavailable',
    clockAdvanced:before === null ? null : audio.currentTime > before,
    resumePending:!!resuming,
    error:usingMedia ? mediaFailure : lastAudioError,
    elapsedMs:Math.round(performance.now() - started),
    userGesture:gesture,
    speechActive:!!window.speechSynthesis?.speaking,
    visibility:document.visibilityState,
    standalone:window.navigator?.standalone ?? window.matchMedia?.('(display-mode: standalone)').matches ?? false,
    audioSession:window.navigator?.audioSession?.type ?? 'unsupported',
    userAgent:window.navigator?.userAgent,
  };
}
let media;
let mediaStop;
let mediaToken = 0;
let mediaFailure = null;
function prepareMedia() {
  if (!media && window.Audio) {
    media = new window.Audio('/audio/reactions.wav');
    media.preload = 'auto';
    media.load();
  }
  return media;
}
export async function playReaction(correct, { streak = 0, badge = false } = {}) {
  if (!window.Audio || context?.state === 'running') return playSynthReaction(correct, { streak, badge });
  const token = ++mediaToken;
  const player = prepareMedia();
  clearTimeout(mediaStop);
  player.pause();
  player.onplaying = null;
  player.ontimeupdate = null;
  const offset = !correct ? 1 : badge ? 3 : streak >= 5 && streak % 5 === 0 ? 2 : 0;
  try {
    player.currentTime = offset;
    player.muted = false;
    player.volume = 1;
    mediaFailure = null;
    player.ontimeupdate = () => {
      if (token === mediaToken && player.currentTime >= offset + .8) {
        player.pause(); clearTimeout(mediaStop);
      }
    };
    player.onplaying = () => {
      if (token !== mediaToken) return;
      // Stop inside the silent tail, before the next reaction in the file.
      clearTimeout(mediaStop);
      const remaining = Math.max(0, offset + .8 - player.currentTime);
      mediaStop = setTimeout(() => { if (token === mediaToken) player.pause(); }, remaining * 1000);
    };
    // Called directly inside the answer click: no await before play().
    await player.play();
    return { outcome:'scheduled', engine:'audio-file' };
  } catch (error) {
    if (token !== mediaToken) return { outcome:'superseded' };
    mediaFailure = { name:error.name, message:error.message };
    const fallback = await playSynthReaction(correct, { streak, badge });
    return fallback.outcome === 'scheduled' ? fallback : { outcome:'media-error', engine:'audio-file' };
  }
}