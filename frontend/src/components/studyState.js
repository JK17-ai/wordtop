export function rebuildStudyDeck(words) {
  // Normalize older saves before deriving the three mutually exclusive feeds.
  return words.map(word => {
    const raw = String(word.status || "").trim().toLowerCase();
    const status = raw === "scrap" ? "scrap"
      : raw === "mastered" || word.checked === true ? "mastered" : "new";
    return { ...word, status, checked: status === "mastered" };
  });
}
export function getFeed(words, tab) {
  return words.filter(word => {
    const status = word.status || (word.checked ? "mastered" : "new");
    return tab === "all" ? status !== "scrap" && status !== "mastered" : status === tab;
  });
}

export function answerWord(words, tab, index, id, correct) {
  const updated = words.map(word => word.id === id
    ? { ...word, status: correct ? "mastered" : "scrap", checked: correct }
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
