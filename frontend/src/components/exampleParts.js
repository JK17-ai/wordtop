// Match complete words/phrases, allowing punctuation and whitespace between words.
export function exampleParts(example, term) {
  if (typeof example !== 'string') return [];
  const tokens=String(term||'').trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [{text:example,highlight:false}];
  const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const regex=new RegExp('(?<![\\p{L}\\p{N}])'+tokens.map(escape).join('(?:[\\s-]+)')+'(?![\\p{L}\\p{N}])','giu');
  const parts=[];let end=0;
  for(const match of example.matchAll(regex)) {if(match.index>end)parts.push({text:example.slice(end,match.index),highlight:false});parts.push({text:match[0],highlight:true});end=match.index+match[0].length;}
  if(end<example.length)parts.push({text:example.slice(end),highlight:false});
  return parts;
}
