import {createPortal} from 'react-dom';
export default function PortraitOnly({active}){return active?createPortal(<div className="portrait-only" role="alert"><span aria-hidden="true">↻</span><h2>휴대폰을 세로로 돌려 주세요</h2><p>단어모아는 세로 화면에서 학습할 수 있어요.</p></div>,document.body):null;}
