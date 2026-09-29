import { sha256Hex, browserUUID } from './browserCrypto.js';
import { openStudyBackupStore, migrateStudyBackups } from './studyBackup.js';
import { validateWords, validateProgress, MAX_SNAPSHOT_BYTES } from './studyValidation.js';
// Snapshot sync deliberately stops on conflicting device edits instead of merging guesses.
export function validateSnapshot(value) {
  validateWords(value?.deck?.words);
  validateProgress(value);
  if (new TextEncoder().encode(JSON.stringify(value)).length > MAX_SNAPSHOT_BYTES) throw Error('단어장 저장 용량(8MB)을 초과했어요.');
  if (value?.schemaVersion !== 1 || !Array.isArray(value.deck?.words) || !value.deck.words.length
      || value.deck.words.length > 10000 || typeof value.deck.name !== 'string') throw Error('서버 학습 기록 형식을 확인해 주세요.');
  const ids = new Set();
  for (const word of value.deck.words) {
    if (!word || !['string', 'number'].includes(typeof word.id) || ids.has(word.id)
      || typeof word.word !== 'string' || typeof word.meaning !== 'string'
      || (word.status && !['new', 'scrap', 'mastered'].includes(word.status))) throw Error('단어 기록 형식이 올바르지 않습니다.');
    ids.add(word.id);
  }
  if (value.accuracy && (!Number.isInteger(value.accuracy.total) || !Number.isInteger(value.accuracy.correct)
    || value.accuracy.correct < 0 || value.accuracy.total < value.accuracy.correct || typeof value.accuracy.date !== 'string')) throw Error('정답률 기록 형식이 올바르지 않습니다.');
  if (value.activeMs !== undefined && (!Number.isFinite(value.activeMs) || value.activeMs < 0)) throw Error('학습 시간 형식이 올바르지 않습니다.');
  if (value.deckLibrary) {
    const library=value.deckLibrary;
    if(typeof library.activeId !== 'string' || !Array.isArray(library.decks)) throw Error('단어장 목록 형식을 확인해 주세요.');
    const deckIds=new Set([library.activeId]);
    for(const entry of library.decks){
      if(typeof entry?.id !== 'string' || deckIds.has(entry.id)) throw Error('단어장 식별자를 확인해 주세요.');
      deckIds.add(entry.id); validateSnapshot({...entry,schemaVersion:1});
    }
  }
  return value;
}

export async function snapshotHash(snapshot) {
  // PostgreSQL jsonb may reorder object keys. Array order remains significant.
  const stable = value => Array.isArray(value) ? value.map(stable)
    : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
  const data = new TextEncoder().encode(JSON.stringify(stable(snapshot)));
  return sha256Hex(data);
}

