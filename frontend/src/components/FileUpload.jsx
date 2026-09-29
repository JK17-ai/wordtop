import useCardFit from './useCardFit';
import AccountPanel from './AccountPanel';
import PortraitOnly, {usePortraitOnly} from './PortraitOnly';
import AppNotice from './AppNotice';
import { withFeedExample } from './feedExamples.js';
import { isKoreanWord } from './koreanVocabulary.js';
import DeckPicker from './DeckPicker';
import { emptyDeckLibrary, libraryItems, selectLibraryDeck, addLibraryDeck, localDeckSave } from './deckLibrary.js';
import { browserUUID } from '../lib/browserCrypto.js';
import { nextQuizBatch, remainingQuizWords, quizVisitedIds, selfJudgment, quizPool, quizLabel, tabQuizKey, resumeQuiz, recordQuizAnswer, restoreQuizProgress } from './quizSessions.js';
import MotivationBanner, { useMotivationRotation } from './MotivationBanner';
import { feedStorageKey, readFeed } from './moaFeedState.js';
import { classifyWord, isDue, quizExercise, mergeLegacyFeed } from './learningFlow.js';
import MoaFeed, { MoaLibrary } from './MoaFeed';
import '../moa-feed.css';
import ResceneFace from './ResceneFace';
import StudyTutorial from "./StudyTutorial";
import SeungwooCompanion from "./SeungwooCompanion";
import MoaLogo from "./MoaLogo";
import { playReaction } from "../reactionSound";
import PanelBoundary from "./PanelBoundary";
import StudySettings from "./StudySettings";
import { dailyRecord, dailyCounts, learningSettings, studyDay } from "./dailyStudy.js";
import LearningPanel from "./LearningPanel";
import useAwards from "./useAwards";
import { reviewFeed, nextReviewIndex } from "./reviewStudy.js";
import useStudySync from "./useStudySync";
import StudySyncStatus from "./StudySyncStatus";
import { repairSavedDeck } from "./repairSavedDeck";
// 다음 단어 미리보기 복원 시 사용: import FitWord from "./FitWord";
import { profileKey } from "../lib/profiles";
import { useEffect, useMemo, useRef, useState } from "react";
import { importDeck } from "./importDeck";
import WordCard from "./WordCard";
import { getFeed, answerWord, restorePositions, rebuildStudyDeck } from "./studyState";
import ScrapPreview from "./ScrapPreview";
import UpdateNotice from "./UpdateNotice";
import useAccuracy, { AccuracyStats } from "./useAccuracy";



