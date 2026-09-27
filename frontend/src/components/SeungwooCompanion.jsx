import { MoaMark } from './MoaCompanion';
export function SeungwooFace({ mood = 'idle', className = '' }) {
  const positions = { idle:'0% 0%', correct:'50% 0%', wrong:'100% 0%', paused:'0% 100%', streak:'50% 100%', badge:'100% 100%' };
  return <span aria-hidden="true" className={`seungwoo-face ${className}`} style={{backgroundPosition:positions[mood] || positions.idle}}/>;
}
export default function SeungwooCompanion({ paused, reaction }) {
  const mood = paused ? 'paused' : reaction?.mood || 'idle';
  const label = paused ? '잠깐 충전 중' : mood === 'badge' ? `${reaction?.tier === 'gold' ? '금' : reaction?.tier === 'silver' ? '은' : '동'} 배지 획득!` : mood === 'streak' ? `${reaction.count}연속 정답` : mood === 'correct' ? '좋아, 기억했어.' : mood === 'wrong' ? '다음엔 기억하면 돼.' : '';
  return <div className="companion-space"><div key={reaction?.id || mood} className={`seungwoo-companion mood-${mood}`}>
    {mood === 'idle' || mood === 'paused' ? <MoaMark mood={mood}/> : <SeungwooFace mood={mood}/>}<span className="companion-caption">{label}</span>
  </div></div>;
}
