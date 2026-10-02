import test from 'node:test';
import assert from 'node:assert/strict';
import {swipeJudgment, isDoubleTap, FEED_CONFIRM_MS} from '../src/components/feedGestures.js';
test('horizontal swipes classify; short and vertical scroll gestures do not', () => {
  assert.equal(swipeJudgment(-80, 10), 'unknown');
  assert.equal(swipeJudgment(80, -10), 'known');
  for (const [x,y] of [[49,0],[-49,0],[50,70],[80,80],[0,-100]]) assert.equal(swipeJudgment(x,y), null);
});
test('double tap requires close positions and a short positive interval', () => {
  const first={x:100,y:100,time:1000};
  assert.equal(isDoubleTap(first,{x:110,y:105,time:1200}),true);
  assert.equal(isDoubleTap(first,{x:100,y:100,time:1400}),false);
  assert.equal(isDoubleTap(first,{x:140,y:100,time:1200}),false);
  assert.equal(isDoubleTap(first,{x:100,y:100,time:900}),false);
  assert.equal(isDoubleTap(null,first),false);
});
test('confirmation is visible for less than one second',()=>assert.ok(FEED_CONFIRM_MS > 0 && FEED_CONFIRM_MS < 1000));
