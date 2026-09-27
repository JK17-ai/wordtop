import ResceneFace from './ResceneFace';
import StudyTutorial from "./StudyTutorial";
import SeungwooCompanion from "./SeungwooCompanion";
import { MoaMark } from "./MoaCompanion";
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
  const [pauseLocked, setPauseLocked] = useState(false);
  const [viewMode, setViewMode] = useState("phone");
  const [panel, setPanel] = useState(null);
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
    setActiveTab(tab);
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
  const hadLocalRecords = useRef(false);
  const snapshot = useMemo(() => ({ schemaVersion: 1,
    deck: { name: deckName, words: allWords, cursors: Object.fromEntries(["all", "scrap", "mastered"].map(tab => [tab, reviewFeed(allWords, tab, reviewStage)[positions[tab]]?.id ?? null])) },
    accuracy: accuracy.today, activeMs, dailyStudy: daily, learningSettings: settings,
  }), [deckName, allWords, positions, accuracy.today, activeMs, reviewStage, daily, settings]);
  const restoreSnapshot = async value => {
    const repaired = await repairSavedDeck(value.deck.words, value.deck, deckStorageKey);
    const rebuilt = rebuildStudyDeck(repaired);
    accuracy.restore(value.accuracy);
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
        setActiveMs(Number.isFinite(saved?.activeMs) ? saved.activeMs : 0);
        const data = saved?.words?.length ? saved.words : await fetch("/books/2027.json").then(res => {
          if (!res.ok) throw new Error("단어장을 불러오지 못했어요.");
          return res.json();
        });
        if (cancelled) return;
        const repaired = await repairSavedDeck(data, saved, deckStorageKey);
        if (cancelled) return;
        const rebuilt = rebuildStudyDeck(repaired);
        setAllWords(rebuilt); setPositions(restorePositions(rebuilt, saved?.cursors));
        if (saved?.name) setDeckName(saved.name);
        setReady(true);
      } catch (error) { if (!cancelled) setNotice(error.message); }
    })();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(deckStorageKey, JSON.stringify({ ...snapshot.deck, activeMs: snapshot.activeMs })); }
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
      setAllWords(imported); setPositions({ all: 0, scrap: 0, mastered: 0 });
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
    const pageWords = filteredWords.slice(safePage, safePage + 1);
    const currentWordId = pageWords[0]?.id;
    useEffect(() => { setStudyPaused(false); setPauseLocked(false); }, [currentWordId, activeTab, deckVersion]);
    const movePage = (direction) => setPage((value) => { const next = Math.max(0, Math.min(pageCount - 1, value + direction)); return next; });
    const onTouchStart = (event) => setTouchStart({ x: event.touches[0].clientX, y: event.touches[0].clientY });
    const onTouchEnd = (event) => {
      if (pauseLocked) return;
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
      <header className="topbar"><h1 className="moa-brand"><MoaMark/>단어모아</h1>{profile && <div className="active-profile">{profile.avatar} {profile.name}</div>}</header>
      <input ref={picker} hidden type="file" accept=".pdf,.docx,.txt,.csv,image/*" onChange={handleFile} />
      {!panel && <div className="quiet-deck" title={`현재학습 : ${deckName}`}>현재학습 : {deckName}</div>}
      <StudySyncStatus sync={sync} snapshot={snapshot} />
      {notice && <div className="import-notice" role="status" onClick={() => !busy && setNotice("")}>{notice}</div>}
      {/* Previous per-answer streak toast hidden for focused study. */}
       {!panel && <><nav className="feed-tabs" inert={pauseLocked ? true : undefined}><button className={activeTab === "all" ? "active" : ""} onClick={() => selectStudyTab("all")}>ALL FEED<small>({pendingCount.toLocaleString()})</small></button><button className={activeTab === "scrap" ? "active" : ""} onClick={() => selectStudyTab("scrap")}>SCRAP<small>({allWords.filter(word => word.status === "scrap").length.toLocaleString()})</small></button><button className={activeTab === "mastered" ? "active" : ""} onClick={() => selectStudyTab("mastered")}>MASTERED<small>({knownCount.toLocaleString()})</small></button></nav>
      {/* 이전 제목 보관: Today's Mission / Today */}
      <section className="mission-bar" aria-label="오늘 학습 현황"><div className="today-counts"><div><small>오늘학습</small><strong>{today.total}</strong></div><div><small>스크랩</small><strong>{today.scrap}</strong></div><div><small>마스터</small><strong>{today.mastered}</strong></div></div></section></>}
      <div className={`study-scroll ${panel ? "panel-scroll" : "study-content"}`}>{panel === "settings" ? <StudySettings onTutorial={() => { setPanel(null); setShowTutorial(true); }} onClose={() => setPanel(null)} settings={settings} onChange={value => { hadLocalRecords.current=true; setSettings(value); setDeckVersion(v=>v+1); }} stage={reviewStage} onStage={value => { setReviewStage(value); setPositions({all:0,scrap:0,mastered:0}); }} /> : panel ? <PanelBoundary key={panel} onClose={() => setPanel(null)}><LearningPanel kind={panel} awards={awards} onClose={() => setPanel(null)} /></PanelBoundary> : <>
      {/* Previous inline review controls moved to Settings > 학습방법. */}
      <main className="reel-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>{pageWords.map(item => <WordCard key={`${deckVersion}-${activeTab}-${reviewStage}-${item.id}`} exercise={activeTab === "all" ? "meaning" : exercise} item={item} reviewMode={activeTab !== "all"} paused={studyPaused} onPausedChange={setStudyPaused} onFinish={correct => { setPauseLocked(true); reactToAnswer(correct); }} suspended={busy || syncBlocked || !!panel || reviewHint || showTutorial} choices={allWords.filter(word => word.id !== item.id).map(word => activeTab !== "all" && exercise === "reverse" ? word.word : word.meaning).slice(0, 8)} onAnswer={(id, correct, timing) => {
        const next = answerWord(allWords, activeTab, safePage, id, correct, timing);
        setActiveMs(value => value + (timing?.responseMs || 0));
        hadLocalRecords.current = true;
        accuracy.record(correct); awards.record(item, timing);
        setDaily(previous => dailyRecord(previous, JSON.stringify([deckName,item.id,item.word]), correct));
        setAllWords(next.words); setPage(nextReviewIndex(filteredWords, reviewFeed(next.words, activeTab, reviewStage), safePage, id));
        setDeckVersion(value => value + 1);
      }} />)}{ready && !pageWords.length && <div className="empty-feed">{activeTab === "all" ? "전체 학습 완료! 스크랩함에서 복습해 보세요." : "아직 담긴 단어가 없어요."}</div>}</main>
       {/* 다음 단어 미리보기 보관
       <div className="next-preview"><FitWord maxSize={22}>{filteredWords.length > 1 ? filteredWords[(safePage + 1) % filteredWords.length]?.word : "다음 단어 없음"}</FitWord></div>
       */}
       <button type="button" className="next-preview study-pause" disabled={busy || !ready || syncBlocked || !pageWords.length || pauseLocked} aria-pressed={studyPaused} onClick={() => setStudyPaused(value => !value)}>{studyPaused ? "학습 계속하기" : "잠깐 멈춤"}</button>
       <SeungwooCompanion paused={studyPaused} reaction={reaction}/>
       {/* Previous scrap preview retained: <ScrapPreview words={allWords} cardKey={`${activeTab}-${pageWords[0]?.id ?? "empty"}`} /> */}
</>}</div><nav inert={pauseLocked ? true : undefined} className="stats-nav polished-nav" aria-label="하단 메뉴">
  {/* 이전 하단 학습 버튼 보관: <button onClick={() => setPanel(null)}>학습</button> */}
  <button disabled={busy || !ready || syncBlocked} onClick={() => picker.current?.click()}><span>＋</span><small>업로드</small></button>
  <button className={panel === 'family' ? 'selected' : ''} onClick={() => setPanel('family')}><span>♧</span><small>가족</small></button>
  <button className={panel === 'badges' ? 'selected' : ''} onClick={() => setPanel('badges')}><span>♔</span><small>배지</small></button>
  <button className={panel === 'settings' ? 'selected' : ''} onClick={() => setPanel('settings')}><span>⚙</span><small>설정</small></button>
</nav>
    </div>{showTutorial && <StudyTutorial onClose={closeTutorial}/>}</>
  );
}
  // Previous content-driven density resizing removed: stable layout avoids jumping.
