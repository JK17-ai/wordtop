// Load bytes at startup without claiming an audio session or creating a media player.
let bytesPromise, decoded, decoding, context, resumePromise, idleTimer;
let generation=0, lastError=null;
const active=new Set();
export function preloadSounds() {
  if(!bytesPromise && typeof window.fetch==='function') {
    bytesPromise=window.fetch('/audio/reactions.wav').then(r=>{if(!r.ok)throw Error('Audio preload failed');return r.arrayBuffer();}).catch(error=>{lastError={message:error.message};return null;});
  }
  return bytesPromise || Promise.resolve(null);
}
function mixSession() {
  try { if(window.navigator?.audioSession) window.navigator.audioSession.type='ambient'; } catch { /* Optional browser API. */ }
}
function releaseWhenIdle() {
  clearTimeout(idleTimer);
  idleTimer=setTimeout(()=>{if(!active.size && context?.state==='running') void context.suspend?.().catch(()=>{});},120);
}
function decode() {
  if(decoded || decoding || !context?.decodeAudioData) return;
  decoding=preloadSounds().then(bytes=>bytes ? context.decodeAudioData(bytes.slice(0)) : null).then(value=>{decoded=value;}).catch(error=>{lastError={message:error.message};}).finally(()=>{decoding=null;});
}
export function unlockSound() {
  try {
    const AudioContext=window.AudioContext || window.webkitAudioContext;
    if(!AudioContext) return Promise.resolve(false);
    mixSession();clearTimeout(idleTimer);
    if(!context || context.state==='closed') {context=new AudioContext({latencyHint:'interactive'});decoded=null;}
    decode();
    if(context.state==='running') return Promise.resolve(true);
    if(!resumePromise) resumePromise=context.resume().then(()=>{if(!active.size)releaseWhenIdle();return context.state==='running';}).catch(error=>{lastError={name:error.name,message:error.message};return false;}).finally(()=>{resumePromise=null;});
    return resumePromise;
  } catch(error) {lastError={name:error.name,message:error.message};return Promise.resolve(false);}
}
export function stopSounds() {
  generation++;clearTimeout(idleTimer);
  for(const node of active){try{node.stop();node.disconnect();}catch{/* already stopped */}}
  active.clear();
  if(context?.state==='running') void context.suspend?.().catch(()=>{});
}
export function installSoundUnlock(target=document) {
  void preloadSounds();
  const hidden=()=>{if(target.visibilityState==='hidden') stopSounds();};
  target.addEventListener('visibilitychange',hidden);
  window.addEventListener?.('pagehide',stopSounds);
  return ()=>{target.removeEventListener('visibilitychange',hidden);window.removeEventListener?.('pagehide',stopSounds);stopSounds();};
}
function track(node,gain) {
  active.add(node);
  node.onended=()=>{active.delete(node);node.disconnect();gain?.disconnect();if(!active.size)releaseWhenIdle();};
}
async function play(kind,options={}) {
  const token=++generation;let timer;
  // resume() is requested synchronously from the answer click, before awaiting.
  const ready=await Promise.race([unlockSound(),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),600);})]);
  clearTimeout(timer);
  if(token!==generation) return {outcome:'superseded'};
  if(!ready || context?.state!=='running'){releaseWhenIdle();return {outcome:'activation-failed'};}
  if(window.document?.visibilityState==='hidden'){stopSounds();return {outcome:'hidden'};}
  if(window.speechSynthesis?.speaking){releaseWhenIdle();return {outcome:'speech-active'};}
  for(const node of active){try{node.stop();}catch{/* already stopped */}}active.clear();
  if(decoded && kind!=='feed') {
    const source=context.createBufferSource();source.buffer=decoded;
    const gain=context.createGain();gain.gain.value=.65;source.connect(gain);gain.connect(context.destination);track(source,gain);
    const offset=kind==='wrong'?1:options.badge?3:options.streak>=5&&options.streak%5===0?2:0;
    source.start(0,offset,.75);
    return {outcome:'scheduled',engine:'web-audio-buffer'};
  }
  // Ready immediately even if file download/decode has not finished on the first tap.
  const pitches=kind==='feed'?[880,659.25]:kind==='wrong'?[260,220]:options.badge?[523.25,659.25,783.99,1046.5]:[659.25,783.99,987.77];
  pitches.forEach((pitch,i)=>{
    const node=context.createOscillator(),gain=context.createGain();const start=context.currentTime+.008+i*(kind==='feed'?.16:.065);const duration=kind==='feed'?.25:.15;
    node.type='sine';node.frequency.setValueAtTime(pitch,start);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.09,start+.012);gain.gain.exponentialRampToValueAtTime(.001,start+duration);
    node.connect(gain);gain.connect(context.destination);track(node,gain);node.start(start);node.stop(start+duration+.02);
  });
  return {outcome:'scheduled',engine:'web-audio'};
}
export const playReaction=(correct,options)=>play(correct?'correct':'wrong',options);
export const playFeedChime=()=>play('feed');
export async function diagnoseSound() {
  const result=await playReaction(true);
  return {version:'ambient-on-demand-4',...result,state:context?.state||'unavailable',preloaded:!!bytesPromise,decoded:!!decoded,error:lastError,audioSession:window.navigator?.audioSession?.type||'unsupported',userAgent:window.navigator?.userAgent};
}