export default function FileUpload({ profile }) {
  useCardFit();
  const landscape = usePortraitOnly();
  const [showAccount,setShowAccount] = useState(false);
  const deckStorageKey = profileKey(profile?.id, "wordtop-current-deck");
  const accuracy = useAccuracy(profileKey(profile?.id, "wordtop-daily-accuracy-v1"));
  const shellRef = useRef(null);
  const tutorialKey = profileKey(profile?.id, 'wordtop-tutorial-v1');
  const [showTutorial, setShowTutorial] = useState(() => {
    try { return localStorage.getItem(tutorialKey) !== 'hidden' && sessionStorage.getItem(tutorialKey) !== 'seen'; } catch { return true; }
  });
  const closeTutorial = permanently => {
    try {
      if (permanently) localStorage.setItem(tutorialKey, 'hidden');
      sessionStorage.setItem(tutorialKey, 'seen');
    } catch { /* Dismissal still works when browser storage is unavailable. */ }
    setShowTutorial(false);
  };
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => document.documentElement.style.setProperty("--app-height", (viewport?.height || window.innerHeight) + "px");
    update();
    viewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      document.documentElement.style.removeProperty("--app-height");
    };
  }, []);
  const [reaction, setReaction] = useState(null);
  const reactionTimer = useRef(null);
  useEffect(() => () => clearTimeout(reactionTimer.current), []);
  const reactToAnswer = (correct, item, exercise) => {
    clearTimeout(reactionTimer.current);
    streak.current = correct ? streak.current + 1 : 0;
    const count = streak.current;
    const mood = correct && count >= 5 && count % 5 === 0 ? 'streak' : correct ? 'correct' : 'wrong';
    const example = exercise === 'context' ? withFeedExample(item) : null;
    setReaction({ mood, count, id: Date.now(), ...(example?.example ? {example:example.example, exampleWord:example.displayWord || item.word} : {}), ...(!correct && item ? {answerWord:item.word,answerMeaning:item.meaning} : {}) });
    void playReaction(correct, { streak: count }).catch(() => {});
    reactionTimer.current = setTimeout(() => setReaction(null), example?.example ? 5000 : 2500);
  };
  const [studyPaused, setStudyPaused] = useState(false);
  const settingsChanged = useRef(false);
  const [pauseLocked, setPauseLocked] = useState(false);
  const [viewMode, setViewMode] = useState("phone");
  const [panel, setPanel] = useState(null);
  const [deckPickerReturn,setDeckPickerReturn] = useState(null);
  const openDeckPicker = () => {setDeckPickerReturn(panel);setPanel('decks');};
  const [recordSection, setRecordSection] = useState(null);
  const [mode, setMode] = useState("feed");
  const bannerIndices = useMotivationRotation(panel ? null : mode);
  const [reviewStage, setReviewStage] = useState("all");
  const [settings, setSettings] = useState(() => { try { return learningSettings(JSON.parse(localStorage.getItem(deckStorageKey + ':settings'))); } catch { return learningSettings(); } });
  const [daily, setDaily] = useState(() => { try { return JSON.parse(localStorage.getItem(deckStorageKey + ':daily')) || {date:studyDay(),entries:{}}; } catch { return {date:studyDay(),entries:{}}; } });
  const [todayDate, setTodayDate] = useState(studyDay);
  useEffect(() => { const timer = setInterval(() => setTodayDate(studyDay()), 1000); return () => clearInterval(timer); }, []);
  const today = dailyCounts(daily, todayDate);
  useEffect(() => { try { localStorage.setItem(deckStorageKey + ':settings', JSON.stringify(settings)); localStorage.setItem(deckStorageKey + ':daily', JSON.stringify(daily)); } catch { setNotice('기기 저장 공간을 확인해 주세요.'); } }, [settings,daily,deckStorageKey]);
  const awards = useAwards(profile?.id);
  useEffect(() => {
    if (!awards.latestAward) return;
    clearTimeout(reactionTimer.current);
    setReaction({ mood:'badge', tier:awards.latestAward.tier, id:awards.latestAward.id });
    void playReaction(true, { badge:true }).catch(() => {});
    reactionTimer.current = setTimeout(() => setReaction(null),2500);
  }, [awards.latestAward]);
  const [activeTab, setActiveTab] = useState("all");
  const [reviewHint, setReviewHint] = useState(false);
  const reviewHintTimer = useRef(null);
  useEffect(() => () => clearTimeout(reviewHintTimer.current), []);
  useEffect(() => { if (panel) { clearTimeout(reviewHintTimer.current); setReviewHint(false); } }, [panel]);
  const selectStudyTab = tab => {
    clearTimeout(reviewHintTimer.current);
    setReviewHint(false);
    openQuiz(tabQuizKey(tab, reviewStage), quizPool(allWords, tab, reviewStage, feedProgress), {tab, stage:tab === 'all' ? 'all' : reviewStage, label:quizLabel(tab)});
  };
  const exercise = activeTab === "all" ? "meaning" : settings[activeTab];

  const [positions, setPositions] = useState({ all: 0, scrap: 0, mastered: 0 });
  const page = positions[activeTab];
  const setPage = value => setPositions(previous => ({ ...previous, [activeTab]: typeof value === "function" ? value(previous[activeTab]) : value }));

  const [touchStart, setTouchStart] = useState(null);

  const [deckName, setDeckName] = useState("2027 수능 EBS영단어");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const [deckVersion, setDeckVersion] = useState(0);
  const [allWords, setAllWords] = useState([]);
  const [deckLibrary,setDeckLibrary] = useState(emptyDeckLibrary);
  const [activeMs, setActiveMs] = useState(0);
  const [quizProgress, setQuizProgress] = useState({activeKey:null, sessions:{}});
  const quizSession = quizProgress.sessions[quizProgress.activeKey] || null;
  const setQuizSession = update => setQuizProgress(previous => {
    const current = previous.sessions[previous.activeKey];
    if (!current) return previous;
    return {...previous, sessions:{...previous.sessions, [previous.activeKey]:typeof update === 'function' ? update(current) : update}};
  });
  const [feedProgress, setFeedProgress] = useState(null);
  const openQuiz = (key, words, metadata) => {
    settingsChanged.current=false;
    setQuizProgress(previous => ({activeKey:key, sessions:{...previous.sessions, [key]:resumeQuiz(previous.sessions[key], [...words,...allWords.filter(word=>previous.sessions[key]?.ids.slice(0,previous.sessions[key].index).includes(word.id) && !words.some(item=>item.id===word.id))], metadata)}}));
    setActiveTab(metadata.tab || 'all'); setPanel(null); setMode('quiz');
    setPauseLocked(false); setStudyPaused(false); setDeckVersion(v=>v+1);
  };
  const startQuiz = (words, practice = false, label = '방금 학습한 단어') => {
    const eligible = new Set(quizPool(allWords, 'all', 'all', feedProgress).map(word=>word.id));
    const selected = words.filter(word=>eligible.has(word.id));
    const key = `${practice ? 'practice' : 'batch'}:${label}:${JSON.stringify(selected.map(word=>word.id))}`;
    openQuiz(key, selected, {tab:'all', stage:'all', label:practice ? '한 단어 연습' : label, practice});
  };
  const continueQuiz = (retryWrong = false) => {
    const next = retryWrong
      ? resumeQuiz(null, allWords.filter(word=>quizSession?.results?.some(result=>result.id===word.id && !result.correct)), {tab:'all',stage:'all',label:'틀린 단어 다시 풀기',visitedIds:quizVisitedIds(quizSession)})
      : nextQuizBatch(quizSession,allWords,feedProgress);
    if (!next.ids.length) return;
    const key=`continue:${browserUUID()}`;
    setQuizProgress(previous=>({...previous,activeKey:key,sessions:{...previous.sessions,[key]:next}}));
    setActiveTab('all');setReviewStage('all');setPanel(null);setMode('quiz');
    settingsChanged.current=false;setPauseLocked(false);setStudyPaused(false);setReaction(null);
    clearTimeout(reactionTimer.current);setDeckVersion(v=>v+1);
  };
  const restoreQuizzes = (saved, words, progress) => {
    const restored = restoreQuizProgress(saved, words, progress);
    setQuizProgress(restored);
    setActiveTab(restored.sessions[restored.activeKey]?.tab || 'all');
    setReviewStage(restored.sessions[restored.activeKey]?.stage || 'all');
  };
  const classify = (id, action) => { hadLocalRecords.current=true; setAllWords(words=>classifyWord(words,id,action)); };
  const hadLocalRecords = useRef(false);
  const snapshot = useMemo(() => ({ schemaVersion: 1,
    deck: { name: deckName, words: allWords, cursors: Object.fromEntries(["all", "scrap", "mastered"].map(tab => [tab, reviewFeed(allWords, tab, reviewStage)[positions[tab]]?.id ?? null])) },
    deckLibrary, accuracy: accuracy.today, activeMs, dailyStudy: daily, learningSettings: settings, quizProgress, ...(quizSession ? {quizSession} : {}), ...(feedProgress ? {feedProgress} : {}),
  }), [deckLibrary, deckName, allWords, positions, accuracy.today, activeMs, reviewStage, daily, settings, quizSession, quizProgress, feedProgress]);
  const restoreSnapshot = async value => {
    const repaired = await repairSavedDeck(value.deck.words, value.deck, deckStorageKey);
    const rebuilt = rebuildStudyDeck(repaired);
    setDeckLibrary(value.deckLibrary || emptyDeckLibrary());
    accuracy.restore(value.accuracy);
    restoreQuizzes(value, rebuilt, value.feedProgress); setFeedProgress(value.feedProgress || null);
    if (value.dailyStudy?.entries) setDaily(value.dailyStudy);
    if (value.learningSettings) setSettings(learningSettings(value.learningSettings));
    setAllWords(rebuilt); setDeckName(value.deck.name);
    setPositions(restorePositions(rebuilt, value.deck.cursors));
    setActiveMs(Number.isFinite(value.activeMs) ? value.activeMs : 0);
    setDeckVersion(version => version + 1);
  };
  const sync = useStudySync({ profileId: profile?.id, storageKey: deckStorageKey, ready,
    snapshot, hasLocal: hadLocalRecords.current, onRestore: restoreSnapshot });
  const syncBlocked = sync.state === 'loading' || sync.state === 'conflict' || sync.state === 'storage-full';

  useEffect(() => {
    if (!ready || !['saved','synced'].includes(sync.state)) return;
    const entries = readFeed(feedStorageKey(profile?.id,deckName,allWords)).entries;
    if (!allWords.some(w=>!w.feedMigrated && entries[JSON.stringify([w.id,w.word,w.meaning])])) return;
    setAllWords(words=>mergeLegacyFeed(words,entries));
  },[ready,sync.state,deckName,allWords,profile?.id]);
  const picker = useRef(null);
  const importing = useRef(false);
  const streak = useRef(0);
  const toastTimer = useRef(null);
  const [toast, setToast] = useState(null);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const celebrate = correct => {
    streak.current = correct ? streak.current + 1 : 0;
    clearTimeout(toastTimer.current);
    setToast(null);
    if (streak.current >= 3) {
      setToast({ count: streak.current, text: ["오호라?", "잘하네?", "죽이네?"][(streak.current - 3) % 3] });
      toastTimer.current = setTimeout(() => setToast(null), 1600);
    }
  };
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let saved;
        try { saved = JSON.parse(localStorage.getItem(deckStorageKey)); } catch { /* Use bundled deck. */ }
        hadLocalRecords.current = !!saved?.words?.length;
        setDeckLibrary(saved?.deckLibrary || emptyDeckLibrary());
         setFeedProgress(saved?.feedProgress || null);
        setActiveMs(Number.isFinite(saved?.activeMs) ? saved.activeMs : 0);
        const data = saved?.words?.length ? saved.words : await fetch("/books/2027.json").then(res => {
          if (!res.ok) throw new Error("단어장을 불러오지 못했어요.");
          return res.json();
        });
        if (cancelled) return;
        const repaired = await repairSavedDeck(data, saved, deckStorageKey);
        if (cancelled) return;
        const rebuilt = rebuildStudyDeck(repaired);
        const storedFeed = saved?.feedProgress || readFeed(feedStorageKey(profile?.id,saved?.name || deckName,rebuilt));
        setFeedProgress(storedFeed); restoreQuizzes(saved, rebuilt, storedFeed);
        setAllWords(rebuilt); setPositions(restorePositions(rebuilt, saved?.cursors));
        if (saved?.name) setDeckName(saved.name);
        setReady(true);
      } catch (error) { if (!cancelled) setNotice(error.message); }
    })();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(deckStorageKey, JSON.stringify(localDeckSave(snapshot))); }
    catch { setNotice("저장 공간이 부족해 새로고침 후 단어장이 유지되지 않을 수 있어요."); }
  }, [ready, snapshot, deckStorageKey]);

  const activateDeck = next => {
    // Persist the complete library before replacing the visible deck.
    if (new TextEncoder().encode(JSON.stringify(next)).length > 8 * 1024 * 1024) throw Error('단어장 저장 용량을 초과했어요. 더 작은 문서를 선택해 주세요.');
    localStorage.setItem(deckStorageKey, JSON.stringify(localDeckSave(next)));
    hadLocalRecords.current=true;
    setDeckLibrary(next.deckLibrary); setAllWords(next.deck.words); setDeckName(next.deck.name);
    setFeedProgress(next.feedProgress || {cursor:null,entries:{}});
    restoreQuizzes(next,next.deck.words,next.feedProgress);
    setPositions(restorePositions(next.deck.words,next.deck.cursors));
    setStudyPaused(false);setPauseLocked(false);setReaction(null);clearTimeout(reactionTimer.current);
    setMode('feed');setDeckVersion(v=>v+1);
  };
  const selectDeck = id => {
    if (busy || !ready || syncBlocked) return false;
    try { if(id!==deckLibrary.activeId)activateDeck(selectLibraryDeck(snapshot,id));return true; }
    catch(error){setNotice(error.message || '단어장을 저장하지 못해 전환을 중단했어요.');return false;}
  };
  const handleFile = async event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || importing.current || syncBlocked) return;
    importing.current = true; setBusy(true); setNotice("단어장 만드는 중…");
    try {
      const imported = await importDeck(file, setNotice);
      activateDeck(addLibraryDeck(snapshot,browserUUID(),file.name.replace(/\.[^.]+$/, ""),rebuildStudyDeck(imported)));
      setPanel('library');
      streak.current = 0; setToast(null);
      try { localStorage.setItem("wordtop-page", "0"); } catch { /* Memory still works. */ }
      setNotice(imported.length.toLocaleString() + "개 단어로 새 단어장을 만들었어요.");
    } catch (error) {
      setNotice(error.message || "파일을 읽지 못했어요. 다른 파일로 다시 시도해 주세요.");
    } finally { importing.current = false; setBusy(false); }
  };
    const totalCount = allWords.length;

    const knownCount =
        getFeed(allWords, "mastered").length;

    const unknownCount =
        totalCount - knownCount;

    const progress =
        totalCount === 0
            ? 0
            : Math.round((knownCount / totalCount) * 100);

    const filteredWords = quizPool(allWords, activeTab, reviewStage, feedProgress);
    const learnedWords = quizPool(allWords, "all", "all", feedProgress);
    const remainingQuizCount = remainingQuizWords(quizSession,allWords,feedProgress).length;
    const quizResults = (quizSession?.results || []).map(result=>({...result,word:allWords.find(word=>word.id===result.id)})).filter(result=>result.word);
    const wrongQuizCount = quizResults.filter(result=>!result.correct).length;
    const pendingCount = getFeed(allWords, "all").length;
    const pageCount = Math.max(1, filteredWords.length);
    const safePage = Math.max(0, Math.min(page, pageCount - 1));
    const pageWords = quizSession ? allWords.filter(w=>w.id === quizSession.ids[quizSession.index]).slice(0,1) : [];
    const activeExercise = quizSession && pageWords[0] ? quizExercise({...pageWords[0],status:selfJudgment(pageWords[0],feedProgress) === 'known' ? 'mastered' : 'scrap'},settings) : exercise;
    const currentWordId = pageWords[0]?.id;
    useEffect(() => { setStudyPaused(settingsChanged.current); setPauseLocked(false); }, [currentWordId, activeTab, deckVersion]);
    const movePage = (direction) => setPage((value) => { const next = Math.max(0, Math.min(pageCount - 1, value + direction)); return next; });
    const onTouchStart = (event) => setTouchStart({ x: event.touches[0].clientX, y: event.touches[0].clientY });
    const onTouchEnd = (event) => {
      if (pauseLocked || quizSession) return;
      if (!touchStart) return;
      const dx = event.changedTouches[0].clientX - touchStart.x;
      const dy = event.changedTouches[0].clientY - touchStart.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 45) {
        if (Math.abs(dx) > Math.abs(dy)) {
          selectStudyTab(dx < 0 ? "mastered" : "scrap");

        } else {
          movePage(dy < 0 ? 1 : -1);
        }
      }
      setTouchStart(null);
    };

  return (
    <><PortraitOnly active={landscape}/><div inert={showAccount || landscape || showTutorial || !!notice ? true : undefined} ref={shellRef} className={`app-shell preview-${viewMode} reel-feed quiet-study`}>
      <UpdateNotice />
      {reviewHint && !panel && <div className="review-method-hint" role="status" aria-live="polite"><ResceneFace member="liv"/><span>설정에서 학습방법 변경 가능합니다.</span></div>}
      <header className="topbar"><h1 className="moa-brand"><MoaLogo/></h1>{profile && <button className="active-profile" onClick={()=>setShowAccount(true)} aria-label="내 정보 열기">{profile.avatar} {profile.name}</button>}</header>
      <input ref={picker} hidden type="file" accept=".pdf,.docx,.txt,.csv,image/*" onChange={handleFile} />
      {!panel && <button type="button" className="quiet-deck" disabled={busy || !ready || syncBlocked || pauseLocked} onClick={openDeckPicker} title={`현재 단어장: ${deckName} · 선택하기`}><span className="quiet-deck-label">현재 단어장</span><strong>{deckName}</strong><span aria-hidden="true">⌄</span></button>}
      <StudySyncStatus sync={sync} snapshot={snapshot} />
      {!panel && mode === "feed" && learnedWords.some(w=>isDue(w)) && <button className="review-invitation" disabled={busy || !ready || syncBlocked} onClick={()=>startQuiz(learnedWords.filter(w=>isDue(w)).slice(0,17), false, '복습할 단어')}><span className="review-invitation-icon" aria-hidden="true">↻</span><span className="review-invitation-copy"><strong>기억을 깨울 시간</strong><small>복습할 {learnedWords.filter(w=>isDue(w)).length}개 중 {Math.min(17,learnedWords.filter(w=>isDue(w)).length)}개만 가볍게</small></span><span className="review-invitation-action">복습 시작 <span aria-hidden="true">→</span></span></button>}
      {notice && <AppNotice message={notice} busy={busy} onClose={()=>setNotice("")}/>}
      {/* Previous per-answer streak toast hidden for focused study. */}
       {!panel && mode === "quiz" && <><nav className="feed-tabs" inert={pauseLocked ? true : undefined}><button className={activeTab === "all" ? "active" : ""} onClick={() => selectStudyTab("all")}>학습한 단어<small>({learnedWords.length.toLocaleString()})</small></button><button className={activeTab === "scrap" ? "active" : ""} onClick={() => selectStudyTab("scrap")}>몰라요<small>({quizPool(allWords,"scrap",reviewStage,feedProgress).length.toLocaleString()})</small></button><button className={activeTab === "mastered" ? "active" : ""} onClick={() => selectStudyTab("mastered")}>알아요<small>({quizPool(allWords,"mastered",reviewStage,feedProgress).length.toLocaleString()})</small></button></nav>
      {/* 이전 제목 보관: Today's Mission / Today */}
      <section className="daily-study-line" aria-label="오늘 학습 현황"><span>오늘 <strong>{today.total}</strong>개 학습</span><span aria-hidden="true">·</span><span>다시 익힐 <strong>{today.scrap}</strong>개</span><span aria-hidden="true">·</span><span>정답 <strong>{today.mastered}</strong>개</span></section></>}
      <div className={`study-scroll ${panel ? "panel-scroll" : "study-content"}`}>{panel === "decks" ? <DeckPicker decks={libraryItems(snapshot)} activeId={deckLibrary.activeId} onSelect={selectDeck} onUpload={()=>picker.current?.click()} onClose={()=>setPanel(deckPickerReturn)} disabled={busy || !ready || syncBlocked}/> : panel === "library" ? <MoaLibrary onOpenDecks={openDeckPicker} key={deckLibrary.activeId} decks={libraryItems(snapshot)} activeDeckId={deckLibrary.activeId} onSelectDeck={selectDeck} onClassify={classify} onQuiz={(words,practice)=>startQuiz(words,practice,'내 단어장 복습')} progress={feedProgress} profileId={profile?.id} words={allWords} name={deckName} onUpload={() => picker.current?.click()} disabled={busy || !ready || syncBlocked} /> : panel === "records" ? <section className="moa-menu"><header className="records-heading"><h2>내 기록</h2><p>가족과 함께 쌓아가는 공부 습관</p></header>
        {[["family","♧","가족 학습 기록"],["badges","♔","내 배지와 보상"],["settings","⚙","학습 설정"]].map(([key,icon,label]) => <section className="moa-record-section" key={key}>
          <h3><button id={`record-toggle-${key}`} className="moa-record-toggle" aria-expanded={recordSection === key} aria-controls={`record-content-${key}`} onClick={() => setRecordSection(current => current === key ? null : key)}><span>{icon} {label}</span><span aria-hidden="true">{recordSection === key ? '−' : '+'}</span></button></h3>
          {recordSection === key && <div id={`record-content-${key}`} className="moa-record-content" role="region" aria-labelledby={`record-toggle-${key}`}>
            {key === 'settings' ? <StudySettings korean={allWords.some(isKoreanWord)} embedded onTutorial={() => { setShowTutorial(true); }} onClose={() => setRecordSection(null)} settings={settings} onChange={value => { hadLocalRecords.current=true; setSettings(value); settingsChanged.current=true; setDeckVersion(v=>v+1); }} stage={reviewStage} onStage={value => { setReviewStage(value); if (quizSession && quizProgress.activeKey?.startsWith('tab:')) { const key=tabQuizKey(activeTab,value); setQuizProgress(previous=>({...previous,activeKey:key,sessions:{...previous.sessions,[key]:resumeQuiz(previous.sessions[key],quizPool(allWords,activeTab,value,feedProgress),{tab:activeTab,stage:value,label:quizLabel(activeTab)})}})); } setDeckVersion(v=>v+1); }} /> : <PanelBoundary onClose={() => setRecordSection(null)}><LearningPanel embedded kind={key} awards={awards} onClose={() => setRecordSection(null)} /></PanelBoundary>}
          </div>}
        </section>)}
        <aside className="records-banner-slot" aria-label="오늘의 응원" data-slot="records-large-ad" data-content-type="motivation"><img src="/banners/keep-going-clean.png" width="515" height="446" alt="포기하지 마세요! 지금도 목표에 한 걸음 더 가까워지고 있어요. 보물을 향해 한 번 더 도전하는 모습." loading="lazy" /></aside>
      </section> : panel === "settings" ? <StudySettings korean={allWords.some(isKoreanWord)} onTutorial={() => { setPanel(null); setShowTutorial(true); }} onClose={() => setPanel(null)} settings={settings} onChange={value => { hadLocalRecords.current=true; setSettings(value); settingsChanged.current=true; setDeckVersion(v=>v+1); }} stage={reviewStage} onStage={value => { setReviewStage(value); if (quizSession && quizProgress.activeKey?.startsWith('tab:')) { const key=tabQuizKey(activeTab,value); setQuizProgress(previous=>({...previous,activeKey:key,sessions:{...previous.sessions,[key]:resumeQuiz(previous.sessions[key],quizPool(allWords,activeTab,value,feedProgress),{tab:activeTab,stage:value,label:quizLabel(activeTab)})}})); } setDeckVersion(v=>v+1); }} /> : panel ? <PanelBoundary key={panel} onClose={() => setPanel(null)}><LearningPanel kind={panel} awards={awards} onClose={() => setPanel(null)} /></PanelBoundary> : mode === "feed" ? (ready && !syncBlocked ? <MoaFeed progress={feedProgress} onProgress={setFeedProgress} onClassify={classify} onQuiz={startQuiz} key={`${profile?.id}:${deckLibrary.activeId}`} deckId={deckLibrary.activeId} words={allWords} name={deckName} profileId={profile?.id} disabled={landscape || busy || syncBlocked} /> : <p role="status">단어장을 불러오는 중…</p>) : <section className="moa-quiz-body">
      {quizSession && quizSession.index < quizSession.ids.length && <section className="quiz-session-progress" aria-label="이번 퀴즈 진행"><div className="quiz-session-heading"><span><small>{quizSession.label || quizLabel(activeTab)}</small><strong>{quizSession.index + 1}<span> / {quizSession.ids.length}</span></strong></span></div><div className="quiz-session-track" role="progressbar" aria-label="완료한 문제" aria-valuemin={0} aria-valuemax={quizSession.ids.length} aria-valuenow={quizSession.index}><span style={{width:`${100*quizSession.index/quizSession.ids.length}%`}}/></div></section>}
      {(!quizSession || quizSession.index >= quizSession.ids.length) ? <section className="quiz-session-complete" aria-live="polite">
        <span className="quiz-complete-mark" aria-hidden="true">{quizSession?.ids.length ? '✓' : '▤'}</span>
        <small>{quizSession?.label || quizLabel(activeTab)}</small>
        <h2>{quizSession?.ids.length ? '이번 퀴즈 완료!' : learnedWords.length ? '이 범위에 담긴 단어가 없어요' : '단어를 먼저 살펴보세요'}</h2>
        <p>{quizSession?.ids.length ? '학습 기록은 그대로, 원하는 때 다시 확인해요.' : learnedWords.length ? '다른 범위를 고르거나 학습에서 단어를 더 만나보세요.' : '모아학습에서 알아요·몰라요를 선택하면 퀴즈를 시작할 수 있어요.'}</p>
        {!!quizSession?.ids.length && <><div className="quiz-result-counts"><div><strong>{quizSession.correct}</strong><span>정답</span></div><div><strong>{quizSession.ids.length-quizSession.correct}</strong><span>다시 익힐 단어</span></div></div>{remainingQuizCount > 0 ? <button className="quiz-complete-primary" onClick={()=>continueQuiz()}>다른 학습한 단어로 계속하기 →<small>남은 {remainingQuizCount}개 중 {Math.min(17,remainingQuizCount)}개</small></button> : <p className="quiz-all-complete">학습한 단어를 모두 확인했어요.</p>}
        {wrongQuizCount > 0 && <button className="quiz-complete-secondary" onClick={()=>continueQuiz(true)}>틀린 {wrongQuizCount}개 다시 풀기</button>}
        {quizResults.length > 0 && <section className="quiz-results-list" aria-label="이번 퀴즈 단어별 결과"><h3>이번 퀴즈 결과</h3><ul>{quizResults.map(result=><li key={result.id} className={result.correct ? 'is-correct' : 'is-incorrect'}><span aria-label={result.correct ? '정답' : '오답'}>{result.correct ? '✓' : '×'}</span><strong>{result.word.word}</strong><span>{result.word.meaning}</span></li>)}</ul></section>}</>}
        <button className="quiz-complete-secondary" onClick={()=>{setMode('feed');setPauseLocked(false);}}>모아학습으로 {learnedWords.length ? '돌아가기' : '시작하기'} →</button>
      </section> : <>
      {/* Previous inline review controls moved to Settings > 학습방법. */}
      <main className="reel-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>{pageWords.map(item => <WordCard key={`${deckVersion}-${activeTab}-${reviewStage}-${item.id}`} exercise={activeExercise} item={item} reviewMode={activeTab !== "all"} paused={studyPaused} onPausedChange={setStudyPaused} onFinish={correct => { setPauseLocked(true); reactToAnswer(correct, item, activeExercise); }} suspended={showAccount || landscape || !!reaction?.example || busy || syncBlocked || !!panel || mode !== "quiz" || reviewHint || showTutorial} choices={allWords} onAnswer={(id, correct, timing) => {
        const next = answerWord(allWords, activeTab, safePage, id, correct, timing);
        setActiveMs(value => value + (timing?.responseMs || 0));
        hadLocalRecords.current = true;
        accuracy.record(correct); if (!quizSession?.practice) awards.record(item, timing);
        setPauseLocked(false);
        if (quizSession) setQuizSession(previous=>recordQuizAnswer(previous,id,correct));
        setDaily(previous => dailyRecord(previous, JSON.stringify([deckName,item.id,item.word]), correct));
        setAllWords(next.words); setPage(nextReviewIndex(filteredWords, reviewFeed(next.words, activeTab, reviewStage), safePage, id));
        setDeckVersion(value => value + 1);
      }} />)}{ready && !pageWords.length && <div className="empty-feed">{activeTab === "all" ? "새 단어를 모두 익혔어요. 다시 익히기에서 복습해 보세요." : "아직 담긴 단어가 없어요."}</div>}</main>
       {/* 다음 단어 미리보기 보관
       <div className="next-preview"><FitWord maxSize={22}>{filteredWords.length > 1 ? filteredWords[(safePage + 1) % filteredWords.length]?.word : "다음 단어 없음"}</FitWord></div>
       */}
       <button type="button" className="next-preview study-pause" disabled={busy || !ready || syncBlocked || !pageWords.length || pauseLocked} aria-pressed={studyPaused} onClick={() => { settingsChanged.current=false; setStudyPaused(value => !value); }}><span aria-hidden="true">{studyPaused ? "▶" : "Ⅱ"}</span><span>{studyPaused ? "학습 계속하기" : "잠깐 멈춤"}</span></button>

       {/* Previous scrap preview retained: <ScrapPreview words={allWords} cardKey={`${activeTab}-${pageWords[0]?.id ?? "empty"}`} /> */}
