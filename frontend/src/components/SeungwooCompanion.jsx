import { createPortal } from 'react-dom';
import { useState } from 'react';
import { nextReactionMessage } from './reactionMessages';
function ReactionText({ reaction }) {
 const [message]=useState(()=>nextReactionMessage(reaction.mood));
 return createPortal(<div className="motivation-reaction" role="status" aria-live="polite">
   <div className={`motivation-reaction-text${reaction.mood === 'wrong' ? ' is-wrong' : ''}`}><span aria-hidden="true">{reaction.mood==='wrong'?'↻':'✦'}</span>{reaction.mood==='wrong' && reaction.answerWord ? <><small className="reaction-answer-label">정답</small><strong lang="en">{reaction.answerWord}</strong><p lang="ko">{reaction.answerMeaning}</p></> : <><strong lang="en">{message.en}</strong><p lang="ko">{message.ko}</p></>}</div>
 </div>,document.body);
}
export default function SeungwooCompanion({ paused, reaction }) {
 if(paused || !reaction || reaction.mood==='idle') return null;
 return <ReactionText key={reaction.id} reaction={reaction}/>;
}
