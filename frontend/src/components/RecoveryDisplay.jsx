import {formatRecovery} from '../lib/recoveryCode.js';
export default function RecoveryDisplay({code}){
 return <div className="recovery-display"><code>{formatRecovery(code)}</code><p>내 정보에서 확인이 가능합니다.<br/>기기가 바뀌면 이 코드로 복구하세요.</p></div>;
}
