

const summary = snapshot => {
  const words = snapshot?.deck?.words || [];
  return `마스터 ${words.filter(w => w.status === 'mastered' || (!w.status && w.checked)).length} · 스크랩 ${words.filter(w => w.status === 'scrap').length}`;
};
export default function StudySyncStatus({ sync, snapshot }) {
  if (sync.state === 'storage-full') return <div className="study-sync" role="alert"><strong>기기 저장 공간 확인이 필요해요</strong><p>{sync.message}</p><button onClick={sync.retry}>저장 다시 시도</button></div>;
  if (sync.state === 'conflict') return <div className="study-sync conflict" role="alert">
    <strong>두 기기의 기록이 달라요.</strong>
    <p>양쪽 기록을 백업한 뒤 선택한 기록으로 이어갑니다. 자동으로 합치지는 않습니다.</p>
    <button onClick={() => sync.resolve('local')}>이 기기 기록 사용 ({summary(snapshot)})</button>
    <button onClick={() => sync.resolve('remote')}>서버 기록 사용 ({summary(sync.remote)})</button>
  </div>;
  // 이전 상시 완료 표시 보관: saved: '서버 저장 완료'
  if (sync.state === 'saved' || sync.state === 'saving') return null;
  /* Previous upload toast preserved, disabled for quiet study:
  return <>
    <div className="study-sync" role="status">서버 저장 완료</div>
    {showUploaded && <div key={sync.uploadSequence} className="study-upload-toast" role="status" aria-live="polite">서버 업로드 완료</div>}
  </>; */
  const labels = { loading: '서버 기록 확인 중…', error: '이 기기 기록 유지 · 서버 저장 재시도 필요' };
  return <div className="study-sync" role="status"><span>{labels[sync.state]}</span>
    {sync.state === 'error' && <><small>{sync.message}</small><button onClick={sync.retry}>다시 연결</button></>}
  </div>;
}
