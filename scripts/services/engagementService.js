import { getSupabaseClient } from './supabaseClient.js';
import { logger } from '../core/logger.js';
import { FEATURE_FLAGS, QUEST_RULES } from '../config.js';
import { getUTCNow } from '../utils/time.js';

export function createEngagementService(store, events, economyService) {
  const supabase = getSupabaseClient();

  async function loadAchievements(userId) {
    if (!FEATURE_FLAGS.enableAchievements) return [];
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*, achievement:achievements(*)')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });
    if (error) {
      logger.error('engagement', 'Failed to load achievements', error);
      events.emit('supabase:error', { scope: 'engagement', action: 'loadAchievements', error });
      throw error;
    }
    store.patch({ achievements: data }, { type: 'achievements:loaded' });
    return data;
  }

  async function loadQuests(userId) {
    if (!FEATURE_FLAGS.enableQuests) return [];
    const { data, error } = await supabase
      .from('user_daily_quests')
      .select('*, quest:daily_quest_definitions(*)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('expires_at', { ascending: true });
    if (error) {
      logger.error('engagement', 'Failed to load quests', error);
      events.emit('supabase:error', { scope: 'engagement', action: 'loadQuests', error });
      throw error;
    }
    store.patch({ quests: data }, { type: 'quests:loaded' });
    return data;
  }

  async function recordQuestProgress(userId, questId, progress) {
    const { data, error } = await supabase
      .from('user_daily_quests')
      .update({ progress, updated_at: getUTCNow() })
      .eq('user_id', userId)
      .eq('id', questId)
      .select('*, quest:daily_quest_definitions(*)')
      .single();
    if (error) {
      logger.error('engagement', 'Failed to update quest progress', error);
      events.emit('supabase:error', { scope: 'engagement', action: 'recordQuestProgress', error });
      throw error;
    }
    if (data.progress >= data.quest.target_amount && !data.completed_at) {
      await completeQuest(userId, questId, data.quest);
    }
    await loadQuests(userId);
    return data;
  }

  async function completeQuest(userId, questId, questDef) {
    const { data, error } = await supabase
      .from('user_daily_quests')
      .update({ completed_at: getUTCNow(), progress: questDef.target_amount })
      .eq('id', questId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) {
      logger.error('engagement', 'Failed to complete quest', error);
      events.emit('supabase:error', { scope: 'engagement', action: 'completeQuest', error });
      throw error;
    }
    await economyService.adjustBalance(userId, {
      delta_gold: questDef.reward_gold ?? 0,
      delta_gems: questDef.reward_gems ?? 0
    }, {
      type: 'quest_reward',
      description: `Completed quest: ${questDef.title}`
    });
    events.emit('quest:completed', data);
    return data;
  }

  async function loadSeasonalSpotlights() {
    if (!FEATURE_FLAGS.enableSeasonalEvents) return [];
    const { data, error } = await supabase
      .from('seasonal_events')
      .select('*')
      .eq('is_active', true)
      .order('starts_at', { ascending: true });
    if (error) {
      logger.error('engagement', 'Failed to load seasonal events', error);
      events.emit('supabase:error', { scope: 'engagement', action: 'loadSeasonalSpotlights', error });
      throw error;
    }
    store.patch({ seasonalEvents: data }, { type: 'seasonal:loaded' });
    return data;
  }

  async function ensureQuests(userId) {
    if (!FEATURE_FLAGS.enableQuests) return [];
    const { data, error } = await supabase
      .rpc('ensure_daily_quests', {
        p_user_id: userId,
        p_max_active: QUEST_RULES.maxActiveQuests
      });
    if (error) {
      logger.error('engagement', 'Failed to ensure quests', error);
      events.emit('supabase:error', { scope: 'engagement', action: 'ensureQuests', error });
      throw error;
    }
    await loadQuests(userId);
    return data;
  }

  return { loadAchievements, loadQuests, recordQuestProgress, completeQuest, loadSeasonalSpotlights, ensureQuests };
}
