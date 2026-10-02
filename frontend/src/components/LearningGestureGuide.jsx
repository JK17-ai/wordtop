import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import useDialogFocus from './useDialogFocus';

// Intentionally lives only in this app runtime: a new launch shows the guide again.
let dismissedThisLaunch = false;
export default function LearningGestureGuide({suspended = false}) {
  const [dismissed, setDismissed] = useState(() => dismissedThisLaunch);
  if (dismissed || suspended) return null;
  return <GestureDialog onClose={() => { dismissedThisLaunch = true; setDismissed(true); }}/>;
}
function GestureDialog({onClose}) {
  const dialog = useDialogFocus(onClose);
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    const previous = root.inert;
    root.inert = true;
    return () => { root.inert = previous; };
  }, []);
  return createPortal(<div className="learning-gesture-backdrop">
    <section className="learning-gesture-guide" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="learning-gesture-title" aria-describedby="learning-gesture-description">
      <small>터치로 가볍게 학습해요</small>
      <h2 id="learning-gesture-title">밀고, 두 번 톡</h2>
      <div className="learning-gesture-directions">
        <div><span aria-hidden="true">← ☆</span><strong>왼쪽으로 밀기</strong><p>몰라요</p></div>
        <div><span aria-hidden="true">✓ →</span><strong>오른쪽으로 밀기</strong><p>알아요</p></div>
      </div>
      <div className="learning-gesture-save"><span aria-hidden="true">♡</span><div><strong>카드를 두 번 톡</strong><p>더블탭 · 더블클릭으로 저장</p></div></div>
      <p id="learning-gesture-description">아래 버튼으로도 선택할 수 있어요.<br/>선택 표시가 잠깐 뜨고 다음 단어로 넘어가요.</p>
      <button onClick={onClose}>넘어가기</button>
    </section>
  </div>, document.body);
}
