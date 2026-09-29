import {openStudyBackupStore} from './studyBackup.js';
// Export study data only: never include authentication sessions or recovery codes.
export async function exportStudy(storage, deckKey, snapshot) {
  const records = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key === deckKey || key?.startsWith(deckKey + ':')) records[key] = storage.getItem(key);
  }
  let archived=[], archiveWarning=null;
  try {
    const archive=await openStudyBackupStore();
    if(archive)try{archived=await archive.list(deckKey+':');}finally{archive.close();}
  } catch { archiveWarning='브라우저 백업 저장소를 읽지 못했어요. 현재 기기의 기록만 포함합니다.'; }
  const url = URL.createObjectURL(new Blob([JSON.stringify({version:snapshot?2:1, snapshot, records, archived, archiveWarning}, null, 2)], {type:'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = 'wordtop-study-backup.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
