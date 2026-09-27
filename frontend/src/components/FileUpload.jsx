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
  useEffect(() => {
    const shell = shellRef.current;
    const area = shell?.querySelector(".study-scroll");
    if (!area) return;
    let frame;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        shell.dataset.density = "normal";
        for (const density of ["compact", "tight"]) {
          if (area.scrollHeight <= area.clientHeight + 1) break;
          shell.dataset.density = density;
        }
      });
    };
    const observer = new ResizeObserver(fit);
    observer.observe(area);
    for (const child of area.children) observer.observe(child);
    const mutations = new MutationObserver(fit);
    mutations.observe(area, { childList: true, subtree: true, characterData: true });
    window.visualViewport?.addEventListener("resize", fit);
    fit();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); mutations.disconnect();
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, []);
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
  const [studyPaused, setStudyPaused] = useState(false);
  const [pauseLocked, setPauseLocked] = useState(false);
  const [viewMode, setViewMode] = useState("phone");
  const [panel, setPanel] = useState(null);
  const [reviewStage, setReviewStage] = useState("all");
  const [exerciseOverrides, setExerciseOverrides] = useState({});
  const awards = useAwards(profile?.id);
  const [activeTab, setActiveTab] = useState("all");
  const exercise = exerciseOverrides[activeTab] || (activeTab === 'scrap' ? 'recall' : activeTab === 'mastered' ? 'reverse' : 'meaning');
  const setExercise = value => setExerciseOverrides(previous => ({ ...previous, [activeTab]: value }));

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
    accuracy: accuracy.today, activeMs,
  }), [deckName, allWords, positions, accuracy.today, activeMs, reviewStage]);
  const restoreSnapshot = async value => {
    const repaired = await repairSavedDeck(value.deck.words, value.deck, deckStorageKey);
    const rebuilt = rebuildStudyDeck(repaired);
    accuracy.restore(value.accuracy);
    setAllWords(rebuilt); setDeckName(value.deck.name);
    setReviewStage('all');
    setPositions(restorePositions(rebuilt, value.deck.cursors));
    setActiveMs(Number.isFinite(value.activeMs) ? value.activeMs : 0);
    setDeckVersion(version => version + 1);
  };
  const sync = useStudySync({ profileId: profile?.id, storageKey: deckStorageKey, ready,
    snapshot, hasLocal: hadLocalRecords.current, onRestore: restoreSnapshot });
  const syncBlocked = sync.state === 'loading' || sync.state === 'conflict';

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
      setActiveTab("all"); setDeckVersion(v => v + 1);
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
          setActiveTab(dx < 0 ? "mastered" : "scrap");

        } else {
          movePage(dy < 0 ? 1 : -1);
        }
      }
      setTouchStart(null);
    };

  return (
    <div ref={shellRef} className={`app-shell preview-${viewMode} reel-feed`}>
      <UpdateNotice />
      <div className="device-switcher"><button onClick={() => setViewMode("phone")}>Phone</button><button onClick={() => setViewMode("tablet")}>Tablet</button><button onClick={() => setViewMode("pc")}>PC</button></div>
      <header className="topbar"><h1>WORDTOP</h1>{profile && <div className="active-profile">{profile.avatar} {profile.name}</div>}<div className="deck-toolbar"><button className="upload-button" disabled={busy || !ready || syncBlocked} onClick={() => picker.current?.click()}>{busy ? "읽는 중…" : "+ 업로드"}</button><input ref={picker} hidden type="file" accept=".pdf,.docx,.txt,.csv,image/*" onChange={handleFile} /><strong className="deck-name" title={deckName}>{deckName}</strong></div></header>
      <StudySyncStatus sync={sync} snapshot={snapshot} />
      {notice && <div className="import-notice" role="status" onClick={() => !busy && setNotice("")}>{notice}</div>}
      {toast && <div key={toast.count} className="streak-toast" role="status"><strong>{toast.text}</strong><span>🔥 {toast.count}연속 정답</span></div>}
       <nav className="feed-tabs" inert={pauseLocked ? true : undefined}><button className={activeTab === "all" ? "active" : ""} onClick={() => { setPanel(null); setActiveTab("all");  }}>ALL FEED<small>({pendingCount.toLocaleString()})</small></button><button className={activeTab === "scrap" ? "active" : ""} onClick={() => { setPanel(null); setActiveTab("scrap");  }}>SCRAP<small>({allWords.filter(word => word.status === "scrap").length.toLocaleString()})</small></button><button className={activeTab === "mastered" ? "active" : ""} onClick={() => { setPanel(null); setActiveTab("mastered");  }}>MASTERED<small>({knownCount.toLocaleString()})</small></button></nav>
      <section className="mission-bar"><div className="mission-copy"><strong>Today&apos;s Mission</strong><span>{filteredWords.length ? safePage + 1 : 0} / {filteredWords.length}</span></div><div className="progress-track"><span style={{width: `${totalCount ? ((knownCount / totalCount) * 100) : 0}%`}} /></div><AccuracyStats live={accuracy.live} today={accuracy.today} /></section>
      <div className="study-scroll">{panel ? <LearningPanel kind={panel} awards={awards} onClose={() => setPanel(null)} /> : <>
      {activeTab !== "all" && <div className="review-controls"><label>응답 단계<select aria-label="응답 단계" disabled={pauseLocked} value={reviewStage} onChange={event => { setReviewStage(event.target.value); setPositions({ all: 0, scrap: 0, mastered: 0 }); }}>{[["all","전체"],["1","★ 3초 이내"],["2","★★ 3~6초"],["3","★★★ 6초 초과"],["unrated","이전 기록 · 미분류"]].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>복습 방법<select aria-label="복습 방법" disabled={pauseLocked} value={exercise} onChange={event => { setExercise(event.target.value); setDeckVersion(v => v + 1); }}><option value="meaning">뜻 고르기</option><option value="reverse">영어 단어 고르기</option><option value="recall">먼저 뜻 떠올리기</option></select></label></div>}
      <main className="reel-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>{pageWords.map(item => <WordCard key={`${deckVersion}-${activeTab}-${reviewStage}-${item.id}`} exercise={activeTab === "all" ? "meaning" : exercise} item={item} reviewMode={activeTab !== "all"} paused={studyPaused} onPausedChange={setStudyPaused} onFinish={() => setPauseLocked(true)} suspended={busy || syncBlocked || !!panel} choices={allWords.filter(word => word.id !== item.id).map(word => activeTab !== "all" && exercise === "reverse" ? word.word : word.meaning).slice(0, 8)} onAnswer={(id, correct, timing) => {
        const next = answerWord(allWords, activeTab, safePage, id, correct, timing);
        setActiveMs(value => value + (timing?.responseMs || 0));
        hadLocalRecords.current = true;
        accuracy.record(correct); celebrate(correct); awards.record(item, timing);
        setAllWords(next.words); setPage(nextReviewIndex(filteredWords, reviewFeed(next.words, activeTab, reviewStage), safePage, id));
        setDeckVersion(value => value + 1);
      }} />)}{ready && !pageWords.length && <div className="empty-feed">{activeTab === "all" ? "전체 학습 완료! 스크랩함에서 복습해 보세요." : "아직 담긴 단어가 없어요."}</div>}</main>
       {/* 다음 단어 미리보기 보관
       <div className="next-preview"><FitWord maxSize={22}>{filteredWords.length > 1 ? filteredWords[(safePage + 1) % filteredWords.length]?.word : "다음 단어 없음"}</FitWord></div>
       */}
       <button type="button" className="next-preview study-pause" disabled={busy || !ready || syncBlocked || !pageWords.length || pauseLocked} aria-pressed={studyPaused} onClick={() => setStudyPaused(value => !value)}>{studyPaused ? "학습 계속하기" : "잠깐 멈춤"}</button>
       <ScrapPreview words={allWords} cardKey={`${activeTab}-${pageWords[0]?.id ?? "empty"}`} />
