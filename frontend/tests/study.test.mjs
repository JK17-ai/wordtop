import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVocabulary } from '../src/components/parseVocabulary.js';
import { getFeed, answerWord, restorePositions } from '../src/components/studyState.js';

test('preserves tilde definitions, phrases, separate lines and Unicode variants', () => {
  const pairs = [
    ['lead to', '~로 이어지다'], ['result in', '～을 초래하다'],
    ['contribute to', '∼에 기여하다'], ['relate to', '〜와 관련되다'],
    ['range', '범위 ~ 한도'], ['apple', '사과'], ['level', '수준 2']
  ];
  const result = parseVocabulary(pairs.map(([w,m],i) => w + (i % 2 ? '\t' : '\n') + m).join('\n'));
  assert.deepEqual(result.map(w => [w.word,w.meaning]), pairs);
});
const seed = () => ['alpha','beta','gamma'].map((word,id) => ({ id, word, meaning:word, checked:false }));
test('correct and incorrect answers remove only answered card, without skipping successor', () => {
  let next = answerWord(seed(), 'all', 0, 0, true);
  assert.deepEqual(getFeed(next.words,'all').map(w=>w.id),[1,2]);
  assert.equal(next.index,0);
  next = answerWord(next.words, 'all', next.index, 1, false);
  assert.deepEqual(getFeed(next.words,'all').map(w=>w.id),[2]);
  assert.equal(getFeed(next.words,'scrap')[0].id,1);
  next = answerWord(next.words, 'all',0,2,false);
  assert.equal(getFeed(next.words,'all').length,0);
  assert.equal(next.index,0);
});
test('legacy checked entries stay out of all feed and cursor restores by ID', () => {
  const words=seed(); words[0].checked=true;
  assert.deepEqual(getFeed(words,'all').map(w=>w.id),[1,2]);
  assert.equal(restorePositions(words,{all:2}).all,1);
  assert.equal(restorePositions(words,{all:999}).all,0);
});
test('review remaining in same group advances, last card wraps, changed group leaves', () => {
  const words=seed().map(w=>({...w,status:'scrap'}));
  assert.equal(answerWord(words,'scrap',0,0,false).index,1);
  assert.equal(answerWord(words,'scrap',2,2,false).index,0);
  const next=answerWord(words,'scrap',0,0,true);
  assert.equal(getFeed(next.words,'scrap')[next.index].id,1);
});

test('startup rebuild preserves scraps and masters, excludes them from pending feed', async () => {
  const { rebuildStudyDeck } = await import('../src/components/studyState.js');
  const words = rebuildStudyDeck([
    {id:0,word:'a',status:' SCRAP ',checked:true},
    {id:1,word:'b',checked:true},
    {id:2,word:'c',status:'MASTERED'},
    {id:3,word:'d'}
  ]);
  assert.deepEqual(getFeed(words,'all').map(w=>w.id),[3]);
  assert.deepEqual(getFeed(words,'scrap').map(w=>w.id),[0]);
  assert.deepEqual(getFeed(words,'mastered').map(w=>w.id),[1,2]);
  assert.deepEqual(rebuildStudyDeck(words),words);
});
