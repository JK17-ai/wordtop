import {useState} from 'react';
export default function DeckPicker({decks,activeId,onSelect,onUpload,disabled}) {
  const [open,setOpen]=useState(false);
  return <div className="deck-picker">
    <button className="deck-picker-toggle" disabled={disabled} aria-expanded={open} aria-controls="deck-picker-panel" onClick={()=>setOpen(value=>!value)}>단어장 선택하기 <span aria-hidden="true">{open?'⌃':'⌄'}</span></button>
    {open && <section id="deck-picker-panel" className="deck-picker-panel" aria-label="단어장 선택">
      <div className="deck-picker-heading"><strong>내 단어장 <span>{decks.length}</span></strong><button aria-label="단어장 선택 닫기" onClick={()=>setOpen(false)}>×</button></div>
      <div className="deck-picker-grid">{decks.map(item=>{
        const selected=item.id===activeId;
        return <button key={item.id} className={`deck-tile ${selected?'is-selected':''}`} aria-pressed={selected} disabled={disabled} onClick={()=>{if(onSelect(item.id)!==false)setOpen(false);}}>
          <span className="deck-tile-icon" aria-hidden="true">▤</span><span className="deck-tile-status">{selected?'✓ 현재 선택':'선택하기'}</span>
          <strong>{item.deck.name}</strong><small>{item.deck.words.length.toLocaleString()}개 단어</small>
        </button>;
      })}</div>
      <button className="deck-upload-new" disabled={disabled} onClick={onUpload}>＋ 새로운 문서 업로드</button>
      <p>새 단어장으로 추가돼요. 기존 단어장과 학습 기록은 유지됩니다.</p>
    </section>}
  </div>;
}
