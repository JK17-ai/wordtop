export const studyDay = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit' }).format(now);
export function dailyRecord(previous, key, correct, date = studyDay()) {
  const entries = previous?.date === date ? { ...previous.entries } : {};
  entries[key] = correct ? 'mastered' : 'scrap';
  return { date, entries };
}
export function dailyCounts(value, date = studyDay()) {
  const entries = value?.date === date ? Object.values(value.entries || {}) : [];
  return { total: entries.length, scrap: entries.filter(x => x === 'scrap').length, mastered: entries.filter(x => x === 'mastered').length };
}
export function learningSettings(value) {
  return { scrap: ['recall','meaning'].includes(value?.scrap) ? value.scrap : 'recall', mastered: value?.contextQuizVersion === 1 && value?.mastered === 'reverse' ? 'english-context' : ['english-context','context'].includes(value?.mastered) && value?.contextQuizVersion === 1 ? value.mastered : 'context', contextQuizVersion:1 };
}
