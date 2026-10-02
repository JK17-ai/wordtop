export const FEED_CONFIRM_MS = 360;
export function swipeJudgment(dx, dy) {
  if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy) * 1.2) return null;
  return dx < 0 ? 'unknown' : 'known';
}
export function isDoubleTap(previous, next) {
  return !!previous && next.time - previous.time >= 0 && next.time - previous.time <= 300 &&
    Math.hypot(next.x - previous.x, next.y - previous.y) <= 24;
}
