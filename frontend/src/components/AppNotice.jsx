import useDialogFocus from './useDialogFocus';
import {createPortal} from 'react-dom';
export default function AppNotice({message,busy,onClose,onCancel}) {
  const dialog=useDialogFocus(onClose,busy);
  return createPortal(<div className="app-notice-backdrop"><section ref={dialog} tabIndex={-1} className="app-notice-dialog" role="dialog" aria-modal="true" aria-labelledby="app-notice-title" aria-describedby="app-notice-message" onKeyDown={event=>{if(event.key==='Escape'&&!busy)onClose();}}>
    <span className="app-notice-mark" aria-hidden="true">{busy?'⋯':'!'}</span><h2 id="app-notice-title">{busy?'단어장을 준비하고 있어요':'안내'}</h2><p id="app-notice-message" role="status" aria-live="polite">{message}</p>
    {busy && onCancel && <button onClick={onCancel}>가져오기 취소</button>}
    {!busy && <button autoFocus onClick={onClose}>확인</button>}
  </section></div>,document.body);
}
