import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoaSymbol } from './MoaLogo';
const steps = [
  { icon:'📖', title:'가볍게 시작하는 모아학습', menu:'모아학습 · 알아요·몰라요', text:'단어와 뜻, 예문을 함께 보세요. 왼쪽으로 밀면 ☆ 몰라요, 오른쪽으로 밀면 ✓ 알아요, 두 번 탭하면 ♡ 저장이에요. 버튼으로도 선택할 수 있고, 선택 표시 후 다음 단어로 넘어가요.' },
  { icon:'♡', title:'익힌 단어를 퀴즈로 연결해요', menu:'모아학습 → 모아퀴즈', text:'선택한 단어는 모아퀴즈의 학습한 단어·몰라요·알아요에서 확인해요. 퀴즈에서 틀린 단어는 몰라요로 옮겨 다시 익혀요. 저장 버튼은 따로 다시 보고 싶은 단어를 표시해요.' },
  { icon:'🌱', title:'한 번에 17개, 차근차근', menu:'모아학습 · 작은 목표', text:'17개씩 가볍게 익혀보세요. 목표를 채우면 방금 익힌 단어로 퀴즈를 풀거나, 다음 단어를 더 만나거나, 오늘 공부를 마칠 수 있어요.' },
  { icon:'ϟ', title:'학습한 단어를 퀴즈로 확인', menu:'모아퀴즈 · 학습한 단어', text:'모아학습에서 알아요·몰라요를 선택한 단어만 출제해요. 이전 문제 다음부터 이어서 풀고, 완료하면 다른 학습한 단어로 계속할 수 있어요. 틀린 단어는 몰라요로 이동해요.' },
  { icon:'↻', title:'몰라요로 고른 단어 확인', menu:'몰라요 · 떠올리기·퀴즈', text:'몰라요로 선택한 단어를 다시 공부해요. 뜻을 먼저 떠올린 뒤 퀴즈를 풀거나 바로 시작할 수 있어요. 별은 최근 퀴즈에서 답하는 데 걸린 시간을 나타내요.' },
  { icon:'🎧', title:'알아요로 고른 단어도 확인', menu:'알아요 · 예문·뜻', text:'알아요로 선택한 단어도 다시 확인해요. 기본은 국문 예문을 보고 영어 단어 고르기예요. 설정에서 영문 예문을 보고 한국어 뜻 고르기로 바꿀 수 있어요. 복습할 때가 되면 모아학습에서 알려드려요.' },
  { icon:'⚙', title:'내 방식으로 공부해요', menu:'내 기록 → 학습 설정', text:'몰라요와 알아요의 퀴즈 방식, 복습할 별 단계를 바꿀 수 있어요. 내 단어장에서는 검색·분류·저장과 한 단어 연습을 할 수 있어요. 이 가이드도 설정에서 다시 볼 수 있어요.' },
  { icon:'🏅', title:'함께 쌓는 공부 습관', menu:'내 기록 · 가족·배지', text:'가족 학습 기록과 내 배지·보상을 펼쳐보세요. 서버에서 확인한 연속 정답으로 배지가 쌓여요. 알아요 표시나 한 단어 연습은 배지에 포함되지 않아요.' },
];

export default function StudyTutorial({ onClose }) {
  const [step, setStep] = useState(0);
  const dialog = useRef(null);
  const heading = useRef(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
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
      <div className="tutorial-top"><MoaSymbol/><span>단어모아 사용 가이드</span><span>{step + 1} / {steps.length}</span></div>
      <div className="tutorial-icon" aria-hidden="true">{item.icon}</div>
      <h2 id="tutorial-heading" ref={heading} tabIndex={-1}>{item.title}</h2>
      <div className="tutorial-menu">{item.menu}</div>
      <p id="tutorial-text">{item.text}</p>
      <div className="tutorial-dots" aria-hidden="true">{steps.map((_, index) => <i key={index} className={index === step ? 'active' : ''}/>)}</div>
      <div className="tutorial-navigation"><button disabled={step === 0} onClick={() => setStep(value => value - 1)}>이전</button><button className="tutorial-next" onClick={() => step === steps.length - 1 ? onClose(false) : setStep(value => value + 1)}>{step === steps.length - 1 ? '학습 시작하기' : '다음'}</button></div>
      <div className="tutorial-dismiss"><button onClick={() => onClose(true)}>다시 보지 않기</button><button onClick={() => onClose(false)}>건너뛰기</button></div>
    </section>
  </div>, document.body);
}