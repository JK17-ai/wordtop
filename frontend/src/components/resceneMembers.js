export const members = {
  woni: { name:'원이', phrase:'오이쉬', x:70, y:274 },
  liv: { name:'리브', phrase:'너도~ 나도', x:343, y:274 },
  minami: { name:'미나미', phrase:'야호', x:619, y:274 },
  may: { name:'메이', phrase:'그립감 좋다', x:190, y:730 },
  zena: { name:'제나', phrase:'왜요~', x:527, y:730 },
};
export function reactionMember(mood, count=1) {
  return mood === 'wrong' ? 'zena' : mood === 'streak' ? 'minami' : mood === 'badge' ? 'may' : ['woni','liv','may'][Math.max(0,count-1)%3];
}
export function memberPhrase(member) { return members[member]?.phrase || members.woni.phrase; }
