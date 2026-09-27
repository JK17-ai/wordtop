export const PROFILE_CACHE_KEY = 'wordtop-selected-profile-v1';
export function readProfileCache(storage) {
  try {
    const profile = JSON.parse(storage.getItem(PROFILE_CACHE_KEY));
    return typeof profile?.id === 'string' && typeof profile?.name === 'string' && typeof profile?.family_id === 'string' ? profile : null;
  } catch { return null; }
}
export function saveProfileCache(storage, profile) {
  if (!profile?.id || !profile?.family_id) throw Error('프로필 응답을 확인하지 못했어요.');
  storage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  return profile;
}
