export function MoaSymbol({ className = '' }) {
  return <svg className={`moa-symbol ${className}`} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <rect x="9" y="7" width="42" height="47" rx="11" fill="#171c18" transform="rotate(-10 30 30)"/>
    <rect x="15" y="13" width="42" height="45" rx="11" fill="#b5ff24" stroke="#171c18" strokeWidth="2.5"/>
    <path d="M26 25h20v20H26z" fill="none" stroke="#171c18" strokeWidth="5" strokeLinejoin="round"/>
    <path d="M46 15v7m-3.5-3.5h7" stroke="#171c18" strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}
export default function MoaLogo() {
  return <span className="moa-logo"><MoaSymbol/><span className="moa-wordmark">단어모아<span className="moa-logo-dot" aria-hidden="true">.</span></span></span>;
}
