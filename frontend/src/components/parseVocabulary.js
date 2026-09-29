import { parseKoreanVocabulary } from './koreanVocabulary.js';
import { cleanEbsMeaning } from './cleanEbsMeaning.js';

export function csvRows(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else if (quoted || !field.trim()) quoted = !quoted;
      else field += c;
    } else if (!quoted && (c === ',' || c === '\n')) {
      row.push(field.replace(/\r$/, '').trim()); field = '';
      if (c === '\n') { rows.push(row); row = []; }
    } else field += c;
  }
  if (quoted) throw Error('CSV 따옴표가 닫히지 않았어요. 파일을 확인해 주세요.');
  row.push(field.replace(/\r$/, '').trim()); rows.push(row);
  return rows;
}
export function parseVocabulary(text) {
  text = text.replace(/^\uFEFF/, '').normalize('NFC');
  const result = [];
  const used = new Set();
  const add = entry => {
    const key = JSON.stringify([entry.word.toLowerCase(), entry.meaning]);
    if (!used.has(key)) { used.add(key); result.push({...entry, id:result.length, checked:false}); }
  };
  // CSV is parsed before prose so commas and line breaks inside quoted meanings survive.
  if (/^\s*"?(?:[A-Za-z][A-Za-z'’ -]*|[가-힣]{2,20}(?:[（(][\p{Script=Han}\s]+[)）])?)"?\s*,/u.test(text.split(/\r?\n/).find(line => line.trim()) || '')) {
    for (const row of csvRows(text)) {
      if (row.length < 2) continue;
      const word = row[0].trim(), meaning = row.slice(1).join(', ').trim();
      if (!/[가-힣]/u.test(meaning) || (/^(word|term|단어|사자성어)$/i.test(word) && /^(meaning|definition|뜻|의미|한글 뜻)$/i.test(meaning))) continue;
      if (/^[A-Za-z][A-Za-z'’ -]{0,79}$/.test(word)) add({word,meaning});
      else for (const entry of parseKoreanVocabulary(`${word}: ${meaning}`)) add(entry);
    }
    // Mixed CSV and colon-delimited text is legal; parse the remaining lines too.
    text = csvRows(text).filter(row => row.length === 1).map(row => row[0]).join('\n');
  }
  for (const entry of parseKoreanVocabulary(text)) add(entry);
  const pattern = /([A-Za-z][A-Za-z'’ -]*?)\s*(?:\[[^\]\n]*\]|\/[^/\n]+\/)?\s*(?:(?:n|v|adj|adv|prep|conj|pron|a|ad|vt|vi)\.)?\s*[:\t,–—-]*\s*([~～∼〜]?\s*[가-힣][^A-Za-z\n]*)/g;
  for (const match of text.normalize('NFC').matchAll(pattern)) {
    const word = match[1].trim();
    const meaning = cleanEbsMeaning(match[2]).replace(/[\s|;]+$/g, '').trim();
    if (word.toUpperCase() === 'EBS' && /수능|유형편|실전편/u.test(meaning)) continue;
    if (!/[가-힣]/u.test(meaning) || word.length > 80) continue;
    add({word,meaning});
  }
  return result;
}
