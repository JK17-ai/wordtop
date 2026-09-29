import {readRecovery,saveRecovery,validRecovery,normalizeRecovery} from './recoveryCode.js';
import { readProfileCache, saveProfileCache } from './profileCache.js';
import { getSupabase } from './supabase';

const remember = profile => { try { saveProfileCache(localStorage,profile); } catch { /* Server identity remains valid when storage is unavailable. */ } return profile; };
export async function loadProfile() {
  const cached = readProfileCache(localStorage);
  const client = getSupabase();
  if (!client) throw Error('서버 연결 설정을 확인해 주세요.');
  try {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data.session) {
      const code = cached && readRecovery(localStorage,cached.id);
      if (code) return (await recoverPersonal(code)).profile;
      return null;
    }
    const {data:profile,error:failure}=await client.rpc('wordtop_my_profile').abortSignal(AbortSignal.timeout(8000));
    if(failure)throw failure;
    return profile?.id ? remember(profile) : null;
  } catch(error) {
    if(cached)return cached; // Offline access stays scoped to its existing profile.
    throw Error('연결을 확인하지 못했어요. 인터넷 연결 후 다시 시도해 주세요.');
  }
}
async function deviceClient(){
 const client=getSupabase();if(!client)throw Error('서버 연결 설정을 확인해 주세요.');
 const {data,error}=await client.auth.getSession();if(error)throw error;
 if(!data.session){const {error:failure}=await client.auth.signInAnonymously();if(failure)throw Error('기기를 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');}
 return client;
}
async function accountRpc(name,args){
 const client=await deviceClient();const {data,error}=await client.rpc(name,args).abortSignal(AbortSignal.timeout(15000));
 if(error)throw Error(error.code==='PGRST202'?'개인 계정 기능의 서버 업데이트가 필요합니다.':error.code==='23505'?'같은 이름이 이미 있어요. 다른 표시 이름을 입력해 주세요.':error.message);
 if(data?.error)throw Error(data.error);return data;
}
function rememberAccount(data){
 if(!data?.profile?.id)throw Error('연결된 학습 공간을 확인하지 못했어요.');
 remember(data.profile);
 if(data.recovery_code){try{saveRecovery(localStorage,data.profile.id,data.recovery_code);}catch{data.storageWarning=true;}}
 return data;
}
export async function createPersonal(name,gender=null,age=null,code=null){return rememberAccount(await accountRpc(code?'wordtop_create_personal_with_code':'wordtop_create_personal',{display_name:name.trim(),gender_value:gender||null,age_value:age||null,...(code?{initial_code:normalizeRecovery(code)}:{})}));}
export async function recoverPersonal(code){if(!validRecovery(code))throw Error('복구 코드를 정확하게 입력했는지 확인해 주세요.');return rememberAccount(await accountRpc('wordtop_recover_personal',{recovery_code:normalizeRecovery(code)}));}
export async function issueRecovery(){return rememberAccount(await accountRpc('wordtop_issue_recovery'));}
export async function updatePersonal(name,gender=null,age=null){return remember(await accountRpc('wordtop_update_personal',{display_name:name.trim(),gender_value:gender||null,age_value:age||null}));}
// Previous invite-code API retained for rollback; the character picker no longer calls it.
export async function claimProfile(name, code) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase 연결 설정이 필요합니다.');
  const { data, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!data.session) {
    const { error } = await client.auth.signInAnonymously();
    if (error) throw new Error('기기 인증 실패: ' + error.message);
  }
  const { data: profile, error } = await client.rpc('wordtop_claim_profile', {
    profile_name: name, invite_code: code.trim(),
  });
  if (error) throw new Error(error.code === 'P0001' ? error.message : '사용자 연결에 실패했어요. SQL 설정과 네트워크를 확인해 주세요.');
  if (!profile?.id) throw new Error('연결된 사용자를 확인하지 못했어요.');
  return profile;
}
export function profileKey(profileId, name) {
  return profileId ? 'wordtop:' + profileId + ':' + name : name;
}
export function migrateLocalRecords(profileId) {
  // A legacy device's records can be claimed only once; preserve originals.
  const ownerKey = 'wordtop-legacy-owner';
  const owner = localStorage.getItem(ownerKey);
  if (owner && owner !== profileId) return;
  for (const key of ['wordtop-current-deck','wordtop-daily-accuracy-v1']) {
    const destination = profileKey(profileId,key);
    const value = localStorage.getItem(key);
    if (value && !localStorage.getItem(destination)) localStorage.setItem(destination,value);
  }
  localStorage.setItem(ownerKey,profileId);
}
