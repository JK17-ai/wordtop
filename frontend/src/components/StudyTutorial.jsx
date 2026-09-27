import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoaMark } from './MoaCompanion';
const steps = [
  { icon:'👋', title:'단어모아에 오신 걸 환영해요', menu:'현재학습 · 오늘학습', text:'상단에서 지금 공부하는 단어장과 오늘 학습한 단어 수를 확인해요. 스크랩·마스터 탭의 숫자는 누적된 단어 수예요.' },
  { icon:'📖', title:'새 단어는 ALL FEED에서', menu:'ALL FEED · 잠깐 멈춤', text:'영어 단어에 맞는 뜻을 선택하세요. 단어 색과 얇은 막대가 남은 시간을 알려줘요. 잠깐 멈춤을 누르면 쉬어 갈 수 있어요.' },
  { icon:'⭐', title:'헷갈린 단어는 스크랩으로', menu:'SCRAP · ★ / ★★ / ★★★', text:'틀린 단어를 다시 공부해요. 뜻을 먼저 떠올린 뒤 퀴즈를 풀거나 바로 퀴즈를 풀 수 있어요. 빠르게 답한 단어는 별 하나, 오래 고민한 단어는 별 세 개로 구분해요.' },
  { icon:'🎧', title:'아는 단어도 한 번 더', menu:'MASTERED', text:'맞힌 단어는 마스터에서 복습해요. 한글 뜻을 보고 영어를 고르거나, 미국식 발음을 듣고 뜻을 고를 수 있어요. 첫 퀴즈에는 별이 없고 복습할 때 표시돼요.' },
  { icon:'⚙', title:'나에게 맞게 학습해요', menu:'설정 → 학습방법', text:'스크랩·마스터의 퀴즈 방식과 복습할 별 단계를 바꿀 수 있어요. 이 안내도 설정에서 언제든 다시 볼 수 있어요.' },
  { icon:'🏅', title:'함께 공부하고 배지를 모아요', menu:'＋ 업로드 · 가족 · 배지', text:'업로드에서 공부할 파일을 불러오고, 가족에서 학습 현황을 확인해요. 배지에서는 연속 정답으로 모은 메달과 이번 달·올해의 보상 합계를 볼 수 있어요.' },
];
export default function StudyTutorial({ onClose }) {
  const [step, setStep] = useState(0);
  const dialog = useRef(null);
  const heading = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  useEffect(() => { heading.current?.focus(); }, [step]);
  const onKeyDown = event => {
    if (event.key === 'Escape') { event.preventDefault(); close.current(false); }
    if (event.key !== 'Tab') return;
    const buttons = [...dialog.current.querySelectorAll('button:not(:disabled)')];
    const first = buttons[0], last = buttons.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const item = steps[step];
  return createPortal(<div className="tutorial-backdrop" onKeyDown={onKeyDown}>
    <section ref={dialog} className="tutorial-dialog" role="dialog" aria-modal="true" aria-labelledby="tutorial-heading" aria-describedby="tutorial-text">
      <div className="tutorial-top"><MoaMark/><span>단어모아 사용 가이드</span><span>{step + 1} / {steps.length}</span></div>
      <div className="tutorial-icon" aria-hidden="true">{item.icon}</div>
      <h2 id="tutorial-heading" ref={heading} tabIndex={-1}>{item.title}</h2>
      <div className="tutorial-menu">{item.menu}</div>
      <p id="tutorial-text">{item.text}</p>
      <div className="tutorial-dots" aria-hidden="true">{steps.map((_, index) => <i key={index} className={index === step ? 'active' : ''}/>)}</div>
      <div className="tutorial-navigation"><button disabled={step === 0} onClick={() => setStep(value => value - 1)}>이전</button><button className="tutorial-next" onClick={() => step === steps.length - 1 ? onClose(false) : setStep(value => value + 1)}>{step === steps.length - 1 ? '학습 시작하기' : '다음'}</button></div>
      <div className="tutorial-dismiss"><button onClick={() => onClose(true)}>다시 보지 않기</button><button onClick={() => onClose(false)}>Skip</button></div>
    </section>
  </div>, document.body);
}