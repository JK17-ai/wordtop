import idioms from '../data/common-idioms.json' with {type:'json'};
import ethics from '../data/common-ethics-patterns.json' with {type:'json'};
import society from '../data/common-society-patterns.json' with {type:'json'};
export const commonDecks = [
  {id:'common:ko-idioms-v1', common:true, deck:{name:'수능 기출 사자성어',words:idioms}},
  {id:'common:ko-ethics-patterns-v1', common:true, deck:{name:'생활과윤리 혼동 패턴 100',words:ethics}},
  {id:'common:ko-society-patterns-v1', common:true, deck:{name:'사회문화 혼동 패턴 100',words:society}},
];
export const commonDeck = id => commonDecks.find(item=>item.id===id);
