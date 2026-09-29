// Active deck stays in the legacy snapshot fields; other decks retain their own progress.
export const emptyDeckLibrary = () => ({activeId:'original', decks:[]});
export function captureDeck(snapshot) {
  return {deck:snapshot.deck, quizProgress:snapshot.quizProgress, quizSession:snapshot.quizSession, feedProgress:snapshot.feedProgress};
}
export function libraryItems(snapshot) {
  const library=snapshot.deckLibrary || emptyDeckLibrary();
  return [{id:library.activeId,...captureDeck(snapshot)},...library.decks];
}
export function selectLibraryDeck(snapshot, id) {
  const library=snapshot.deckLibrary || emptyDeckLibrary();
  if(id===library.activeId)return snapshot;
  const selected=library.decks.find(item=>item.id===id);
  if(!selected)throw Error('단어장을 찾지 못했어요.');
  return {...snapshot,...captureDeck(selected),deckLibrary:{activeId:id,decks:[{id:library.activeId,...captureDeck(snapshot)},...library.decks.filter(item=>item.id!==id)]}};
}
export function addLibraryDeck(snapshot, id, name, words) {
  const library=snapshot.deckLibrary || emptyDeckLibrary();
  if(libraryItems(snapshot).some(item=>item.id===id))throw Error('중복된 단어장입니다.');
  return {...snapshot,deck:{name,words,cursors:{}},quizProgress:{activeKey:null,sessions:{}},quizSession:null,feedProgress:{cursor:null,entries:{}},
    deckLibrary:{activeId:id,decks:[{id:library.activeId,...captureDeck(snapshot)},...library.decks]}};
}
export function localDeckSave(snapshot) {
  return {...snapshot.deck,activeMs:snapshot.activeMs,quizSession:snapshot.quizSession,quizProgress:snapshot.quizProgress,feedProgress:snapshot.feedProgress,deckLibrary:snapshot.deckLibrary};
}
