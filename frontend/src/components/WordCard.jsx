import FitWord from "./FitWord";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { unlockSound, playReaction } from "../reactionSound";
export default function WordCard({ item, onAnswer, onNext, suspended = false, choices = [] }) {
  const [remaining, setRemaining] = useState(10000);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState(null);
  const [flight, setFlight] = useState(null);
  const card = useRef(null);
  const done = useRef(false);
  const completion = useRef(null);
  const callbacks = useRef({ onAnswer, onNext });
  callbacks.current = { onAnswer, onNext };
  useEffect(() => () => clearTimeout(completion.current), []);
  const [options] = useState(() => {
    const shuffle = values => {
      for (let i = values.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [values[i], values[j]] = [values[j], values[i]];
      }
      return values;
    };
    return shuffle([item.meaning, ...shuffle([...new Set(choices)].filter(x => x && x !== item.meaning)).slice(0, 3)]);
  });
  const finish = (correct, choice = null) => {
    if (done.current) return;
    done.current = true;
    setResult({ correct, choice });
    playReaction(correct);
    const source = card.current?.querySelector('[data-correct="true"]')?.getBoundingClientRect();
    const target = document.querySelector(`.feed-tabs button:nth-child(${correct ? 3 : 2})`)?.getBoundingClientRect();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (source && target && !reduced) setFlight({ left: source.left, top: source.top, width: source.width, height: source.height, dx: target.left + target.width / 2 - source.left - source.width / 2, dy: target.top + target.height / 2 - source.top - source.height / 2 });
    completion.current = setTimeout(() => {
      target && document.querySelector(`.feed-tabs button:nth-child(${correct ? 3 : 2})`)?.animate([{ boxShadow: `0 0 0 0 ${correct ? '#36bc88' : '#ee7394'}` }, { boxShadow: '0 0 0 16px transparent' }], { duration: 500 });
      callbacks.current.onAnswer?.(item.id, correct);
      callbacks.current.onNext?.();
    }, reduced ? 650 : 1300);
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;
  useEffect(() => {
    if (paused || result || suspended) return;
    let previous = performance.now();
    let left = remaining;
    const timer = setInterval(() => {
      const now = performance.now(); left -= now - previous; previous = now;
      setRemaining(Math.max(0, left));
      if (left <= 0) { clearInterval(timer); finishRef.current(false); }
    }, 50);
    return () => clearInterval(timer);
  }, [paused, result, suspended]);
  return <>
    <article onPointerDown={unlockSound} ref={card} className={`word-card reel-card ${result ? result.correct ? 'answer-success' : 'answer-miss' : ''}`} onDoubleClick={event => { if (!done.current && !event.target.closest('button')) setPaused(v => !v); }}>
      <div className="card-topline"><div className="timer-segments" role="progressbar" aria-label="남은 시간" aria-valuemin={0} aria-valuemax={10} aria-valuenow={Math.ceil(remaining / 1000)}>{[0,1,2,3,4].map(index => <i key={index} className={index < Math.ceil(remaining / 2000) ? "lit" : ""} />)}</div><span className="countdown-number">{Math.ceil(remaining / 1000)}</span></div>
      <FitWord as="h2" className="word-term" maxSize={46}>{item.word}</FitWord>
      <button className="pause-button" disabled={!!result} onClick={() => setPaused(v => !v)}>{paused ? '다시 시작' : '멈춤'}</button>
      <div className="quiz-prompt" role="status">{result ? result.correct ? '정답! 마스터함에 담아요 ✓' : result.choice === null ? '시간 종료 · 정답을 기억하고 스크랩해요' : '괜찮아요! 정답을 기억하고 스크랩해요' : '올바른 뜻을 선택하세요'}</div>
      <div className="choice-grid">{options.map(choice => <button key={choice} data-correct={choice === item.meaning} disabled={!!result} className={result ? choice === item.meaning ? 'answer-reveal' : choice === result.choice ? 'answer-wrong' : 'answer-muted' : ''} onClick={() => finish(choice === item.meaning, choice)}>{choice}</button>)}</div>
    </article>
    {flight && createPortal(<div aria-hidden="true" className={`answer-flight ${result.correct ? 'to-mastered' : 'to-scrap'}`} style={{ left: flight.left, top: flight.top, width: flight.width, minHeight: flight.height, '--fly-x': `${flight.dx}px`, '--fly-y': `${flight.dy}px` }}>{item.meaning}<span>✦</span></div>, document.body)}
  </>;
}
