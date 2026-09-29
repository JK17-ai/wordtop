import {commonDecks,commonDeck} from './commonDecks.js';
import { validateWords } from '../lib/studyValidation.js';
// Active deck stays in the legacy snapshot fields; other decks retain their own progress.
export const emptyDeckLibrary = () => ({activeId:'original', decks:[]});
export function captureDeck(snapshot) {
  return {deck:snapshot.deck, quizProgress:snapshot.quizProgress, quizSession:snapshot.quizSession, feedProgress:snapshot.feedProgress};
}
export function libraryItems(snapshot) {
  const library=snapshot.deckLibrary || emptyDeckLibrary();
  const saved=[{id:library.activeId,...captureDeck(snapshot)},...library.decks];
  return [...saved.map(item=>({...item,common:!!commonDeck(item.id)})),...commonDecks.filter(item=>!saved.some(savedItem=>savedItem.id===item.id))];
}
export function selectLibraryDeck(snapshot, id) {
  const library=snapshot.deckLibrary || emptyDeckLibrary();
  if(id===library.activeId)return snapshot;
  const selected=library.decks.find(item=>item.id===id);
  if(!selected){
    const shared=commonDeck(id);
    if(!shared)throw Error('단어장을 찾지 못했어요.');
    return addLibraryDeck(snapshot,id,shared.deck.name,shared.deck.words.map(word=>({...word})));
  }
  return {...snapshot,...captureDeck(selected),deckLibrary:{activeId:id,decks:[{id:library.activeId,...captureDeck(snapshot)},...library.decks.filter(item=>item.id!==id)]}};
}
export function addLibraryDeck(snapshot, id, name, words) {
  validateWords(words);
  const library=snapshot.deckLibrary || emptyDeckLibrary();
  if(library.activeId===id || library.decks.some(item=>item.id===id))throw Error('중복된 단어장입니다.');
  return {...snapshot,deck:{name,words,cursors:{}},quizProgress:{activeKey:null,sessions:{}},quizSession:null,feedProgress:{cursor:null,entries:{}},
    deckLibrary:{activeId:id,decks:[{id:library.activeId,...captureDeck(snapshot)},...library.decks]}};
}
export function localDeckSave(snapshot) {
  return {...snapshot.deck,activeMs:snapshot.activeMs,quizSession:snapshot.quizSession,quizProgress:snapshot.quizProgress,feedProgress:snapshot.feedProgress,deckLibrary:snapshot.deckLibrary};
}
