export const recoveryKey = id => `wordtop:${id}:recovery-code-v1`;
export function normalizeRecovery(value){
 const code=String(value||'').normalize('NFC').trim();
 const legacy=code.replace(/[\s-]/g,'');
 return /^[A-Fa-f0-9]{32}$/.test(legacy)?legacy.toUpperCase():code;
}
export const validRecovery = value => {const code=normalizeRecovery(value);return /^[A-F0-9]{32}$/.test(code)||(/^[A-Za-z0-9!@#$%&*?]{10}$/.test(code)&&/[A-Za-z]/.test(code)&&/[0-9]/.test(code)&&/[!@#$%&*?]/.test(code))||(/^[가-힣A-Za-z!@#$%&*?]{10}$/.test(code)&&/[가-힣]/.test(code)&&/[A-Za-z]/.test(code)&&/[!@#$%&*?]/.test(code));};
export const formatRecovery = value => normalizeRecovery(value);
export function saveRecovery(storage,id,value){const code=normalizeRecovery(value);if(!validRecovery(code))throw Error('복구 코드 응답을 확인해 주세요.');storage.setItem(recoveryKey(id),code);}
export function readRecovery(storage,id){try{const value=storage.getItem(recoveryKey(id));return validRecovery(value)?normalizeRecovery(value):null;}catch{return null;}}

// Generate once per onboarding screen; submit this exact code with the account.
export function generateRecovery(){
 const randomInt=max=>{const value=new Uint32Array(1),limit=Math.floor(4294967296/max)*max;do{crypto.getRandomValues(value);}while(value[0]>=limit);return value[0]%max;};
 const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',symbols='!@#$%&*?';
 const digits='0123456789',all=letters+digits+symbols;
 const parts=[letters[randomInt(letters.length)],digits[randomInt(digits.length)],symbols[randomInt(symbols.length)]];
 while(parts.length<10)parts.push(all[randomInt(all.length)]);
 for(let i=parts.length-1;i>0;i--){const j=randomInt(i+1);[parts[i],parts[j]]=[parts[j],parts[i]];}
 return parts.join('');
}
