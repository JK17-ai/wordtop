import FitWord from "./FitWord";
import { profileKey } from "../lib/profiles";
import { useEffect, useRef, useState } from "react";
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
  const [viewMode, setViewMode] = useState("phone");
  const [activeTab, setActiveTab] = useState("all");

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
        const data = saved?.words?.length ? saved.words : await fetch("/books/2027.json").then(res => {
          if (!res.ok) throw new Error("단어장을 불러오지 못했어요.");
          return res.json();
        });
        if (cancelled) return;
        const rebuilt = rebuildStudyDeck(data);
        setAllWords(rebuilt); setPositions(restorePositions(rebuilt, saved?.cursors));
        if (saved?.name) setDeckName(saved.name);
        setReady(true);
      } catch (error) { if (!cancelled) setNotice(error.message); }
    })();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(deckStorageKey, JSON.stringify({ name: deckName, words: allWords, cursors: Object.fromEntries(["all", "scrap", "mastered"].map(tab => [tab, getFeed(allWords, tab)[positions[tab]]?.id ?? null])) })); }
    catch { setNotice("저장 공간이 부족해 새로고침 후 단어장이 유지되지 않을 수 있어요."); }
  }, [ready, deckName, allWords, positions, deckStorageKey]);
  const handleFile = async event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || importing.current) return;
    importing.current = true; setBusy(true); setNotice("단어장 만드는 중…");
    try {
      const imported = await importDeck(file, setNotice);
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

    const filteredWords = getFeed(allWords, activeTab);
    const pendingCount = getFeed(allWords, "all").length;
    const pageCount = Math.max(1, filteredWords.length);
    const safePage = Math.max(0, Math.min(page, pageCount - 1));
    const pageWords = filteredWords.slice(safePage, safePage + 1);
    const movePage = (direction) => setPage((value) => { const next = Math.max(0, Math.min(pageCount - 1, value + direction)); return next; });
    const onTouchStart = (event) => setTouchStart({ x: event.touches[0].clientX, y: event.touches[0].clientY });
    const onTouchEnd = (event) => {
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
      <header className="topbar"><h1>WORDTOP</h1>{profile && <div className="active-profile">{profile.avatar} {profile.name}</div>}<div className="deck-toolbar"><button className="upload-button" disabled={busy || !ready} onClick={() => picker.current?.click()}>{busy ? "읽는 중…" : "+ 업로드"}</button><input ref={picker} hidden type="file" accept=".pdf,.docx,.txt,.csv,image/*" onChange={handleFile} /><strong className="deck-name" title={deckName}>{deckName}</strong></div></header>
      {notice && <div className="import-notice" role="status" onClick={() => !busy && setNotice("")}>{notice}</div>}
      {toast && <div key={toast.count} className="streak-toast" role="status"><strong>{toast.text}</strong><span>🔥 {toast.count}연속 정답</span></div>}
       <nav className="feed-tabs"><button className={activeTab === "all" ? "active" : ""} onClick={() => { setActiveTab("all");  }}>ALL FEED<small>({pendingCount.toLocaleString()})</small></button><button className={activeTab === "scrap" ? "active" : ""} onClick={() => { setActiveTab("scrap");  }}>SCRAP<small>({allWords.filter(word => word.status === "scrap").length.toLocaleString()})</small></button><button className={activeTab === "mastered" ? "active" : ""} onClick={() => { setActiveTab("mastered");  }}>MASTERED<small>({knownCount.toLocaleString()})</small></button></nav>
      <section className="mission-bar"><div className="mission-copy"><strong>Today&apos;s Mission</strong><span>{filteredWords.length ? safePage + 1 : 0} / {filteredWords.length}</span></div><div className="progress-track"><span style={{width: `${totalCount ? ((knownCount / totalCount) * 100) : 0}%`}} /></div><AccuracyStats live={accuracy.live} today={accuracy.today} /></section>
      <div className="study-scroll"><main className="reel-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>{pageWords.map(item => <WordCard key={`${deckVersion}-${activeTab}-${item.id}`} item={item} suspended={busy} choices={allWords.filter(word => word.id !== item.id).map(word => word.meaning).slice(0, 8)} onAnswer={(id, correct) => {
        const next = answerWord(allWords, activeTab, safePage, id, correct);
        accuracy.record(correct); celebrate(correct);
        setAllWords(next.words); setPage(next.index);
        setDeckVersion(value => value + 1);
      }} />)}{ready && !pageWords.length && <div className="empty-feed">{activeTab === "all" ? "전체 학습 완료! 스크랩함에서 복습해 보세요." : "아직 담긴 단어가 없어요."}</div>}</main>
       <div className="next-preview"><FitWord maxSize={22}>{filteredWords.length > 1 ? filteredWords[(safePage + 1) % filteredWords.length]?.word : "다음 단어 없음"}</FitWord></div>
       <ScrapPreview words={allWords} cardKey={`${activeTab}-${pageWords[0]?.id ?? "empty"}`} />
</div><nav className="stats-nav polished-nav" aria-label="학습 메뉴">
  <button className={activeTab === "all" ? "selected" : ""} onClick={() => { setActiveTab("all");  }}><svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10H3Z M9 20v-7h6v7" /></svg><small>전체</small><b>{pendingCount.toLocaleString()}</b></button>
  <button className={activeTab === "scrap" ? "selected" : ""} onClick={() => { setActiveTab("scrap");  }}><svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4Z" /></svg><small>스크랩</small><b>{allWords.filter(w => w.status === "scrap").length}</b></button>
  <button className={activeTab === "mastered" ? "selected" : ""} onClick={() => { setActiveTab("mastered");  }}><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></svg><small>마스터</small><b>{knownCount}</b></button>
  <div className="nav-progress"><svg viewBox="0 0 24 24"><path d="M4 20V13m8 7V8m8 12V3"/></svg><small>달성률</small><b>{progress}%</b></div>
</nav>
    </div>
  );
}
