import {useEffect,useState} from 'react';
const query='(orientation: landscape) and (pointer: coarse) and (max-height: 500px)';
export function usePortraitOnly(){
 const [landscape,setLandscape]=useState(()=>window.matchMedia(query).matches);
 useEffect(()=>{const media=window.matchMedia(query);const update=()=>setLandscape(media.matches);const lock=()=>{if(window.matchMedia(query).matches){try{window.screen.orientation?.lock?.('portrait').catch(()=>{});}catch{/* Orientation locking is optional. */}}};media.addEventListener('change',update);window.addEventListener('pointerdown',lock,{once:true});lock();return()=>{media.removeEventListener('change',update);window.removeEventListener('pointerdown',lock);};},[]);
 return landscape;
}
