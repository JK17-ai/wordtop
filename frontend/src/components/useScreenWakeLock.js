import { useEffect } from 'react';
export default function useScreenWakeLock() {
 useEffect(() => {
  if (!navigator.wakeLock?.request) return;
  let closed=false, pending=false, lock=null;
  const release=()=>{const previous=lock;lock=null;if(previous)void previous.release().catch(()=>{});};
  const acquire=async()=>{
   if(closed||pending||lock||document.visibilityState!=='visible')return;
   pending=true;
   try {
    const next=await navigator.wakeLock.request('screen');
    if(closed||document.visibilityState!=='visible'){await next.release();return;}
    lock=next;
    next.addEventListener('release',()=>{if(lock===next)lock=null;},{once:true});
   } catch { /* Device power policy may deny a request. Retry on the next interaction. */ }
   finally {pending=false;}
  };
  const visibility=()=>{if(document.visibilityState==='visible')void acquire();else release();};
  document.addEventListener('visibilitychange',visibility);
  document.addEventListener('pointerdown',acquire,{passive:true});
  document.addEventListener('keydown',acquire);
  void acquire();
  return()=>{closed=true;document.removeEventListener('visibilitychange',visibility);document.removeEventListener('pointerdown',acquire);document.removeEventListener('keydown',acquire);release();};
 },[]);
}
