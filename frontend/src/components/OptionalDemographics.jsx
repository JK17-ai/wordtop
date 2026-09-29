export default function OptionalDemographics({gender,age,onGender,onAge}) {
 const group=(legend,value,onChange,options)=> <fieldset className="demographic-group"><legend>{legend} <small>선택</small></legend><div className={`demographic-options ${legend==='나이대'?'age-options':''}`}>{options.map(([key,label])=><button key={key} type="button" aria-pressed={value===key} className={value===key?'is-selected':''} onClick={()=>onChange(value===key?'':key)}>{label}</button>)}</div></fieldset>;
 return <div className="optional-demographics">{group('성별',gender,onGender,[['male','남성'],['female','여성']])}{group('나이대',age,onAge,[['under10','10대 미만'],['teens','10대'],['20s','20대'],['30plus','30대 이상']])}</div>;
}
