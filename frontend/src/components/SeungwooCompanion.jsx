import { createPortal } from 'react-dom';
import { useLayoutEffect, useRef, useState } from 'react';
import { MoaMark } from './MoaCompanion';
export function SeungwooFace({ mood = 'idle', className = '' }) {
  const positions = { idle:'0% 0%', correct:'50% 0%', wrong:'100% 0%', paused:'0% 100%', streak:'50% 100%', badge:'100% 100%' };
  return <span aria-hidden="true" className={`seungwoo-face ${className}`} style={{backgroundPosition:positions[mood] || positions.idle}}/>;
}
export default function SeungwooCompanion({ paused, reaction }) {
  const space = useRef(null);
  const [bounds, setBounds] = useState({ height:0, left:0, top:0, width:0 });
  useLayoutEffect(() => {
    const element = space.current;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      const nav = element.closest('.app-shell')?.querySelector('.stats-nav')?.getBoundingClientRect();
      const bottom = Math.min(rect.bottom, nav?.top ?? window.innerHeight) - 8;
      setBounds({ height:rect.height, left:rect.left, width:rect.width, top:Math.max(8, bottom - 145 - Math.max(0, (rect.height - 161) / 2)) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
        window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, []);
  const height = bounds.height;
  const mood = paused ? 'paused' : reaction?.mood || 'idle';
  const label = paused ? '잠깐 충전 중' : mood === 'badge' ? `${reaction?.tier === 'gold' ? '금' : reaction?.tier === 'silver' ? '은' : '동'} 배지 획득!` : mood === 'streak' ? `${reaction.count}연속 정답` : mood === 'correct' ? '좋아, 기억했어.' : mood === 'wrong' ? '다음엔 기억하면 돼.' : '';
  const effect = mood !== 'idle' && mood !== 'paused';
  return <><div ref={space} className="companion-space">
    {!effect && height >= 96 && <div className={`seungwoo-companion mood-${mood}`}><MoaMark mood={mood}/><span className="companion-caption">{label}</span></div>}
  </div>{effect && createPortal(<div key={reaction?.id || mood} className={`seungwoo-companion reaction-overlay mood-${mood}`} style={{ left:bounds.left, top:bounds.top, width:bounds.width }}>
    <SeungwooFace mood={mood}/><span className="companion-caption">{label}</span>
  </div>, document.body)}</>;
}