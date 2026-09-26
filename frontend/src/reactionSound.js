// Short synthetic cartoon reactions; no recording or external audio requests.
let context;
export function unlockSound() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  context ||= new Audio();
  if (context.state === 'suspended') context.resume().catch(() => {});
}
export function playReaction(correct) {
  if (!context || context.state !== 'running') return;
  const variant = Math.floor(Math.random() * 3);
  const start = context.currentTime;
  const laugh = correct;
  const count = laugh ? 3 + variant : 2 + (variant % 2);
  for (let i = 0; i < count; i++) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 1500;
    oscillator.type = laugh ? 'triangle' : 'sawtooth';
    const time = start + i * (laugh ? .13 : .22);
    const duration = laugh ? .12 : .23;
    const pitch = laugh ? 320 + variant * 70 + i * 45 : variant === 2 ? 900 : 440 + variant * 80;
    oscillator.frequency.setValueAtTime(pitch, time);
    oscillator.frequency.exponentialRampToValueAtTime(laugh ? pitch * .58 : pitch * .36, time + duration);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(.075, time + .02);
    gain.gain.exponentialRampToValueAtTime(.001, time + duration);
    oscillator.connect(filter); filter.connect(gain); gain.connect(context.destination);
    oscillator.start(time); oscillator.stop(time + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
}
