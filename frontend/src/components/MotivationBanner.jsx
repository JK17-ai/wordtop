import { useEffect, useState } from 'react';
import './MotivationBanner.css';

export const MOTIVATION_BANNERS = [
  { id:'sprout', title:'작아도, 매일 자라는 중.', text:'오늘 만난 단어가 내일의 실력이 돼요.' },
  { id:'steps', title:'멀리 말고, 한 걸음만.', text:'지금 익힌 한 단어면 충분한 시작이에요.' },
  { id:'gem', title:'몰랐던 단어가 내 보물로.', text:'틀려도 괜찮아요. 다시 만나면 더 익숙해져요.' },
];
function Illustration({kind}) {
  return <svg viewBox="0 0 104 64" fill="none" aria-hidden="true" focusable="false">
    <ellipse cx="56" cy="56" rx="37" ry="5" fill="#dceabb"/>
    {kind==='sprout' ? <>
      <path d="M42 40h31l-5 17H47z" fill="#b4ee59" stroke="#334d27" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M57 40V22" stroke="#334d27" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M57 31C39 32 34 23 35 16c14-1 23 4 22 15Z" fill="#baff48" stroke="#334d27" strokeWidth="2"/>
      <path d="M57 24C57 10 69 7 79 10c-1 12-9 18-22 14Z" fill="#e0f6ab" stroke="#334d27" strokeWidth="2"/>
      <path d="m19 20 3-5 3 5-3 5Zm66 17 3-5 3 5-3 5Z" fill="#84ba38"/>
      <path d="M53 47h1m8 0h1m-9 4q4 3 8 0" stroke="#334d27" strokeWidth="2" strokeLinecap="round"/>
    </> : kind==='steps' ? <>
      <path d="M23 55V43h19V31h20V19h20v36Z" fill="#d7efa5" stroke="#334d27" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M42 55V43m20 12V31" stroke="#a1ca63" strokeWidth="2"/>
      <circle cx="40" cy="17" r="7" fill="#baff48" stroke="#334d27" strokeWidth="2"/>
      <path d="m39 25-5 10 12 1 7-8m-16 6-8 7m10-15 10-3" stroke="#334d27" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M81 18V4l12 4-12 5" fill="#baff48" stroke="#334d27" strokeWidth="2" strokeLinejoin="round"/>
    </> : <>
      <path d="m29 27 13-14h25l14 14-26 29Z" fill="#baff48" stroke="#334d27" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M29 27h52M42 13l-2 14 15 29 14-29-2-14M40 27l15-14 14 14" stroke="#689733" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M18 17v8m-4-4h8m62 18v8m-4-4h8M79 7v6m-3-3h6" stroke="#689733" strokeWidth="2" strokeLinecap="round"/>
    </>}
  </svg>;
}
// Replace this slot's content with a clearly labelled ad when an ad provider is added.
// No ad SDK, tracking or external requests are loaded here.
// Keep both assignments alive across menu changes. Rotate only the visible slot.
export function useMotivationRotation(activeMode) {
  const [indices,setIndices]=useState(()=>{
    const feed=Math.floor(Math.random()*MOTIVATION_BANNERS.length);
    return {feed,quiz:(feed+1+Math.floor(Math.random()*2))%3};
  });
  useEffect(()=>{
    if(!['feed','quiz'].includes(activeMode)) return;
    const timer=setInterval(()=>{
      if(document.visibilityState!=='visible') return;
      setIndices(previous=>{
        const other=activeMode==='feed'?'quiz':'feed';
        const candidates=MOTIVATION_BANNERS.map((_,i)=>i).filter(i=>i!==previous[activeMode] && i!==previous[other]);
        return {...previous,[activeMode]:candidates[Math.floor(Math.random()*candidates.length)]};
      });
    },20000);
    return ()=>clearInterval(timer);
  },[activeMode]);
  return indices;
}
export default function MotivationBanner({index=0}) {
  const banner=MOTIVATION_BANNERS[index];
  return <aside className="feed-message-slot motivation-slot" aria-label="오늘의 응원" data-slot="learning-message-ad" data-content-type="motivation">
    <div className="motivation-banner" key={banner.id}>
      <div className="motivation-copy"><strong>{banner.title}</strong><p>{banner.text}</p></div>
      <div className="motivation-art"><Illustration kind={banner.id}/></div>
    </div>
  </aside>;
}
