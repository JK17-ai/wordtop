import {test} from 'node:test';
import assert from 'node:assert/strict';
import {previewStudyBackup} from '../src/lib/restoreStudy.js';
import {createStudySync} from '../src/lib/studySync.js';
const snapshot=name=>({schemaVersion:1,deck:{name,words:[{id:1,word:'word',meaning:'뜻'}]}});
test('backup preview accepts current and legacy records without importing identities or storage keys',()=>{
 const current=snapshot('새 백업');
 const file={version:2,snapshot:current,records:{'sb-secret':'token','wordtop-selected-profile-v1':'{"id":"other"}'}};
 assert.deepEqual(previewStudyBackup(JSON.stringify(file)).map(x=>x.snapshot),[current]);
 const legacy={version:1,records:{'wordtop:other:wordtop-current-deck':JSON.stringify(current.deck)}};
 assert.equal(previewStudyBackup(JSON.stringify(legacy))[0].snapshot.deck.name,'새 백업');
 assert.throws(()=>previewStudyBackup('{'));
 assert.throws(()=>previewStudyBackup(JSON.stringify({version:2,snapshot:{deck:{words:[]}}})));
});
test('restore archives current data before replacement; failed archive leaves current and pending intact',async()=>{
 const values=new Map();let fail=false,remote=null,rev=0;
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(fail&&k.includes(':sync-backup:'))throw Error('quota');values.set(k,v);},removeItem:k=>values.delete(k)};
 const sync=createStudySync({storage,key:'deck',profileId:'p',rpc:async(name,args)=>{
  if(name==='wordtop_load_study')return {data:{profile_id:'p',revision:rev,snapshot:remote}};
  remote=args.new_snapshot;return {data:{profile_id:'p',revision:++rev}};
 }});
 const before=snapshot('원본'),after=snapshot('복원');
 await sync.initialize(before,true);sync.queue(before);await sync.flush();fail=true;
 await assert.rejects(sync.importBackup(after,before),/quota/);assert.equal(remote.deck.name,'원본');assert.equal(storage.getItem('deck:sync-pending-v1'),null);
 fail=false;await sync.importBackup(after,before);await sync.flush();assert.equal(remote.deck.name,'복원');
 const preserved=JSON.parse([...values].find(([key])=>key.includes(':sync-backup:'))[1]);assert.deepEqual(preserved.local,before);
});
