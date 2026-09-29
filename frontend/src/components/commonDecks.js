import idioms from '../data/common-idioms.json' with {type:'json'};
export const commonDecks = [{id:'common:ko-idioms-v1', common:true, deck:{name:'수능 기출 사자성어',words:idioms}}];
export const commonDeck = id => commonDecks.find(item=>item.id===id);
