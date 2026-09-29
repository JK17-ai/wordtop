import {test} from 'node:test';
import assert from 'node:assert/strict';
const param={setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};
function setup(){const calls={created:0,fetch:0,media:0,starts:[],suspended:0,nodes:[],listeners:{}};globalThis.window={navigator:{audioSession:{type:'auto'}},document:{visibilityState:'visible'},fetch:async()=>{calls.fetch++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};},Audio:class{constructor(){calls.media++;}},AudioContext:class{
 state='suspended';currentTime=0;destination={};
 constructor(){calls.created++;}
 resume(){this.state='running';return Promise.resolve();}
 suspend(){calls.suspended++;this.state='suspended';return Promise.resolve();}
 decodeAudioData(){return Promise.resolve({duration:4});}
 createBufferSource(){const n={connect(){},disconnect(){},start(...args){calls.starts.push(args);},stop(){}};calls.nodes.push(n);return n;}
 createOscillator(){const n={frequency:param,connect(){},disconnect(){},start(){calls.starts.push('tone');},stop(){}};calls.nodes.push(n);return n;}
 createGain(){return {gain:{...param},connect(){},disconnect(){}};}
 }};return calls;}
test('startup fetches reusable bytes without media player, AudioContext, or gesture interception',async()=>{const c=setup();const s=await import('../src/reactionSound.js?preload4');const target={addEventListener:(name,fn)=>c.listeners[name]=fn,removeEventListener(){}};const cleanup=s.installSoundUnlock(target);await s.preloadSounds();assert.equal(c.fetch,1);assert.equal(c.created,0);assert.equal(c.media,0);assert.deepEqual(Object.keys(c.listeners),['visibilitychange']);assert.equal(window.navigator.audioSession.type,'auto');cleanup();});
test('first answer can play immediately, cached samples use ambient and release idle context',async()=>{const c=setup();const s=await import('../src/reactionSound.js?cached4');await s.preloadSounds();const first=await s.playReaction(true);assert.equal(first.outcome,'scheduled');assert.equal(window.navigator.audioSession.type,'ambient');assert.equal(c.media,0);await Promise.resolve();await s.playReaction(false);assert.deepEqual(c.starts.at(-1),[0,1,.75]);for(const node of c.nodes)node.onended?.();await new Promise(r=>setTimeout(r,150));assert.ok(c.suspended>0);s.stopSounds();});
test('hidden page cancels effects and does not fall back to exclusive HTML audio',async()=>{const c=setup();const s=await import('../src/reactionSound.js?hidden4');await s.playFeedChime();s.stopSounds();assert.ok(c.suspended>0);assert.equal(c.media,0);});
