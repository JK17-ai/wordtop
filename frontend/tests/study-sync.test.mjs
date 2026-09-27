import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStudySync, snapshotHash, validateSnapshot } from '../src/lib/studySync.js';

const snapshot = (status = 'new') => ({ schemaVersion: 1, deck: { name: '단어장', words: [
  { id: 1, word: 'breadth', meaning: '폭', status, checked: status === 'mastered', responseStage: 3 },
], cursors: { all: 1, scrap: null, mastered: null } }, accuracy: { date: '2026-09-27', total: 1, correct: 1 }, activeMs: 7100 });
const storage = () => {
  const values = new Map();
  return { values, getItem:k=>values.get(k)??null, setItem:(k,v)=>values.set(k,v), removeItem:k=>values.delete(k) };
};
const server = () => {
  let saved = { profile_id: 'p1', revision: 0, snapshot: null };
  return {
    get saved() { return structuredClone(saved); },
    async rpc(name, args) {
      if (name === 'wordtop_load_study') return { data: structuredClone(saved) };
      if (args.expected_revision !== saved.revision) return { data: { ...structuredClone(saved), conflict: true } };
      saved = { ...saved, revision: saved.revision + 1, snapshot: structuredClone(args.new_snapshot) };
      return { data: { profile_id: 'p1', revision: saved.revision, conflict: false } };
    },
  };
};
function setup(db = server(), store = storage()) {
  const statuses=[];
  const controller=createStudySync({rpc:db.rpc,storage:store,key:'p1',profileId:'p1',status:s=>statuses.push(s)});
  return {db,store,statuses,controller};
}
test('first upload and new-device restore retain all progress, cursors and response fields', async () => {
  const a=setup(); const local=snapshot('mastered');
  assert.equal((await a.controller.initialize(local,true)).shouldSave,true);
  a.controller.queue(local); await a.controller.flush();
  assert.deepEqual(a.db.saved.snapshot,local);
  const b=setup(a.db); const loaded=await b.controller.initialize(snapshot(),false);
  assert.deepEqual(loaded.snapshot,local);
  assert.equal(b.store.getItem('p1:sync-pending-v1'),null);
});
test('simultaneous devices conflict rather than overwrite, choosing remote backs up both', async () => {
  const a=setup(); a.controller.queue(snapshot()); await a.controller.initialize(snapshot(),true); await a.controller.flush();
  const b=setup(a.db); await b.controller.initialize(snapshot(),false);
  a.controller.queue(snapshot('mastered')); await a.controller.flush();
  b.controller.queue(snapshot('scrap')); await b.controller.flush();
  assert.equal(b.statuses.at(-1).state,'conflict');
  assert.equal(a.db.saved.snapshot.deck.words[0].status,'mastered');
  const selected=await b.controller.resolve('remote',snapshot('scrap'));
  assert.equal(selected.deck.words[0].status,'mastered');
  const backup=JSON.parse([...b.store.values].find(([key])=>key.includes(':sync-backup:'))[1]);
  assert.equal(backup.local.deck.words[0].status,'scrap');
  assert.equal(backup.remote.deck.words[0].status,'mastered');
});
test('existing unknown local records require a choice when server differs', async () => {
  const a=setup(); await a.controller.initialize(snapshot(),false); a.controller.queue(snapshot('mastered')); await a.controller.flush();
  const b=setup(a.db); assert.equal((await b.controller.initialize(snapshot('scrap'),true)).conflict,true);
  await b.controller.resolve('local',snapshot('scrap'));
  assert.equal(a.db.saved.snapshot.deck.words[0].status,'scrap');
});
test('clean device restores a newer server revision on restart', async () => {
  const a=setup(); await a.controller.initialize(snapshot(),false); a.controller.queue(snapshot()); await a.controller.flush();
  const b=setup(a.db); await b.controller.initialize(snapshot(),false);
  a.controller.queue(snapshot('mastered')); await a.controller.flush();
  const restarted=setup(a.db,b.store);
  assert.equal((await restarted.controller.initialize(snapshot(),true)).snapshot.deck.words[0].status,'mastered');
});
test('failed network save retains pending data and retry stores once', async () => {
  const db=server(); let failing=false;
  const actual=db.rpc;
  db.rpc=async(...args)=>{if(failing)throw Error('offline');return actual(...args);};
  const a=setup(db); await a.controller.initialize(snapshot(),false);
  a.controller.queue(snapshot('mastered')); failing=true;
  await assert.rejects(a.controller.flush(),/offline/);
  assert.ok(a.store.getItem('p1:sync-pending-v1'));
  failing=false; await a.controller.flush(); await a.controller.flush();
  assert.equal(db.saved.revision,1); assert.equal(a.store.getItem('p1:sync-pending-v1'),null);
});
test('profile mismatch and corrupt remote snapshots do not restore', async () => {
  const a=setup({rpc:async()=>({data:{profile_id:'p2',revision:1,snapshot:snapshot()}})});
  await assert.rejects(a.controller.initialize(snapshot(),true),/프로필/);
  assert.throws(()=>validateSnapshot({...snapshot(),deck:{name:'x',words:[{id:1},{id:1}]}}));
});
test('backup failure prevents conflict resolution', async () => {
  const a=setup(); await a.controller.initialize(snapshot(),false); a.controller.queue(snapshot('mastered')); await a.controller.flush();
  const b=setup(a.db); await b.controller.initialize(snapshot('scrap'),true);
  b.store.setItem=()=>{throw Error('quota');};
  await assert.rejects(b.controller.resolve('local',snapshot('scrap')),/quota/);
  assert.equal(a.db.saved.snapshot.deck.words[0].status,'mastered');
});
test('identical snapshot does not increase server revision', async () => {
  const a=setup(); await a.controller.initialize(snapshot(),true); a.controller.queue(snapshot()); await a.controller.flush();
  a.controller.queue(snapshot()); await a.controller.flush();
  assert.equal(a.db.saved.revision,1);
  assert.equal(JSON.parse(a.store.getItem('p1:sync-meta-v1')).hash,await snapshotHash(snapshot()));
});
