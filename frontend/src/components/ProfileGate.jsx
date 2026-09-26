import { useEffect, useState } from 'react';
import { claimProfile, loadProfile, migrateLocalRecords } from '../lib/profiles';
const people = [
  {name:'제이크',avatar:'👨',color:'#e6eaff'},
  {name:'지니',avatar:'👩',color:'#ffe3ec'},
  {name:'새우깡',avatar:'🦐',color:'#ffead7'},
  {name:'갈매기',avatar:'🕊️',color:'#dcf4ee'},
];
export default function ProfileGate({ children }) {
  const [profile,setProfile] = useState(null);
  const [loading,setLoading] = useState(true);
  const [selected,setSelected] = useState(null);
  const [code,setCode] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [copyOld,setCopyOld] = useState(true);
  const [hasOld] = useState(() => {
    try { return !!localStorage.getItem('wordtop-current-deck') && !localStorage.getItem('wordtop-legacy-owner'); } catch { return false; }
  });
  async function restore() {
    setLoading(true); setError('');
    try { setProfile(await loadProfile()); } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active=true;
    loadProfile().then(value=>{if(active)setProfile(value);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[]);
  async function start(event) {
    event.preventDefault();
    if (busy || !selected) return;
    setBusy(true); setError('');
    try {
      const value=await claimProfile(selected.name,code);
      if (hasOld && copyOld) migrateLocalRecords(value.id);
      else if (hasOld) localStorage.setItem('wordtop-legacy-owner',value.id);
      setProfile(value); setCode('');
    } catch(e) { setError(e.message); }
    finally { setBusy(false); }
  }
  if(profile) return children(profile);
  return <main className="profile-screen">
    <header><b>WORDTOP</b><span>우리 가족의 작은 공부 습관</span></header>
    <h1>누가 공부하나요?</h1>
    <p>처음 한 번 선택하면 이 기기에서 기억할게요.</p>
    {loading ? <p role="status">내 프로필 확인 중…</p> : <>
    <div className="profile-grid">{people.map(person=><button key={person.name} disabled={busy} aria-pressed={selected?.name===person.name}
      onClick={()=>{setSelected(person);setError('');}} className={selected?.name===person.name?'chosen':''}>
      <span style={{background:person.color}}>{person.avatar}</span><strong>{person.name}</strong>
    </button>)}</div>
    {selected && <form onSubmit={start} className="profile-connect">
      <h2>{selected.name}으로 시작할까요?</h2>
      <label>내 초대코드<input type="password" autoComplete="off" required value={code} disabled={busy}
        onChange={e=>setCode(e.target.value)} placeholder="가족에게 받은 초대코드 붙여넣기" /></label>
      <p>다른 기기에서도 같은 이름과 코드를 사용하세요.</p>
      {hasOld && <label className="legacy-choice"><input type="checkbox" checked={copyOld} onChange={e=>setCopyOld(e.target.checked)} disabled={busy}/>이 기기의 기존 학습 기록 가져오기</label>}
      <button className="profile-start" disabled={busy || !code.trim()}>{busy?'연결 중…':'학습 시작'}</button>
    </form>}
    </>}
    {error && <div role="alert"><p>{error}</p><button disabled={busy || loading} onClick={restore}>연결 다시 확인</button></div>}
  </main>;
}
