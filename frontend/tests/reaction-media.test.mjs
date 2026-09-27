import { test } from 'node:test';
import assert from 'node:assert/strict';
test('file audio is played synchronously on click, uses one player and selects each reaction', async()=>{
 let instances=0, plays=0, player;
 globalThis.window={Audio:class {
 constructor(){instances++; player=this;} load(){} pause(){} play(){plays++;return Promise.resolve();}
 }};
 const {playReaction}=await import('../src/reactionSound.js?media');
 const first=playReaction(true);
 assert.equal(plays,1); assert.equal(player.currentTime,0); await first;
 await playReaction(false); assert.equal(player.currentTime,1);
 await playReaction(true,{streak:5}); assert.equal(player.currentTime,2);
 await playReaction(true,{badge:true}); assert.equal(player.currentTime,3);
 assert.equal(instances,1);
});
test('blocked file playback reports its error without breaking scoring',async()=>{
 globalThis.window={Audio:class {load(){} pause(){} play(){return Promise.reject(Object.assign(Error('blocked'),{name:'NotAllowedError'}));}}};
 const {playReaction}=await import('../src/reactionSound.js?blocked-media');
 assert.equal((await playReaction(true)).outcome,'media-error');
});
test('sprite playback stops before the next effect and stale handlers cannot stop a newer effect',async()=>{
 let player, pauses=0;
 globalThis.window={Audio:class {constructor(){player=this;}load(){}pause(){pauses++;}play(){return Promise.resolve();}}};
 const {playReaction}=await import('../src/reactionSound.js?boundaries');
 await playReaction(true); const stale=player.ontimeupdate;
 await playReaction(false); const before=pauses;
 player.currentTime=1.4; stale(); assert.equal(pauses,before);
 player.ontimeupdate(); assert.equal(pauses,before);
 player.currentTime=1.81; player.ontimeupdate(); assert.equal(pauses,before+1);
});
