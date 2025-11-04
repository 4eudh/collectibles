import { getSupabaseClient } from './supabaseClient.js';
import { logger } from '../core/logger.js';

export function createProfileService(store, events) {
  const supabase = getSupabaseClient();

  async function loadProfile(userId) {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) {
      logger.error('profiles', 'Failed to load profile', error);
      events.emit('supabase:error', { scope: 'profiles', action: 'loadProfile', error });
      throw error;
    }
    store.patch({ profile: data }, { type: 'profile:loaded' });
    return data;
  }

  async function upsertProfile(profile) {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(profile)
      .select()
      .single();
    if (error) {
      logger.error('profiles', 'Failed to upsert profile', error);
      events.emit('supabase:error', { scope: 'profiles', action: 'upsertProfile', error });
      throw error;
    }
    store.patch({ profile: data }, { type: 'profile:updated' });
    events.emit('profile:updated', data);
    return data;
  }

  return { loadProfile, upsertProfile };
}
