import { createResponseClock, responseStage } from "./responseTiming.js";
import FitWord from "./FitWord";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { unlockSound, playReaction } from "../reactionSound";
// false로 바꾸면 기존 타이머 바·숫자 표시로 되돌립니다.
const USE_WORD_COLOR_TIMER = true;

export default function WordCard({ item, onAnswer, suspended = false, choices = [], paused = false, onPausedChange, onFinish, reviewMode = false, exercise = "meaning" }) {
  const [pauseHint, setPauseHint] = useState(false);
  const pauseHintTimer = useRef(null);
  useEffect(() => {
    if (!paused) setPauseHint(false);
    return () => clearTimeout(pauseHintTimer.current);
  }, [paused]);
  const showPauseHint = () => {
    clearTimeout(pauseHintTimer.current);
    setPauseHint(true);
    pauseHintTimer.current = setTimeout(() => setPauseHint(false), 2200);
  };
  const [recalling, setRecalling] = useState(exercise === "recall");
  const [heard, setHeard] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [listenCount, setListenCount] = useState(0);
  const speechRef = useRef(null);
  const speechTimeout = useRef(null);
  const listen = () => {
    if (speaking || suspended || result || paused) return;
    const synth = window.speechSynthesis;
    if (!synth || !window.SpeechSynthesisUtterance) { setSpeechError('이 브라우저는 듣기를 지원하지 않아요. 설정에서 학습방법을 바꿔 주세요.'); return; }
    const language = item.language || 'en-US';
    const voice = synth.getVoices().find(v=>v.lang.toLowerCase()===language.toLowerCase()) || synth.getVoices().find(v=>v.lang.split(/[-_]/)[0]===language.split(/[-_]/)[0]);
    if (!voice) { setSpeechError('이 단어의 언어 음성을 준비하지 못했어요. 다시 듣거나 기기의 음성 설정을 확인해 주세요.'); return; }
    responseClock.current.stop(); clearInterval(timerRef.current);
    setSpeaking(true); setSpeechError('');
    const utterance = new SpeechSynthesisUtterance(item.word); speechRef.current = utterance;
    utterance.voice = voice; utterance.lang = language; utterance.rate = 0.9;
    const finishSpeech = success => {
      if (speechRef.current !== utterance) return;
      speechRef.current = null; clearTimeout(speechTimeout.current); setSpeaking(false);
      if (success) { setHeard(true); setListenCount(n => n + 1); }
      else setSpeechError('발음을 재생하지 못했어요. 다시 눌러 주세요.');
    };
    utterance.onend = () => finishSpeech(true); utterance.onerror = () => finishSpeech(false);
    speechTimeout.current = setTimeout(() => { finishSpeech(false); synth.cancel(); }, 15000);
    try { synth.cancel(); synth.speak(utterance); } catch { finishSpeech(false); }
  };
  useEffect(() => {
    window.speechSynthesis?.getVoices();
    return () => { clearTimeout(speechTimeout.current); if (speechRef.current) { speechRef.current.onend = null; speechRef.current.onerror = null; speechRef.current = null; window.speechSynthesis?.cancel(); } };
  }, []);
  const answer = exercise === "reverse" ? item.word : item.meaning;
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
    return shuffle([answer, ...shuffle([...new Set(choices)].filter(x => x && x !== answer)).slice(0, 3)]);
  });
  const finish = (correct, choice = null) => {
    if (paused && choice !== null && !done.current && !suspended) { showPauseHint(); return; }
    if (done.current || suspended || speaking || paused || (exercise === "listening" && (!heard || speechError))) return;
    done.current = true;
    responseClock.current.stop();
    const responseMs = choice === null ? 10000 : Math.round(responseClock.current.elapsed());
    const timing = { exercise, listenCount, responseMs, responseStage: responseStage(responseMs), timedOut: choice === null, selectedMeaning: choice === null ? null : exercise === "reverse" ? (correct ? item.meaning : "[reverse incorrect] " + choice) : choice };
    onFinish?.(correct);
    clearInterval(timerRef.current);
    setPaused(false);
    setResult({ correct, choice, timing });
    if (!onFinish) void playReaction(correct).catch(() => { /* Standalone preview fallback. */ });
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
    // Score exactly once even if a browser cannot render an optional effect.
    completion.current = setTimeout(() => {
      setFlight(null);
      callbacks.current.onAnswer?.(item.id, correct, timing);
    }, reduced ? 350 : 650);
    try {
      const source = card.current?.querySelector('[data-correct="true"]')?.getBoundingClientRect();
      const target = document.querySelector('.feed-tabs button:nth-child(' + (correct ? 3 : 2) + ')')?.getBoundingClientRect();
      if (false && source?.width > 0 && target && !reduced) {
        setFlight({ left: source.left, top: source.top, width: source.width, height: source.height,
          dx: target.left + target.width / 2 - source.left - source.width / 2,
          dy: target.top + target.height / 2 - source.top - source.height / 2 });
      }
    } catch { /* Optional visual effect only. */ }
  };  const finishRef = useRef(finish);
  finishRef.current = finish;
  useEffect(() => {
    if (paused || result || suspended || recalling || speaking || (exercise === "listening" && (!heard || speechError))) return;
    responseClock.current.start();
    const timer = timerRef.current = setInterval(() => {
      const left = 10000 - responseClock.current.elapsed();
      setRemaining(left);
      if (left <= 0) { clearInterval(timer); finishRef.current(false); }
    }, 50);
    return () => { clearInterval(timer); responseClock.current.stop(); };
  }, [paused, result, suspended, recalling, speaking, heard, speechError, exercise]);
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
        {exercise === 'listening' && !result ? <div className="listening-heading">{reviewMode && [1,2,3].includes(item.responseStage) && <span className="listening-stars" aria-label={item.responseStage + '단계'}>{Array.from({length:item.responseStage},(_,i)=><span key={i}>★</span>)}</span>}<button className="listen-button" disabled={speaking || suspended || paused} onClick={listen}>{speaking ? '재생 중…' : heard ? '🔊 다시 듣기' : '🔊 발음 듣기'}</button></div> : <FitWord as="h2" className="word-term" maxSize={54} leading={reviewMode && [1, 2, 3].includes(item.responseStage) && (
          <span className="response-stars" role="img" aria-label={`최근 응답 시간 ${item.responseStage}단계${item.timedOut ? ', 시간 초과' : ''}`} title="별 1개: 3초 이내 · 2개: 3~6초 · 3개: 6초 초과">
            {Array.from({ length: item.responseStage }, (_, index) => <span key={index} aria-hidden="true">★</span>)}
          </span>
        )}>{result ? item.word : exercise === "reverse" ? item.meaning : item.word}</FitWord>}
      </div>
      {USE_WORD_COLOR_TIMER && (
        <div className="thin-timer" role="progressbar" aria-label="남은 시간" aria-valuemin={0} aria-valuemax={10} aria-valuenow={Math.ceil(remaining / 1000)}>
          {[0, 1, 2, 3, 4].map(index => <i key={index} className={index < Math.ceil(remaining / 2000) ? "lit" : ""} />)}
        </div>
      )}
        {((exercise !== "reverse" && exercise !== "listening") || result) && (
          <div
            lang="en-US"
            aria-label="미국식 발음기호"
            className="word-ipa"
          >
            {item.ipa || "\u00a0"}
          </div>
        )}
      {/* 이전 카드 내부 멈춤 버튼 보관
      <button className="pause-button" disabled={!!result || suspended || speaking || paused || (exercise === "listening" && (!heard || !!speechError))} onClick={() => setPaused(v => !v)}>{paused ? '다시 시작' : '멈춤'}</button>
      */}
      <div className="quiz-prompt" role="status" style={pauseHint ? {fontWeight:800,color:"#38551c",background:"#e5f3ce",borderRadius:8,padding:"6px 8px"} : undefined}>{(pauseHint && "학습 계속하기를 먼저 눌러주세요") || speechError || (result ? '\u00a0' : recalling ? '뜻을 떠올린 뒤 시작하세요' : exercise === 'listening' && !heard ? '발음을 들은 뒤 뜻을 선택하세요' : '\u00a0')}</div>
      <div className="choice-grid">{recalling ? <button className="recall-ready" disabled={suspended} onClick={() => { if (paused) showPauseHint(); else setRecalling(false); }}>떠올렸어요 · 퀴즈 시작</button> : options.map(choice => <button key={choice} data-correct={choice === answer} disabled={!!result || suspended} className={result ? choice === answer ? 'answer-reveal' : choice === result.choice ? 'answer-wrong' : 'answer-muted' : ''} onClick={() => finish(choice === answer, choice)}>{choice}</button>)}</div>
    </article>

    {flight && createPortal(<div aria-hidden="true" className={`answer-flight ${result.correct ? 'to-mastered' : 'to-scrap'}`} style={{ left: flight.left, top: flight.top, width: flight.width, minHeight: flight.height, '--fly-x': `${flight.dx}px`, '--fly-y': `${flight.dy}px` }}>{item.meaning}<span>✦</span></div>, document.body)}
  </>;
}

