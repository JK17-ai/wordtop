import { cleanEbsMeaning, cleanDanglingBrackets } from './cleanEbsMeaning.js';
import { vocabularyCorrections } from './vocabularyCorrections.js';
import {idiomCorrections} from './idiomCorrections.js';

export async function repairSavedDeck(data, saved, storageKey) {
  const reference = vocabularyCorrections;
  const byId = new Map(reference.map(item => [item.id, item]));
  let changed = false;
  const repaired = data.map(original => {
    const meaning = cleanDanglingBrackets(original.meaning);
    const idiom = idiomCorrections.find(patch => patch.id === original.id && patch.word === original.word && patch.oldMeaning === meaning);
    const nextMeaning = idiom?.meaning || meaning;
    const item = nextMeaning === original.meaning ? original : { ...original, meaning:nextMeaning };
    if (item !== original) changed = true;
    const target = byId.get(item.id);
    if (!target || target.word !== item.word || typeof item.meaning !== 'string') return item;
    if (!/[가-힣]/u.test(target.meaning) || cleanEbsMeaning(item.meaning) !== target.meaning) return item;
    const patch = { meaning: target.meaning };
    if (typeof target.ipa === 'string' && target.ipa) {
      patch.ipa = target.ipa;
      patch.ipaAccent = target.ipaAccent;
      patch.ipaStatus = target.ipaStatus;
    }
    if (Object.entries(patch).every(([key, value]) => item[key] === value)) return item;
    changed = true;
    return { ...item, ...patch };
  });
  if (changed && saved?.words?.length) {
    // 백업 실패 시 throw: 호출부에서 로딩을 중단해 원본 덮어쓰기를 방지합니다.
    const backupKey = storageKey + ':before-meaning-ipa-v1';
    try {
      if (localStorage.getItem(backupKey) === null) {
        const backup = JSON.stringify(saved);
        localStorage.setItem(backupKey, backup);
        if (localStorage.getItem(backupKey) !== backup) throw new Error('Backup verification failed');
      }
    } catch {
      throw new Error('기존 기록 백업에 실패해 보정을 중단했어요. 브라우저 데이터를 삭제하지 마세요.');
    }
  }
  return repaired;
}

// Feed keys include meanings; transfer only known vocabulary corrections, keeping learned state.
export function repairFeedKeys(progress, before, after) {
  if (!progress?.entries) return progress;
  const key = w => JSON.stringify([w.id,w.word,w.meaning]);
  const remap = new Map(before.map((word,i) => [key(word),key(after[i])]));
  return {...progress, cursor:remap.get(progress.cursor) || progress.cursor,
    entries:Object.fromEntries(Object.entries(progress.entries).map(([k,v]) => [remap.get(k) || k,v])),
    ...(progress.daily ? {daily:{...progress.daily, keys:Array.isArray(progress.daily.keys) ? progress.daily.keys.map(k => remap.get(k) || k) : []}} : {})};
}
export async function repairLibrary(library, storageKey) {
  if (!library) return {activeId:'original',decks:[]};
  const decks = [];
  for (const entry of library.decks) {
    const words = await repairSavedDeck(entry.deck.words,entry.deck,storageKey+':library:'+encodeURIComponent(entry.id));
    decks.push({...entry,deck:{...entry.deck,words},feedProgress:repairFeedKeys(entry.feedProgress,entry.deck.words,words)});
  }
  return {...library,decks};
}
