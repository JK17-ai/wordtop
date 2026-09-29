export default function DeckPicker({decks,activeId,onSelect,onUpload,onClose,disabled}) {
  const emptySlots=Math.max(1,6-decks.length);
  return <section className="deck-selection-page" aria-label="단어장 선택">
    <header className="deck-selection-header"><button onClick={onClose} aria-label="단어장 선택 닫기">←</button><div><h2>단어장 선택하기</h2><p>학습할 단어장을 골라 주세요</p></div><span>{decks.length}개</span></header>
    <div className="deck-selection-grid">
      {decks.map(item=><button key={item.id} className={`deck-choice ${item.id===activeId?'is-selected':''}`} aria-pressed={item.id===activeId} disabled={disabled} onClick={()=>{if(onSelect(item.id)!==false)onClose();}}>
        <span className="deck-choice-art" aria-hidden="true"><span>▤</span>{item.id===activeId&&<i>✓</i>}</span>
        <strong>{item.deck.name}</strong><small>{item.common ? '공통 단어장 · ' : ''}{item.deck.words.length.toLocaleString()}개 단어</small><span className="deck-choice-status">{item.id===activeId?'현재 선택':'선택하기'}</span>
      </button>)}
      {Array.from({length:emptySlots},(_,i)=><button key={`add-${i}`} className="deck-choice deck-choice-empty" disabled={disabled} onClick={onUpload} aria-label="새 단어장 추가"><span className="deck-choice-art" aria-hidden="true">＋</span><strong>단어장 추가</strong><small>문서에서 가져오기</small></button>)}
    </div>
    <p className="deck-selection-note">공통 단어장은 누구나 바로 선택할 수 있어요. ＋로 내 문서를 추가해도 기존 학습 기록은 유지돼요.</p>
  </section>;
}
