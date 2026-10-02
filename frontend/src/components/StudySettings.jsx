import { diagnoseSound } from '../reactionSound';
import { useState } from 'react';
export default function StudySettings({ settings, onChange, stage, onStage, onClose, onTutorial, korean = false, embedded = false }) {
  const [audioReport, setAudioReport] = useState(null);
  const [testingAudio, setTestingAudio] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const testAudio = async () => {
    setTestingAudio(true); setCopyStatus('');
    try { setAudioReport(await diagnoseSound()); }
    catch (error) { setAudioReport({ outcome:'diagnostic-error', message:error.message }); }
    finally { setTestingAudio(false); }
  };
  return <section className="learning-panel study-settings">{!embedded && <header><h2>설정</h2><button className="back-to-study" onClick={onClose}><span aria-hidden="true">← </span>학습으로</button></header>}<h3>학습방법</h3>
    <fieldset><legend>몰라요로 고른 단어</legend>{[['recall','떠올린 후 퀴즈 (기본)'],['meaning','바로 퀴즈']].map(([value,label]) => <label key={value}><input type="radio" name="scrap-method" checked={settings.scrap === value} onChange={() => onChange({...settings,scrap:value})}/>{label}</label>)}</fieldset>
    <fieldset><legend>알아요로 고른 단어</legend>{korean ? <p>뜻을 보고 사자성어·국어 단어 선택 (기본)</p> : [['context','국문 예문으로 영문 선택 (기본)'],['english-context','영문 예문으로 국문 뜻 선택']].map(([value,label]) => <label key={value}><input type="radio" name="master-method" checked={settings.mastered === value} onChange={() => onChange({...settings,mastered:value})}/>{label}</label>)}</fieldset>
    <label className="stage-setting">복습할 별 단계<select value={stage} onChange={e => onStage(e.target.value)}><option value="all">전체</option><option value="1">★ 쉬움 · 3초 이내</option><option value="2">★★ 보통 · 6초 이내</option><option value="3">★★★ 어려움 · 6초 초과</option><option value="unrated">이전 기록 · 미분류</option></select></label>
    <p>{korean ? '국어 단어장은 몰라요에서 단어를 보고 뜻을, 알아요에서 뜻을 보고 단어를 고릅니다. 예문 없이도 학습할 수 있어요.' : '국문 예문에서는 영어 단어를, 영문 예문에서는 한국어 뜻을 고릅니다. 틀리면 정답 단어와 뜻을 보여줍니다. 예문이 없는 업로드 단어는 단어와 뜻으로 출제됩니다.'}</p>
    <button className="panel-refresh" disabled={testingAudio} onClick={testAudio}>{testingAudio ? '소리 상태 확인 중…' : '🔊 효과음 확인'}</button>
    {audioReport && <section className="audio-diagnostics" aria-label="효과음 진단"><p role="status">{audioReport.outcome === 'scheduled' ? '브라우저에 재생을 요청했습니다. 실제 소리가 들리는지는 직접 확인해 주세요.' : '재생이 진행되지 않았습니다. 아래 진단 정보를 보내주세요.'}</p><textarea readOnly aria-label="복사할 오디오 진단 정보" value={JSON.stringify(audioReport,null,2)} rows={9} style={{width:'100%',boxSizing:'border-box',fontSize:12}}/><button onClick={async()=>{try{await navigator.clipboard.writeText(JSON.stringify(audioReport,null,2));setCopyStatus('복사했습니다.');}catch{setCopyStatus('위 내용을 길게 눌러 복사해 주세요.');}}}>진단 정보 복사</button><span role="status">{copyStatus}</span></section>}

    <h3>단어장 관리</h3><p>단어장 선택하기에서 내가 업로드한 단어장을 길게 누르면 “삭제하시겠습니까?” 안내가 나와요. “예 · 삭제”를 누르면 목록에서 삭제됩니다. 기본 제공 단어장은 삭제되지 않아요. 실수로 삭제했다면 단어장 화면 아래의 “삭제한 단어장 · 복원”에서 학습 기록과 함께 되돌릴 수 있어요.</p>
    <button className="panel-refresh" onClick={onTutorial}>사용 가이드 다시 보기</button>
  </section>;
}
