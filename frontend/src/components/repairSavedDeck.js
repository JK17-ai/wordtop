import { cleanEbsMeaning } from './cleanEbsMeaning.js';
import { vocabularyCorrections } from './vocabularyCorrections.js';

export async function repairSavedDeck(data, saved, storageKey) {
  if (!saved?.words?.length) return data;
  const reference = vocabularyCorrections;
  const byId = new Map(reference.map(item => [item.id, item]));
  let changed = false;
  const repaired = data.map(item => {
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
