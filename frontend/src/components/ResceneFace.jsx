import {members} from './resceneMembers.js';
export default function ResceneFace({ member='woni' }) {
  const person=members[member] || members.woni;
  return <span role="img" aria-label={`리센느 ${person.name}`} className="seungwoo-face rescene-face" style={{backgroundImage:"url('/characters/rescene/team.jpg')",backgroundSize:'430.476% 571.429%',backgroundPosition:`${person.x / 694 * 100}% ${person.y / 990 * 100}%`}}/>;
}