import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyWord,mergeLegacyFeed,verifiedProgress,quizExercise,isDue} from '../src/components/learningFlow.js';
import {rebuildStudyDeck,getFeed,answerWord} from '../src/components/studyState.js';
import {wordKey} from '../src/components/moaFeedState.js';
import {validateSnapshot} from '../src/lib/studySync.js';
const word={id:1,word:'test',meaning:'시험',status:'new'};
test('self classification excludes first confirmation but does not manufacture quiz timing',()=>{
 const words=rebuildStudyDeck(classifyWord([word],1,'known',1000));
 assert.equal(getFeed(words,'all').length,0);assert.equal(words[0].responseStage,undefined);
 assert.equal(words[0].statusSource,'self');assert.equal(words[0].lastVerifiedAt,undefined);
 const saved=classifyWord(words,1,'saved')[0];assert.equal(saved.status,'mastered');assert.equal(saved.saved,true);
});
test('legacy migration preserves server quiz decisions, identity and response counts',()=>{
 const verified={...word,status:'scrap',statusSource:'quiz',responseCounts:{incorrectStage1:2}};
 const migrated=mergeLegacyFeed([verified],{[wordKey(word)]:{judgment:'known',saved:true}})[0];
 assert.equal(migrated.status,'scrap');assert.deepEqual(migrated.responseCounts,verified.responseCounts);assert.equal(migrated.saved,true);
 assert.deepEqual(mergeLegacyFeed([migrated],{}),[migrated]);
});
test('repeat success on the same day does not increase spacing level',()=>{
 const now=Date.UTC(2026,8,28);const first=verifiedProgress(word,true,now);
 assert.equal(verifiedProgress({...word,...first},true,now+1000).reviewLevel,0);
 assert.equal(verifiedProgress({...word,...first},true,now+86400000).reviewLevel,1);
 assert.equal(isDue({...word,...first},now),false);
});
test('all quiz entry points can derive settings from word state',()=>{
 const settings={scrap:'meaning',mastered:'listening'};
 assert.equal(quizExercise({...word,status:'mastered'},settings),'listening');
 assert.equal(quizExercise({...word,status:'scrap'},settings),'meaning');
});
test('snapshot schema v1 roundtrip retains new optional metadata and old records',()=>{
 const words=answerWord([word],'all',0,1,true).words;
 const snapshot={schemaVersion:1,deck:{name:'test',words},quizSession:{ids:[1],index:0},feedProgress:{cursor:wordKey(word)}};
 assert.deepEqual(validateSnapshot(JSON.parse(JSON.stringify(snapshot))),snapshot);
});
