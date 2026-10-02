import {test} from 'node:test';
import assert from 'node:assert/strict';
import {commonDecks} from '../src/components/commonDecks.js';
import {archiveLibraryDeck,restoreLibraryDeck,selectLibraryDeck,libraryItems} from '../src/components/deckLibrary.js';
import {validateSnapshot} from '../src/lib/studySync.js';

test('NAWL is selectable with 957 distinct words, Korean glosses and short examples',()=>{
  const nawl=commonDecks.find(item=>item.id==='common:en-nawl-v1');
  assert.equal(nawl.deck.words.length,957);
  assert.equal(new Set(nawl.deck.words.map(word=>word.word)).size,957);
  assert.equal(nawl.deck.words[0].word,'abdominal');
  assert.equal(nawl.deck.words.at(-1).word,'yeast');
  for(const word of nawl.deck.words){
    assert.match(word.meaning,/[가-힣]/);
    assert(word.example.trim().split(/\s+/).length<=12);
    assert.equal(word.language,'en-US');
    assert.equal(word.saved,undefined);
  }
  const state={schemaVersion:1,deck:{name:'내 자료',words:[{id:'one',word:'one',meaning:'하나'}]}};
  assert.equal(validateSnapshot(selectLibraryDeck(state,nawl.id)).deck.words.length,957);
});
const personal={schemaVersion:1,deck:{name:'생활과윤리',words:Array.from({length:27},(_,i)=>({id:`p${i}`,word:`개념${i}`,meaning:'설명',saved:true}))},feedProgress:{cursor:'p1',entries:{p1:{judgment:'unknown'}}},activeMs:100};
test('deleting an active personal 27-word deck preserves its progress for restoration',()=>{
  const before=structuredClone(personal);
  const deleted=archiveLibraryDeck(personal,'original');
  validateSnapshot(deleted);
  assert(!libraryItems(deleted).some(item=>item.id==='original'));
  assert.equal(deleted.deckLibrary.archived[0].deck.words.length,27);
  const switched=selectLibraryDeck(deleted,'common:en-nawl-v1');
  assert.equal(switched.deckLibrary.archived.length,1);
  const restored=selectLibraryDeck(restoreLibraryDeck(switched,'original'),'original');
  assert.deepEqual(restored.deck,personal.deck);
  assert.deepEqual(restored.feedProgress,personal.feedProgress);
  assert.deepEqual(personal,before);
});
test('deleting an inactive private deck leaves the active common 100-word deck unchanged',()=>{
  const current=selectLibraryDeck(personal,'common:ko-ethics-patterns-v1');
  const deleted=archiveLibraryDeck(current,'original');
  assert.deepEqual(deleted.deck,current.deck);
  assert.equal(deleted.deck.words.length,100);
  assert.throws(()=>archiveLibraryDeck(deleted,'common:ko-ethics-patterns-v1'));
  assert.throws(()=>archiveLibraryDeck(deleted,'missing'));
  const corrupt=structuredClone(deleted);
  corrupt.deckLibrary.archived[0].deck.words[0].id=null;
  assert.throws(()=>validateSnapshot(corrupt));
});
