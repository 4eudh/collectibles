import { getSupabaseClient } from './supabaseClient.js';
import { ECONOMY_RULES } from '../config.js';
import { logger } from '../core/logger.js';
import { getUTCNow, hoursBetween } from '../utils/time.js';

export function createEconomyService(store, events) {
  const supabase = getSupabaseClient();

  async function loadWallet(userId) {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error && error.code !== 'PGRST116') {
      logger.error('economy', 'Failed to load wallet', error);
      throw error;
    }
    if (!data) {
      const { data: created, error: createError } = await supabase
        .from('wallets')
        .insert({ user_id: userId, gold_balance: 0, gem_balance: 0 })
        .select()
        .single();
      if (createError) {
        logger.error('economy', 'Failed to create wallet', createError);
        throw createError;
      }
      store.patch({ wallet: created }, { type: 'wallet:created' });
      return created;
    }
    store.patch({ wallet: data }, { type: 'wallet:loaded' });
    return data;
  }

  async function loadLedger(userId, limit = 25) {
    const { data, error } = await supabase
      .from('economy_ledger')
      .select('*')
      .eq('user_id', userId)
      .order('occurred_at', { ascending: false })
      .limit(limit);
    if (error) {
      logger.error('economy', 'Failed to load ledger', error);
      throw error;
    }
    store.patch({ ledger: data }, { type: 'ledger:loaded' });
    return data;
  }

  async function recordLedgerEntry(entry) {
    const { data, error } = await supabase
      .from('economy_ledger')
      .insert(entry)
      .select()
      .single();
    if (error) {
      logger.error('economy', 'Failed to record ledger entry', error);
      throw error;
    }
    events.emit('ledger:entry', data);
    return data;
  }

  async function grantDailyStipend(userId, wallet) {
    const { stipendIntervalHours, stipendGoldAmount, stipendGemAmount } = ECONOMY_RULES;
    if (!wallet) wallet = await loadWallet(userId);
    if (!wallet) return null;
    if (wallet.last_stipend_at) {
      const elapsed = hoursBetween(wallet.last_stipend_at, getUTCNow());
      if (elapsed < stipendIntervalHours) {
        return { alreadyClaimed: true, hoursRemaining: stipendIntervalHours - elapsed };
      }
    }
    const { data, error } = await supabase
      .from('wallets')
      .update({
        gold_balance: (wallet.gold_balance ?? 0) + stipendGoldAmount,
        gem_balance: (wallet.gem_balance ?? 0) + stipendGemAmount,
        last_stipend_at: getUTCNow()
      })
      .eq('id', wallet.id)
      .select()
      .single();
    if (error) {
      logger.error('economy', 'Failed to grant stipend', error);
      throw error;
    }
    await recordLedgerEntry({
      user_id: userId,
      type: 'stipend',
      delta_gold: stipendGoldAmount,
      delta_gems: stipendGemAmount,
      description: 'Daily realm stipend',
      occurred_at: getUTCNow()
    });
    store.patch({ wallet: data }, { type: 'wallet:stipend' });
    return data;
  }

  async function adjustBalance(userId, deltas, context) {
    const wallet = await loadWallet(userId);
    const { delta_gold = 0, delta_gems = 0 } = deltas;
    const { data, error } = await supabase
      .from('wallets')
      .update({
        gold_balance: (wallet.gold_balance ?? 0) + delta_gold,
        gem_balance: (wallet.gem_balance ?? 0) + delta_gems
      })
      .eq('id', wallet.id)
      .select()
      .single();
    if (error) {
      logger.error('economy', 'Failed to adjust balance', error);
      throw error;
    }
    await recordLedgerEntry({
      user_id: userId,
      type: context?.type ?? 'adjustment',
      delta_gold,
      delta_gems,
      description: context?.description ?? null,
      reference_id: context?.referenceId ?? null,
      occurred_at: getUTCNow()
    });
    store.patch({ wallet: data }, { type: 'wallet:adjusted' });
    return data;
  }

  async function convertDuplicate(userId, rarity) {
    const reward = ECONOMY_RULES.duplicateConversion[rarity] ?? { gold: 0, gems: 0 };
    return adjustBalance(userId, { delta_gold: reward.gold ?? 0, delta_gems: reward.gems ?? 0 }, {
      type: 'conversion',
      description: `Converted duplicate (${rarity})`
    });
  }

  async function applyMarketplacePurchase(userId, { goldCost, gemCost, listingId }) {
    return adjustBalance(userId, { delta_gold: -Math.abs(goldCost ?? 0), delta_gems: -Math.abs(gemCost ?? 0) }, {
      type: 'marketplace_purchase',
      referenceId: listingId,
      description: 'Marketplace purchase'
    });
  }

  return {
    loadWallet,
    loadLedger,
    recordLedgerEntry,
    grantDailyStipend,
    adjustBalance,
    convertDuplicate,
    applyMarketplacePurchase
  };
}
