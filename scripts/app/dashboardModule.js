import { qs, render, formatNumber } from '../utils/dom.js';
import { UI_COPY } from '../config.js';

export function createDashboardModule({ store, services, events }) {
  const container = qs('#view-container');

  function renderDashboard(state) {
    if (store.getState().ui.activeView !== 'dashboard') return;
    const wallet = state.wallet ?? { gold_balance: 0, gem_balance: 0 };
    const achievements = state.achievements ?? [];
    const quests = state.quests ?? [];
    const seasonal = state.seasonalEvents ?? [];

    const content = `
      <div class="max-w-7xl mx-auto grid gap-10">
        <section class="glass-surface border-gradient rounded-3xl p-10 shadow-card">
          <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <p class="uppercase tracking-[0.35em] text-xs font-semibold text-slate-500 dark:text-slate-400">${UI_COPY.dashboard.welcomeTitle}</p>
              <h2 class="text-4xl font-display font-semibold text-obsidian dark:text-white">${state.profile?.username ?? 'Adventurer'}</h2>
              <p class="mt-2 text-slate-500 dark:text-slate-400">${UI_COPY.dashboard.welcomeSubtitle}</p>
            </div>
            <div class="flex gap-4">
              <button id="claim-stipend" class="px-5 py-3 rounded-2xl bg-gradient-to-r from-nebula to-aurora text-obsidian font-semibold shadow-glow">Claim Daily Stipend</button>
              <button data-nav="marketplace" class="nav-link px-5 py-3 rounded-2xl glass-surface border border-white/20">Visit Marketplace</button>
            </div>
          </div>
        </section>

        <section class="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
          ${renderWalletCard('Realm Gold', wallet.gold_balance, '💰', 'Track the currency you earn across the realm.')}
          ${renderWalletCard('Stellar Gems', wallet.gem_balance, '💎', 'Premium currency for legendary trades.')}
          ${renderProgressCard('Collection Power', state.collectibles?.length ?? 0, 'Complete seasonal sets to unlock rare cosmetics.')}
          ${renderProgressCard('Quest Momentum', quests.filter((quest) => !quest.completed_at).length, 'Keep streaks alive to boost rewards.')}
        </section>

        <section class="grid lg:grid-cols-2 gap-6">
          <div class="glass-surface border-gradient rounded-3xl p-8 shadow-card">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-xl font-semibold text-white">Active Quests</h3>
              <button class="text-sm text-aurora" id="refresh-quests">Refresh</button>
            </div>
            <div class="space-y-4">
              ${quests.length ? quests.map(renderQuest).join('') : '<p class="text-slate-400">No quests assigned. Check back later!</p>'}
            </div>
          </div>
          <div class="glass-surface border-gradient rounded-3xl p-8 shadow-card">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-xl font-semibold text-white">Recent Achievements</h3>
              <span class="text-sm text-slate-400">${achievements.length}</span>
            </div>
            <div class="space-y-4 max-h-72 overflow-y-auto pr-2 scrollbar-hide">
              ${achievements.length ? achievements.map(renderAchievement).join('') : '<p class="text-slate-400">Earn achievements by exploring every corner of the realm.</p>'}
            </div>
          </div>
        </section>

        <section class="glass-surface border-gradient rounded-3xl p-8 shadow-card">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-semibold text-white">Seasonal Spotlights</h3>
            <span class="text-sm text-slate-400">${seasonal.length || '—'}</span>
          </div>
          <div class="grid md:grid-cols-2 gap-4">
            ${seasonal.length ? seasonal.map(renderSeasonal).join('') : '<p class="text-slate-400">Stay tuned for the next seasonal event drop.</p>'}
          </div>
        </section>
      </div>
    `;

    render(container, content);
    bindInteractions();
  }

  function bindInteractions() {
    const stipendButton = qs('#claim-stipend');
    const refreshQuests = qs('#refresh-quests');
    if (stipendButton) {
      stipendButton.addEventListener('click', async () => {
        const session = store.getState().session;
        if (!session?.user) return;
        stipendButton.disabled = true;
        try {
          await services.economy.grantDailyStipend(session.user.id, store.getState().wallet);
          events.emit('economy:refresh');
        } catch (error) {
          console.error(error);
        } finally {
          stipendButton.disabled = false;
        }
      });
    }
    if (refreshQuests) {
      refreshQuests.addEventListener('click', async () => {
        const session = store.getState().session;
        if (!session?.user) return;
        await services.engagement.ensureQuests(session.user.id);
      });
    }
  }

  function renderWalletCard(label, amount, icon, description) {
    return `
      <article class="glass-surface border-gradient rounded-3xl p-6 shadow-card relative overflow-hidden">
        <div class="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-nebula/30 to-aurora/10 rounded-full blur-3xl"></div>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm uppercase tracking-[0.3em] text-slate-400">${label}</p>
            <p class="mt-3 text-3xl font-display text-white">${formatNumber(amount)}</p>
            <p class="mt-3 text-sm text-slate-400">${description}</p>
          </div>
          <span class="text-4xl">${icon}</span>
        </div>
      </article>
    `;
  }

  function renderProgressCard(label, value, description) {
    return `
      <article class="glass-surface border-gradient rounded-3xl p-6 shadow-card">
        <p class="text-sm uppercase tracking-[0.3em] text-slate-400">${label}</p>
        <p class="mt-3 text-3xl font-display text-white">${formatNumber(value)}</p>
        <p class="mt-3 text-sm text-slate-400">${description}</p>
      </article>
    `;
  }

  function renderQuest(quest) {
    const progressPercent = Math.min(100, Math.round((quest.progress / quest.quest.target_amount) * 100));
    return `
      <div class="glass-surface border border-white/10 rounded-2xl p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-white">${quest.quest.title}</p>
            <p class="text-xs text-slate-400">${quest.quest.description}</p>
          </div>
          <span class="rarity-pill px-3 py-1 rounded-full text-xs uppercase tracking-[0.2em] text-aurora">${quest.quest.type}</span>
        </div>
        <div class="mt-4">
          <div class="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-nebula to-aurora" style="width: ${progressPercent}%"></div>
          </div>
          <p class="mt-2 text-xs text-slate-400">${quest.progress}/${quest.quest.target_amount} • ${quest.quest.reward_gold ?? 0} gold • ${quest.quest.reward_gems ?? 0} gems</p>
        </div>
      </div>
    `;
  }

  function renderAchievement(entry) {
    return `
      <div class="glass-surface border border-white/10 rounded-2xl p-4 flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-nebula/40 to-aurora/20 flex items-center justify-center text-2xl">${entry.achievement.icon ?? '🏆'}</div>
        <div>
          <p class="text-sm font-semibold text-white">${entry.achievement.title}</p>
          <p class="text-xs text-slate-400">${entry.achievement.description}</p>
        </div>
      </div>
    `;
  }

  function renderSeasonal(event) {
    return `
      <article class="glass-surface border border-white/10 rounded-3xl p-5 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <h4 class="text-lg font-semibold text-white">${event.name}</h4>
          <span class="text-xs uppercase tracking-[0.25em] text-starlight">${event.tier}</span>
        </div>
        <p class="text-sm text-slate-300">${event.description}</p>
        <p class="text-xs text-slate-400">${new Date(event.starts_at).toLocaleDateString()} → ${new Date(event.ends_at).toLocaleDateString()}</p>
      </article>
    `;
  }

  store.subscribe(renderDashboard);
  events.on('view:changed', (view) => {
    if (view === 'dashboard') {
      renderDashboard(store.getState());
    }
  });

  return {
    init() {
      renderDashboard(store.getState());
    }
  };
}
