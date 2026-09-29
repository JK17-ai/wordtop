import {useState} from 'react';
import {listDevices,revokeDevice,leaveAccount,profileKey} from '../lib/profiles';
import {exportStudy} from '../lib/exportStudy.js';
import {previewStudyBackup} from '../lib/restoreStudy.js';
import RecoveryDisplay from './RecoveryDisplay';
export default function AccountTools({profile,snapshot,onRestore,onBusyChange}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[devices,setDevices]=useState(null),[action,setAction]=useState(null),[confirmation,setConfirmation]=useState(''),[newCode,setNewCode]=useState(null),[copies,setCopies]=useState([]),[selected,setSelected]=useState(0);
 const run=async fn=>{if(busy)return;setBusy(true);onBusyChange(true);setError('');try{await fn();}catch(e){setError(e.message);}finally{setBusy(false);onBusyChange(false);}};
 const read=async file=>{if(!file)return;if(file.size>32*1024*1024)throw Error('백업 파일은 32MB 이하로 선택해 주세요.');setCopies(previewStudyBackup(await file.text()));setSelected(0);};
 return <section className="account-tools"><h3>학습 기록 백업</h3>
 <button disabled={busy} onClick={()=>run(()=>exportStudy(localStorage,profileKey(profile.id,'wordtop-current-deck'),snapshot))}>학습 기록 내려받기</button>
 <label>백업 파일 미리보기<input type="file" accept=".json,application/json" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';void run(()=>read(file));}}/></label>
 {!!copies.length&&<div><label>복원할 기록<select value={selected} onChange={e=>setSelected(Number(e.target.value))}>{copies.map((copy,i)=><option key={i} value={i}>{copy.label} · {copy.snapshot.deck.name}</option>)}</select></label><p>단어장 {copies[selected].deckCount}개 · 현재 단어장 {copies[selected].wordCount}단어</p><p>현재 기록을 먼저 백업한 뒤 이 기록으로 바꿉니다. 배지와 계정 정보는 바뀌지 않습니다.</p><button disabled={busy} onClick={()=>run(async()=>{await onRestore(copies[selected].snapshot);setCopies([]);setError('학습 기록을 복원했습니다.');})}>이 기록으로 복원</button><button disabled={busy} onClick={()=>setCopies([])}>취소</button></div>}
 <h3>연결된 기기</h3><button disabled={busy} onClick={()=>run(async()=>setDevices(await listDevices()))}>기기 목록 확인</button>
 {devices?.map((device,i)=><div key={device.id}><p>{device.current?'현재 기기':`연결 기기 ${i+1}`} · {new Date(device.connected_at).toLocaleString('ko-KR')}</p>{!device.current&&<button disabled={busy} onClick={()=>setAction({type:'revoke',id:device.id})}>이 기기 연결 해제</button>}</div>)}
 {newCode&&<div><p>이전 복구 코드도 폐기했습니다. 새 코드를 보관해 주세요.</p><RecoveryDisplay code={newCode}/></div>}
 <h3>계정 관리</h3><button disabled={busy} onClick={()=>setAction({type:'logout'})}>이 기기에서 로그아웃</button><button disabled={busy} onClick={()=>{setConfirmation('');setAction({type:'delete'});}}>계정 삭제</button>
 {action&&<div role="group" aria-label="계정 작업 확인"><p>{action.type==='delete'?'모든 기기의 계정 연결과 서버 학습 기록·배지가 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.':action.type==='logout'?'이 기기의 계정 연결과 저장 기록을 지웁니다. 다시 연결하려면 복구 코드가 필요합니다. 미전송 기록은 먼저 백업해 주세요.':'선택한 기기의 서버 접근을 해제하고 복구 코드를 교체합니다. 해당 기기에 이미 내려받은 오프라인 사본은 원격으로 지울 수 없습니다.'}</p>
 {action.type==='delete'&&<label>확인 문구 ‘계정 삭제’<input value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off"/></label>}
 <button disabled={busy} onClick={()=>setAction(null)}>취소</button><button disabled={busy||(action.type==='delete'&&confirmation!=='계정 삭제')} onClick={()=>run(async()=>{if(action.type==='revoke'){const result=await revokeDevice(action.id);setNewCode(result.recovery_code);setDevices(await listDevices());}else await leaveAccount(profile.id,action.type==='delete'?confirmation:null);setAction(null);})}>{busy?'처리 중…':'확인하고 진행'}</button></div>}
 <p role="status">{error}</p></section>;
}
