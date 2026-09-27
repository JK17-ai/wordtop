import { getFeed } from './studyState.js';
export function reviewFeed(words, tab, stage = 'all') {
  const feed = getFeed(words, tab);
  if (tab === 'all' || stage === 'all') return feed;
  return feed.filter(word => stage === 'unrated' ? ![1, 2, 3].includes(word.responseStage) : word.responseStage === Number(stage));
}
export function nextReviewIndex(before, after, index, id) {
  if (!after.length) return 0;
  // Move to the next surviving word even when the answered word changes stage/status.
  for (let offset = 1; offset <= before.length; offset++) {
    const candidate = before[(index + offset) % before.length];
    if (candidate?.id === id) continue;
    const found = after.findIndex(word => word.id === candidate?.id);
    if (found >= 0) return found;
  }
  return Math.min(index, after.length - 1);
}
