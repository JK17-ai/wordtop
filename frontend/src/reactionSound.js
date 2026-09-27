// Short synthetic cartoon reactions; no recording or external audio requests.
let context;
let resuming;
export function unlockSound() {
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return Promise.resolve(false);
    if (!context || context.state === 'closed') context = new Audio({ latencyHint: 'interactive' });
    if (context.state === 'running') return Promise.resolve(true);
    if (!resuming) {
      resuming = context.resume().then(() => context.state === 'running', () => false)
        .finally(() => { resuming = null; });
    }
    return resuming;
  } catch { return Promise.resolve(false); }
}
export function installSoundUnlock(target = document) {
  const unlock = () => { void unlockSound(); };
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
    new Promise(resolve => { timeout = setTimeout(() => resolve(false), 140); }),
  ]);
  clearTimeout(timeout);
  if (!ready || !context || context.state !== 'running') return;
  if (generation !== soundGeneration || window.speechSynthesis?.speaking) return;
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
    gain.gain.linearRampToValueAtTime(correct ? .045 : .03,time+.012);
    gain.gain.exponentialRampToValueAtTime(.001,time+duration);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(time); oscillator.stop(time+duration+.02);
    activeTones.add(oscillator);
    oscillator.onended=()=>{activeTones.delete(oscillator);oscillator.disconnect();gain.disconnect();};
  });
}
