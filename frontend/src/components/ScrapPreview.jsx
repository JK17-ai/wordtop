import FitWord from './FitWord';
import { useMemo, useState } from 'react';

// Prefer supplied ratings. Legacy decks use the existing provisional heuristic.
const rating = word => Number(word.difficulty ?? word.stars) || Math.max(1, Math.min(5, 1 + Math.floor(String(word.word).replace(/[^a-z]/gi, '').length / 4) + (/\s|-/.test(word.word) ? 1 : 0)));
export default function ScrapPreview({ words, cardKey }) {
  const [cycle, setCycle] = useState({ key: cardKey, step: 0 });
  if (cycle.key !== cardKey) setCycle({ key: cardKey, step: cycle.step + 1 });
  const scraps = words.filter(word => word.status === 'scrap');
  const pool = useMemo(() => {
    const candidates = words.filter(word => rating(word) >= 4).map(word => word.id);
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    return candidates;
  }, [cardKey, words]);
  const start = scraps.length ? (cycle.step * 4) % scraps.length : 0;
  const visible = Array.from({ length: Math.min(4, scraps.length) }, (_, index) => scraps[(start + index) % scraps.length]);
  const ids = new Set(visible.map(word => word.id));
  const byId = new Map(words.map(word => [word.id, word]));
  for (const id of pool) {
    if (visible.length === 4) break;
    if (!ids.has(id)) { visible.push(byId.get(id)); ids.add(id); }
  }
  return <section className="scrap-preview" aria-label="스크랩 단어 복습">
    <div className="scrap-preview-heading"><span>스크랩 다시 보기</span><small>({scraps.length.toLocaleString()}개)</small></div>
    {visible.length ? <div className="scrap-preview-pair" key={cardKey}>
      {visible.map(word => <div className="scrap-preview-item" key={word.id}><FitWord as="strong" maxSize={15}>{word.word}</FitWord><span>{word.meaning}</span></div>)}
    </div> : <p className="scrap-preview-empty">스크랩 또는 4★ 이상 단어가 아직 없어요.</p>}
  </section>;
}
