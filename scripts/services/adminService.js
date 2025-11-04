import { getSupabaseClient } from './supabaseClient.js';
import { logger } from '../core/logger.js';
import { getUTCNow } from '../utils/time.js';

export function createAdminService(store, events) {
  const supabase = getSupabaseClient();

  async function loadRedemptionCodes() {
    const { data, error } = await supabase
      .from('redemption_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      logger.error('admin', 'Failed to load redemption codes', error);
      throw error;
    }
    store.patch({ adminCodes: data }, { type: 'admin:codes' });
    return data;
  }

  async function createRedemptionCode(payload) {
    const entry = {
      code: payload.code,
      rarity: payload.rarity,
      max_redemptions: payload.maxRedemptions,
      expires_at: payload.expiresAt ?? null,
      reward_gold: payload.rewardGold ?? 0,
      reward_gems: payload.rewardGems ?? 0,
      reward_collectible_id: payload.rewardCollectibleId ?? null,
      metadata: payload.metadata ?? {},
      created_at: getUTCNow()
    };
    const { data, error } = await supabase
      .from('redemption_codes')
      .insert(entry)
      .select('*')
      .single();
    if (error) {
      logger.error('admin', 'Failed to create redemption code', error);
      throw error;
    }
    events.emit('admin:codeCreated', data);
    await loadRedemptionCodes();
    return data;
  }

  async function deactivateCode(codeId) {
    const { data, error } = await supabase
      .from('redemption_codes')
      .update({ is_active: false })
      .eq('id', codeId)
      .select('*')
      .single();
    if (error) {
      logger.error('admin', 'Failed to deactivate code', error);
      throw error;
    }
    await loadRedemptionCodes();
    return data;
  }

  return { loadRedemptionCodes, createRedemptionCode, deactivateCode };
}
