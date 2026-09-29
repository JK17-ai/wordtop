import useDialogFocus from './useDialogFocus';
import AccountTools from './AccountTools';
import {useState} from 'react';
import {createPortal} from 'react-dom';
import {issueRecovery,updatePersonal} from '../lib/profiles';
import {readRecovery} from '../lib/recoveryCode.js';
import RecoveryDisplay from './RecoveryDisplay';
import OptionalDemographics from './OptionalDemographics';
export default function AccountPanel({profile,onClose,snapshot,onRestore}){
 const [name,setName]=useState(profile.name),[gender,setGender]=useState(profile.gender||''),[age,setAge]=useState(profile.age_band||'');
 const [code,setCode]=useState(()=>readRecovery(localStorage,profile.id)),[visible,setVisible]=useState(false),[confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const dialog=useDialogFocus(onClose,busy,'.active-profile');
 const save=async e=>{e.preventDefault();setBusy(true);setMessage('');try{const next=await updatePersonal(name,gender,age);window.dispatchEvent(new CustomEvent('wordtop-profile-updated',{detail:next}));setMessage('저장했습니다.');}catch(e){setMessage(e.message);}finally{setBusy(false);}};
 const issue=async()=>{setBusy(true);setMessage('');try{const next=await issueRecovery();setCode(next.recovery_code);setVisible(true);setConfirm(false);window.dispatchEvent(new CustomEvent('wordtop-profile-updated',{detail:next.profile}));if(next.storageWarning)setMessage('기기에 저장하지 못했어요. 코드를 별도로 보관해 주세요.');}catch(e){setMessage(e.message);}finally{setBusy(false);}};
 return createPortal(<div className="account-backdrop"><section ref={dialog} tabIndex={-1} className="account-panel" role="dialog" aria-modal="true" aria-labelledby="account-heading"><header><h2 id="account-heading">내 정보</h2><button disabled={busy} onClick={onClose} aria-label="내 정보 닫기">닫기</button></header><form onSubmit={save}><label>표시 이름<input required maxLength={30} value={name} onChange={e=>setName(e.target.value)}/></label><OptionalDemographics gender={gender} age={age} onGender={setGender} onAge={setAge}/><button className="account-primary" disabled={busy}>정보 저장</button></form><section className="account-recovery"><h3>학습 기록 복구</h3><p>이 기기에서는 자동으로 연결됩니다. 새 기기에서는 복구 코드를 입력해 주세요.</p>{visible&&code?<RecoveryDisplay code={code}/>:code?<button disabled={busy} onClick={()=>setVisible(true)}>복구 코드 보기</button>:<p>이 기기에 저장된 복구 코드가 없어요.</p>}{!confirm?<button className="account-text-button" disabled={busy} onClick={()=>setConfirm(true)}>{profile.has_recovery||code?'복구 코드 재발급':'복구 코드 발급'}</button>:<div><p>{profile.has_recovery||code?'새로 발급하면 이전 코드는 사용할 수 없습니다. 연결된 기기의 학습 기록은 유지됩니다.':'복구 코드를 발급하고 별도로 저장해 주세요.'}</p><div className="account-actions"><button disabled={busy} onClick={()=>setConfirm(false)}>취소</button><button disabled={busy} onClick={issue}>발급하기</button></div></div>}</section><AccountTools onBusyChange={setBusy} profile={profile} snapshot={snapshot} onRestore={onRestore}/><p role="status">{message}</p></section></div>,document.body);
}
