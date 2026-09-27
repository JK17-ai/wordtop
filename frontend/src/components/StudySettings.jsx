export default function StudySettings({ settings, onChange, stage, onStage }) {
  return <section className="learning-panel study-settings"><h2>설정</h2><h3>학습방법</h3>
    <fieldset><legend>스크랩</legend>{[['recall','떠올린 후 퀴즈'],['meaning','바로 퀴즈']].map(([value,label]) => <label key={value}><input type="radio" name="scrap-method" checked={settings.scrap === value} onChange={() => onChange({...settings,scrap:value})}/>{label}</label>)}</fieldset>
    <fieldset><legend>마스터</legend>{[['reverse','국문으로 영문 선택'],['listening','발음 듣고 뜻 선택']].map(([value,label]) => <label key={value}><input type="radio" name="master-method" checked={settings.mastered === value} onChange={() => onChange({...settings,mastered:value})}/>{label}</label>)}</fieldset>
    <label className="stage-setting">복습할 별 단계<select value={stage} onChange={e => onStage(e.target.value)}><option value="all">전체</option><option value="1">★ 쉬움 · 3초 이내</option><option value="2">★★ 보통 · 6초 이내</option><option value="3">★★★ 어려움 · 6초 초과</option><option value="unrated">이전 기록 · 미분류</option></select></label>
    <p>듣기 버튼을 누르면 미국식 음성을 재생합니다. 듣는 동안은 시간이 멈추고, 다시 듣기 전 고민한 시간은 유지됩니다.</p>
  </section>;
}