</>}</div><nav inert={pauseLocked ? true : undefined} className="stats-nav polished-nav" aria-label="학습 메뉴">
  <button className={activeTab === "all" ? "selected" : ""} onClick={() => { setPanel(null); setActiveTab("all");  }}><svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10H3Z M9 20v-7h6v7" /></svg><small>전체</small><b>{pendingCount.toLocaleString()}</b></button>
  <button className={activeTab === "scrap" ? "selected" : ""} onClick={() => { setPanel(null); setActiveTab("scrap");  }}><svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4Z" /></svg><small>스크랩</small><b>{allWords.filter(w => w.status === "scrap").length}</b></button>
  <button className={activeTab === "mastered" ? "selected" : ""} onClick={() => { setPanel(null); setActiveTab("mastered");  }}><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></svg><small>마스터</small><b>{knownCount}</b></button>
  {/* 이전 달성률 메뉴 보관: <div className="nav-progress"><small>달성률</small><b>{progress}%</b></div> */}
  <button className={panel === "family" ? "selected" : ""} onClick={() => setPanel("family")}><span aria-hidden="true">♧</span><small>가족</small></button>
  <button className={panel === "badges" ? "selected" : ""} onClick={() => setPanel("badges")}><span aria-hidden="true">♔</span><small>배지</small>{!!awards.pending && <b>{awards.pending} 대기</b>}</button>
</nav>
    </div>
  );
}
