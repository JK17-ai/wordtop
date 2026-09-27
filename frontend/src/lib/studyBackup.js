// Move only verified backup copies; current decks and pending answers are untouched.
export async function openStudyBackupStore() {
  if (!globalThis.indexedDB) return null;
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('wordtop-study-backups-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('backups');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(Error('백업 저장소를 열지 못했습니다. 다른 앱 탭을 닫고 다시 시도해 주세요.'));
  });
  const operation = (mode, action) => new Promise((resolve, reject) => {
    const tx = db.transaction('backups', mode);
    const request = action(tx.objectStore('backups'));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = tx.onabort = () => reject(tx.error || Error('백업 저장에 실패했습니다.'));
  });
  return {
    async put(key, value) {
      await operation('readwrite', store => store.put(value, key));
      if (await operation('readonly', store => store.get(key)) !== value) throw Error('백업 검증에 실패했습니다.');
    },
    close: () => db.close(),
  };
}
export async function migrateStudyBackups(storage, key, archive) {
  if (!archive) return;
  const keys = [];
  for (let i = 0; i < storage.length; i++) {
    const name = storage.key(i);
    if (name?.startsWith(key + ':sync-backup:')) keys.push(name);
  }
  for (const name of keys) {
    const value = storage.getItem(name);
    if (value === null) continue;
    await archive.put(name, value);
    if (storage.getItem(name) === value) storage.removeItem(name);
  }
}
export const isStorageQuotaError = error => error?.name === 'QuotaExceededError' || error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' || /quota|저장 공간/i.test(error?.message || '');