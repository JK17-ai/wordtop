import { diagnoseSound } from '../reactionSound';
import { useState } from 'react';
export default function StudySettings({ settings, onChange, stage, onStage, onClose, onTutorial }) {
  const [audioReport, setAudioReport] = useState(null);
  const [testingAudio, setTestingAudio] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const testAudio = async () => {
    setTestingAudio(true); setCopyStatus('');
    try { setAudioReport(await diagnoseSound()); }
    catch (error) { setAudioReport({ outcome:'diagnostic-error', message:error.message }); }
    finally { setTestingAudio(false); }
  };
  return <section className="learning-panel study-settings"><header><h2>설정</h2><button onClick={onClose}>학습으로</button></header><h3>학습방법</h3>
    <fieldset><legend>스크랩</legend>{[['recall','떠올린 후 퀴즈'],['meaning','바로 퀴즈']].map(([value,label]) => <label key={value}><input type="radio" name="scrap-method" checked={settings.scrap === value} onChange={() => onChange({...settings,scrap:value})}/>{label}</label>)}</fieldset>
    <fieldset><legend>마스터</legend>{[['reverse','국문으로 영문 선택'],['listening','발음 듣고 뜻 선택']].map(([value,label]) => <label key={value}><input type="radio" name="master-method" checked={settings.mastered === value} onChange={() => onChange({...settings,mastered:value})}/>{label}</label>)}</fieldset>
    <label className="stage-setting">복습할 별 단계<select value={stage} onChange={e => onStage(e.target.value)}><option value="all">전체</option><option value="1">★ 쉬움 · 3초 이내</option><option value="2">★★ 보통 · 6초 이내</option><option value="3">★★★ 어려움 · 6초 초과</option><option value="unrated">이전 기록 · 미분류</option></select></label>
    <p>듣기 버튼을 누르면 미국식 음성을 재생합니다. 듣는 동안은 시간이 멈추고, 다시 듣기 전 고민한 시간은 유지됩니다.</p>
    <button className="panel-refresh" disabled={testingAudio} onClick={testAudio}>{testingAudio ? '소리 상태 확인 중…' : '🔊 효과음 확인'}</button>
    {audioReport && <section className="audio-diagnostics" aria-label="효과음 진단"><p role="status">{audioReport.outcome === 'scheduled' ? '브라우저에 재생을 요청했습니다. 실제 소리가 들리는지는 직접 확인해 주세요.' : '재생이 진행되지 않았습니다. 아래 진단 정보를 보내주세요.'}</p><textarea readOnly aria-label="복사할 오디오 진단 정보" value={JSON.stringify(audioReport,null,2)} rows={9} style={{width:'100%',boxSizing:'border-box',fontSize:12}}/><button onClick={async()=>{try{await navigator.clipboard.writeText(JSON.stringify(audioReport,null,2));setCopyStatus('복사했습니다.');}catch{setCopyStatus('위 내용을 길게 눌러 복사해 주세요.');}}}>진단 정보 복사</button><span role="status">{copyStatus}</span></section>}
    <button className="panel-refresh" onClick={onTutorial}>사용 가이드 다시 보기</button>
  </section>;
}
