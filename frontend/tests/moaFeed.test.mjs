import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feedStorageKey, markFeed, wordKey } from '../src/components/moaFeedState.js';
const words = [{id:0,word:'normal',meaning:'정상의',status:'mastered'}, {id:1,word:'activate',meaning:'활성화하다',status:'scrap'}];
test('feed storage belongs to a profile and deck, independent of quiz status', () => {
 const key = feedStorageKey('one','deck',words);
 assert.notEqual(key,feedStorageKey('two','deck',words));
 assert.notEqual(key,feedStorageKey('one','other',words));
 assert.equal(key,feedStorageKey('one','deck',words.map(w=>({...w,status:'new'}))));
 assert.notEqual(key,feedStorageKey('one','deck',[{...words[0],meaning:'보통의'},words[1]]));
});
test('judgments and bookmarks preserve each other and never edit quiz data', () => {
 const before = structuredClone(words);
 const first = {cursor:wordKey(words[1]),entries:{}};
 const unknown = markFeed(first,words[0],{judgment:'unknown'});
 const saved = markFeed(unknown,words[0],{saved:true});
 const known = markFeed(saved,words[0],{judgment:'known'});
 assert.deepEqual(known.entries[wordKey(words[0])],{judgment:'known',saved:true});
 assert.equal(known.cursor,first.cursor);
 assert.deepEqual(first.entries,{});
 assert.deepEqual(words,before);
});
