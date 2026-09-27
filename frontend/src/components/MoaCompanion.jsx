export function MoaMark({ mood = 'idle', className = '' }) {
  return <svg className={`moa-mark ${className}`} viewBox="0 0 120 120" aria-hidden="true">
    <rect x="26" y="17" width="70" height="83" rx="17" fill="#df9aac" transform="rotate(12 61 58)" />
    <rect x="18" y="22" width="73" height="82" rx="17" fill="#fff4db" stroke="#593746" strokeWidth="3" />
    <path d="M33 39h21" stroke="#ba3e62" strokeWidth="5" strokeLinecap="round" />
    {mood === 'paused' ? <path d="M35 62h9m19 0h9" stroke="#593746" strokeWidth="4" strokeLinecap="round" /> : mood === 'correct' ? <path d="m34 63 5-5 5 5m18 0 5-5 5 5" stroke="#593746" strokeWidth="4" strokeLinecap="round" fill="none" /> : <g fill="#593746"><circle cx="39" cy="62" r="3.5"/><circle cx="67" cy="62" r="3.5"/></g>}
    <path d={mood === 'correct' ? 'M44 75q10 13 20 0' : mood === 'wrong' ? 'M47 79q8-4 15 0' : 'M47 76q7 5 14 0'} stroke="#593746" strokeWidth="3" strokeLinecap="round" fill="none" />
  </svg>;
}
export default function MoaCompanion({ paused, reaction }) {
  const mood = paused ? 'paused' : reaction?.mood || 'idle';
  return <div className="companion-space" aria-hidden="true"><div key={reaction?.id || mood} className={`moa-companion mood-${mood}`}>
    <MoaMark mood={mood}/><span>{paused ? '잠깐 충전 중' : mood === 'correct' ? '좋아, 하나 더 쌓았다.' : mood === 'wrong' ? '다음에 기억하면 돼.' : '한 단어씩, 내 것으로.'}</span>
  </div></div>;
}
