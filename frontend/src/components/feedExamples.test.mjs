import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { feedExamples, withFeedExample } from './feedExamples.js';
import { wordKey } from './moaFeedState.js';
const deck = JSON.parse(readFileSync(new URL('../../public/books/2027.json', import.meta.url), 'utf8'));
const sense = word => JSON.stringify([word.word, word.meaning]);
test('every source sense has a nonempty English example and Korean translation', () => {
  assert.equal(new Set(feedExamples.map(sense)).size, feedExamples.length);
  const source = new Set(deck.map(sense));
  for (const example of feedExamples) assert(source.has(sense(example)), example.word);
  for (const word of deck) {
    const enriched = withFeedExample(Object.freeze({...word}));
    assert.match(enriched.example, /[A-Za-z]/, word.word);
    assert.match(enriched.exampleTranslation, /[가-힣]/u, word.word);
    assert(!enriched.example.includes('\uFFFD'), word.word);
    assert(!enriched.exampleTranslation.includes('\uFFFD'), word.word);
    assert.equal(wordKey(enriched), wordKey(word));
    assert.equal(enriched.id, word.id);
  }
});
test('uploaded examples and other senses are not overwritten', () => {
  const custom = {word:'normal', meaning:'정상의', example:'My custom sentence.', exampleTranslation:'직접 작성한 문장'};
  assert.equal(withFeedExample(custom), custom);
  const other = {word:'normal', meaning:'수직선'};
  assert.equal(withFeedExample(other), other);
});
test('malformed source text is repaired for display without changing saved identity', () => {
  const original = {...deck.find(word=>word.word==='contradict with'), status:'mastered'};
  const result = withFeedExample(original);
  assert.equal(result.displayWord, 'contradict');
  assert.equal(result.displayIpa, null);
  assert.equal(result.status, 'mastered');
  assert.equal(wordKey(result), wordKey(original));
  assert.equal(withFeedExample(deck.find(word=>word.word==='hypotheses')).displayMeaning, '가설들 (hypothesis의 복수형)');
});
