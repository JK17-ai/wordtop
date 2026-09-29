import {useEffect,useRef,useState} from 'react';
import MoaLogo from './MoaLogo';
import WordCard from './WordCard';
import KoreanStudyContent from './KoreanStudyContent';
import MotivationBanner from './MotivationBanner';
import './PhoneTest.css';
const words=[
 {id:1,word:'괄목상대',hanja:'刮目相對',meaning:'눈을 비비고 상대를 대한다는 뜻으로, 학식이나 재주가 놀라운 정도로 부쩍 향상되었다는 뜻',language:'ko-KR'},
 {id:2,word:'자화자찬',hanja:'自畫自讚',meaning:'자기가 한 일을 스스로 자랑함',language:'ko-KR'}
];
export default function PhoneTest(){
 const embedded=new URLSearchParams(location.search).get('preview')==='phone-screen';
 const [width,setWidth]=useState(393),[mode,setMode]=useState('quiz'),[paused,setPaused]=useState(true);
 if(!embedded)return <PhoneViewport width={width} setWidth={setWidth}/>;
 const studyWord={word:'청천벽력',hanja:'靑天霹靂',meaning:'맑게 갠 하늘에서 갑자기 떨어지는 벼락이라는 뜻으로, 돌발적인 사태나 뜻밖의 큰 충격을 이르는 말'};
 return <div className="app-shell reel-feed quiet-study phone-ratio-test">
 <header className="topbar"><h1><MoaLogo/></h1><span className="active-profile">🕊 갈매기</span></header>
 <div className="phone-deck"><small>현재 단어장</small><strong>수능기출사자성어 ⌄</strong></div>
 {mode==='quiz'?<><div className="feed-tabs">{['학습한 단어','몰라요','알아요'].map((t,i)=><button key={t} className={!i?'active':''}>{t}<small>({[26,13,13][i]})</small></button>)}</div><div className="daily-study-line">오늘 87개 학습 · 다시 익힐 44개 · 정답 43개</div></>:<><div className="phone-review">↻ <strong>기억을 깨울 시간</strong><span>복습 시작 →</span></div><div className="phone-progress">오늘 벌써 <b>26개</b>를 살펴봤어요</div></>}
 <section className="phone-main">
 {mode==='quiz'?<><section className="quiz-session-progress"><div className="quiz-session-heading"><span><small>학습한 단어</small><strong>20<span> / 26</span></strong></span></div><div className="quiz-session-track"><span style={{width:'77%'}}/></div></section><div className="moa-quiz-body"><main className="reel-stage"><WordCard key={mode} item={words[0]} choices={words} exercise="reverse" paused={paused} onPausedChange={setPaused} onAnswer={()=>{}}/></main><button className="study-pause" onClick={()=>setPaused(!paused)}>{paused?'▶ 학습 계속하기':'Ⅱ 잠깐 멈춤'}</button></div></>:<div className="moa-feed"><article className="moa-slide korean-study-card is-current"><div className="moa-card-tools"><span>새롭게 만나는 단어</span><button>☆ 저장</button></div><KoreanStudyContent word={studyWord}/><div className="moa-judgments"><button>♡ 몰라요</button><button>✓ 알아요</button></div></article></div>}
 </section>
 <MotivationBanner index={mode==='quiz'?1:0}/>
 <nav className="stats-nav polished-nav" aria-label="하단 메뉴">{['모아학습','모아퀴즈','내 단어장','내 기록'].map((t,i)=><button key={t} className={(i===0&&mode==='study')||(i===1&&mode==='quiz')?'selected':''} onClick={()=>{if(i<2){setMode(i?'quiz':'study');setPaused(true);}}}><span>{['▤','ϟ','▥','◎'][i]}</span><small>{t}</small></button>)}</nav>
 </div>;
}

function PhoneViewport({width,setWidth}){
 const host=useRef(null);
 const [height,setHeight]=useState(852);
 const [scale,setScale]=useState(1);
 useEffect(()=>{
  const observer=new ResizeObserver(([entry])=>setScale(Math.min(1,entry.contentRect.width/width,entry.contentRect.height/height)));
  observer.observe(host.current);
  return ()=>observer.disconnect();
 },[width,height]);
 return <main className="phone-test-workbench actual-phone-preview">
  <header><h1>iPhone 15 Pro · 실제 앱</h1><p>{width} × {height} · 화면 맞춤 {Math.round(scale*100)}%</p><label>폭 {width}px <input aria-label="화면 폭" type="range" min="300" max="430" value={width} onChange={e=>setWidth(Number(e.target.value))}/></label><label>높이 {height}px <input aria-label="화면 높이" type="range" min="568" max="932" value={height} onChange={e=>setHeight(Number(e.target.value))}/></label></header>
  <div className="phone-preview-space" ref={host}><div style={{width:width*scale,height:height*scale,position:'relative'}}><iframe title="아이폰 15 Pro 실제 앱" style={{width,height,transform:`scale(${scale})`,transformOrigin:'top left'}} src="/?preview=learning"/></div></div>
  <p>실제 앱입니다. 학습·퀴즈를 진행하면 기존 계정의 기록에 반영됩니다.</p>
 </main>;
}