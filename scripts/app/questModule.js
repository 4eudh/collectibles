import { qs, render } from '../utils/dom.js';

export function createQuestModule({ store, services, events }) {
  const container = qs('#view-container');

  function renderQuests(state) {
    if (store.getState().ui.activeView !== 'quests') return;
    const quests = state.quests ?? [];

    const content = `
      <div class="max-w-4xl mx-auto glass-surface border-gradient rounded-3xl p-10 shadow-card">
        <header class="flex flex-col gap-3">
          <h2 class="text-3xl font-display font-semibold text-white">Daily Quest Log</h2>
          <p class="text-slate-400">Complete objectives to earn gold, gems, and exclusive cosmetics. Quests refresh daily.</p>
        </header>
        <section class="mt-8 space-y-6">
          ${quests.length ? quests.map(renderQuest).join('') : '<p class="text-slate-400">No quests available. Check back after the refresh window.</p>'}
        </section>
      </div>
    `;
    render(container, content);
    bindInteractions();
  }

  function renderQuest(quest) {
    const percent = Math.min(100, Math.round((quest.progress / quest.quest.target_amount) * 100));
    return `
      <article class="glass-surface border border-white/10 rounded-3xl p-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-xl font-semibold text-white">${quest.quest.title}</h3>
            <p class="text-sm text-slate-400">${quest.quest.description}</p>
          </div>
          <button data-quest="${quest.id}" data-current="${quest.progress}" class="quest-progress px-4 py-2 rounded-2xl bg-gradient-to-r from-nebula to-aurora text-obsidian text-sm font-semibold">Progress +1</button>
        </div>
        <div class="mt-4">
          <div class="w-full h-2 bg-white/10 rounded-full">
            <div class="h-full bg-gradient-to-r from-nebula to-aurora" style="width: ${percent}%"></div>
          </div>
          <p class="mt-2 text-xs text-slate-400">${quest.progress}/${quest.quest.target_amount} • ${quest.quest.reward_gold ?? 0} gold • ${quest.quest.reward_gems ?? 0} gems</p>
        </div>
      </article>
    `;
  }

  function bindInteractions() {
    container?.addEventListener('click', async (event) => {
      if (event.target.matches('.quest-progress')) {
        const questId = event.target.dataset.quest;
        const session = store.getState().session;
        if (!session?.user) return;
        try {
          const nextProgress = (Number(event.target.dataset.current) || 0) + 1;
          await services.engagement.recordQuestProgress(session.user.id, questId, nextProgress);
          event.target.dataset.current = String(nextProgress);
          events.emit('economy:refresh');
        } catch (error) {
          console.error(error);
        }
      }
    });
  }

  events.on('view:changed', (view) => {
    if (view === 'quests') renderQuests(store.getState());
  });

  store.subscribe(renderQuests);

  return {
    init() {
      renderQuests(store.getState());
    }
  };
}
