import {test} from 'node:test';
import assert from 'node:assert/strict';
import {libraryItems,selectLibraryDeck,localDeckSave} from '../src/components/deckLibrary.js';
import {commonDecks} from '../src/components/commonDecks.js';
import {validateSnapshot} from '../src/lib/studySync.js';
const original={schemaVersion:1,deck:{name:'My deck',words:[{id:1,word:'one',meaning:'하나',judgment:'known'}],cursors:{all:1}},quizProgress:{activeKey:'x',sessions:{x:{ids:[1],index:1,correct:1}}},feedProgress:{entries:{one:{judgment:'known'}}},activeMs:123};
test('existing and new libraries see common idioms without altering their current deck',()=>{
 const copy=JSON.stringify(original),items=libraryItems(original);
 assert.equal(items.filter(d=>d.common).length,1);
 assert.equal(items.find(d=>d.common).deck.words.length,186);
 assert.equal(JSON.stringify(original),copy);
});
test('selecting common deck preserves private progress and repeated selection has no duplicates',()=>{
 const shared=selectLibraryDeck(original,commonDecks[0].id);
 assert.equal(shared.deck.words.length,186); assert.equal(shared.quizSession,null);
 assert.equal(libraryItems(shared).filter(d=>d.id===commonDecks[0].id).length,1);
 assert.equal(validateSnapshot(shared),shared);
 assert.equal(localDeckSave(shared).deckLibrary.activeId,commonDecks[0].id);
 shared.deck.words[0].judgment='known';
 const back=selectLibraryDeck(shared,'original');
 assert.deepEqual(back.deck,original.deck);assert.deepEqual(back.quizProgress,original.quizProgress);assert.deepEqual(back.feedProgress,original.feedProgress);
 assert.equal(selectLibraryDeck(back,commonDecks[0].id).deck.words[0].judgment,'known');
 const another=selectLibraryDeck(original,commonDecks[0].id);
 assert.equal(another.deck.words[0].judgment,undefined);
});
test('common idioms have 186 unique stable IDs and no personal progress',()=>{
 const words=commonDecks[0].deck.words;
 assert.equal(new Set(words.map(w=>w.id)).size,186);assert.equal(new Set(words.map(w=>w.word)).size,186);
 for(const w of words){assert(w.hanja&&w.word&&w.meaning);assert.equal(w.status,'new');assert.equal(w.judgment,undefined);assert.equal(w.saved,undefined);assert(!/\s\d{1,2}$/.test(w.meaning));}
});
