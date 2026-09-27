import { readProfileCache, saveProfileCache } from './profileCache.js';
import { getSupabase } from './supabase';

const remember = profile => { try { saveProfileCache(localStorage,profile); } catch { /* Server identity remains valid when storage is unavailable. */ } return profile; };
export async function loadProfile() {
  const cached = readProfileCache(localStorage);
  const client = getSupabase();
  try {
    if (!client) throw Error('서버 연결 설정을 확인해 주세요.');
    const { data: session, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session.session) return cached ? await selectCharacter(cached.name) : null;
    const { data, error } = await client.rpc('wordtop_my_profile').abortSignal(AbortSignal.timeout(8000));
    if (error) throw error;
    if (data?.id) return remember(data);
    return cached ? await selectCharacter(cached.name) : null;
  } catch (error) {
    // Cached identity allows local study; server writes still require a valid binding.
    if (cached) return cached;
    throw Error('프로필 연결을 확인하지 못했어요. 연결 후 다시 시도해 주세요.');
  }
}
export async function selectCharacter(name) {
  const client = getSupabase();
  if (!client) throw Error('서버 연결 설정이 필요합니다.');
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data.session) {
    const { error: failure } = await client.auth.signInAnonymously();
    if (failure) throw Error('기기 연결에 실패했어요. 인터넷 연결을 확인해 주세요.');
  }
  const { data: profile, error: failure } = await client.rpc('wordtop_select_character', {profile_name:name}).abortSignal(AbortSignal.timeout(10000));
  if (failure) throw Error(failure.code === 'PGRST202' ? '캐릭터 바로 시작 기능의 서버 업데이트가 필요합니다.' : failure.message);
  if (!profile?.id) throw Error('캐릭터를 연결하지 못했어요.');
  return remember(profile);
}
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
