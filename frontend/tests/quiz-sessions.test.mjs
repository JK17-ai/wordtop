import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quizPool, resumeQuiz, recordQuizAnswer, restartQuiz, restoreQuizProgress} from '../src/components/quizSessions.js';
import {answerWord} from '../src/components/studyState.js';
import {wordKey} from '../src/components/moaFeedState.js';
import {validateSnapshot, snapshotHash} from '../src/lib/studySync.js';
const words=[{id:1,word:'one',meaning:'하나',judgment:'unknown',status:'scrap'}, {id:2,word:'two',meaning:'둘',judgment:'known',status:'mastered'}, {id:3,word:'three',meaning:'셋',status:'new'}];
test('quiz gates untouched and merely saved words, using self choice independently of quiz results',()=>{
 assert.deepEqual(quizPool(words).map(w=>w.id),[1,2]);
 const after=answerWord(words,'all',0,1,true).words;
 assert.deepEqual(quizPool(after,'scrap').map(w=>w.id),[1]);
 assert.deepEqual(quizPool(after,'mastered').map(w=>w.id),[2]);
 assert.equal(quizPool([{...words[2],saved:true}]).length,0);
 assert.equal(quizPool([words[2]],'all','all',{entries:{[wordKey(words[2])]:{judgment:'known'}}}).length,1);
});
test('resume preserves order and position, appends newly learned words and restart preserves source records',()=>{
 let session=resumeQuiz(null,words.slice(0,2),{tab:'all',stage:'all',label:'학습한 단어'},()=>0.999);
 session=recordQuizAnswer(session,1,true);
 assert.equal(recordQuizAnswer(session,1,true),session);
 const resumed=resumeQuiz(session,[words[2],words[1],words[0]]);
 assert.deepEqual(resumed.ids,[1,2,3]);assert.equal(resumed.index,1);assert.equal(resumed.correct,1);
 const restarted=restartQuiz(resumed,()=>0.999);
 assert.equal(restarted.index,0);assert.equal(restarted.correct,0);assert.deepEqual(restarted.ids,resumed.ids);
 assert.equal(session.index,1);assert.equal(words[0].judgment,'unknown');
});
test('removed eligibility does not skip the next question or count a removed answer',()=>{
 let session=resumeQuiz(null,words,{},()=>0.999);session=recordQuizAnswer(session,1,true);
 session=recordQuizAnswer(session,2,false);
 const resumed=resumeQuiz(session,words.slice(1));
 assert.equal(resumed.index,1);assert.equal(resumed.correct,0);assert.equal(resumed.ids[resumed.index],3);
});
test('stage filtering and settings groups remain independent of quiz status',()=>{
 const rated=words.map((w,i)=>({...w,responseStage:i+1}));
 assert.equal(quizPool(rated,'scrap','1').length,1);assert.equal(quizPool(rated,'scrap','2').length,0);
 assert.equal(quizPool(rated,'all','3').length,2);
});
test('JSON/server snapshot roundtrip restores separate cursors and all original record fields',async()=>{
 const source={schemaVersion:1,deck:{name:'test',words:words.map(w=>({...w,responseCounts:{correctStage1:7},lastVerifiedAt:'2026-09-01'}))},dailyStudy:{entries:{one:'mastered'}},activeMs:123,quizProgress:{activeKey:'tab:all:all',sessions:{
 'tab:all:all':recordQuizAnswer(resumeQuiz(null,words.slice(0,2),{tab:'all',stage:'all',label:'학습한 단어'}),1,true),
 'tab:mastered:all':resumeQuiz(null,[words[1]],{tab:'mastered',stage:'all',label:'알아요로 고른 단어'})}}};
 const saved=validateSnapshot(JSON.parse(JSON.stringify(source)));const restored=restoreQuizProgress(saved,saved.deck.words);
 assert.deepEqual(restored,source.quizProgress);assert.deepEqual(saved.deck,source.deck);
 assert.equal(await snapshotHash(saved),await snapshotHash(source));
});
test('legacy session migrates at its existing position and rejects corrupt sessions',()=>{
 const legacy={quizSession:{ids:[1,2],index:1,correct:1,practice:false}};
 const restored=restoreQuizProgress(legacy,words);
 assert.equal(restored.sessions.legacy.index,1);assert.equal(restored.sessions.legacy.correct,1);
 assert.equal(restoreQuizProgress({quizSession:{ids:[1,1],index:1}},words).activeKey,null);
});
test('all tabs shuffle new batches and restarts while resume retains the saved order',()=>{
 const pool=Array.from({length:8},(_,id)=>({id,word:String(id),judgment:id%2?'known':'unknown'}));
 for(const tab of ['all','scrap','mastered']){
  const eligible=quizPool(pool,tab),source=eligible.map(w=>w.id);
  const session=resumeQuiz(null,eligible,{tab},()=>0);
  assert.notDeepEqual(session.ids,source);assert.deepEqual([...session.ids].sort(),[...source].sort());
  const answered=recordQuizAnswer(session,session.ids[0],true);
  assert.deepEqual(resumeQuiz(answered,eligible),answered);
  const restarted=restartQuiz(answered,()=>0);
  assert.notDeepEqual(restarted.ids,answered.ids);assert.equal(restarted.index,0);assert.equal(answered.index,1);
 }
});
