import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import useDialogFocus from './useDialogFocus';

const personalDeck=item=>!item.common && !(item.id==='original' && item.deck.name==='2027 수능 EBS영단어');
function DeleteDeckDialog({item,onCancel,onConfirm,disabled}) {
  const dialog=useDialogFocus(onCancel,disabled);
  return createPortal(<div className="app-notice-backdrop"><section ref={dialog} tabIndex={-1} className="app-notice-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-deck-title" aria-describedby="delete-deck-description">
    <h2 id="delete-deck-title">삭제하시겠습니까?</h2><p id="delete-deck-description">{item.deck.name} · {item.deck.words.length}개 단어<br/>삭제한 단어장은 나중에 복원할 수 있어요.</p>
    <div className="deck-delete-actions"><button disabled={disabled} onClick={onCancel}>아니요</button><button disabled={disabled} onClick={onConfirm}>예 · 삭제</button></div>
  </section></div>,document.body);
}
export default function DeckPicker({decks,activeId,onSelect,onUpload,onClose,onArchive,onRestore,archived=[],disabled}) {
  const [deleting,setDeleting]=useState(null);
  const hold=useRef(null),origin=useRef(null),consumed=useRef(false);
  const clearHold=()=>{clearTimeout(hold.current);hold.current=null;};
  useEffect(()=>()=>clearTimeout(hold.current),[]);
  useEffect(()=>{if(disabled)clearHold();},[disabled]);
  const startHold=(event,item)=>{
    clearHold();consumed.current=false;
    if(disabled || !personalDeck(item) || event.button!==0 || !event.isPrimary)return;
    origin.current={x:event.clientX,y:event.clientY};
    hold.current=setTimeout(()=>{consumed.current=true;setDeleting(item);},600);
  };
  const moveHold=event=>{if(origin.current && Math.hypot(event.clientX-origin.current.x,event.clientY-origin.current.y)>12)clearHold();};
  const emptySlots=Math.max(1,6-decks.length);
  return <section className="deck-selection-page" aria-label="단어장 선택">
    <header className="deck-selection-header"><button onClick={onClose} aria-label="단어장 선택 닫기">←</button><div><h2>단어장 선택하기</h2><p>학습할 단어장을 골라 주세요</p></div><span>{decks.length}개</span></header>
    <div className="deck-selection-grid">
      {decks.map(item=><div key={item.id} className="deck-choice-wrap"><button className={`deck-choice ${item.id===activeId?'is-selected':''}`} aria-pressed={item.id===activeId} disabled={disabled} aria-description={personalDeck(item)?'길게 누르면 삭제할 수 있어요. 키보드에서는 Delete 키를 누르세요.':undefined} onPointerDown={event=>startHold(event,item)} onPointerMove={moveHold} onPointerUp={clearHold} onPointerCancel={clearHold} onPointerLeave={clearHold} onContextMenu={event=>{if(personalDeck(item)){event.preventDefault();clearHold();consumed.current=true;setDeleting(item);}}} onKeyDown={event=>{if(event.key==='Delete'&&personalDeck(item)){event.preventDefault();setDeleting(item);}}} onClick={()=>{if(consumed.current){consumed.current=false;return;}if(onSelect(item.id)!==false)onClose();}}>
        {(item.common || (item.id==='original' && item.deck.name==='2027 수능 EBS영단어'))&&<span className="deck-default-badge">기본제공</span>}
        <span className="deck-choice-art" aria-hidden="true"><span>▤</span>{item.id===activeId&&<i>✓</i>}</span>
        <strong>{item.deck.name}</strong><small>{item.common ? '공통 단어장 · ' : ''}{item.deck.words.length.toLocaleString()}개 단어</small><span className="deck-choice-status">{item.id===activeId?'현재 선택':'선택하기'}</span>
      </button></div>)}
      {Array.from({length:emptySlots},(_,i)=><button key={`add-${i}`} className="deck-choice deck-choice-empty" disabled={disabled} onClick={onUpload} aria-label="새 단어장 추가"><span className="deck-choice-art" aria-hidden="true">＋</span><strong>단어장 추가</strong><small>문서에서 가져오기</small></button>)}
    </div>
    <p className="deck-delete-hint">내가 올린 단어장을 길게 누르면 삭제할 수 있어요.</p>
    <p className="deck-selection-note">공통 단어장은 누구나 바로 선택할 수 있어요. ＋로 내 문서를 추가해도 기존 학습 기록은 유지돼요.</p>
    <p className="deck-selection-note">고급 독해·학술 영단어는 NAWL 957개에 한국어 뜻과 짧은 AI 예문을 더한 자료예요. <a href="/nawl-attribution.txt" target="_blank" rel="noreferrer">출처·이용 조건</a></p>
    {archived.length>0&&<details className="deck-archive"><summary>삭제한 단어장 {archived.length}개 · 복원</summary>{archived.map(item=><div key={item.id}><span>{item.deck.name} · {item.deck.words.length}개</span><button disabled={disabled} onClick={()=>onRestore(item.id)}>복원</button></div>)}</details>}
    {deleting&&<DeleteDeckDialog item={deleting} disabled={disabled} onCancel={()=>{setDeleting(null);consumed.current=false;}} onConfirm={()=>{setDeleting(null);consumed.current=false;onArchive(deleting.id);}}/>}
  </section>;
}
