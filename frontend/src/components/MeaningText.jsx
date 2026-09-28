import { splitMeaningNote } from './splitMeaningNote.js';
export default function MeaningText({ meaning }) {
  const { main, note } = splitMeaningNote(meaning);
  return <>{main}{note && <span className="meaning-note" style={{display:'block',marginTop:6,fontSize:'0.72em',lineHeight:1.55,fontWeight:400,color:'#606c59',overflowWrap:'anywhere'}}>{note}</span>}</>;
}
