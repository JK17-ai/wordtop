import {useEffect, useRef} from 'react';
export default function useDialogFocus(onClose, busy = false, restoreSelector = null) {
  const dialog = useRef(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = busy ? null : onClose; }, [onClose,busy]);
  useEffect(() => {
    const previous = restoreSelector ? document.querySelector(restoreSelector) : document.activeElement, element = dialog.current;
    if (!element) return;
    const buttons = () => [...element.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(item => item.getClientRects().length);
    const focus = () => (buttons()[0] || element).focus();
    focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); close.current?.(); }
      if (event.key !== 'Tab') return;
      const items = buttons(), index = items.indexOf(document.activeElement);
      if (!items.length) { event.preventDefault(); element.focus(); }
      else if (event.shiftKey && index <= 0) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && (index < 0 || index === items.length - 1)) { event.preventDefault(); items[0].focus(); }
    };
    const contain = event => { if (!element.contains(event.target)) focus(); };
    document.addEventListener('keydown',keydown);
    document.addEventListener('focusin',contain);
    return () => { document.removeEventListener('keydown',keydown); document.removeEventListener('focusin',contain); requestAnimationFrame(() => { if (previous?.isConnected) previous.focus(); }); };
  }, [restoreSelector]);
  return dialog;
}
