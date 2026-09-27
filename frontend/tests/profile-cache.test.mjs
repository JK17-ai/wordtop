import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readProfileCache, saveProfileCache } from '../src/lib/profileCache.js';
test('saved profile is available synchronously before a network request', () => {
 let value=null;
 const storage={getItem:()=>value,setItem:(_,v)=>{value=v;}};
 assert.equal(readProfileCache(storage),null);
 const profile={id:'p1',name:'갈매기',avatar:'🕊️',family_id:'f1'};
 saveProfileCache(storage,profile);
 assert.deepEqual(readProfileCache(storage),profile);
});
test('corrupted or unavailable storage does not crash startup', () => {
 assert.equal(readProfileCache({getItem:()=>'{invalid'}),null);
 assert.equal(readProfileCache({getItem:()=>JSON.stringify({name:'갈매기'})}),null);
 assert.equal(readProfileCache({getItem:()=>{throw Error('blocked');}}),null);
});
