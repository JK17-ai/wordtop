import { isKoreanWord } from './koreanVocabulary.js';
import { wordKey } from './moaFeedState.js';
const DAY = 86400000;
export function classifyWord(words, id, action, now = Date.now()) {
  return words.map(word => {
    if (word.id !== id) return word;
    if (action === 'saved') return {...word, saved: !word.saved};
    if (!['known','unknown'].includes(action)) return word;
    return {...word, status:action === 'known' ? 'mastered' : 'scrap', checked:action === 'known',
      judgment:action, judgmentAt:new Date(now).toISOString(), statusSource:'self', nextReviewAt:new Date(now).toISOString()};
  });
}
export function verifiedProgress(word, correct, now = Date.now()) {
  const previous = Date.parse(word.lastVerifiedAt);
  const delayed = correct && Number.isFinite(previous) && now - previous >= DAY;
  const level = correct ? Math.min(4, (word.reviewLevel || 0) + Number(delayed)) : 0;
  return {statusSource:'quiz', lastAnsweredAt:new Date(now).toISOString(),
    ...(correct ? {lastVerifiedAt:new Date(now).toISOString()} : {}),
    reviewLevel:level, nextReviewAt:new Date(now + (correct ? [1,3,7,14,30][level] * DAY : 10*60000)).toISOString()};
}
export const isDue = (word, now = Date.now()) => Number.isFinite(Date.parse(word.nextReviewAt)) && Date.parse(word.nextReviewAt) <= now;
export function reviewPriority(word, now = Date.now()) {
  if (isDue(word, now)) return 0;
  if (word.status === 'scrap') return 1;
  if (word.status === 'mastered' && word.statusSource !== 'quiz') return 2;
  return word.status === 'new' || !word.status ? 3 : 4;
}
// Legacy local feed judgments must never overwrite a server or quiz decision.
export function mergeLegacyFeed(words, entries = {}) {
  return words.map(word => {
    if (word.feedMigrated) return word;
    const entry = entries[wordKey(word)];
    if (!entry) return word;
    let next = word;
    if (entry?.judgment && (!word.status || word.status === 'new') && !word.checked)
      next = classifyWord([word], word.id, entry.judgment)[0];
    return {...next, ...(!word.judgment && ['known','unknown'].includes(entry.judgment) ? {judgment:entry.judgment} : {}), saved:word.saved ?? !!entry?.saved, feedMigrated:true};
  });
}
export function quizExercise(word, settings) {
  if (isKoreanWord(word)) return word.status === 'mastered' ? 'reverse' : word.status === 'scrap' ? settings.scrap : 'meaning';
  return word.status === 'scrap' ? settings.scrap : word.status === 'mastered' ? settings.mastered : 'meaning';
}
export function restoreQuizSession(value, words) {
  if (!value || !Array.isArray(value.ids) || !Number.isInteger(value.index) || value.index<0 || value.index>value.ids.length) return null;
  const valid=new Set(words.map(w=>w.id));
  if (value.ids.some(id=>!valid.has(id)) || new Set(value.ids).size!==value.ids.length) return null;
  return {ids:value.ids,index:value.index,correct:Math.max(0,Math.min(value.index,Number.isInteger(value.correct)?value.correct:0)),practice:value.practice===true};
}
