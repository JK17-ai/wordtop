import FitWord from "./FitWord";
import { useEffect, useRef, useState } from "react";
import { importDeck } from "./importDeck";
import WordCard from "./WordCard";
import ScrapPreview from "./ScrapPreview";
import useAccuracy, { AccuracyStats } from "./useAccuracy";



export default function FileUpload() {
  const accuracy = useAccuracy();
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

  const [page, setPage] = useState(() => Number(localStorage.getItem("wordtop-page") || 0));
  const PAGE_SIZE = 1;
  const [touchStart, setTouchStart] = useState(null);

  const [deckName, setDeckName] = useState("2027 수능 EBS영단어");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const [deckVersion, setDeckVersion] = useState(0);
  const [allWords, setAllWords] = useState([]);
  const [words, setWords] = useState([]);
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
        try { saved = JSON.parse(localStorage.getItem("wordtop-current-deck")); } catch { /* Use bundled deck. */ }
        const data = saved?.words?.length ? saved.words : await fetch("/books/2027.json").then(res => {
          if (!res.ok) throw new Error("단어장을 불러오지 못했어요.");
          return res.json();
        });
        if (cancelled) return;
        setAllWords(data); setWords(data);
        if (saved?.name) setDeckName(saved.name);
        setReady(true);
      } catch (error) { if (!cancelled) setNotice(error.message); }
    })();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem("wordtop-current-deck", JSON.stringify({ name: deckName, words: allWords })); }
    catch { setNotice("저장 공간이 부족해 새로고침 후 단어장이 유지되지 않을 수 있어요."); }
  }, [ready, deckName, allWords]);
  const handleFile = async event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || importing.current) return;
    importing.current = true; setBusy(true); setNotice("단어장 만드는 중…");
    try {
      const imported = await importDeck(file, setNotice);
      setAllWords(imported); setWords(imported);
      setDeckName(file.name.replace(/\.[^.]+$/, ""));
      setPage(0); setActiveTab("all"); setDeckVersion(v => v + 1);
      streak.current = 0; setToast(null);
      try { localStorage.setItem("wordtop-page", "0"); } catch { /* Memory still works. */ }
      setNotice(imported.length.toLocaleString() + "개 단어로 새 단어장을 만들었어요.");
    } catch (error) {
      setNotice(error.message || "파일을 읽지 못했어요. 다른 파일로 다시 시도해 주세요.");
    } finally { importing.current = false; setBusy(false); }
  };
    const totalCount = allWords.length;

    const knownCount =
        allWords.filter(word => word.checked).length;

    const unknownCount =
        totalCount - knownCount;

    const progress =
        totalCount === 0
            ? 0
            : Math.round((knownCount / totalCount) * 100);

    const filteredWords = activeTab === "all" ? words : words.filter(word => word.status === activeTab || (activeTab === "mastered" && word.checked));
    const pageCount = Math.max(1, filteredWords.length);
    const safePage = Math.min(page, pageCount - 1);
    const pageWords = filteredWords.slice(safePage, safePage + 1);
    const movePage = (direction) => setPage((value) => { const next = Math.max(0, Math.min(pageCount - 1, value + direction)); localStorage.setItem("wordtop-page", String(next)); return next; });
    const onTouchStart = (event) => setTouchStart({ x: event.touches[0].clientX, y: event.touches[0].clientY });
    const onTouchEnd = (event) => {
      if (!touchStart) return;
      const dx = event.changedTouches[0].clientX - touchStart.x;
      const dy = event.changedTouches[0].clientY - touchStart.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 45) {
        if (Math.abs(dx) > Math.abs(dy)) {
          setActiveTab(dx < 0 ? "mastered" : "scrap");
          setPage(0);
        } else {
          movePage(dy < 0 ? 1 : -1);
        }
      }
      setTouchStart(null);
    };

  return (
    <div ref={shellRef} className={`app-shell preview-${viewMode} reel-feed`}>
      <div className="device-switcher"><button onClick={() => setViewMode("phone")}>Phone</button><button onClick={() => setViewMode("tablet")}>Tablet</button><button onClick={() => setViewMode("pc")}>PC</button></div>
      <header className="topbar"><h1>WORDTOP</h1><div className="deck-toolbar"><button className="upload-button" disabled={busy || !ready} onClick={() => picker.current?.click()}>{busy ? "읽는 중…" : "+ 업로드"}</button><input ref={picker} hidden type="file" accept=".pdf,.docx,.txt,.csv,image/*" onChange={handleFile} /><strong className="deck-name" title={deckName}>{deckName}</strong></div></header>
      {notice && <div className="import-notice" role="status" onClick={() => !busy && setNotice("")}>{notice}</div>}
      {toast && <div key={toast.count} className="streak-toast" role="status"><strong>{toast.text}</strong><span>🔥 {toast.count}연속 정답</span></div>}
       <nav className="feed-tabs"><button className={activeTab === "all" ? "active" : ""} onClick={() => { setActiveTab("all"); setPage(0); }}>ALL FEED<small>({allWords.length.toLocaleString()})</small></button><button className={activeTab === "scrap" ? "active" : ""} onClick={() => { setActiveTab("scrap"); setPage(0); }}>SCRAP<small>({allWords.filter(word => word.status === "scrap").length.toLocaleString()})</small></button><button className={activeTab === "mastered" ? "active" : ""} onClick={() => { setActiveTab("mastered"); setPage(0); }}>MASTERED<small>({knownCount.toLocaleString()})</small></button></nav>
      <section className="mission-bar"><div className="mission-copy"><strong>Today&apos;s Mission</strong><span>{page + 1} / {pageCount}</span></div><div className="progress-track"><span style={{width: `${totalCount ? ((knownCount / totalCount) * 100) : 0}%`}} /></div><AccuracyStats live={accuracy.live} today={accuracy.today} /></section>
      <div className="study-scroll"><main className="reel-stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>{pageWords.map(item => <WordCard key={`${deckVersion}-${activeTab}-${item.id}`} item={item} suspended={busy} choices={allWords.filter(word => word.id !== item.id).map(word => word.meaning).slice(0, 8)} onNext={() => { if (activeTab === "all") movePage(1); }} onAnswer={(id, correct) => { accuracy.record(correct); celebrate(correct); const next = allWords.map(word => word.id === id ? { ...word, status: correct ? "mastered" : "scrap", checked: correct } : word); setAllWords(next); setWords(next); localStorage.setItem("wordtop-progress", JSON.stringify({ id, status: correct ? "mastered" : "scrap" })); }} onScrap={(id) => { const next = allWords.map(word => word.id === id ? { ...word, status: "scrap" } : word); setAllWords(next); setWords(next); }} />)}</main>
       <div className="next-preview"><FitWord maxSize={22}>{filteredWords[(page + 1) % Math.max(filteredWords.length, 1)]?.word || "End of feed"}</FitWord></div>
       <ScrapPreview words={allWords} cardKey={`${activeTab}-${pageWords[0]?.id ?? "empty"}`} />
</div><nav className="stats-nav polished-nav" aria-label="학습 메뉴">
  <button className={activeTab === "all" ? "selected" : ""} onClick={() => { setActiveTab("all"); setPage(0); }}><svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10H3Z M9 20v-7h6v7" /></svg><small>전체</small><b>{totalCount.toLocaleString()}</b></button>
  <button className={activeTab === "scrap" ? "selected" : ""} onClick={() => { setActiveTab("scrap"); setPage(0); }}><svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4Z" /></svg><small>스크랩</small><b>{allWords.filter(w => w.status === "scrap").length}</b></button>
  <button className={activeTab === "mastered" ? "selected" : ""} onClick={() => { setActiveTab("mastered"); setPage(0); }}><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></svg><small>마스터</small><b>{knownCount}</b></button>
  <div className="nav-progress"><svg viewBox="0 0 24 24"><path d="M4 20V13m8 7V8m8 12V3"/></svg><small>달성률</small><b>{progress}%</b></div>
</nav>
    </div>
  );
}
