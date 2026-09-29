import { wordKey } from './moaFeedState.js';
import { restoreQuizSession } from './learningFlow.js';

export function selfJudgment(word, progress) {
  const value = word.judgment || progress?.entries?.[wordKey(word)]?.judgment;
  return ['known', 'unknown'].includes(value) ? value : null;
}
export function quizPool(words, tab = 'all', stage = 'all', progress) {
  return words.filter(word => {
    const judgment = selfJudgment(word, progress);
    if (!judgment || (tab === 'scrap' && judgment !== 'unknown') || (tab === 'mastered' && judgment !== 'known')) return false;
    return tab === 'all' || stage === 'all' || (stage === 'unrated'
      ? word.responseStageSource === 'legacy-default' || ![1, 2, 3].includes(word.responseStage)
      : word.responseStage === Number(stage));
  });
}
export const quizLabel = tab => tab === 'scrap' ? '몰라요로 고른 단어' : tab === 'mastered' ? '알아요로 고른 단어' : '학습한 단어';
export const tabQuizKey = (tab, stage = 'all') => `tab:${tab}:${tab === 'all' ? 'all' : stage}`;

function shuffled(ids, random) {
  const result=[...ids];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
// Keep the existing order and cursor; newly eligible words go after the saved batch.
export function resumeQuiz(previous, words, metadata = {}, random = Math.random) {
  const eligible = new Set(words.map(word => word.id));
  const ids = previous ? previous.ids.filter(id => eligible.has(id)) : [];
  const seen = new Set(ids);
  const added = [];
  for (const word of words) if (!seen.has(word.id)) { added.push(word.id); seen.add(word.id); }
  ids.push(...shuffled(added,random));
  const answered = previous?.ids.slice(0, previous.index).filter(id => eligible.has(id)) || [];
  const results = previous?.results?.filter(result => answered.includes(result.id));
  return { ...previous, ...metadata, ids, index:answered.length,
    correct:results ? results.filter(result => result.correct).length : Math.min(answered.length, previous?.correct || 0),
    ...(results ? { results } : !previous ? { results:[] } : {}), practice:metadata.practice ?? previous?.practice ?? false };
}
export function quizVisitedIds(session) {
  return [...new Set([...(session?.visitedIds || []), ...(session?.ids.slice(0,session.index) || [])])];
}
export function remainingQuizWords(session, words, progress) {
  const visited=new Set(quizVisitedIds(session));
  return quizPool(words,'all','all',progress).filter(word=>!visited.has(word.id));
}
export function nextQuizBatch(session, words, progress, random = Math.random) {
  const available=remainingQuizWords(session,words,progress);
  const order=shuffled(available.map(word=>word.id),random).slice(0,17);
  return {ids:order,index:0,correct:0,results:[],practice:false,tab:'all',stage:'all',label:'학습한 단어',visitedIds:quizVisitedIds(session)};
}
export function recordQuizAnswer(session, id, correct) {
  if (!session || session.ids[session.index] !== id) return session;
  return { ...session, index:session.index + 1, correct:session.correct + Number(correct),
    ...(session.results ? { results:[...session.results, {id, correct:!!correct}] } : {}) };
}
export function restartQuiz(session, random = Math.random) {
  return session ? { ...session, ids:shuffled(session.ids,random), index:0, correct:0, results:[] } : session;
}
export function restoreQuizProgress(saved, words, progress) {
  const sessions = {};
  for (const [key, value] of Object.entries(saved?.quizProgress?.sessions || {})) {
    const restored = restoreQuizSession(value, words);
    if (!restored) continue;
    const tab = ['all','scrap','mastered'].includes(value.tab) ? value.tab : 'all';
    const stage = ['all','1','2','3','unrated'].includes(value.stage) ? value.stage : 'all';
    const allowed = quizPool(words, tab, stage, progress);
    const answeredIds = new Set(restored.ids.slice(0,restored.index));
    const allowedWithResults = words.filter(word=>answeredIds.has(word.id) || allowed.some(item=>item.id===word.id));
    const pool = key.startsWith('tab:') ? allowedWithResults : allowedWithResults.filter(word => restored.ids.includes(word.id));
    const results = Array.isArray(value.results) && value.results.length === restored.index && value.results.every((r,i) => r?.id === restored.ids[i] && typeof r.correct === 'boolean') ? value.results : undefined;
    sessions[key] = resumeQuiz({...restored, ...(Array.isArray(value.visitedIds) ? {visitedIds:value.visitedIds.filter(id=>words.some(word=>word.id===id))} : {}), ...(results ? {results} : {})}, pool, {tab,stage,label:typeof value.label === 'string' ? value.label : quizLabel(tab)});
  }
  let activeKey = Object.hasOwn(sessions, saved?.quizProgress?.activeKey) ? saved.quizProgress.activeKey : null;
  if (!Object.keys(sessions).length) {
    const legacy = restoreQuizSession(saved?.quizSession, words);
    if (legacy) {
      activeKey = 'legacy';
      sessions[activeKey] = resumeQuiz(legacy, quizPool(words,'all','all',progress).filter(word => legacy.ids.includes(word.id)), {tab:'all',stage:'all',label:'학습한 단어'});
    }
  }
  return {activeKey, sessions};
}
