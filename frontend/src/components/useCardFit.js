import {useEffect} from 'react';
export default function useCardFit(){
 useEffect(()=>{
  let frame=0,closed=false;const observed=new WeakSet();
  const fit=()=>{frame=0;document.querySelectorAll('.korean-study-card,.word-card.korean-quiz').forEach(card=>{
   if(!observed.has(card)){observer.observe(card);observed.add(card);}
   card.style.setProperty('--card-fit','1');
   const overflow=()=>[card,...card.querySelectorAll('.korean-study-content,.word-heading,.choice-grid button')].some(el=>el.scrollHeight>el.clientHeight+2);
   for(let size=.97;overflow()&&size>=.64;size-=.03)card.style.setProperty('--card-fit',size.toFixed(2));
  });};
  const schedule=()=>{if(!closed&&!frame)frame=requestAnimationFrame(fit);};
  const observer=new ResizeObserver(schedule),mutation=new MutationObserver(schedule);
  mutation.observe(document.querySelector('.app-shell')||document.body,{childList:true,subtree:true});
  window.visualViewport?.addEventListener('resize',schedule);document.fonts.ready.then(schedule);schedule();
  return()=>{closed=true;observer.disconnect();mutation.disconnect();cancelAnimationFrame(frame);window.visualViewport?.removeEventListener('resize',schedule);};
 },[]);
}
