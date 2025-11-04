import { getSupabaseClient } from './supabaseClient.js';
import { logger } from '../core/logger.js';

export function createCollectiblesService(store, events) {
  const supabase = getSupabaseClient();

  async function loadCollectibles(userId) {
    if (!userId) {
      store.patch({ collectibles: [] }, { type: 'collectibles:cleared' });
      return [];
    }
    const { data, error } = await supabase
      .from('user_collectibles')
      .select('*, collectible:collectibles(*)')
      .eq('user_id', userId)
      .order('acquired_at', { ascending: false });
    if (error) {
      logger.error('collectibles', 'Failed to load collectibles', error);
      throw error;
    }
    const withMeta = data.map((entry) => ({
      ...entry.collectible,
      acquisition_id: entry.id,
      acquired_at: entry.acquired_at,
      rarity_label: entry.collectible?.rarity?.charAt(0).toUpperCase() + entry.collectible?.rarity?.slice(1) ?? 'Unknown'
    }));
    store.patch({ collectibles: withMeta }, { type: 'collectibles:loaded' });
    events.emit('collectibles:loaded', withMeta);
    return withMeta;
  }

  async function redeemCode(code, userId) {
    const { data, error } = await supabase.rpc('redeem_collectible_code', { p_code: code, p_user_id: userId });
    if (error) {
      logger.error('collectibles', 'Failed to redeem code', error);
      throw error;
    }
    events.emit('redeem:success', data);
    await loadCollectibles(userId);
    return data;
  }

  return { loadCollectibles, redeemCode };
}
