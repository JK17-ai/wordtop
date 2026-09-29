import { koreanHighlight, registeredHighlight } from './exampleHighlights.js';
import { withFeedExample } from './feedExamples.js';

// Only replace an exact Korean sense at a word boundary; never guess translations.
export function contextQuestion(item) {
  const word = withFeedExample(item);
  const sentence = word.exampleTranslation;
  if (!sentence || !word.example) return null;
  const registered=registeredHighlight('ko',item,sentence);
  if(registered)return {...registered,term:word.displayWord || word.word};
  const senses = String(word.displayMeaning || word.meaning).replace(/\([^)]*\)/g, '').split(/[,;/]/).map(s => s.replace(/~/g, '').trim()).filter(s => s.length >= 2).sort((a,b)=>b.length-a.length);
  for (const sense of senses) {
    const escaped = sense.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`(^|[\\s“”"'‘’])(${escaped})(?=$|[\\s.,!?은는이가을를의에와과도만으로이다])`, 'u').exec(sentence);
    if (!match) continue;
    const at = match.index + match[1].length;
    const before = sentence.slice(0, at), after = sentence.slice(at + sense.length);
    // Do not reveal another answer synonym elsewhere in the sentence.
    if (senses.some(other => (before + after).includes(other))) continue;
    return {before, highlight:sense, term:word.displayWord || word.word, after};
  }
  const inflected = koreanHighlight(sentence,word.displayMeaning || word.meaning);
  if(inflected)return {...inflected,term:word.displayWord || word.word};
  return {before:sentence, highlight:'', term:word.displayWord || word.word, after:''};
}
