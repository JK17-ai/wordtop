import { feedStorageKey, readFeed } from './moaFeedState.js';
import { classifyWord, isDue, quizExercise, mergeLegacyFeed, restoreQuizSession } from './learningFlow.js';
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
  const reactToAnswer = correct => {
    clearTimeout(reactionTimer.current);
    streak.current = correct ? streak.current + 1 : 0;
    const count = streak.current;
    const mood = correct && count >= 5 && count % 5 === 0 ? 'streak' : correct ? 'correct' : 'wrong';
    setReaction({ mood, count, id: Date.now() });
    void playReaction(correct, { streak: count }).catch(() => {});
    reactionTimer.current = setTimeout(() => setReaction(null), 1700);
  };
  const [studyPaused, setStudyPaused] = useState(false);
  const settingsChanged = useRef(false);
  const [pauseLocked, setPauseLocked] = useState(false);
  const [viewMode, setViewMode] = useState("phone");
  const [panel, setPanel] = useState(null);
  const [recordSection, setRecordSection] = useState(null);
  const [mode, setMode] = useState("feed");
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
    reactionTimer.current = setTimeout(() => setReaction(null),2200);
  }, [awards.latestAward]);
  const [activeTab, setActiveTab] = useState("all");
  const [reviewHint, setReviewHint] = useState(false);
  const reviewHintTimer = useRef(null);
  useEffect(() => () => clearTimeout(reviewHintTimer.current), []);
  useEffect(() => { if (panel) { clearTimeout(reviewHintTimer.current); setReviewHint(false); } }, [panel]);
  const selectStudyTab = tab => {
    clearTimeout(reviewHintTimer.current);
    setPanel(null);
    setActiveTab(tab); setQuizSession({ids:reviewFeed(allWords,tab,reviewStage).map(w=>w.id),index:0,correct:0,practice:false});
    const show = tab === 'scrap' || tab === 'mastered';
    setReviewHint(show);
    if (show) reviewHintTimer.current = setTimeout(() => setReviewHint(false), 2800);
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
  const [activeMs, setActiveMs] = useState(0);
  const [quizSession, setQuizSession] = useState(null);
  const [feedProgress, setFeedProgress] = useState(null);
  const startQuiz = (words, practice = false) => { if (!words.length) return; settingsChanged.current=false; setQuizSession({ids:words.map(w=>w.id),index:0,correct:0,practice}); setPanel(null); setMode("quiz"); setPauseLocked(false); setStudyPaused(false); setDeckVersion(v=>v+1); };
  const classify = (id, action) => { hadLocalRecords.current=true; setAllWords(words=>classifyWord(words,id,action)); };
  const hadLocalRecords = useRef(false);
  const snapshot = useMemo(() => ({ schemaVersion: 1,
    deck: { name: deckName, words: allWords, cursors: Object.fromEntries(["all", "scrap", "mastered"].map(tab => [tab, reviewFeed(allWords, tab, reviewStage)[positions[tab]]?.id ?? null])) },
    accuracy: accuracy.today, activeMs, dailyStudy: daily, learningSettings: settings, ...(quizSession ? {quizSession} : {}), ...(feedProgress ? {feedProgress} : {}),
  }), [deckName, allWords, positions, accuracy.today, activeMs, reviewStage, daily, settings, quizSession, feedProgress]);
  const restoreSnapshot = async value => {
    const repaired = await repairSavedDeck(value.deck.words, value.deck, deckStorageKey);
    const rebuilt = rebuildStudyDeck(repaired);
    accuracy.restore(value.accuracy);
    setQuizSession(restoreQuizSession(value.quizSession,rebuilt)); setFeedProgress(value.feedProgress || null);
    if (value.dailyStudy?.entries) setDaily(value.dailyStudy);
    if (value.learningSettings) setSettings(learningSettings(value.learningSettings));
    setAllWords(rebuilt); setDeckName(value.deck.name);
    setReviewStage('all');
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
        setQuizSession(restoreQuizSession(saved?.quizSession,rebuilt));
        setAllWords(rebuilt); setPositions(restorePositions(rebuilt, saved?.cursors));
        if (saved?.name) setDeckName(saved.name);
        setReady(true);
      } catch (error) { if (!cancelled) setNotice(error.message); }
    })();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(deckStorageKey, JSON.stringify({ ...snapshot.deck, activeMs: snapshot.activeMs, quizSession: snapshot.quizSession, feedProgress: snapshot.feedProgress })); }
    catch { setNotice("저장 공간이 부족해 새로고침 후 단어장이 유지되지 않을 수 있어요."); }
  }, [ready, snapshot, deckStorageKey]);

  const handleFile = async event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || importing.current || syncBlocked) return;
    importing.current = true; setBusy(true); setNotice("단어장 만드는 중…");
    try {
      const imported = await importDeck(file, setNotice);
      hadLocalRecords.current = true;
      setQuizSession(null); setFeedProgress(null); setAllWords(imported); setPositions({ all: 0, scrap: 0, mastered: 0 });
      setDeckName(file.name.replace(/\.[^.]+$/, ""));
      setPanel(null); setActiveTab("all"); setDeckVersion(v => v + 1);
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

    const filteredWords = reviewFeed(allWords, activeTab, reviewStage);
    const pendingCount = getFeed(allWords, "all").length;
    const pageCount = Math.max(1, filteredWords.length);
    const safePage = Math.max(0, Math.min(page, pageCount - 1));
    const pageWords = quizSession ? allWords.filter(w=>w.id === quizSession.ids[quizSession.index]).slice(0,1) : filteredWords.slice(safePage, safePage + 1);
    const activeExercise = quizSession && pageWords[0] ? quizExercise(pageWords[0],settings) : exercise;
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
    <><div inert={showTutorial ? true : undefined} ref={shellRef} className={`app-shell preview-${viewMode} reel-feed quiet-study`}>
      <UpdateNotice />
      {reviewHint && !panel && <div className="review-method-hint" role="status" aria-live="polite"><ResceneFace member="liv"/><span>설정에서 학습방법 변경 가능합니다.</span></div>}
      <header className="topbar"><h1 className="moa-brand"><MoaLogo/></h1>{profile && <div className="active-profile">{profile.avatar} {profile.name}</div>}</header>
      <input ref={picker} hidden type="file" accept=".pdf,.docx,.txt,.csv,image/*" onChange={handleFile} />
      {!panel && <div className="quiet-deck" title={`현재학습 : ${deckName}`}>현재학습 : {deckName}</div>}
      <StudySyncStatus sync={sync} snapshot={snapshot} />
      {!panel && mode === "feed" && allWords.some(w=>isDue(w)) && <button className="review-invitation" disabled={busy || !ready || syncBlocked} onClick={()=>startQuiz(allWords.filter(w=>isDue(w)).slice(0,17))}><span className="review-invitation-icon" aria-hidden="true">↻</span><span className="review-invitation-copy"><strong>기억을 깨울 시간</strong><small>복습할 {allWords.filter(w=>isDue(w)).length}개 중 {Math.min(17,allWords.filter(w=>isDue(w)).length)}개만 가볍게</small></span><span className="review-invitation-action">복습 시작 <span aria-hidden="true">→</span></span></button>}
      {notice && <div className="import-notice" role="status" onClick={() => !busy && setNotice("")}>{notice}</div>}
      {/* Previous per-answer streak toast hidden for focused study. */}
       {!panel && mode === "quiz" && <><nav className="feed-tabs" inert={pauseLocked ? true : undefined}><button className={activeTab === "all" ? "active" : ""} onClick={() => selectStudyTab("all")}>첫 확인<small>({pendingCount.toLocaleString()})</small></button><button className={activeTab === "scrap" ? "active" : ""} onClick={() => selectStudyTab("scrap")}>다시 익히기<small>({allWords.filter(word => word.status === "scrap").length.toLocaleString()})</small></button><button className={activeTab === "mastered" ? "active" : ""} onClick={() => selectStudyTab("mastered")}>기억 다지기<small>({knownCount.toLocaleString()})</small></button></nav>
      {/* 이전 제목 보관: Today's Mission / Today */}
      <section className="mission-bar" aria-label="오늘 학습 현황"><div className="today-counts"><div><small>오늘학습</small><strong>{today.total}</strong></div><div><small>다시 익히기</small><strong>{today.scrap}</strong></div><div><small>기억 다지기</small><strong>{today.mastered}</strong></div></div></section></>}
      <div className={`study-scroll ${panel ? "panel-scroll" : "study-content"}`}>{panel === "library" ? <MoaLibrary onClassify={classify} onQuiz={startQuiz} profileId={profile?.id} words={allWords} name={deckName} onUpload={() => picker.current?.click()} disabled={busy || !ready || syncBlocked} /> : panel === "records" ? <section className="moa-menu"><h2>내 기록</h2><p>가족과 함께 쌓아가는 공부 습관</p>
        {[["family","♧","가족 학습 기록"],["badges","♔","내 배지와 보상"],["settings","⚙","학습 설정"]].map(([key,icon,label]) => <section className="moa-record-section" key={key}>
          <h3><button id={`record-toggle-${key}`} className="moa-record-toggle" aria-expanded={recordSection === key} aria-controls={`record-content-${key}`} onClick={() => setRecordSection(current => current === key ? null : key)}><span>{icon} {label}</span><span aria-hidden="true">{recordSection === key ? '−' : '+'}</span></button></h3>
          {recordSection === key && <div id={`record-content-${key}`} className="moa-record-content" role="region" aria-labelledby={`record-toggle-${key}`}>
            {key === 'settings' ? <StudySettings embedded onTutorial={() => { setShowTutorial(true); }} onClose={() => setRecordSection(null)} settings={settings} onChange={value => { hadLocalRecords.current=true; setSettings(value); settingsChanged.current=true; setDeckVersion(v=>v+1); }} stage={reviewStage} onStage={value => { setReviewStage(value); setPositions({all:0,scrap:0,mastered:0}); }} /> : <PanelBoundary onClose={() => setRecordSection(null)}><LearningPanel embedded kind={key} awards={awards} onClose={() => setRecordSection(null)} /></PanelBoundary>}
          </div>}
        </section>)}
      </section> : panel === "settings" ? <StudySettings onTutorial={() => { setPanel(null); setShowTutorial(true); }} onClose={() => setPanel(null)} settings={settings} onChange={value => { hadLocalRecords.current=true; setSettings(value); settingsChanged.current=true; setDeckVersion(v=>v+1); }} stage={reviewStage} onStage={value => { setReviewStage(value); setPositions({all:0,scrap:0,mastered:0}); }} /> : panel ? <PanelBoundary key={panel} onClose={() => setPanel(null)}><LearningPanel kind={panel} awards={awards} onClose={() => setPanel(null)} /></PanelBoundary> : mode === "feed" ? (ready && !syncBlocked ? <MoaFeed progress={feedProgress} onProgress={setFeedProgress} onClassify={classify} onQuiz={startQuiz} key={profile?.id} words={allWords} name={deckName} profileId={profile?.id} disabled={busy || syncBlocked} /> : <p role="status">단어장을 불러오는 중…</p>) : <section className="moa-quiz-body">
      {quizSession && quizSession.index < quizSession.ids.length && <section className="quiz-session-progress" aria-label="이번 퀴즈 진행"><div className="quiz-session-heading"><span><small>{quizSession.practice ? '한 단어 연습' : '차근차근 기억 확인'}</small><strong>{quizSession.index + 1}<span> / {quizSession.ids.length}</span></strong></span><button disabled={pauseLocked} onClick={()=>{setMode('feed');setPauseLocked(false);}}>나중에 이어하기 <span aria-hidden="true">↗</span></button></div><div className="quiz-session-track" role="progressbar" aria-label="완료한 문제" aria-valuemin={0} aria-valuemax={quizSession.ids.length} aria-valuenow={quizSession.index}><span style={{width:`${100*quizSession.index/quizSession.ids.length}%`}}/></div></section>}
      {quizSession && quizSession.index >= quizSession.ids.length ? <section className="quiz-session-complete" aria-live="polite"><span className="quiz-complete-mark" aria-hidden="true">✓</span><small>한 걸음 더 쌓았어요</small><h2>{quizSession.ids.length ? '이번 퀴즈 완료!' : '지금은 확인할 단어가 없어요'}</h2><p>{quizSession.ids.length ? '맞힌 단어는 다지고, 헷갈린 단어는 다시 만나요.' : '모아학습에서 새로운 단어를 만나보세요.'}</p>{quizSession.ids.length > 0 && <div className="quiz-result-counts"><div><strong>{quizSession.correct}</strong><span>정답</span></div><div><strong>{quizSession.ids.length-quizSession.correct}</strong><span>다시 익힐 단어</span></div></div>}<button className="quiz-complete-primary" onClick={()=>{setQuizSession(null);setMode('feed');setPauseLocked(false);}}>모아학습으로 돌아가기 →</button><button className="quiz-complete-secondary" onClick={()=>{setQuizSession(null);setPanel('library');setPauseLocked(false);}}>내 단어장 살펴보기</button></section> : <>
      {/* Previous inline review controls moved to Settings > 학습방법. */}
      <main className="reel-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>{pageWords.map(item => <WordCard key={`${deckVersion}-${activeTab}-${reviewStage}-${item.id}`} exercise={activeExercise} showFeedback={!!quizSession} item={item} reviewMode={activeTab !== "all"} paused={studyPaused} onPausedChange={setStudyPaused} onFinish={correct => { setPauseLocked(true); reactToAnswer(correct); }} suspended={busy || syncBlocked || !!panel || reviewHint || showTutorial} choices={allWords.filter(word => word.id !== item.id).map(word => activeExercise === "reverse" ? word.word : word.meaning).slice(0, 8)} onAnswer={(id, correct, timing) => {
        const next = answerWord(allWords, activeTab, safePage, id, correct, timing);
        setActiveMs(value => value + (timing?.responseMs || 0));
        hadLocalRecords.current = true;
        accuracy.record(correct); if (!quizSession?.practice) awards.record(item, timing);
        setPauseLocked(false);
        if (quizSession) setQuizSession(previous=>({...previous,index:previous.index+1,correct:previous.correct+Number(correct)}));
        setDaily(previous => dailyRecord(previous, JSON.stringify([deckName,item.id,item.word]), correct));
        setAllWords(next.words); setPage(nextReviewIndex(filteredWords, reviewFeed(next.words, activeTab, reviewStage), safePage, id));
        setDeckVersion(value => value + 1);
      }} />)}{ready && !pageWords.length && <div className="empty-feed">{activeTab === "all" ? "첫 확인을 마쳤어요. 다시 익히기에서 복습해 보세요." : "아직 담긴 단어가 없어요."}</div>}</main>
       {/* 다음 단어 미리보기 보관
       <div className="next-preview"><FitWord maxSize={22}>{filteredWords.length > 1 ? filteredWords[(safePage + 1) % filteredWords.length]?.word : "다음 단어 없음"}</FitWord></div>
       */}
       <button type="button" className="next-preview study-pause" disabled={busy || !ready || syncBlocked || !pageWords.length || pauseLocked} aria-pressed={studyPaused} onClick={() => { settingsChanged.current=false; setStudyPaused(value => !value); }}><span aria-hidden="true">{studyPaused ? "▶" : "Ⅱ"}</span><span>{studyPaused ? "학습 계속하기" : "잠깐 멈춤"}</span></button>
       <SeungwooCompanion paused={studyPaused} reaction={reaction}/>
       {/* Previous scrap preview retained: <ScrapPreview words={allWords} cardKey={`${activeTab}-${pageWords[0]?.id ?? "empty"}`} /> */}
</>}</section>}</div><nav inert={pauseLocked ? true : undefined} className="stats-nav polished-nav" aria-label="하단 메뉴">
  <button className={!panel && mode === 'feed' ? 'selected' : ''} aria-current={!panel && mode === 'feed' ? 'page' : undefined} onClick={() => { setPanel(null); setMode('feed'); }}><span>▤</span><small>모아학습</small></button>
  <button className={!panel && mode === 'quiz' ? 'selected' : ''} aria-current={!panel && mode === 'quiz' ? 'page' : undefined} onClick={() => { setPanel(null); setMode('quiz'); if(!quizSession) selectStudyTab(activeTab); }}><span>ϟ</span><small>모아퀴즈</small></button>
  <button className={panel === 'library' ? 'selected' : ''} onClick={() => setPanel('library')}><span>▥</span><small>내 단어장</small></button>
  <button className={panel && panel !== 'library' ? 'selected' : ''} onClick={() => setPanel('records')}><span>◎</span><small>내 기록</small></button>
</nav>
    </div>{showTutorial && <StudyTutorial onClose={closeTutorial}/>}</>
  );
}
  // Previous content-driven density resizing removed: stable layout avoids jumping.