export function createStudySync({ rpc, storage, key, profileId, status = () => {} }) {
  let revision = null;
  let remoteConflict = null;
  let pending = null;
  let running = null;
  const metaKey = key + ':sync-meta-v1';
  const pendingKey = key + ':sync-pending-v1';
  const attemptKey = key + ':sync-attempt-v1';
  const read = name => { const raw = storage.getItem(name); return raw ? JSON.parse(raw) : null; };
  const checkRemote = data => {
    if (!data || data.profile_id !== profileId || !Number.isSafeInteger(data.revision) || data.revision < 0) throw Error('동기화 프로필 또는 버전을 확인해 주세요.');
    if (data.snapshot) validateSnapshot(data.snapshot);
    return data;
  };
  const call = async (name, args) => {
    const { data, error } = await rpc(name, args);
    if (error) throw error;
    return checkRemote(data);
  };
  const acknowledge = async (snapshot, rev) => {
    storage.setItem(metaKey, JSON.stringify({ revision: rev, hash: await snapshotHash(snapshot) }));
    revision = rev;
  };
  const backup = async (local, remote) => {
    const backupKey = key + ':sync-backup:' + Date.now() + ':' + browserUUID();
    const value = JSON.stringify({ local, remote });
    const archive = await openStudyBackupStore();
    if (archive) { try { await archive.put(backupKey, value); } finally { archive.close(); } return; }
    storage.setItem(backupKey, value);
    if (storage.getItem(backupKey) !== value) throw Error('기록 백업에 실패했습니다.');
  };

  return {
    async initialize(local, hasLocal) {
      status({ state: 'loading' });
      const archive = await openStudyBackupStore();
      if (archive) { try { await migrateStudyBackups(storage, key, archive); } finally { archive.close(); } }
      const savedPending = read(pendingKey);
      if (savedPending && !hasLocal) { local = validateSnapshot(savedPending); hasLocal = true; }
      const remote = await call('wordtop_load_study');
      const meta = read(metaKey);
      if (!remote.snapshot) {
        revision = 0;
        return { snapshot: local, shouldSave: true };
      }
      const hash = await snapshotHash(local);
      if (!hasLocal || hash === await snapshotHash(remote.snapshot) || (meta?.hash === hash)) {
        if (hasLocal && hash !== await snapshotHash(remote.snapshot)) await backup(local, remote.snapshot);
        await acknowledge(remote.snapshot, remote.revision);
        storage.removeItem(pendingKey);
        status({ state: 'saved' });
        return { snapshot: remote.snapshot, shouldSave: false };
      }
      if (meta?.revision === remote.revision) {
        revision = remote.revision;
        return { snapshot: local, shouldSave: true };
      }
      remoteConflict = remote;
      status({ state: 'conflict', remote: remote.snapshot });
      return { snapshot: local, conflict: true };
    },
    queue(snapshot) {
      validateSnapshot(snapshot);
      // Durable pending data is written before network I/O. Never silently lose it.
      storage.setItem(pendingKey, JSON.stringify(snapshot));
      pending = snapshot;
    },
    async flush() {
      if (running) return running;
      if (remoteConflict) { status({ state: 'conflict', remote: remoteConflict.snapshot }); return; }
      if (revision === null || !pending) return;
      running = (async () => {
        while (pending && !remoteConflict) {
          const sending = pending;
          const hash = await snapshotHash(sending);
          if (read(metaKey)?.hash === hash) {
            if (pending === sending) { pending = null; storage.removeItem(pendingKey); }
            status({ state: 'saved' });
            continue;
          }
          status({ state: 'saving' });
          const previousAttempt = read(attemptKey);
          storage.setItem(attemptKey, JSON.stringify({ hash, revision }));
          const result = await call('wordtop_save_study', { expected_revision: revision, new_snapshot: sending });
          if (result.conflict) {
            const remoteHash = result.snapshot ? await snapshotHash(result.snapshot) : null;
            // A successful write whose acknowledgement was lost is not a device conflict.
            if (remoteHash === hash || (previousAttempt?.revision === revision && remoteHash === previousAttempt?.hash)) {
              await acknowledge(result.snapshot, result.revision);
              storage.removeItem(attemptKey);
              if (remoteHash === hash && pending === sending) { pending = null; storage.removeItem(pendingKey); }
              status({ state: pending ? 'saving' : 'saved' });
              continue;
            }
            remoteConflict = result;
            status({ state: 'conflict', remote: result.snapshot });
            return;
          }
          await acknowledge(sending, result.revision);
          storage.removeItem(attemptKey);
          if (pending === sending) { pending = null; storage.removeItem(pendingKey); }
          status({ state: 'saved', uploaded: true });
        }
      })();
      try { await running; }
      catch (error) { status({ state: 'error', message: error.message }); throw error; }
      finally { running = null; }
    },
    async importBackup(snapshot, local) {
      validateSnapshot(snapshot);
      if(revision===null || remoteConflict)throw Error('서버 동기화와 충돌 해결을 먼저 완료해 주세요.');
      if(running)await running;
      await backup(local,snapshot);
      this.queue(snapshot);
    },
    async resolve(choice, local) {
      if (!remoteConflict) return null;
      const remote = remoteConflict;
      await backup(local, remote.snapshot);
      if (choice === 'remote') {
        await acknowledge(remote.snapshot, remote.revision);
        pending = null;
        storage.removeItem(pendingKey);
        remoteConflict = null;
        status({ state: 'saved' });
        return remote.snapshot;
      }
      if (choice !== 'local') throw Error('알 수 없는 선택입니다.');
      revision = remote.revision;
      remoteConflict = null;
      this.queue(local);
      await this.flush();
      return null;
    },
  };
}
