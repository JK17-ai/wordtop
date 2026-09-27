import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rebuildStudyDeck, answerWord } from '../src/components/studyState.js';
import { reviewFeed } from '../src/components/reviewStudy.js';
test('legacy review words default to one star without inventing response time', () => {
 const words=rebuildStudyDeck([{id:0,status:'scrap'},{id:1,checked:true},{id:2,status:'new'},{id:3,status:'mastered',responseStage:3}]);
 assert.equal(words[0].responseStage,1); assert.equal(words[1].responseStage,1);
 assert.equal(words[0].responseMs,undefined); assert.equal(words[2].responseStage,undefined); assert.equal(words[3].responseStage,3);
 assert.deepEqual(reviewFeed(words,'scrap','1').map(w=>w.id),[0]);
 assert.deepEqual(rebuildStudyDeck(words),words);
 const next=answerWord(words,'scrap',0,0,true,{responseMs:7500,responseStage:3}).words[0];
 assert.equal(next.responseStage,3); assert.equal(next.responseStageSource,'measured');
});
