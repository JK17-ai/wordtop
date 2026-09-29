export const isKoreanWord = word => word?.language === 'ko-KR' || /^[가-힣]+$/.test(word?.word || '');

// Only accept explicit term/definition boundaries; wrapped lines belong to that entry.
export function parseKoreanVocabulary(text) {
  const words = [], seen = new Set();
  let entry = null;
  const lines=text.normalize('NFC').split(/\r?\n/);
  const csv=lines.filter(line=>line.trim()).every(line=>/^[가-힣]{2,20}\s*,/.test(line.trim()));
  const flush = () => {
    if (entry && /[가-힣]/.test(entry.meaning) && !seen.has(entry.word)) {
      seen.add(entry.word); words.push({...entry,id:words.length,checked:false,language:'ko-KR',partOfSpeech:'noun'});
    }
    entry = null;
  };
  for (const raw of lines) {
    const line=csv ? raw.trim().replace(',',':') : raw.trim();
    if (!line || /^\d+$/.test(line)) continue;
    const match=/^(?:\d+[.)]\s*)?([가-힣]{2,20})\s*(?:[（(]([\p{Script=Han}\s]+)[)）])?\s*[:：\t–—-]\s*(.*)$/u.exec(line);
    if (match) {flush();entry={word:match[1],...(match[2]?{hanja:match[2].replace(/\s/g,'')}:{}),meaning:match[3].trim()};}
    else if(entry) entry.meaning += ' ' + line;
  }
  flush(); return words;
}
export function needsVocabularyOcr(text, parsed) {
  const letters=[...text].filter(c=>/\p{L}/u.test(c));
  const readable=letters.filter(c=>/[A-Za-z가-힣\p{Script=Han}]/u.test(c)).length;
  return !parsed.length || (letters.length>20 && readable/letters.length<0.75);
}
