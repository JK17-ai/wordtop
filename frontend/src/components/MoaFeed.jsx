import KoreanStudyContent from './KoreanStudyContent';
import { isKoreanWord } from './koreanVocabulary.js';
import { selfJudgment, quizPool } from './quizSessions.js';
import StudyExample from './StudyExample';
import { reviewPriority } from './learningFlow.js';
import MeaningText from './MeaningText';
import { withFeedExample } from './feedExamples';
import { playFeedChime } from '../reactionSound';
import { useEffect, useMemo, useRef, useState } from 'react';
import FitWord from './FitWord';
import useFeedLayout from './useFeedLayout';
import {FEED_CONFIRM_MS, swipeJudgment, isDoubleTap} from './feedGestures';
import LearningGestureGuide from './LearningGestureGuide';
import { feedStorageKey, readFeed, markFeed, wordKey, shuffleFeed, feedDay, dailySteps, recordFeedStep } from './moaFeedState';

// Survives menu changes, but a fresh page visit starts a new shuffled session.
const feedSessions = new Map();
function openFeedSession(words, key) {
  if (!feedSessions.has(key)) {
    feedSessions.set(key, { words:shuffleFeed(words), state:{ ...readFeed(key), cursor:null } });
  }
  return feedSessions.get(key);
}
export default function MoaFeed(props) {
  const storageKey = useMemo(() => feedStorageKey(props.profileId, `${props.name}:${props.deckId || "original"}`, props.words), [props.profileId, props.name, props.deckId, props.words]);
  return <><LearningGestureGuide suspended={props.disabled || props.guideSuspended}/><FeedSession key={storageKey} {...props} storageKey={storageKey}/></>;
}
function FeedSession({ words:sourceWords, storageKey, disabled, onClassify, onQuiz, progress, onProgress }) {
  const [session] = useState(() => openFeedSession(sourceWords, storageKey));
  const currentWords = new Map(sourceWords.map(w=>[w.id,w]));
  const words = session.words.map(original=>currentWords.get(original.id) || original);
  const [state, setState] = useState(() => ({...(progress || session.state), entries:(progress || session.state).entries || {}}));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [day, setDay] = useState(feedDay);
  const [resting, setResting] = useState(false);
  useEffect(() => { const timer=setInterval(()=>setDay(feedDay()),1000); return ()=>clearInterval(timer); }, []);
  const daily = dailySteps(state.daily,day);
  const target = Math.min(17, Math.max(1, session.words.length-daily.base));
  const steps = Math.min(target, daily.keys.length-daily.base);
  const complete = target > 0 && steps >= target;
  const wordsByKey = new Map(words.map(item => [wordKey(item), item]));
  const batchWords = daily.keys.slice(daily.base).map(key => wordsByKey.get(key)).filter(Boolean);
  const knownInBatch = batchWords.filter(item => selfJudgment(item,state) === 'known').length;
  const touch = useRef(null);
  const lastTap = useRef(null);
  const [swipeHint, setSwipeHint] = useState(null);
  const wheelLock = useRef(0);
  const viewport = useRef(null);
  const motionTimer = useRef(null);
  const moving = useRef(false);
  const [offset, setOffset] = useState(0);
  const [settling, setSettling] = useState(false);
  const [selection, setSelection] = useState(null);
  useEffect(() => () => clearTimeout(motionTimer.current), []);
  const index = Math.max(0, words.findIndex(word => wordKey(word) === state.cursor));
  const word = words[index];
  useFeedLayout(viewport, word ? wordKey(word) : null, complete && !selection);
  useEffect(() => {
    feedSessions.set(storageKey, {...session,state});
    onProgress?.(state);
    try { localStorage.setItem(storageKey, JSON.stringify(state)); }
  // eslint-disable-next-line react-hooks/set-state-in-effect -- External storage/network subscriptions and their error states are synchronized here; updates are guarded by stable dependencies.
    catch { setError('기기에 진행 기록을 저장하지 못했어요. 저장 공간을 확인해 주세요.'); }
  }, [state, storageKey, session, onProgress]);
  const settle = (target, done) => {
    moving.current = true;
    setSettling(true); setOffset(target);
    clearTimeout(motionTimer.current);
    motionTimer.current = setTimeout(() => {
      done?.(); setSelection(null); setSettling(false); setOffset(0); moving.current = false;
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300);
  };
  const move = direction => {
    if (disabled || moving.current) return;
    const next = Math.max(0, Math.min(words.length - 1, index + direction));
    if (next === index) {
      setMessage(direction > 0 ? '마지막 단어예요. 이전 단어도 다시 볼 수 있어요.' : '첫 번째 단어예요.');
      settle(0); return;
    }
    settle(-direction * ((viewport.current?.clientHeight || 440) + 12), () => {
      setState(value => ({ ...value, cursor:wordKey(words[next]) }));
      setMessage(''); setError('');
    });
  };
  const startDrag = event => {
    if (disabled || moving.current || event.touches.length !== 1) return;
    const definition = event.target.closest('.moa-definition,.korean-study-content,.study-example');
    touch.current = { x:event.touches[0].clientX, y:event.touches[0].clientY, time:event.timeStamp,
      ignore:!!event.target.closest('button'), scrollable:!!(definition && definition.scrollHeight > definition.clientHeight + 2) };
  };
  const drag = event => {
    const start = touch.current;
    if (!start || start.ignore || disabled || moving.current) return;
    const dy = event.touches[0].clientY-start.y, dx = event.touches[0].clientX-start.x;
    if (Math.abs(dx) > Math.abs(dy) * 1.2 && Math.abs(dx) > 12) {
      start.horizontal = true;
      setSwipeHint(dx < 0 ? 'unknown' : 'known'); setOffset(0); return;
    }
    if (start.horizontal) { setSwipeHint(null); return; }
    if (start.scrollable) {
      if (Math.abs(dy) > 10) { start.ignore = true; lastTap.current = null; }
      return;
    }
    const edge = (index === 0 && dy > 0) || (index === words.length-1 && dy < 0);
    const height = viewport.current?.clientHeight || 440;
    setOffset(Math.max(-height, Math.min(height, dy * (edge ? .22 : 1))));
  };
  const endDrag = event => {
    const start = touch.current; touch.current = null;
    setSwipeHint(null);
    if (!start || start.ignore || moving.current) return;
    const dy = event.changedTouches[0].clientY-start.y, dx = event.changedTouches[0].clientX-start.x;
    const judgment = swipeJudgment(dx, dy);
    if (judgment) { lastTap.current = null; choose(judgment); return; }
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const tap = {x:start.x, y:start.y, time:event.timeStamp};
      if (isDoubleTap(lastTap.current, tap)) { lastTap.current = null; choose('saved'); return; }
      lastTap.current = tap;
      setOffset(0);
      return;
    } else lastTap.current = null;
    if (start.horizontal) { settle(0); return; }
    const velocity = Math.abs(dy) / Math.max(1, event.timeStamp-start.time);
    if (Math.abs(dy)>Math.abs(dx) && (Math.abs(dy)>85 || (Math.abs(dy)>25 && velocity>.45))) move(dy<0 ? 1 : -1);
    else settle(0);
  };
  const choose = action => {
    if (disabled || moving.current || !word) return;
    moving.current = true;
    onClassify?.(word.id, action);
    touch.current = null;
    setSelection(action);
    const nextDaily = action === 'saved' ? dailySteps(state.daily,feedDay()) : recordFeedStep(state.daily,feedDay(),wordKey(word));
    const finished = nextDaily.keys.length-nextDaily.base >= target;
    setState(value => ({...markFeed(value, word, action === 'saved' ? { saved:true } : { judgment:action }), daily:nextDaily}));
    void playFeedChime().catch(() => {});
    // Let the lime confirmation register before the card starts travelling.
    clearTimeout(motionTimer.current);
    motionTimer.current = setTimeout(() => { moving.current = false; if(finished && action !== 'saved') setSelection(null); else move(1); }, FEED_CONFIRM_MS);
  };
  if (!word) return <p className="empty-feed">내 단어장에서 학습할 파일을 업로드해 주세요.</p>;
  return <section className={`moa-feed ${complete && !selection ? 'has-summary' : ''}`} aria-label="모아학습">

    <div className="moa-steps" role="progressbar" aria-label="작은 학습 목표" aria-valuemin={0} aria-valuemax={target} aria-valuenow={steps}>{Array.from({length:target},(_,i)=><span key={i} className={i<steps ? 'filled' : ''}>{i<steps ? '✓' : '·'}</span>)}</div>
    <p className="moa-today">오늘 벌써 <strong>{daily.keys.length}개</strong>를 살펴봤어요</p>
    {complete && !selection ? <section className="moa-celebration moa-batch-summary" aria-label="방금 살펴본 단어">
      <header className="moa-batch-heading">
        <h3>{resting ? '오늘은 여기까지' : `방금 본 ${batchWords.length}개`}</h3>
        <p><span className="batch-known">✓ 알아요 {knownInBatch}</span><span className="batch-unknown">☆ 몰라요 {batchWords.length-knownInBatch}</span></p>
      </header>
      <ol className="moa-batch-list">
        {batchWords.map(item => {
          const display = withFeedExample(item);
          const known = selfJudgment(item,state) === 'known';
          const label = known ? '알아요' : '몰라요';
          const term = display.displayWord || display.word;
          const meaning = display.displayMeaning || display.meaning;
          return <li key={wordKey(item)} className={known ? 'batch-known' : 'batch-unknown'}>
            <div className="batch-result-row">
              <span className="batch-mark" aria-label={label}>{known ? '✓' : '☆'}</span>
              <div className="batch-term"><strong>{term}</strong>{display.hanja && <span className="batch-hanja" lang="ko">{display.hanja}</span>}</div><span className="batch-meaning">{meaning}</span>
            </div>
          </li>;
        })}
      </ol>
      <div className="moa-batch-actions">
        <button disabled={disabled} onClick={()=>onQuiz?.(batchWords)}>퀴즈로 확인 →</button>
        {daily.keys.length < session.words.length ? <button disabled={disabled} onClick={() => {
          const next=[...words.slice(index+1),...words.slice(0,index+1)].find(item=>!daily.keys.includes(wordKey(item)));
          setState(value=>({...value,cursor:next ? wordKey(next) : value.cursor,daily:{...daily,base:daily.keys.length}})); setResting(false);
        }}>{resting ? '다시 이어가기' : `${Math.min(17,session.words.length-daily.keys.length)}개 더 보기`} →</button> : <p>단어장 모두 완료!</p>}
      </div>
      {!resting && <button className="moa-rest" onClick={()=>setResting(true)}>오늘은 여기까지</button>}
    </section> : <>

    <div ref={viewport} className="moa-swipe-viewport" onTouchStart={startDrag} onTouchMove={drag} onTouchEnd={endDrag}
      onTouchCancel={() => { setSwipeHint(null); lastTap.current = null; touch.current = null; if (!moving.current) settle(0); }}
      onWheel={event => { if (Math.abs(event.deltaY) < 20 || event.target.closest('.moa-definition,.korean-study-content,.study-example')) return; if (event.timeStamp - wheelLock.current > 550) { wheelLock.current = event.timeStamp; move(event.deltaY > 0 ? 1 : -1); } }}>
    <div className={`moa-swipe-track ${settling ? 'is-settling' : ''}`} style={{transform:`translate3d(0, ${offset}px, 0)`}}>
    {[-1,0,1].map(relative => {
      const sourceWord = words[index+relative]; if (!sourceWord) return null;
      const word = withFeedExample(sourceWord);
      const displayIpa = Object.hasOwn(word, 'displayIpa') ? word.displayIpa : word.ipa;
      const active = relative === 0;
      const entry = {saved:word.saved, judgment:selfJudgment(sourceWord,state)};
      return <article key={relative} className={`moa-feed-card moa-slide ${isKoreanWord(word) ? "korean-study-card" : ""} ${active ? 'is-current' : relative < 0 ? 'is-previous' : 'is-next'}`} inert={!active || settling || !!selection ? true : undefined} aria-hidden={!active} tabIndex={active ? 0 : -1} aria-label="단어 카드. 위아래 방향키로 이동"
      onDoubleClick={event => { if (active && !event.target.closest('button')) choose('saved'); }}
      onKeyDown={event => { if (event.target !== event.currentTarget) return; if (['ArrowDown','ArrowUp'].includes(event.key)) { event.preventDefault(); move(event.key === 'ArrowDown' ? 1 : -1); } }}>
      <div className="moa-card-tools"><span>{entry.judgment === 'known' ? '이전 분류 · 알아요' : entry.judgment === 'unknown' ? '현재 분류 · 몰라요' : '새롭게 만나는 단어'}</span><button disabled={disabled} aria-pressed={!!entry.saved} className={active && selection === 'saved' ? 'feed-choice-confirmed' : ''} onClick={() => choose('saved')}>{entry.saved ? '♥ 저장됨' : '♡ 저장'}</button></div>
      {isKoreanWord(word) ? <KoreanStudyContent word={word} saveAction={<button disabled={disabled} aria-pressed={!!entry.saved} className={active && selection === 'saved' ? 'feed-choice-confirmed' : ''} onClick={() => choose('saved')}>{entry.saved ? '♥ 저장됨' : '♡ 저장'}</button>}/> : <>
      <div className="moa-term"><FitWord as="h3" maxSize={54}>{word.displayWord || word.word}</FitWord>{word.hanja && <p className="word-hanja">{word.hanja}</p>}{typeof displayIpa === 'string' && displayIpa.trim() && <p className="moa-feed-ipa" style={{fontSize:16,lineHeight:1.5,color:'#606c59',margin:'-4px 0 8px',overflowWrap:'anywhere'}}>{displayIpa}</p>}</div>
      <StudyExample word={word} uploaded={!!sourceWord.example}/>
      <div className="moa-definition"><strong>{word.partOfSpeech || word.pos || ''} <MeaningText meaning={word.displayMeaning || word.meaning}/></strong></div>
      </>}
      <div className="moa-judgments"><button disabled={disabled} aria-pressed={active && selection === 'unknown'} className={active && selection === 'unknown' ? 'feed-choice-confirmed' : ''} onClick={() => choose('unknown')}>☆ 몰라요</button><button disabled={disabled} aria-pressed={active && selection === 'known'} className={active && selection === 'known' ? 'feed-choice-confirmed' : ''} onClick={() => choose('known')}>✓ 알아요</button></div>
    </article>; })}
    </div>{(selection || swipeHint) && <div className={`feed-choice-toast choice-${selection || swipeHint}`} role={selection ? 'status' : undefined}>{(selection || swipeHint) === 'saved' ? '♥ 저장' : (selection || swipeHint) === 'unknown' ? '☆ 몰라요' : '✓ 알아요'}</div>}</div>

    </>}
    {(error || message) && <p className="moa-feed-message" role="status">{error || message}</p>}
  </section>;
}
export function MoaLibrary({ onOpenDecks, words, name,  disabled, onClassify, onQuiz, progress }) {
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState('all');
  const [sort,setSort]=useState('priority');
  const [expanded,setExpanded]=useState(null);
  const [limit,setLimit]=useState(100);
  const [order]=useState(()=>({priority:[...words].sort((a,b)=>reviewPriority(a)-reviewPriority(b)).map(w=>w.id),random:shuffleFeed(words).map(w=>w.id)}));
  const ordered=useMemo(()=>{
    const result=[...words];
    if(sort==='alpha') return result.sort((a,b)=>a.word.localeCompare(b.word));
    if(sort==='recent') return result.reverse();
    const ranks=new Map(order[sort].map((id,i)=>[id,i]));
    return result.sort((a,b)=>(ranks.get(a.id)??Infinity)-(ranks.get(b.id)??Infinity));
  },[words,sort,order]);
  const filtered=ordered.filter(w=>(filter==='all'||(filter==='saved'?w.saved:(selfJudgment(w,progress)==='unknown'?'scrap':selfJudgment(w,progress)==='known'?'mastered':'new')===filter))&&`${w.word} ${w.meaning}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="moa-library"><header className="library-heading"><h2>내 단어장</h2><button className="deck-picker-toggle" onClick={onOpenDecks} disabled={disabled}>단어장 선택하기 <span aria-hidden="true">⌄</span></button></header><p className="library-deck-name"><span>현재 단어장</span> <strong>{name}</strong> · {words.length.toLocaleString()}개</p>
    <input aria-label="단어 검색" placeholder="단어 또는 뜻 검색" value={query} onChange={e=>{setQuery(e.target.value);setLimit(100);}}/>
    <div className="moa-library-filters">{[['all','전체'],['new','새로 익히기'],['scrap','☆ 몰라요'],['mastered','✓ 알아요'],['saved','♡ 저장']].map(([key,label])=><button key={key} aria-pressed={filter===key} onClick={()=>{setFilter(key);setLimit(100);}}>{label}</button>)}</div>
    <div className="library-toolbar"><select aria-label="단어 정렬" value={sort} onChange={e=>setSort(e.target.value)}><option value="priority">복습 우선</option><option value="recent">최근 추가</option><option value="alpha">알파벳순</option><option value="random">랜덤</option></select>
    <button disabled={disabled||!quizPool(words,'scrap','all',progress).length} onClick={()=>onQuiz(quizPool(words,'scrap','all',progress))}>복습 퀴즈 ({quizPool(words,'scrap','all',progress).length}) →</button></div>
    <p className="library-result-count">{filtered.length.toLocaleString()}개</p><ul>{filtered.slice(0,limit).map(source=>{const w=withFeedExample(source);return <li key={wordKey(w)} className="compact-word"><div className="compact-word-row"><button className="compact-word-text" aria-expanded={expanded===w.id} onClick={()=>setExpanded(expanded===w.id?null:w.id)}><strong>{w.displayWord||w.word}</strong>{w.hanja && <span className="library-hanja" lang="ko">{w.hanja}</span>}</button><button disabled={disabled} aria-label={`${w.word} 몰라요`} aria-pressed={selfJudgment(w,progress)==='unknown'} onClick={()=>onClassify(w.id,'unknown')}>{selfJudgment(w,progress)==='unknown'?'★ 몰라요':'☆ 몰라요'}</button><button disabled={disabled} aria-label={`${w.word} 저장`} aria-pressed={!!w.saved} onClick={()=>onClassify(w.id,'saved')}>{w.saved?'♥':'♡'}</button><p className="library-full-meaning">{w.displayMeaning||w.meaning}</p></div>{expanded===w.id&&<div className="compact-word-detail"><p>{w.hanja || w.displayIpa || w.ipa}</p><button onClick={()=>{if(!window.speechSynthesis)return; const speech=new SpeechSynthesisUtterance(w.displayWord||w.word);speech.lang=w.language||'en-US';window.speechSynthesis.cancel();window.speechSynthesis.speak(speech);}}>♫ 듣기</button><p>{w.example}</p><p>{w.exampleTranslation}</p><p>{w.statusSource==='quiz'?'퀴즈로 확인한 기록':w.status==='mastered'?'직접 알아요로 표시 · 퀴즈 확인 전':'다시 확인하며 익혀요'}</p><button disabled={disabled || !selfJudgment(source,progress)} title={!selfJudgment(source,progress) ? "모아학습에서 알아요·몰라요를 먼저 선택해 주세요" : undefined} onClick={()=>onQuiz([source],true)}>이 단어 퀴즈</button></div>}</li>})}</ul>{filtered.length>limit&&<button onClick={()=>setLimit(n=>n+100)}>더 보기</button>}</section>;
}
