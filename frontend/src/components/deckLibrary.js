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
  return {...snapshot,...captureDeck(selected),deckLibrary:{...library,activeId:id,decks:[{id:library.activeId,...captureDeck(snapshot)},...library.decks.filter(item=>item.id!==id)]}};
}
export function addLibraryDeck(snapshot, id, name, words) {
  validateWords(words);
  const library=snapshot.deckLibrary || emptyDeckLibrary();
  if(library.activeId===id || library.decks.some(item=>item.id===id))throw Error('중복된 단어장입니다.');
  return {...snapshot,deck:{name,words,cursors:{}},quizProgress:{activeKey:null,sessions:{}},quizSession:null,feedProgress:{cursor:null,entries:{}},
    deckLibrary:{...library,activeId:id,decks:[{id:library.activeId,...captureDeck(snapshot)},...library.decks]}};
}
export function archiveLibraryDeck(snapshot, id) {
  if (commonDeck(id)) throw Error('기본 제공 단어장은 삭제할 수 없어요.');
  const library=snapshot.deckLibrary || emptyDeckLibrary();
  const item=libraryItems(snapshot).find(entry=>entry.id===id);
  if (!item) throw Error('단어장을 찾지 못했어요.');
  if (id==='original' && item.deck.name==='2027 수능 EBS영단어') throw Error('기본 제공 단어장은 삭제할 수 없어요.');
  const next=id===library.activeId ? selectLibraryDeck(snapshot,commonDecks[0].id) : snapshot;
  return {...next,deckLibrary:{...next.deckLibrary,
    decks:next.deckLibrary.decks.filter(entry=>entry.id!==id),
    archived:[...(library.archived || []),{id,...captureDeck(item)}]}};
}
export function restoreLibraryDeck(snapshot, id) {
  const library=snapshot.deckLibrary || emptyDeckLibrary();
  const item=library.archived?.find(entry=>entry.id===id);
  if (!item) throw Error('복원할 단어장을 찾지 못했어요.');
  if (library.activeId===id || library.decks.some(entry=>entry.id===id)) throw Error('이미 복원된 단어장이에요.');
  return {...snapshot,deckLibrary:{...library,decks:[...library.decks,item],archived:library.archived.filter(entry=>entry.id!==id)}};
}
export function localDeckSave(snapshot) {
  return {...snapshot.deck,activeMs:snapshot.activeMs,quizSession:snapshot.quizSession,quizProgress:snapshot.quizProgress,feedProgress:snapshot.feedProgress,deckLibrary:snapshot.deckLibrary};
}
