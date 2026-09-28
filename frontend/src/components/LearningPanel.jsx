import { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { validatePanelData } from './learningPanelData.js';
const rewards = [{ tier: 'gold', label: '금메달', icon: '🥇', amount: 30000 }, { tier: 'silver', label: '은메달', icon: '🥈', amount: 20000 }, { tier: 'bronze', label: '동메달', icon: '🥉', amount: 10000 }];
const tiers = { bronze: '🥉 동', silver: '🥈 은', gold: '🥇 금' };
export default function LearningPanel({ kind, awards, onClose, embedded = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError('');
    (async () => {
      try {
        const client = getSupabase();
        if (!client) throw Error('서버 연결 설정을 확인해 주세요.');
        const { data: value, error: failure } = await client.rpc(kind === 'family' ? 'wordtop_family_overview' : 'wordtop_my_awards').abortSignal(AbortSignal.timeout(10000));
        if (failure) throw Error('서버 조회에 실패했어요. 다시 시도해 주세요. (' + (failure.code || 'network') + ')');
        const validated = validatePanelData(kind, value);
        if (active) setData({kind, value:validated});
      } catch (failure) { if (active) setError(failure.message || '연결하지 못했어요. 다시 시도해 주세요.'); }
    })();
    return () => { active = false; };
  }, [kind, refresh, awards.version]);
  const current = data?.kind === kind ? data.value : null;
  const koreanDate = date => {
    const value = new Date(date);
    if (!Number.isFinite(value.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-US', { timeZone:'Asia/Seoul', year:'numeric', month:'2-digit' }).formatToParts(value);
    return parts.find(part => part.type === 'year').value + '-' + parts.find(part => part.type === 'month').value;
  };
  const thisMonth = koreanDate(new Date());
  const periods = [{ title:'이번 달 배지 현황', prefix:thisMonth }, { title:'올해 배지 현황', prefix:thisMonth.slice(0,4) }].map(period => {
    const badges = (current?.awards || []).filter(badge => koreanDate(badge.awarded_at).startsWith(period.prefix));
    const counts = Object.fromEntries(rewards.map(({ tier }) => [tier, badges.filter(badge => badge.tier === tier).length]));
    return { ...period, counts, total:rewards.reduce((sum, { tier, amount }) => sum + counts[tier] * amount, 0) };
  });
  return <section className="learning-panel" aria-label={kind === 'family' ? '가족 학습 현황' : '배지 보관함'}>
    {!embedded && <header><h2>{kind === 'family' ? '가족 학습 현황' : '배지 보관함'}</h2><button className="back-to-study" onClick={onClose}><span aria-hidden="true">← </span>학습으로</button></header>}
    {kind === 'badges' && <>
      <div className="medal-rewards" aria-label="메달별 보상 금액">
        {rewards.map(({ tier, icon, label, amount }) => <div key={tier}><span aria-hidden="true">{icon}</span><strong>{label}</strong><span>{amount / 10000}만원</span></div>)}
      </div>
      {periods.map(period => <section key={period.title} className="my-badge-summary" aria-label={period.title}>
        <h3>{period.title} <small>{period.prefix.replace('-', '년 ')}{period.prefix.length > 4 ? '월' : '년'}</small></h3>
        <div className="medal-counts">{rewards.map(({ tier, icon, label }) => <div key={tier}><span>{icon} {label}</span><strong>{current ? `${period.counts[tier]}개` : '—'}</strong></div>)}</div>
        <p><span>획득 배지 합계 금액</span><strong>{current ? `${period.total.toLocaleString('ko-KR')}원` : '—'}</strong></p>
      </section>)}
    </>}
    <button className="panel-refresh" onClick={() => setRefresh(v => v + 1)}>새로고침</button>
    {error && <p role="alert">{error}</p>}{!current && !error && <p role="status">불러오는 중…</p>}
    {kind === 'family' && current?.map(person => <article className="family-summary" key={person.id}>
      <h3>{person.avatar} {person.name}</h3>
      <div className="family-badge-summary">
        <span>누적 배지 <strong>{person.badges}개</strong></span>
        {person.month_badges ? <><span>이번 달 · {person.month_badges.month}</span><div className="family-medal-line"><span>🥇 {person.month_badges.gold}</span><span>🥈 {person.month_badges.silver}</span><span>🥉 {person.month_badges.bronze}</span><strong>{(person.month_badges.gold * 30000 + person.month_badges.silver * 20000 + person.month_badges.bronze * 10000).toLocaleString('ko-KR')}원</strong></div></> : <small>이번 달 배지 집계는 서버 업데이트 후 표시됩니다.</small>}
      </div>
      {person.updated_at ? <><p>마스터 {person.mastered} · 스크랩 {person.scrap} · 전체 {person.total}</p>
      <p>오늘 {person.today_total}문제 · 정답률 {person.today_total ? Math.round(person.today_correct / person.today_total * 100) + '%' : '—'}</p>
      <p>응답 학습 시간 {Math.floor(person.active_ms / 60000)}분</p>
      <small>마지막 저장 {new Date(person.updated_at).toLocaleString('ko-KR')}</small></> : <p>아직 동기화된 기록이 없어요.</p>}
    </article>)}
    {kind === 'badges' && <>
      <p>연속 정답 10개 동 · 20개 은 · 30개 금<br/>한 연속 정답 구간마다 각 배지를 한 번 받아요.</p>
      <p className="panel-note">기본 2027 단어장의 정답을 서버에서 확인한 뒤 지급해요. 오답·시간 초과는 연속 기록을 다시 시작해요. 오프라인 답안은 연결 후 접수 순서로 반영됩니다.</p>
      {!!awards.pending && <p role="status">전송 대기 {awards.pending}개 <button onClick={awards.retry}>다시 전송</button></p>}
      {awards.error && <p role="alert">배지 전송 대기: {awards.error}</p>}
      {current && <><p>현재 연속 정답 <strong>{current.streak}</strong></p><div className="badge-collection">{current.awards.map(badge => <article key={badge.id}><strong>{tiers[badge.tier]} 배지</strong><small>{new Date(badge.awarded_at).toLocaleDateString('ko-KR')}</small></article>)}</div>{!current.awards.length && <p>첫 배지를 향해 시작해 보세요.</p>}</>}
    </>}
  </section>;
}
