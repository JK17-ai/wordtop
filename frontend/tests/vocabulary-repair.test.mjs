import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVocabulary } from '../src/components/parseVocabulary.js';
import { repairSavedDeck } from '../src/components/repairSavedDeck.js';
import { getFeed, restorePositions } from '../src/components/studyState.js';

test('removes EBS heading and split numbers while preserving meaningful digits', () => {
  const entries = parseVocabulary('breadth 폭 0 3\nengaged 몰두[열중]하고 있는 0 1\nfeeling 정서, 감정 유형편 영단어·숙어 01 유형편 02\nquartet 현악 4중주\nsenior (대학의) 4학년\nlevel 수준 2');
  assert.equal(entries.find(x => x.word === 'breadth').meaning, '폭');
  assert.equal(entries.find(x => x.word === 'engaged').meaning, '몰두[열중]하고 있는');
  assert.equal(entries.find(x => x.word === 'feeling').meaning, '정서, 감정');
  assert.equal(entries.find(x => x.word === 'quartet').meaning, '현악 4중주');
  assert.equal(entries.find(x => x.word === 'level').meaning, '수준 2');
});

test('offline migration preserves study fields, cursor, profiles and backup; is repeatable', async () => {
  const storage = new Map([['other-profile', 'untouched'], ['accuracy', 'untouched']]);
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  const saved = { name: '2027', cursors: { mastered: 425, scrap: 511 }, words: [
    { id: 425, word: 'breadth', meaning: '폭 0 3', status: 'mastered', checked: true, count: 4 },
    { id: 511, word: 'engaged', meaning: '몰두[열중]하고 있는 0 1', status: 'scrap', checked: false },
    { id: 0, word: 'normal', meaning: '사용자 정의 뜻', status: 'new' },
  ] };
  const before = structuredClone(saved);
  const next = await repairSavedDeck(saved.words, saved, 'profile-a');
  assert.deepEqual(saved, before);
  assert.equal(next[0].meaning, '폭');
  assert.ok(next[0].ipa);
  assert.equal(next[0].count, 4);
  assert.equal(next[1].meaning, '몰두[열중]하고 있는');
  assert.deepEqual(next[2], before.words[2]);
  for (const tab of ['all', 'scrap', 'mastered']) assert.equal(getFeed(next, tab).length, getFeed(saved.words, tab).length);
  assert.deepEqual(restorePositions(next, saved.cursors), restorePositions(saved.words, saved.cursors));
  assert.deepEqual(JSON.parse(storage.get('profile-a:before-meaning-ipa-v1')), before);
  assert.deepEqual(await repairSavedDeck(next, { ...saved, words: next }, 'profile-a'), next);
  assert.equal(storage.get('other-profile'), 'untouched');
  assert.equal(storage.get('accuracy'), 'untouched');
  globalThis.localStorage = { getItem: () => null, setItem: () => { throw Error('Quota exceeded'); } };
  await assert.rejects(repairSavedDeck(saved.words, saved, 'full'), /백업/);
  assert.deepEqual(saved, before);
});
