import { verifiedProgress } from './learningFlow.js';
export function rebuildStudyDeck(words) {
  // Normalize older saves before deriving the three mutually exclusive feeds.
  return words.map(word => {
    const raw = String(word.status || "").trim().toLowerCase();
    const status = raw === "scrap" ? "scrap"
      : raw === "mastered" || word.checked === true ? "mastered" : "new";
    const legacyReview = status !== 'new' && word.statusSource !== 'self' && ![1,2,3].includes(word.responseStage);
    return { ...word, status, checked: status === "mastered",
      ...(legacyReview ? { responseStage: 1, responseStageSource: 'legacy-default' } : {}),
    };
  });
}
export function getFeed(words, tab) {
  return words.filter(word => {
    const status = word.status || (word.checked ? "mastered" : "new");
    return tab === "all" ? status !== "scrap" && status !== "mastered" : status === tab;
  });
}

export function answerWord(words, tab, index, id, correct, timing) {
  const validTiming = timing && Number.isFinite(timing.responseMs) && [1, 2, 3].includes(timing.responseStage);
  const updated = words.map(word => word.id === id
    ? { ...word, status: correct ? "mastered" : "scrap", checked: correct, ...verifiedProgress(word, correct),
      ...(!correct ? {judgment:"unknown",judgmentAt:new Date().toISOString()} : {}),
      ...(validTiming ? {
        responseMs: timing.responseMs,
        responseStage: timing.responseStage,
        responseStageSource: 'measured',
        timedOut: timing.timedOut === true,
        exercise: timing.exercise || 'meaning',
        listenCount: Number.isInteger(timing.listenCount) ? timing.listenCount : 0,
        responseCounts: {
          ...word.responseCounts,
          [`${correct ? 'correct' : 'incorrect'}Stage${timing.responseStage}`]:
            (word.responseCounts?.[`${correct ? 'correct' : 'incorrect'}Stage${timing.responseStage}`] || 0) + 1,
        },
      } : {}),
    }
    : word);
  const feed = getFeed(updated, tab);
  // Removing a card shifts its successor into the same slot.
  const stillHere = feed.some(word => word.id === id);
  const nextIndex = feed.length ? (index + Number(stillHere)) % feed.length : 0;
  return { words: updated, index: nextIndex };
}

export function restorePositions(words, cursors = {}) {
  return Object.fromEntries(["all", "scrap", "mastered"].map(tab => {
    const index = getFeed(words, tab).findIndex(word => word.id === cursors[tab]);
    return [tab, Math.max(0, index)];
  }));
}
