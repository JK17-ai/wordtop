export function AccuracyStats({ live, today }) {
  return <div className="accuracy-stats">{[['실시간 정답률', live], ['오늘의 정답률', today]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value.total ? `${Math.round(value.correct / value.total * 100)}%` : '—'}</strong>{/* 기존 집계 문구 보관: <small>{value.correct} / {value.total} 정답</small> */}</div>)}</div>;
}
