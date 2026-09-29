import { parseKoreanVocabulary } from './koreanVocabulary.js';
import { cleanEbsMeaning } from './cleanEbsMeaning.js';

export function parseVocabulary(text) {
  const korean = parseKoreanVocabulary(text);
  if (korean.length) return korean;
  const result = [];
  const used = new Set();
  const pattern = /([A-Za-z][A-Za-z'’ -]*?)\s*(?:\[[^\]\n]*\]|\/[^/\n]+\/)?\s*(?:(?:n|v|adj|adv|prep|conj|pron|a|ad|vt|vi)\.)?\s*[:\t,–—-]*\s*([~～∼〜]?\s*[가-힣][^A-Za-z\n]*)/g;
  for (const match of text.normalize('NFC').matchAll(pattern)) {
    const word = match[1].trim();
    const meaning = cleanEbsMeaning(match[2]).replace(/[\s|;]+$/g, '').trim();
    if (word.toUpperCase() === 'EBS' && /수능|유형편|실전편/u.test(meaning)) continue;
    if (!/[가-힣]/u.test(meaning) || word.length > 80 || used.has(word.toLowerCase())) continue;
    used.add(word.toLowerCase());
    result.push({ id: result.length, word, meaning, checked: false });
  }
  return result;
}
