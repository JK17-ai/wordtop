import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateStudyBackups, isStorageQuotaError } from '../src/lib/studyBackup.js';
function storage() {
 const data=new Map([['p:sync-backup:1','old'],['p:sync-pending-v1','pending'],['other:sync-backup:1','other']]);
 return {data,get length(){return data.size;},key:i=>[...data.keys()][i],getItem:k=>data.get(k)??null,removeItem:k=>data.delete(k)};
}
test('migration removes only the verified archived backup, retaining pending data and other profiles',async()=>{
 const s=storage(), archived=new Map();
 await migrateStudyBackups(s,'p',{put:async(k,v)=>{assert.equal(s.getItem(k),v);archived.set(k,v);}});
 assert.equal(archived.get('p:sync-backup:1'),'old');
 assert.equal(s.getItem('p:sync-backup:1'),null);
 assert.equal(s.getItem('p:sync-pending-v1'),'pending');
 assert.equal(s.getItem('other:sync-backup:1'),'other');
});
test('failed archive leaves original backup intact',async()=>{
 const s=storage();
 await assert.rejects(migrateStudyBackups(s,'p',{put:async()=>{throw Error('full');}}));
 assert.equal(s.getItem('p:sync-backup:1'),'old');
});
test('quota errors differ from network failures',()=>{
 assert.equal(isStorageQuotaError({message:'The quota has been exceeded.'}),true);
 assert.equal(isStorageQuotaError({name:'QuotaExceededError'}),true);
 assert.equal(isStorageQuotaError({message:'Failed to fetch'}),false);
});
