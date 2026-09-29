import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
const query='(orientation: landscape) and (pointer: coarse) and (max-width: 1400px)';
export function usePortraitOnly(){
 const [landscape,setLandscape]=useState(()=>window.matchMedia(query).matches);
 useEffect(()=>{const media=window.matchMedia(query);const update=()=>setLandscape(media.matches);const lock=()=>{if(window.matchMedia('(pointer: coarse)').matches){try{window.screen.orientation?.lock?.('portrait').catch(()=>{});}catch{}}};media.addEventListener('change',update);window.addEventListener('pointerdown',lock,{once:true});lock();return()=>{media.removeEventListener('change',update);window.removeEventListener('pointerdown',lock);};},[]);
 return landscape;
}
export default function PortraitOnly({active}){return active?createPortal(<div className="portrait-only" role="alert"><span aria-hidden="true">↻</span><h2>휴대폰을 세로로 돌려 주세요</h2><p>단어모아는 세로 화면에서 학습할 수 있어요.</p></div>,document.body):null;}
