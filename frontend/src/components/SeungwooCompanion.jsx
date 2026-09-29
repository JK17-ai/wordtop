import { exampleParts } from './exampleParts.js';
import { createPortal } from 'react-dom';
import { useState } from 'react';
import { nextReactionMessage } from './reactionMessages';
function ReactionText({ reaction, onContinue }) {
 const [message]=useState(()=>nextReactionMessage(reaction.mood));
 if (reaction.example) return createPortal(<div className="motivation-reaction example-reaction" role="dialog" aria-modal="true" aria-label="정답 영문 예문">
   <div className="motivation-reaction-text"><small>맞았어요! 영문 예문도 확인해요</small><p lang="en">{exampleParts(reaction.example,reaction.exampleWord).map((part,i)=>part.highlight ? <u key={i}>{part.text}</u> : part.text)}</p><button autoFocus onClick={onContinue}>계속하기 →</button></div>
 </div>,document.body);
 return createPortal(<div className="motivation-reaction" role="status" aria-live="polite">
   <div className={`motivation-reaction-text${reaction.mood === 'wrong' ? ' is-wrong' : ''}`}><span aria-hidden="true">{reaction.mood==='wrong'?'↻':'✦'}</span>{reaction.mood==='wrong' && reaction.answerWord ? <><small className="reaction-answer-label">정답</small><strong lang="en">{reaction.answerWord}</strong><p lang="ko">{reaction.answerMeaning}</p></> : <><strong lang="en">{message.en}</strong><p lang="ko">{message.ko}</p></>}</div>
 </div>,document.body);
}
export default function SeungwooCompanion({ paused, reaction, onContinue }) {
 if(paused || !reaction || reaction.mood==='idle') return null;
 return <ReactionText key={reaction.id} reaction={reaction} onContinue={onContinue}/>;
}
