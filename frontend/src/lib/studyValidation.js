export const MAX_DECK_WORDS = 10000;
export const MAX_SNAPSHOT_BYTES = 8 * 1024 * 1024;
export const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const id = value => typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
export function validateWords(words) {
  if (!Array.isArray(words) || !words.length || words.length > MAX_DECK_WORDS) throw Error('단어장은 1~10,000개 단어까지 저장할 수 있어요.');
  const ids = new Set();
  for (const word of words) {
    if (!isRecord(word) || !id(word.id) || ids.has(word.id) || typeof word.word !== 'string' || !word.word.trim()
      || typeof word.meaning !== 'string' || !word.meaning.trim()
      || (word.status && !['new', 'scrap', 'mastered'].includes(word.status))) throw Error('단어 기록 형식이 올바르지 않습니다. 원본 기록을 보관해 주세요.');
    ids.add(word.id);
  }
  return words;
}
export function validateProgress(value) {
  if (value.feedProgress != null) {
    const feed = value.feedProgress;
    if (!isRecord(feed) || (feed.entries !== undefined && (!isRecord(feed.entries) || Object.values(feed.entries).some(entry => !isRecord(entry))))
      || (feed.cursor != null && typeof feed.cursor !== 'string')) throw Error('학습 진행 기록 형식을 확인해 주세요. 원본 기록은 그대로 보관되어 있어요.');
  }
  if (value.quizProgress != null) {
    const quiz = value.quizProgress;
    if (!isRecord(quiz) || !isRecord(quiz.sessions) || (quiz.activeKey != null && typeof quiz.activeKey !== 'string')) throw Error('퀴즈 진행 기록 형식을 확인해 주세요.');
    for (const session of Object.values(quiz.sessions)) {
      if (!isRecord(session) || !Array.isArray(session.ids) || !session.ids.every(id)
        || !Number.isInteger(session.index) || session.index < 0 || session.index > session.ids.length
        || (session.results != null && (!Array.isArray(session.results) || session.results.some(r => !isRecord(r) || !id(r.id) || typeof r.correct !== 'boolean')))
        || (session.visitedIds != null && (!Array.isArray(session.visitedIds) || !session.visitedIds.every(id)))) throw Error('퀴즈 문제 기록 형식을 확인해 주세요.');
    }
  }
  if (value.dailyStudy != null && (!isRecord(value.dailyStudy) || (value.dailyStudy.date !== undefined && typeof value.dailyStudy.date !== 'string') || !isRecord(value.dailyStudy.entries))) throw Error('일일 학습 기록 형식을 확인해 주세요.');
}
