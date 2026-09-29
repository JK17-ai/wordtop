import {registeredHighlight,englishHighlight} from '../src/components/exampleHighlights.js';
import {test} from 'node:test';import assert from 'node:assert/strict';
import {addLibraryDeck,selectLibraryDeck,localDeckSave,libraryItems} from '../src/components/deckLibrary.js';
import {validateSnapshot} from '../src/lib/studySync.js';
import {contextQuestion} from '../src/components/contextQuestion.js';
import {feedExamples} from '../src/components/feedExamples.js';
const original={schemaVersion:1,deck:{name:'Original',words:[{id:1,word:'one',meaning:'하나',judgment:'known'}],cursors:{all:1}},quizProgress:{activeKey:'x',sessions:{x:{ids:[1],index:1,correct:1}}},feedProgress:{entries:{one:{judgment:'known'}}},activeMs:123};
test('adding, switching and JSON roundtrip preserve original quiz and feed records',()=>{const added=addLibraryDeck(original,'new','New',[{id:1,word:'two',meaning:'둘'}]);assert.equal(libraryItems(added).filter(item=>!item.common).length,2);assert.deepEqual(added.deckLibrary.decks[0].deck,original.deck);const switched=selectLibraryDeck(JSON.parse(JSON.stringify(added)),'original');assert.deepEqual(switched.deck,original.deck);assert.deepEqual(switched.quizProgress,original.quizProgress);assert.deepEqual(switched.feedProgress,original.feedProgress);assert.equal(switched.activeMs,123);assert.equal(localDeckSave(switched).deckLibrary.decks[0].id,'new');assert.equal(validateSnapshot(switched),switched);});
test('all registered Korean examples remain intact, without substituting an English word',()=>{for(const word of feedExamples){const question=contextQuestion(word);assert(question,word.word);assert.equal(question.before+(question.highlight||'')+question.after,word.exampleTranslation);}});

test('all 2141 registered examples have Korean and English target spans',()=>{for(const word of feedExamples){assert(contextQuestion(word).highlight,word.word);const span=registeredHighlight('en',word,word.example)||englishHighlight(word.example,word.displayWord||word.word);assert(span?.highlight,word.word);assert.equal(span.before+span.highlight+span.after,word.example);}});
