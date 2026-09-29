import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseVocabulary} from '../src/components/parseVocabulary.js';
import {needsVocabularyOcr} from '../src/components/koreanVocabulary.js';
import {quizExercise,classifyWord} from '../src/components/learningFlow.js';
import {buildQuizChoices} from '../src/components/quizChoices.js';
import {rebuildStudyDeck} from '../src/components/studyState.js';
import {validateSnapshot} from '../src/lib/studySync.js';
import {addLibraryDeck,selectLibraryDeck,localDeckSave} from '../src/components/deckLibrary.js';
const text='동병상련(同病相憐): 같은 처지의 사람들이 서로\n위로하고 도움\n설상가상(雪上加霜): 어려운 일이 겹침\n유유상종: 비슷한 사람끼리 어울림\n새옹지마: 길흉화복을 예측하기 어려움';
test('Korean imports retain hanja, wrapped definitions and language',()=>{
 const words=parseVocabulary(text);assert.equal(words.length,4);assert.equal(words[0].hanja,'同病相憐');assert.equal(words[0].meaning,'같은 처지의 사람들이 서로 위로하고 도움');assert.equal(words[0].language,'ko-KR');
 assert.equal(parseVocabulary('apple 사과\nriver 강').length,2);
});
test('unreadable PDF text requires OCR even when it contains isolated Korean characters',()=>{
 assert(needsVocabularyOcr('੿'.repeat(60)+'한',[]));assert(!needsVocabularyOcr(text,parseVocabulary(text)));
});
test('Korean known quizzes reverse definitions and include full distractor pool',()=>{
 const words=parseVocabulary(text),settings={scrap:'recall',mastered:'english-context'};
 assert.equal(quizExercise({...words[0],status:'mastered'},settings),'reverse');assert.equal(quizExercise({...words[0],status:'scrap'},settings),'recall');
 assert.equal(buildQuizChoices(words[0],words,'reverse').length,2);assert.equal(quizExercise({word:'apple',status:'mastered'},settings),'english-context');
});
test('Korean metadata survives JSON snapshot and library switching without schema changes',()=>{
 const words=rebuildStudyDeck(classifyWord(parseVocabulary(text),0,'known'));
 const original={schemaVersion:1,deck:{name:'영어',words:[{id:0,word:'apple',meaning:'사과'}]}};
 const added=addLibraryDeck(original,'korean','국어',words);validateSnapshot(added);
 const restored=selectLibraryDeck(selectLibraryDeck(JSON.parse(JSON.stringify(added)),'original'),'korean');
 assert.deepEqual(localDeckSave(restored).words,words);assert.equal(restored.deck.words[0].judgment,'known');
});

test('Korean meaning and recall questions have exactly two distinct choices with the answer',()=>{const words=parseVocabulary(text);for(const mode of ['meaning','recall','reverse']){const options=buildQuizChoices(words[0],words,mode);assert.equal(options.length,2);assert.equal(new Set(options).size,2);assert(options.includes(mode==='reverse'?words[0].word:words[0].meaning));}});
test('wrapped Korean clauses with commas are not mistaken for vocabulary entries',()=>{const words=parseVocabulary('수주대토(守株待兎): 실효성 없는 기대는 시간을 허비\n하고, 우연한 행운을 기대하는 어리석음');assert.equal(words.length,1);assert.match(words[0].meaning,/하고, 우연한/);});
