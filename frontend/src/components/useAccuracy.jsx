import { useEffect, useState } from 'react';
import {studyDay as day} from './dailyStudy.js';
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
  const restore = value => {
    const next = value?.date === day() ? value : empty();
    localStorage.setItem(key, JSON.stringify(next));
    setToday(next);
    setLive({ total: 0, correct: 0 });
  };
  return { live, today, record, restore };
}
