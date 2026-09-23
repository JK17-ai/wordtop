import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";
import WordCard from "./WordCard";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function FileUpload() {
  const [viewMode, setViewMode] = useState("phone");

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 4;
  const [touchStart, setTouchStart] = useState(null);

  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");

  const [allWords, setAllWords] = useState([]);   // ??????????諛몃마嶺뚮?????????????硫λ젒???????
  const [words, setWords] = useState([]);         // ????????????????????⑤벡???????????????

    useEffect(() => {

        fetch("/books/2027.json")
            .then(res => res.json())
            .then(data => {

                setAllWords(data);
                setWords(data);

            })
            .catch(err => {

                console.log("Failed to load default words", err);

            });

    }, []);



  // ==========================
  // PDF ?????
  // ==========================

  const parsePdfWords = (text) => {

    text = text
      .replace(/[\\r\\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const tokens = text.split(" ");

    const result = [];
    const used = new Set();

    let i = 0;

    while (i < tokens.length) {

      if (!/^[A-Za-z~-]+$/.test(tokens[i])) {
        i++;
        continue;
      }

      // --------------------
      // ?????????????????????
      // --------------------

      let eng = tokens[i];
      i++;

      while (
        i < tokens.length &&
        /^[A-Za-z~-]+$/.test(tokens[i])
      ) {
        eng += " " + tokens[i];
        i++;
      }

      eng = eng.trim();

      if (eng.length < 3) continue;
      if (eng.toLowerCase() === "chapter") continue;
      if (/^\d/.test(eng)) continue;

      // --------------------
      // ??
      // --------------------

      let kor = "";

      while (
        i < tokens.length &&
        !/^[A-Za-z~-]+$/.test(tokens[i])
      ) {

        kor += tokens[i] + " ";

        i++;

      }

      kor = kor.trim();

      if (!/[\uAC00-\uD7A3]/.test(kor)) continue;

      // ?????????????????????????????????????
      if (/^\d/.test(kor)) continue;

      // ??????????⑤벡???????븐뼐???????????????????????????????????
      kor = kor
        .replace(/\([^)]*\)/g, "")
        .replace(/\(\s*pl\..*?\)/g, "")
        .trim();

      if (kor.length === 0) continue;

      if (used.has(eng.toLowerCase())) continue;

      used.add(eng.toLowerCase());

      result.push({
        id: result.length,
        word: eng,
        meaning: kor,
        checked: false
      });

    }

    console.log(result);

    setAllWords(result);
    setWords(result);

  };

  // ==========================
  // Word ?????
  // ==========================

  const parseWordWords = (text) => {

    const lines = text
      .split("\n")
      .map(v => v.trim())
      .filter(v => v !== "");

    const result = [];

    for (let i = 0; i < lines.length; i += 2) {

      if (!lines[i + 1]) continue;

      result.push({
        id: result.length,
        word: lines[i],
        meaning: lines[i + 1],
        checked: false
      });

    }
    setAllWords(result);
    setWords(result);

  };

  // ==========================
  // ????????????
  // ==========================

  const handleFile = async (e) => {

    const file = e.target.files[0];

    if (!file) return;

    setFileName(file.name);

    if (file.name.toLowerCase().endsWith(".pdf")) {

      await readPDF(file);

    } else if (file.name.toLowerCase().endsWith(".docx")) {

      await readWord(file);

    } else {

      alert("PDF ?????DOCX?????????????????????????ㅼ뒧???嫄??????????????????살몝??");

    }

  };

  // ==========================
  // PDF
  // ==========================

  const readPDF = async (file) => {

    const buffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: buffer
    }).promise;

    let result = "";

    for (let page = 1; page <= pdf.numPages; page++) {

      const p = await pdf.getPage(page);

      const content = await p.getTextContent();

      result +=
        content.items
          .map(item => item.str)
          .join(" ")
        + "\n";

    }

    setText(result);

    parsePdfWords(result);

  };

  // ==========================
  // WORD
  // ==========================

  const readWord = async (file) => {

    const buffer = await file.arrayBuffer();

    const result = await mammoth.extractRawText({
      arrayBuffer: buffer
    });

    setText(result.value);

    parseWordWords(result.value);

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

    const pageCount = Math.max(1, Math.ceil(words.length / PAGE_SIZE));
    const pageWords = words.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const movePage = (direction) => setPage((value) => Math.max(0, Math.min(pageCount - 1, value + direction)));
    const onTouchStart = (event) => setTouchStart({ x: event.touches[0].clientX, y: event.touches[0].clientY });
    const onTouchEnd = (event) => {
      if (!touchStart) return;
      const dx = event.changedTouches[0].clientX - touchStart.x;
      const dy = event.changedTouches[0].clientY - touchStart.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 45) movePage((dx < -45 || dy < -45) ? 1 : -1);
      setTouchStart(null);
    };

    const downloadJson = () => {

        if (allWords.length === 0) {

            alert("?????????Β?щ엠?????饔낅떽?????? PDF?????????????????????嫄?????????");

            return;

        }

        const json = JSON.stringify(allWords, null, 2);

        const blob = new Blob([json], {
            type: "application/json"
        });

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");

        a.href = url;
        a.download = "2027.json";

        a.click();

        URL.revokeObjectURL(url);

    };

    const toggleWord = (id) => {

          console.log("?????", id);

    const updated = allWords.map(word => {

        if (word.id === id) {

        return {
            ...word,
            checked: !word.checked
        };

        }

        return word;

    });

    setAllWords(updated);
    setWords(updated);

    };

    console.log("toggleWord =", toggleWord);

    const statCard = {
        background: "#fff",
        borderRadius: 15,
        padding: 20,
        textAlign: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,.08)"
    };

  return (
    <div className={`app-shell preview-${viewMode}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="device-switcher"><button className={viewMode === "phone" ? "active" : ""} onClick={() => setViewMode("phone")}>Phone</button><button className={viewMode === "tablet" ? "active" : ""} onClick={() => setViewMode("tablet")}>Tablet</button><button className={viewMode === "pc" ? "active" : ""} onClick={() => setViewMode("pc")}>PC</button></div>
      <header className="topbar">
        <h1>WORDTOP</h1>
        <p className="welcome-line">Welcome back · Start today&apos;s words</p>
        <label className="upload-button">+ Upload<input type="file" accept=".pdf,.docx" onChange={handleFile} /></label>
        <button className="save-button" onClick={downloadJson}>Save JSON</button>
        {totalCount > 0 && <span className="upload-status">Upload complete · {totalCount.toLocaleString()} words</span>}
      </header>
      <section className="mission-bar">
        <div className="mission-copy"><strong>Today&apos;s Mission</strong><span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount || words.length} words</span></div>
        <div className="progress-track"><span style={{width: `${totalCount ? ((Math.min((page + 1) * PAGE_SIZE, totalCount) / totalCount) * 100) : 0}%`}} /></div>
      </section>
      <main className="word-feed">
        {pageWords.map(item => <WordCard key={item.id} item={item} onToggle={toggleWord} />)}
      </main>
      <nav className="stats-nav" aria-label="Study navigation">
        <div><span>H</span><small>Home</small><b>{totalCount}</b></div>
        <div><span>D</span><small>Decks</small><b>{knownCount}</b></div>
        <div><span>+</span><small>Upload</small><b>{unknownCount}</b></div>
        <div><span>R</span><small>Records</small><b>{progress}%</b></div>
      </nav>
    </div>
  );
}