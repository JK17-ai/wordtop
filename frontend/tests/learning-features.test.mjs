import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAnswerOutbox } from '../src/lib/answerOutbox.js';
import { reviewFeed, nextReviewIndex } from '../src/components/reviewStudy.js';
import { snapshotHash } from '../src/lib/studySync.js';
import { retryDelay } from '../src/lib/syncRetry.js';
const memory = () => { const data = new Map(); return { getItem:k=>data.get(k)??null, setItem:(k,v)=>data.set(k,v) }; };
test('review filters keep unclassified history and first quizzes separate', () => {
 const words=[{id:0,status:'new'},{id:1,status:'scrap',responseStage:1},{id:2,status:'scrap',responseStage:3},{id:3,status:'scrap'},{id:4,status:'mastered',responseStage:3}];
 assert.deepEqual(reviewFeed(words,'scrap','3').map(w=>w.id),[2]);
 assert.deepEqual(reviewFeed(words,'scrap','unrated').map(w=>w.id),[3]);
 assert.deepEqual(reviewFeed(words,'all','3').map(w=>w.id),[0]);
 assert.deepEqual(reviewFeed(words,'mastered','3').map(w=>w.id),[4]);
});
test('review advances when answer changes category or difficulty and wraps', () => {
 const before=[{id:1},{id:2},{id:3}];
 assert.equal(nextReviewIndex(before,[{id:1},{id:3}],1,2),1);
 assert.equal(nextReviewIndex(before,before,2,3),0);
 assert.equal(nextReviewIndex(before,[],1,2),0);
});
test('outbox survives offline/restart and preserves UUID on retries', async () => {
 const storage=memory(); const entry={event_id:'one',response_ms:2000};
 const a=createAnswerOutbox({storage,key:'p1',send:async()=>{throw Error('offline');}});
 a.enqueue(entry); a.enqueue(entry); await assert.rejects(a.flush(),/offline/); assert.equal(a.count(),1);
 const received=[]; const b=createAnswerOutbox({storage,key:'p1',send:async event=>received.push(event)});
 await b.flush(); assert.deepEqual(received,[entry]); assert.equal(b.count(),0);
});
test('outbox retains new answers appended during a request', async () => {
 const sent=[]; const storage=memory(); let box;
 box=createAnswerOutbox({storage,key:'p1',send:async e=>{ sent.push(e.event_id); if(e.event_id==='one')box.enqueue({event_id:'two'}); }});
 box.enqueue({event_id:'one'}); await box.flush(); assert.deepEqual(sent,['one','two']);
});
test('JSONB key ordering does not create false conflicts', async () => {
 assert.equal(await snapshotHash({deck:{id:1,name:'x'},count:2}),await snapshotHash({count:2,deck:{name:'x',id:1}}));
 assert.notEqual(await snapshotHash([1,2]),await snapshotHash([2,1]));
});
test('retry delay is bounded', () => {
 assert.equal(retryDelay(1),2000); assert.equal(retryDelay(2),4000); assert.equal(retryDelay(100),30000);
});
