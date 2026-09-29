import {useEffect} from 'react';
export default function useCardFit(){
 useEffect(()=>{
  let frame=0,closed=false,current=null;const observed=new WeakSet();
  let shell=document.querySelector('.app-shell');
  const fit=()=>{frame=0;
   const nextShell=document.querySelector('.app-shell');
   if(shell!==nextShell){shell=nextShell;current=null;}
   const quiz=document.querySelector('.word-card.korean-quiz');
   if(current!==quiz){current=quiz;if(shell)delete shell.dataset.quizCompact;}
   document.querySelectorAll('.korean-study-card,.word-card.korean-quiz').forEach(card=>{
   if(!observed.has(card)){observer.observe(card);observed.add(card);}
   if(card.matches('.korean-quiz')){
    // Measure the available card after headers, controls and safe areas take space.
    // Stop at readable type; exceptional content remains scrollable.
    // Compact decoration first. Never reset density in ResizeObserver's feedback cycle.
    if(card.scrollHeight>card.clientHeight+2&&shell){
     if(!shell.dataset.quizCompact)shell.dataset.quizCompact='true';
     card.dataset.compact='true';
     if(card.scrollHeight>card.clientHeight+2)shell.dataset.quizCompact='tight';
    }
    for(let size=18.5;card.scrollHeight>card.clientHeight+1&&size>=17;size-=.5){
     card.style.setProperty('--quiz-font',`${size}px`);
    }
    return;
   }
   card.dataset.compact = String(card.clientHeight < 350 && window.innerWidth <= 480);
   card.style.setProperty('--card-fit','1');
   const overflow=()=>[card,...card.querySelectorAll('.korean-study-content,.word-heading,.choice-grid button')].some(el=>el.scrollHeight>el.clientHeight+2);
   for(let size=.97;overflow()&&size>=.94;size-=.03)card.style.setProperty('--card-fit',size.toFixed(2));
  });};
  const schedule=()=>{if(!closed&&!frame)frame=requestAnimationFrame(fit);};
  const resize=()=>{current=null;document.querySelectorAll('.korean-quiz').forEach(card=>{delete card.dataset.compact;card.style.removeProperty('--quiz-font');});schedule();};
  const observer=new ResizeObserver(schedule),mutation=new MutationObserver(schedule);
  mutation.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);document.fonts.ready.then(schedule);schedule();
  return()=>{closed=true;observer.disconnect();mutation.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('resize',resize);};
 },[]);
}
