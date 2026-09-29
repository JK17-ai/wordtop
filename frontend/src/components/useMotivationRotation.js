import {useEffect,useState} from 'react';
import {MOTIVATION_BANNERS} from './motivationData.js';
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
