import MoaLogo from './MoaLogo';
import {useEffect,useState} from 'react';
import {createPersonal,recoverPersonal,loadProfile} from '../lib/profiles';
import OptionalDemographics from './OptionalDemographics';
import RecoveryDisplay from './RecoveryDisplay';
import {generateRecovery} from '../lib/recoveryCode.js';
import PortraitOnly from './PortraitOnly';
import {usePortraitOnly} from './usePortraitOnly';
export default function ProfileGate({children,preview=false}){
 const [profile,setProfile]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [mode,setMode]=useState('new'),[gender,setGender]=useState(''),[age,setAge]=useState(''),[code,setCode]=useState(''),[draftCode]=useState(generateRecovery);
 const [recoveryWarning,setRecoveryWarning]=useState(null);
 const landscape=usePortraitOnly();
 const restore=async()=>{setLoading(true);setError('');try{setProfile(await loadProfile());}catch(e){setError(e.message);}finally{setLoading(false);}};
  // eslint-disable-next-line react-hooks/set-state-in-effect -- External storage/network subscriptions and their error states are synchronized here; updates are guarded by stable dependencies.
 useEffect(()=>{if(preview)setLoading(false);else void restore();},[preview]);
 useEffect(()=>{const update=e=>setProfile(e.detail);window.addEventListener('wordtop-profile-updated',update);return()=>window.removeEventListener('wordtop-profile-updated',update);},[]);
 useEffect(()=>{
  if(preview||!profile)return;
  let active=true,checking=false;
  const check=async()=>{if(checking||document.hidden||!navigator.onLine)return;checking=true;try{const next=await loadProfile();if(active)setProfile(next);}catch{/* Preserve offline access; authoritative revocation returns null. */}finally{checking=false;}};
  const storage=e=>{if(e.key==='wordtop-selected-profile-v1'&&!e.newValue)setProfile(null);};
  const timer=setInterval(check,60000);
  window.addEventListener('storage',storage);window.addEventListener('online',check);document.addEventListener('visibilitychange',check);
  return()=>{active=false;clearInterval(timer);window.removeEventListener('storage',storage);window.removeEventListener('online',check);document.removeEventListener('visibilitychange',check);};
 },[preview,profile]);
 const submit=async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{if(preview){setProfile({id:'preview',name:'GUEST01'});return;}const result=mode==='new'?await createPersonal('',gender,age,draftCode):await recoverPersonal(code);if(result.storageWarning)setRecoveryWarning(result.recovery_code || (mode==='new'?draftCode:code));setProfile(result.profile);}catch(e){setError(e.message);}finally{setBusy(false);}};
 if(profile&&preview)return <main className="profile-screen personal-entry"><h1>첫 시작 화면 확인 완료</h1><p>실제 서비스에서는 바로 학습 화면으로 이동합니다.</p><p>미리보기에서는 계정과 학습 기록을 생성하지 않습니다.</p><button onClick={()=>setProfile(null)}>처음 화면 다시 보기</button></main>;
 if(profile&&recoveryWarning)return <main className="profile-screen personal-entry"><h1>복구 코드를 따로 보관해 주세요</h1><p role="alert">이 기기에 코드를 저장하지 못했어요. 다른 기기에서 기록을 찾으려면 이 코드가 필요합니다.</p><RecoveryDisplay code={recoveryWarning}/><button onClick={()=>setRecoveryWarning(null)}>보관했어요 · 계속하기</button></main>;
 if(profile)return children(profile);
 return <><PortraitOnly active={landscape}/><main className="profile-screen personal-entry" inert={landscape?true:undefined}><header><b><MoaLogo/></b><span>한 단어씩, 내 것으로.</span></header>{preview&&<small role="status">화면 미리보기 · 입력 내용은 저장되지 않습니다</small>}
 {loading?<p role="status">내 학습 기록을 확인하고 있어요…</p>:<><h1>{mode==='new'?'가볍게 시작해요':'내 기록 불러오기'}</h1><p>{mode==='new'?'GUEST 이름이 자동으로 만들어져요. 나중에 내 정보에서 바꿀 수 있어요.':'저장해 둔 복구 코드로 기존 학습 기록을 연결해요.'}</p><form onSubmit={submit}>{mode==='new'?<><div className="guest-name-preview"><strong>GUEST</strong><span>시작 순서에 따라 번호가 붙어요.</span></div><OptionalDemographics gender={gender} age={age} onGender={setGender} onAge={setAge}/><small>성별·나이대는 입력하지 않아도 시작할 수 있어요.</small><h2 className="onboarding-recovery-title">내 복구 코드</h2><RecoveryDisplay code={draftCode}/></>:<label>복구 코드<input autoComplete="off" autoCapitalize="none" spellCheck={false} required value={code} onChange={e=>setCode(e.target.value)} placeholder="저장한 복구 코드를 입력해 주세요"/></label>}<button className="account-primary" disabled={busy||!!error&&loading}>{busy?'연결 중…':mode==='new'?'학습 시작하기 →':'기록 불러오기 →'}</button></form><button className="account-text-button" disabled={busy} onClick={()=>{setMode(mode==='new'?'recover':'new');setError('');}}>{mode==='new'?'기존 기록이 있어요 · 복구 코드 입력':'처음이에요 · 새로 시작하기'}</button></>}
 {error&&<p role="alert" className="account-error">{error}</p>}{!loading&&!profile&&error&&<button onClick={restore} disabled={busy}>연결 다시 확인</button>}
 </main></>;
}
