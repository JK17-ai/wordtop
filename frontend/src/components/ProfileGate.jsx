import MoaLogo from './MoaLogo';
import { useEffect, useState } from 'react';
import { selectCharacter, loadProfile, migrateLocalRecords } from '../lib/profiles';
import { readProfileCache } from '../lib/profileCache.js';
const people = [
  {name:'제이크',avatar:'👨',color:'#e6eaff'},
  {name:'지니',avatar:'👩',color:'#ffe3ec'},
  {name:'새우깡',avatar:'🦐',color:'#ffead7'},
  {name:'갈매기',avatar:'🕊️',color:'#dcf4ee'},
];
export default function ProfileGate({ children }) {
  const [profile,setProfile] = useState(() => readProfileCache(localStorage));
  const [loading,setLoading] = useState(true);
  const [selected,setSelected] = useState(null);
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
  async function start(person) {
    if (busy) return;
    setSelected(person);
    setBusy(true); setError('');
    try {
      const value=await selectCharacter(person.name);
      if (hasOld && copyOld) migrateLocalRecords(value.id);
      else if (hasOld) localStorage.setItem('wordtop-legacy-owner',value.id);
      setProfile(value);
    } catch(e) { setError(e.message); }
    finally { setBusy(false); }
  }
  if(profile) return children(profile);
  // Existing server sessions without the new cache get a neutral loading screen,
  // never a character picker while their identity is still being checked.
  if(loading) return <main className="profile-screen" aria-busy="true"><header><b><MoaLogo/></b></header><p role="status">학습 기록을 불러오는 중…</p></main>;
  return <main className="profile-screen">
    <header><b><MoaLogo/></b><span>한 단어씩, 내 것으로.</span></header>
    <h1>누가 공부하나요?</h1>
    <p>처음 한 번 선택하면 이 기기에서 기억할게요.</p>
    {loading ? <p role="status">내 프로필 확인 중…</p> : <>
    <div className="profile-grid">{people.map(person=><button key={person.name} disabled={busy} aria-pressed={selected?.name===person.name}
      onClick={()=>start(person)} className={selected?.name===person.name?'chosen':''}>
      <span style={{background:person.color}}>{person.avatar}</span><strong>{person.name}</strong>
    </button>)}</div>
    {/* Previous invite input removed from the entry flow; claimProfile API is retained for rollback. */}
    {busy && <p role="status">{selected?.name}으로 연결 중…</p>}
    {hasOld && <label className="legacy-choice"><input type="checkbox" checked={copyOld} onChange={e=>setCopyOld(e.target.checked)} disabled={busy}/>이 기기의 기존 학습 기록 가져오기</label>}

    </>}
    {error && <div role="alert"><p>{error}</p><button disabled={busy || loading} onClick={restore}>연결 다시 확인</button></div>}
  </main>;
}
