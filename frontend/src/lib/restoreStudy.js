import {validateSnapshot} from './studySync.js';
import {MAX_SNAPSHOT_BYTES} from './studyValidation.js';

// Import only validated study snapshots, never storage keys, identities or answer queues.
export function previewStudyBackup(text) {
 if(new TextEncoder().encode(text).length>MAX_SNAPSHOT_BYTES*4)throw Error('백업 파일은 32MB 이하로 선택해 주세요.');
 const file=JSON.parse(text), candidates=[];
 const add=(label,value)=>{if(!value)return;try{validateSnapshot(value);candidates.push({label,snapshot:value,wordCount:value.deck.words.length,deckCount:1+(value.deckLibrary?.decks.length||0)});}catch{/* Damaged historical copies are not restore candidates. */}};
 if(file.version===2)add('내려받은 현재 기록',file.snapshot);
 if(![1,2].includes(file.version))throw Error('지원하지 않는 백업 형식입니다.');
 for(const [key,raw] of Object.entries(file.records||{})){
  if(typeof raw!=='string')continue;
  let value;try{value=JSON.parse(raw);}catch{continue;}
  if(key.endsWith('wordtop-current-deck'))add('기기에 저장된 단어장',{...value,schemaVersion:1,deck:{name:value.name,words:value.words,cursors:value.cursors}});
  if(key.endsWith(':sync-pending-v1'))add('전송 대기 중이던 기록',value);
  if(key.includes(':sync-backup:')){add('이전 기기 기록',value.local);add('이전 서버 기록',value.remote);}
 }
 for(const entry of file.archived||[]){let value;try{value=JSON.parse(entry.value);}catch{continue;}add('보관된 기기 기록',value.local);add('보관된 서버 기록',value.remote);}
 if(!candidates.length)throw Error('복원할 수 있는 정상 학습 기록이 없어요. 원본 파일을 보관해 주세요.');
 return candidates;
}
