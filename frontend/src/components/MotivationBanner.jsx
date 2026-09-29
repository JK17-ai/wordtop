import {MOTIVATION_BANNERS} from './motivationData.js';
import './MotivationBanner.css';

function Illustration({kind}) {
  return <svg viewBox="0 0 104 64" fill="none" aria-hidden="true" focusable="false">
    <ellipse cx="56" cy="56" rx="37" ry="5" fill="#dceabb"/>
    {kind==='sprout' ? <>
      <path d="M42 40h31l-5 17H47z" fill="#b4ee59" stroke="#334d27" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M57 40V22" stroke="#334d27" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M57 31C39 32 34 23 35 16c14-1 23 4 22 15Z" fill="#baff48" stroke="#334d27" strokeWidth="2"/>
      <path d="M57 24C57 10 69 7 79 10c-1 12-9 18-22 14Z" fill="#e0f6ab" stroke="#334d27" strokeWidth="2"/>
      <path d="m19 20 3-5 3 5-3 5Zm66 17 3-5 3 5-3 5Z" fill="#84ba38"/>
      <path d="M53 47h1m8 0h1m-9 4q4 3 8 0" stroke="#334d27" strokeWidth="2" strokeLinecap="round"/>
    </> : kind==='steps' ? <>
      <path d="M23 55V43h19V31h20V19h20v36Z" fill="#d7efa5" stroke="#334d27" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M42 55V43m20 12V31" stroke="#a1ca63" strokeWidth="2"/>
      <circle cx="40" cy="17" r="7" fill="#baff48" stroke="#334d27" strokeWidth="2"/>
      <path d="m39 25-5 10 12 1 7-8m-16 6-8 7m10-15 10-3" stroke="#334d27" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M81 18V4l12 4-12 5" fill="#baff48" stroke="#334d27" strokeWidth="2" strokeLinejoin="round"/>
    </> : <>
      <path d="m29 27 13-14h25l14 14-26 29Z" fill="#baff48" stroke="#334d27" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M29 27h52M42 13l-2 14 15 29 14-29-2-14M40 27l15-14 14 14" stroke="#689733" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M18 17v8m-4-4h8m62 18v8m-4-4h8M79 7v6m-3-3h6" stroke="#689733" strokeWidth="2" strokeLinecap="round"/>
    </>}
  </svg>;
}
// Replace this slot's content with a clearly labelled ad when an ad provider is added.
// No ad SDK, tracking or external requests are loaded here.
// Keep both assignments alive across menu changes. Rotate only the visible slot.
export default function MotivationBanner({index=0}) {
  const banner=MOTIVATION_BANNERS[index];
  return <aside className="feed-message-slot motivation-slot" aria-label="오늘의 응원" data-slot="learning-message-ad" data-content-type="motivation">
    <div className="motivation-banner" key={banner.id}>
      <div className="motivation-copy"><strong>{banner.title}</strong><p>{banner.text}</p></div>
      <div className="motivation-art"><Illustration kind={banner.id}/></div>
    </div>
  </aside>;
}
