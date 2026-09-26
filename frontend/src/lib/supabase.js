import { createClient } from '@supabase/supabase-js';

let client;
export function getSupabase() {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  if (key.startsWith('sb_secret_')) throw new Error('브라우저에는 Publishable key만 사용하세요.');
  client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

export async function checkDatabaseConnection() {
  const supabase = getSupabase();
  if (!supabase) return { connected: false, message: 'Supabase 연결 정보를 설정해 주세요.' };
  const { data, error } = await supabase.rpc('wordtop_health');
  if (error) return { connected: false, message: error.message };
  return { connected: data === 'wordtop-v1', message: data };
}
