import idioms from '../data/common-idioms.json' with {type:'json'};
import ethics from '../data/common-ethics-patterns.json' with {type:'json'};
import society from '../data/common-society-patterns.json' with {type:'json'};
import nawl from '../data/common-nawl.json' with {type:'json'};
export const commonDecks = [
  {id:'common:ko-idioms-v1', common:true, deck:{name:'수능 기출 사자성어',words:idioms}},
  {id:'common:ko-ethics-patterns-v1', common:true, deck:{name:'생활과윤리 혼동 패턴 100',words:ethics}},
  {id:'common:ko-society-patterns-v1', common:true, deck:{name:'사회문화 혼동 패턴 100',words:society}},
  {id:'common:en-nawl-v1', common:true, deck:{name:'고급 독해·학술 영단어',words:nawl}, description:'NAWL 957개 · 학술 지문과 대학 교재 독해를 위한 어휘'},
];
export const commonDeck = id => commonDecks.find(item=>item.id===id);
