import { useEffect, useState } from 'react';

const day = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
};
const empty = () => ({ date: day(), total: 0, correct: 0 });
function read(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved?.date === day() && Number.isInteger(saved.total) && Number.isInteger(saved.correct) && saved.correct >= 0 && saved.total >= saved.correct) return saved;
  } catch { /* Start fresh if storage is unavailable or invalid. */ }
  return empty();
}
export default function useAccuracy(key = "wordtop-daily-accuracy-v1") {
  const [live, setLive] = useState({ total: 0, correct: 0 });
  const [today, setToday] = useState(() => read(key));
  useEffect(() => {
    const check = () => setToday(value => value.date === day() ? value : empty());
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, []);
  const record = correct => {
    setLive(value => ({ total: value.total + 1, correct: value.correct + Number(correct) }));
    const previous = read(key);
    const next = { date: day(), total: previous.total + 1, correct: previous.correct + Number(correct) };
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* The live counter still works. */ }
    setToday(next);
  };
  return { live, today, record };
}
export function AccuracyStats({ live, today }) {
  return <div className="accuracy-stats">{[['실시간 정답률', live], ['오늘의 정답률', today]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value.total ? `${Math.round(value.correct / value.total * 100)}%` : '—'}</strong><small>{value.correct} / {value.total} 정답</small></div>)}</div>;
}
