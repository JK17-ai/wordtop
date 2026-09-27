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
export async function playReaction(correct, { streak = 0, badge = false } = {}) {
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
  return { outcome:'scheduled' };
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
  const audio = context;
  const before = audio?.currentTime ?? null;
  await new Promise(resolve => setTimeout(resolve, 300));
  return {
    version:'audio-diagnostic-1',
    outcome:result?.outcome,
    state:audio?.state ?? 'unavailable',
    clockAdvanced:before === null ? null : audio.currentTime > before,
    resumePending:!!resuming,
    error:lastAudioError,
    elapsedMs:Math.round(performance.now() - started),
    userGesture:gesture,
    speechActive:!!window.speechSynthesis?.speaking,
    visibility:document.visibilityState,
    standalone:window.navigator?.standalone ?? window.matchMedia?.('(display-mode: standalone)').matches ?? false,
    audioSession:window.navigator?.audioSession?.type ?? 'unsupported',
    userAgent:window.navigator?.userAgent,
  };
}