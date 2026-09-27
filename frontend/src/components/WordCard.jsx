import { createResponseClock, responseStage } from "./responseTiming.js";
import FitWord from "./FitWord";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { unlockSound, playReaction } from "../reactionSound";
// false로 바꾸면 기존 타이머 바·숫자 표시로 되돌립니다.
const USE_WORD_COLOR_TIMER = true;

export default function WordCard({ item, onAnswer, suspended = false, choices = [], paused = false, onPausedChange, onFinish, reviewMode = false }) {
  const [remaining, setRemaining] = useState(10000);
  const setPaused = value => onPausedChange?.(typeof value === "function" ? value(paused) : value);
  const [result, setResult] = useState(null);
  const [flight, setFlight] = useState(null);
  const card = useRef(null);
  const done = useRef(false);
  const responseClock = useRef(null);
  if (!responseClock.current) responseClock.current = createResponseClock();
  const completion = useRef(null);
  const timerRef = useRef(null);
  const callbacks = useRef({ onAnswer });
  callbacks.current = { onAnswer };
  useEffect(() => () => { clearTimeout(completion.current); clearInterval(timerRef.current); }, []);
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
    if (done.current || suspended) return;
    done.current = true;
    responseClock.current.stop();
    const responseMs = choice === null ? 10000 : Math.round(responseClock.current.elapsed());
    const timing = { responseMs, responseStage: responseStage(responseMs), timedOut: choice === null };
    onFinish?.();
    clearInterval(timerRef.current);
    setPaused(false);
    setResult({ correct, choice });
    try { playReaction(correct); } catch { /* Audio must not block scoring. */ }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
    // Score exactly once even if a browser cannot render an optional effect.
    completion.current = setTimeout(() => {
      setFlight(null);
      callbacks.current.onAnswer?.(item.id, correct, timing);
    }, reduced ? 650 : 1300);
    try {
      const source = card.current?.querySelector('[data-correct="true"]')?.getBoundingClientRect();
      const target = document.querySelector('.feed-tabs button:nth-child(' + (correct ? 3 : 2) + ')')?.getBoundingClientRect();
      if (source?.width > 0 && target && !reduced) {
        setFlight({ left: source.left, top: source.top, width: source.width, height: source.height,
          dx: target.left + target.width / 2 - source.left - source.width / 2,
          dy: target.top + target.height / 2 - source.top - source.height / 2 });
      }
    } catch { /* Optional visual effect only. */ }
  };  const finishRef = useRef(finish);
  finishRef.current = finish;
  useEffect(() => {
    if (paused || result || suspended) return;
    responseClock.current.start();
    const timer = timerRef.current = setInterval(() => {
      const left = 10000 - responseClock.current.elapsed();
      setRemaining(left);
      if (left <= 0) { clearInterval(timer); finishRef.current(false); }
    }, 50);
    return () => { clearInterval(timer); responseClock.current.stop(); };
  }, [paused, result, suspended]);
  const elapsed = Math.max(0, Math.min(1, 1 - remaining / 10000));
  const start = elapsed < 0.5 ? [25, 25, 25] : [112, 43, 43];
  const end = elapsed < 0.5 ? [112, 43, 43] : [190, 35, 45];
  const progress = elapsed < 0.5 ? elapsed * 2 : (elapsed - 0.5) * 2;
  const timerColor = !USE_WORD_COLOR_TIMER || result ? '#191919' : 'rgb(' + start.map((value, i) => Math.round(value + (end[i] - value) * progress)).join(',') + ')';
  return <>
    <article onPointerDown={() => { try { unlockSound(); } catch { /* Audio is optional. */ } }} ref={card} style={{ "--word-timer-color": timerColor }} className={`word-card reel-card ${USE_WORD_COLOR_TIMER ? "color-timer" : "legacy-timer"} ${result ? result.correct ? 'answer-success' : 'answer-miss' : ''}`} onDoubleClick={event => { if (!done.current && !suspended && !event.target.closest('button')) setPaused(v => !v); }}>
      {/* 이전 버전 원본 보관: 타이머 바 + 숫자
        <div className="card-topline"><div className="timer-segments" role="progressbar" aria-label="남은 시간" aria-valuemin={0} aria-valuemax={10} aria-valuenow={Math.ceil(remaining / 1000)}>{[0,1,2,3,4].map(index => <i key={index} className={index < Math.ceil(remaining / 2000) ? "lit" : ""} />)}</div><span className="countdown-number">{Math.ceil(remaining / 1000)}</span></div>
      */}
      {!USE_WORD_COLOR_TIMER && (<div className="card-topline"><div className="timer-segments" role="progressbar" aria-label="남은 시간" aria-valuemin={0} aria-valuemax={10} aria-valuenow={Math.ceil(remaining / 1000)}>{[0,1,2,3,4].map(index => <i key={index} className={index < Math.ceil(remaining / 2000) ? "lit" : ""} />)}</div><span className="countdown-number">{Math.ceil(remaining / 1000)}</span></div>)}
      <span className="timer-accessible" role="timer" aria-live="off" aria-label={`남은 시간 ${Math.ceil(remaining / 1000)}초${paused ? ", 일시 정지" : ""}`} />
      <div className="word-heading">
        <FitWord as="h2" className="word-term" maxSize={46} leading={reviewMode && [1, 2, 3].includes(item.responseStage) && (
          <span className="response-stars" role="img" aria-label={`최근 응답 시간 ${item.responseStage}단계${item.timedOut ? ', 시간 초과' : ''}`} title="별 1개: 3초 이내 · 2개: 3~6초 · 3개: 6초 초과">
            {Array.from({ length: item.responseStage }, (_, index) => <span key={index} aria-hidden="true">★</span>)}
          </span>
        )}>{item.word}</FitWord>
      </div>
      {USE_WORD_COLOR_TIMER && (
        <div className="thin-timer" role="progressbar" aria-label="남은 시간" aria-valuemin={0} aria-valuemax={10} aria-valuenow={Math.ceil(remaining / 1000)}>
          {[0, 1, 2, 3, 4].map(index => <i key={index} className={index < Math.ceil(remaining / 2000) ? "lit" : ""} />)}
        </div>
      )}
        {item.ipa && (
          <div
            lang="en-US"
            aria-label="미국식 발음기호"
            className="word-ipa"
          >
            {item.ipa}
            {item.ipaStatus === "components" && (
              <small style={{ display: "block", fontSize: "11px" }}>
                구성 단어별 참고 발음
              </small>
            )}
          </div>
        )}
      {/* 이전 카드 내부 멈춤 버튼 보관
      <button className="pause-button" disabled={!!result || suspended} onClick={() => setPaused(v => !v)}>{paused ? '다시 시작' : '멈춤'}</button>
      */}
      <div className="quiz-prompt" role="status">{result ? result.correct ? '정답! 마스터함에 담아요 ✓' : result.choice === null ? '' : '괜찮아요! 정답을 기억하고 스크랩해요' : '올바른 뜻을 선택하세요'}</div>
      <div className="choice-grid">{options.map(choice => <button key={choice} data-correct={choice === item.meaning} disabled={!!result || suspended} className={result ? choice === item.meaning ? 'answer-reveal' : choice === result.choice ? 'answer-wrong' : 'answer-muted' : ''} onClick={() => finish(choice === item.meaning, choice)}>{choice}</button>)}</div>
    </article>
    {flight && createPortal(<div aria-hidden="true" className={`answer-flight ${result.correct ? 'to-mastered' : 'to-scrap'}`} style={{ left: flight.left, top: flight.top, width: flight.width, minHeight: flight.height, '--fly-x': `${flight.dx}px`, '--fly-y': `${flight.dy}px` }}>{item.meaning}<span>✦</span></div>, document.body)}
  </>;
}

