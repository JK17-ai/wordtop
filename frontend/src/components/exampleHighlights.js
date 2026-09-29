import { exampleHighlightOverrides } from './exampleHighlightOverrides.js';
export function registeredHighlight(lang,item,sentence){
 const target=exampleHighlightOverrides.get(JSON.stringify([lang,item.word,item.meaning,sentence]));
 const at=target?sentence.indexOf(target):-1;
 return at<0?null:{before:sentence.slice(0,at),highlight:target,after:sentence.slice(at+target.length)};
}
// Match inflected forms while preserving the exact registered sentence.
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const irregular={be:['am','is','are','was','were','been'],have:['has','had'],do:['does','did','done'],go:['went','gone'],take:['took','taken'],make:['made'],give:['gave','given'],hold:['held'],get:['got','gotten'],run:['ran'],lead:['led'],find:['found'],keep:['kept'],leave:['left'],bring:['brought'],think:['thought'],buy:['bought'],sell:['sold'],tell:['told'],feel:['felt'],meet:['met'],build:['built'],lose:['lost'],write:['wrote','written'],rise:['rose','risen'],fall:['fell','fallen'],see:['saw','seen'],choose:['chose','chosen'],bear:['bore','born','borne'],break:['broke','broken'],draw:['drew','drawn'],grow:['grew','grown'],seek:['sought'],teach:['taught'],catch:['caught']};
export function englishHighlight(sentence,term){
  if(!sentence)return null;
  const pieces=String(term).trim().split(/\s*~\s*|\s+/).filter(Boolean);
  const first=pieces.shift();if(!first)return null;
  const forms=[first,...(irregular[first.toLowerCase()]||[]),first+'s',first+'es',first+'ed',first+'ing'];
  if(first.endsWith('e')) forms.push(first+'d',first.slice(0,-1)+'ing');
  if(first.endsWith('y')) forms.push(first.slice(0,-1)+'ies',first.slice(0,-1)+'ied');
  if(/[aeiou][b-df-hj-np-tv-z]$/i.test(first))forms.push(first+first.at(-1)+'ed',first+first.at(-1)+'ing');
  const tail=pieces.map(escape).join('[\\s-]+');
  const gap=String(term).includes('~')?'(?:[\\s-]+[\\w’\'-]+){0,5}[\\s-]+':'[\\s-]+';
  const regex=new RegExp('(?<![\\p{L}\\p{N}])(?:'+forms.map(escape).sort((a,b)=>b.length-a.length).join('|')+')'+(tail?gap+tail:'')+'(?![\\p{L}\\p{N}])','iu');
  const m=regex.exec(sentence);return m?{before:sentence.slice(0,m.index),highlight:m[0],after:sentence.slice(m.index+m[0].length)}:null;
}
export function koreanHighlight(sentence,meaning){
  const senses=String(meaning).replace(/\([^)]*\)/g,'').replace(/\[|\]/g,',').replace(/(?:~|…|\.{2,})\s*[을를에과와의]?/g,'').split(/[,;\/]/).map(s=>s.trim()).filter(Boolean);
  const stems=[];
  for(const sense of senses){
    stems.push(sense);
    for(const suffix of ['하다','되다','이다','적인','하는','되는','스럽다','스러운','로운','한','된','의','다','히'])if(sense.endsWith(suffix)&&sense.length>suffix.length+1)stems.push(sense.slice(0,-suffix.length));
  }
  for(const stem of [...new Set(stems)].sort((a,b)=>b.length-a.length)){
    const regex=new RegExp('(^|[\\s“”"‘’])('+escape(stem)+'[가-힣]*)','u');
    const m=regex.exec(sentence);if(!m)continue;
    const at=m.index+m[1].length;return {before:sentence.slice(0,at),highlight:m[2],after:sentence.slice(at+m[2].length)};
  }
  return null;
}
