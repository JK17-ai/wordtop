export function responseStage(ms) {
  return ms <= 3000 ? 1 : ms <= 6000 ? 2 : 3;
}

// Only active quiz time counts; pauses and answer animations are excluded.
export function createResponseClock(now = () => performance.now()) {
  let total = 0;
  let started = null;
  return {
    start() { if (started === null) started = now(); },
    stop() { if (started !== null) { total += now() - started; started = null; } },
    elapsed() { return Math.max(0, Math.min(10000, total + (started === null ? 0 : now() - started))); },
  };
}
