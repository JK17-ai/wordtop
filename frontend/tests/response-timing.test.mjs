import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createResponseClock, responseStage } from '../src/components/responseTiming.js';
import { answerWord, rebuildStudyDeck } from '../src/components/studyState.js';

test('response stages have exact 3 and 6 second boundaries', () => {
  assert.deepEqual([0,3000,3001,6000,6001,10000].map(responseStage), [1,1,2,2,3,3]);
});
test('active clock excludes paused time and result animation; caps timeout', () => {
  let now = 0;
  const clock = createResponseClock(() => now);
  clock.start(); now = 2000; clock.stop();
  now = 12000; assert.equal(clock.elapsed(), 2000);
  clock.start(); now = 13500; clock.stop();
  assert.equal(clock.elapsed(), 3500);
  now = 15000; assert.equal(clock.elapsed(), 3500);
  clock.start(); now = 30000; assert.equal(clock.elapsed(), 10000);
});
test('both right and wrong answers retain stage and separate history counters', () => {
  let words = [{id:1,word:'breadth',meaning:'폭',checked:false}];
  words = answerWord(words,'all',0,1,true,{responseMs:7000,responseStage:3,timedOut:false}).words;
  assert.equal(words[0].status,'mastered');
  assert.equal(words[0].responseStage,3);
  words = answerWord(words,'mastered',0,1,false,{responseMs:1500,responseStage:1,timedOut:false}).words;
  assert.equal(words[0].status,'scrap');
  assert.equal(words[0].responseStage,1);
  assert.deepEqual(words[0].responseCounts,{correctStage3:1,incorrectStage1:1});
  const restored = rebuildStudyDeck(JSON.parse(JSON.stringify(words)));
  assert.deepEqual(restored,words);
  assert.equal(rebuildStudyDeck([{id:2,checked:true}])[0].responseStage,1);
});
