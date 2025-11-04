import { SUPABASE_CONFIG } from '../config.js';

let client;

export function getSupabaseClient() {
  if (client) return client;
  const { url, anonKey } = SUPABASE_CONFIG;
  if (!url || !anonKey) {
    throw new Error('Supabase credentials are missing. Provide them via window.__COLLECTIBLE_REALM_CONFIG.');
  }
  client = window.supabase.createClient(url, anonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true
    }
  });
  return client;
}
