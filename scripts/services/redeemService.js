export function createRedeemService(store, events, collectiblesService, economyService) {

  async function redeemCode(userId, code) {
    const normalized = code.trim().toUpperCase();
    const reward = await collectiblesService.redeemCode(normalized, userId);
    if (reward?.currency_rewards) {
      await economyService.adjustBalance(userId, {
        delta_gold: reward.currency_rewards.gold ?? 0,
        delta_gems: reward.currency_rewards.gems ?? 0
      }, {
        type: 'redeem_reward',
        description: `Reward from code ${normalized}`
      });
    }
    events.emit('redeem:completed', reward);
    return reward;
  }

  return { redeemCode };
}
