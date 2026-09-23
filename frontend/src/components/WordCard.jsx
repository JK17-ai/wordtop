import { useEffect, useState } from "react";

const difficulty = (word = "") => Math.max(1, Math.min(5, 1 + Math.floor(word.replace(/[^a-z]/gi, "").length / 4) + (/\s|-/.test(word) ? 1 : 0)));

export default function WordCard({ item, onToggle }) {
  const [ipa, setIpa] = useState(item.pronunciation || "/…/");
  const [revealed, setRevealed] = useState(false);
  const stars = difficulty(item.word);
  useEffect(() => {
    if (item.pronunciation) return;
    const word = String(item.word || "").split(/\s+/)[0];
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`).then(r => r.ok ? r.json() : []).then(d => { const p = d?.[0]?.phonetics?.find(x => x.text)?.text; if (p) setIpa(p); }).catch(() => {});
  }, [item.word, item.pronunciation]);
  const speak = () => { if (window.speechSynthesis) { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(item.word); u.lang = "en-US"; window.speechSynthesis.speak(u); } };
  return <article className={`word-card ${item.checked ? "is-killed" : ""}`}>
    <div className="card-topline"><span className="part-of-speech">VOCAB</span><span className="difficulty-stars">{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span></div>
    <h2 className="word-term">{item.word}</h2>
    <div className="pronunciation">{ipa}</div>
    <div className="meaning-row"><span className="word-meaning">{revealed ? item.meaning : "뜻을 떠올린 뒤 눌러 확인"}</span><button className="meaning-button" onClick={() => setRevealed(v => !v)}>{revealed ? "숨기기" : "뜻 보기"}</button></div>
    <p className="example-line">“{item.word}” — 오늘 학습할 핵심 어휘</p>
    <div className="card-actions"><button className="listen-button" onClick={speak}>🔊 듣기</button><button className="complete-button" onClick={() => onToggle(item.id)}>{item.checked ? "완료됨" : "암기 완료"}</button></div>
  </article>;
}
