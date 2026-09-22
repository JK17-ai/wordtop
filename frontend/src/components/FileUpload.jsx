import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";
import WordCard from "./WordCard";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function FileUpload() {

  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");

  const [allWords, setAllWords] = useState([]);   // 전체 단어
  const [words, setWords] = useState([]);         // 화면에 보여줄 단어

  // ==========================
  // PDF 파싱
  // ==========================

  const parsePdfWords = (text) => {

    text = text
      .replace(/□/g, " ")
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
      // 영어(숙어)
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
      // 뜻
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

      if (!/[가-힣]/.test(kor)) continue;

      // 숫자만 있는 뜻 제거
      if (/^\d/.test(kor)) continue;

      // 본문 표시 제거
      kor = kor
        .replace(/본문.*?쪽/g, "")
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
  // Word 파싱
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
  // 파일 업로드
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

      alert("PDF 또는 DOCX만 가능합니다.");

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


    const toggleWord = (id) => {

          console.log("클릭!", id);

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

    <div style={{ padding: 30 }}>

      <h1>WORDTOP</h1>

      <input
        type="file"
        accept=".pdf,.docx"
        onChange={handleFile}
      />

    <div style={{ marginTop:20 }}>

        <h3>{fileName}</h3>

        {

            totalCount > 0 &&

            <div
                style={{
                    marginTop:10,
                    padding:15,
                    borderRadius:10,
                    background:"#e8f5e9",
                    color:"#2e7d32",
                    fontWeight:"bold"
                }}
            >
                ✅ 업로드 완료 · {totalCount.toLocaleString()}개 단어
            </div>

        }

    </div>


      <hr style={{ margin: "40px 0" }} />

<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: 15,
    marginTop: 30,
    marginBottom: 30
  }}
>    

        <div style={statCard}>
            <div style={{fontSize:30}}>📚</div>
            <div>전체</div>
            <h2>{totalCount}</h2>
        </div>

        <div style={statCard}>
            <div style={{fontSize:30}}>✅</div>
            <div>완료</div>
            <h2>{knownCount}</h2>
        </div>

        <div style={statCard}>
            <div style={{fontSize:30}}>📖</div>
            <div>복습</div>
            <h2>{unknownCount}</h2>
        </div>

        <div style={statCard}>
            <div style={{fontSize:30}}>📈</div>
            <div>진행률</div>
            <h2>{progress}%</h2>
        </div>

        </div>

  
    <div
    style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
        gap: 20
    }}
    >
    {words.map(item => (
        <WordCard
        key={item.id}
        item={item}
        onToggle={toggleWord}
        />
    ))}
    </div>

    </div>

  );

}