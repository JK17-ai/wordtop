import { getSupabase } from './supabase';

export async function loadProfile() {
  const client = getSupabase();
  if (!client) throw new Error('Supabase 환경변수가 없습니다. 연결 설정을 확인해 주세요.');
  const { data: session, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session.session) return null;
  const { data, error } = await client.rpc('wordtop_my_profile');
  if (error) throw new Error('사용자 연결 SQL 설정 또는 네트워크를 확인해 주세요.');
  return data;
}
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
