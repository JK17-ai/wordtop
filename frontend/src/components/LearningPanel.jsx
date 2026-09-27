import { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
const tiers = { bronze: '🥉 동', silver: '🥈 은', gold: '🥇 금' };
export default function LearningPanel({ kind, awards, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError('');
    const client = getSupabase();
    if (!client) { setError('서버 연결 설정을 확인해 주세요.'); return; }
    client.rpc(kind === 'family' ? 'wordtop_family_overview' : 'wordtop_my_awards').abortSignal(AbortSignal.timeout(10000))
      .then(({ data: value, error: failure }) => { if (active) { if (failure) setError('서버 연결 또는 추가 SQL 적용 상태를 확인해 주세요.'); else setData(value); } })
      .catch(() => { if (active) setError('연결하지 못했어요. 다시 시도해 주세요.'); });
    return () => { active = false; };
  }, [kind, refresh, awards.version]);
  return <section className="learning-panel" aria-label={kind === 'family' ? '가족 학습 현황' : '배지 보관함'}>
    <header><h2>{kind === 'family' ? '가족 학습 현황' : '배지 보관함'}</h2><button onClick={onClose}>학습으로</button></header>
    <button className="panel-refresh" onClick={() => setRefresh(v => v + 1)}>새로고침</button>
    {error && <p role="alert">{error}</p>}{!data && !error && <p role="status">불러오는 중…</p>}
    {kind === 'family' && data?.map(person => <article className="family-summary" key={person.id}>
      <h3>{person.avatar} {person.name}</h3>
      {person.updated_at ? <><p>마스터 {person.mastered} · 스크랩 {person.scrap} · 전체 {person.total}</p>
      <p>오늘 {person.today_total}문제 · 정답률 {person.today_total ? Math.round(person.today_correct / person.today_total * 100) + '%' : '—'}</p>
      <p>응답 학습 시간 {Math.floor(person.active_ms / 60000)}분 · 배지 {person.badges}개</p>
      <small>마지막 저장 {new Date(person.updated_at).toLocaleString('ko-KR')}</small></> : <p>아직 동기화된 기록이 없어요.</p>}
    </article>)}
    {kind === 'badges' && <>
      <p>연속 정답 10개 동 · 20개 은 · 30개 금<br/>한 연속 정답 구간마다 각 배지를 한 번 받아요.</p>
      <p className="panel-note">기본 2027 단어장의 정답을 서버에서 확인한 뒤 지급해요. 오답·시간 초과는 연속 기록을 다시 시작해요. 오프라인 답안은 연결 후 접수 순서로 반영됩니다.</p>
      {!!awards.pending && <p role="status">전송 대기 {awards.pending}개 <button onClick={awards.retry}>다시 전송</button></p>}
      {awards.error && <p role="alert">배지 전송 대기: {awards.error}</p>}
      {data && <><p>현재 연속 정답 <strong>{data.streak}</strong></p><div className="badge-collection">{data.awards.map(badge => <article key={badge.id}><strong>{tiers[badge.tier]} 배지</strong><small>{new Date(badge.awarded_at).toLocaleDateString('ko-KR')}</small></article>)}</div>{!data.awards.length && <p>첫 배지를 향해 시작해 보세요.</p>}</>}
    </>}
  </section>;
}