</>}</section>}</div>{!panel && (mode === "feed" || mode === "quiz") && <MotivationBanner index={bannerIndices[mode]}/>}<SeungwooCompanion paused={studyPaused} reaction={reaction} onPauseExample={()=>clearTimeout(reactionTimer.current)} onResumeExample={()=>{clearTimeout(reactionTimer.current);setReaction(null);}}/><nav inert={pauseLocked ? true : undefined} className="stats-nav polished-nav" aria-label="하단 메뉴">
  <button className={!panel && mode === 'feed' ? 'selected' : ''} aria-current={!panel && mode === 'feed' ? 'page' : undefined} onClick={() => { setPanel(null); setMode('feed'); }}><span>▤</span><small>모아학습</small></button>
  <button className={!panel && mode === 'quiz' ? 'selected' : ''} aria-current={!panel && mode === 'quiz' ? 'page' : undefined} onClick={() => { setPanel(null); setMode('quiz'); if (!quizSession || quizProgress.activeKey?.startsWith('tab:')) selectStudyTab(activeTab); else openQuiz(quizProgress.activeKey, learnedWords.filter(word=>quizSession.ids.includes(word.id)), quizSession); }}><span>ϟ</span><small>모아퀴즈</small></button>
  <button className={panel === 'library' ? 'selected' : ''} onClick={() => setPanel('library')}><span>▥</span><small>내 단어장</small></button>
  <button className={panel && panel !== 'library' && panel !== 'decks' ? 'selected' : ''} onClick={() => setPanel('records')}><span>◎</span><small>내 기록</small></button>
</nav>
    </div>{showAccount && <AccountPanel profile={profile} onClose={()=>setShowAccount(false)}/>} {showTutorial && <StudyTutorial onClose={closeTutorial}/>}</>
  );
}
  // Previous content-driven density resizing removed: stable layout avoids jumping.
