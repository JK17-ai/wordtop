import {studyDay} from './dailyStudy.js';
// Feed judgments are deliberately separate from quiz status and cloud quiz snapshots.
export const wordKey = word => JSON.stringify([word.id, word.word, word.meaning]);
export function feedStorageKey(profileId, name, words) {
  let hash = 2166136261;
  for (const word of words) for (const char of wordKey(word)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return `wordtop:${profileId || 'guest'}:moa-feed-v1:${encodeURIComponent(name)}:${hash}`;
}
export function readFeed(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return { daily: value?.daily, cursor: typeof value?.cursor === 'string' ? value.cursor : null,
      entries: value?.entries && typeof value.entries === 'object' && !Array.isArray(value.entries) ? value.entries : {} };
  } catch { return { cursor:null, entries:{} }; }
}
export function markFeed(state, word, patch) {
  const key = wordKey(word);
  return { ...state, entries:{ ...state.entries, [key]:{ ...state.entries[key], ...patch } } };
}

// Fisher-Yates: each word appears exactly once; never reorder the quiz's source array.
export function shuffleFeed(words, random = Math.random) {
  const shuffled = [...words];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const feedDay = studyDay;
export function dailySteps(daily, day) {
  if (daily?.day !== day) return {day, keys:[], base:0};
  const keys = [...new Set(Array.isArray(daily.keys) ? daily.keys.filter(k=>typeof k==='string') : [])];
  return {day, keys, base:Math.min(keys.length, Math.max(0, Number.isInteger(daily.base) ? daily.base : 0))};
}
export function recordFeedStep(daily, day, key) {
  const value = dailySteps(daily,day);
  return value.keys.includes(key) ? value : {...value, keys:[...value.keys,key]};
}
