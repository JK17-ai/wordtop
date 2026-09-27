import { test } from 'node:test';
import assert from 'node:assert/strict';

test('first reaction awaits activation and reuses the in-flight resume', async () => {
  let activate;
  let starts = 0;
  let resumes = 0;
  const param = {value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};
  class Audio {
    state = 'suspended'; currentTime = 0; destination = {};
    resume() { resumes++; return new Promise(resolve => { activate = () => {this.state = 'running';resolve();}; }); }
    createOscillator() { return {frequency:param,connect(){},disconnect(){},start(){starts++;},stop(){}}; }
    createGain() { return {gain:param,connect(){},disconnect(){}}; }
    createBiquadFilter() { return {frequency:param,connect(){},disconnect(){}}; }
  }
  globalThis.window = {AudioContext:Audio};
  const sound = await import('../src/reactionSound.js?first');
  const unlock = sound.unlockSound();
  const reaction = sound.playReaction(true);
  assert.equal(starts,0); assert.equal(resumes,1);
  activate(); await unlock; await reaction;
  assert.ok(starts >= 3);
});
test('unavailable or rejected audio does not reject scoring flow', async () => {
  globalThis.window = {};
  const absent = await import('../src/reactionSound.js?absent');
  await absent.playReaction(false);
  globalThis.window = {AudioContext:class {state='suspended';resume(){return Promise.reject(Error('blocked'));}}};
  const blocked = await import('../src/reactionSound.js?blocked');
  await blocked.playReaction(true);
});
test('gesture listeners are installed early and cleaned up', async () => {
  const sound = await import('../src/reactionSound.js?listeners');
  const added=[],removed=[];
  const cleanup=sound.installSoundUnlock({addEventListener:(...args)=>added.push(args),removeEventListener:(...args)=>removed.push(args)});
  cleanup();
  assert.deepEqual(added.map(x=>x[0]),['pointerdown','keydown','touchend']);
  assert.deepEqual(removed.map(x=>x[0]),added.map(x=>x[0]));
  assert.ok(removed.every((x,i)=>x[1]===added[i][1]));
});
