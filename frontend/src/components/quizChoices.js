import { isKoreanWord } from './koreanVocabulary.js';
const normalize=value=>String(value||'').normalize('NFKC').replace(/\([^)]*\)/g,'').replace(/\s+/g,' ').trim();
export function wordPartOfSpeech(item) {
 const explicit=String(item.partOfSpeech||item.pos||'').toLowerCase().trim();
 const tags={noun:'noun',n:'noun','n.':'noun','명사':'noun',verb:'verb',v:'verb','v.':'verb','동사':'verb',adjective:'adjective',adj:'adjective','adj.':'adjective','형용사':'adjective',adverb:'adverb',adv:'adverb','adv.':'adverb','부사':'adverb'};
 if(tags[explicit]) return tags[explicit];
 const parts=normalize(item.meaning).split(/[,;/·]/).map(s=>s.trim()).filter(Boolean);
 const inferred=parts.map(s=>{
  if(/(적인|스러운|로운|한|된|있는|없는|같은|않은|스런|의)$/.test(s))return 'adjective';
  if(/(하게|히|으로|로|껏)$/.test(s))return 'adverb';
  if(/다$/.test(s))return 'verb';
  if(/[가-힣]$/.test(s))return 'noun';
  return 'unknown';
 });
 return inferred.length&&inferred.every(x=>x===inferred[0])?inferred[0]:'unknown';
}
function shuffle(values,random) {
 const copy=[...values];
 for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
 return copy;
}
export function buildQuizChoices(item,words,exercise='meaning',random=Math.random) {
 const value=word=>(exercise==='reverse'||exercise==='context')?word.word:word.meaning;
 const answer=value(item),answerKey=normalize(answer);
 const meaningKey=normalize(item.meaning);
 const seen=new Set([answerKey]);
 const candidates=words.filter(word=>{
  const key=normalize(value(word));
  if(word.id===item.id||!key||seen.has(key)||normalize(word.word)===normalize(item.word)||normalize(word.meaning)===meaningKey)return false;
  seen.add(key);return true;
 });
 const pos=wordPartOfSpeech(item);
 const same=isKoreanWord(item)||pos==='unknown'?candidates:candidates.filter(word=>wordPartOfSpeech(word)===pos);
 // Do not fill a noun question with verbs merely to force four choices.
 // Unknown targets use the whole deck; known targets stay in their own group.
 const distractors=shuffle(same,random).slice(0,isKoreanWord(item) ? 1 : 3).map(value);
 return shuffle([answer,...distractors],random);
}
