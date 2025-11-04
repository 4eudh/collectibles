import { qs, render } from '../utils/dom.js';

export function createAdminModule({ store, services, events }) {
  const container = qs('#view-container');

  function renderAdmin(state) {
    if (store.getState().ui.activeView !== 'admin') return;
    const codes = state.adminCodes ?? [];

    const content = `
      <div class="max-w-6xl mx-auto grid gap-8">
        <section class="glass-surface border-gradient rounded-3xl p-8 shadow-card">
          <h2 class="text-3xl font-display font-semibold text-white">Admin Control Center</h2>
          <p class="mt-2 text-slate-400">Manage realm codes, monitor redemptions, and seed new campaigns.</p>
          <form id="code-form" class="mt-8 grid md:grid-cols-2 gap-4">
            <input name="code" required placeholder="Code" class="px-4 py-3 rounded-2xl glass-surface border border-white/10 uppercase tracking-[0.3em]" />
            <select name="rarity" class="px-4 py-3 rounded-2xl glass-surface border border-white/10">
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
              <option value="mythic">Mythic</option>
            </select>
            <input type="number" name="maxRedemptions" placeholder="Max Redemptions" class="px-4 py-3 rounded-2xl glass-surface border border-white/10" />
            <input type="datetime-local" name="expiresAt" class="px-4 py-3 rounded-2xl glass-surface border border-white/10" />
            <input type="number" name="rewardGold" placeholder="Gold" class="px-4 py-3 rounded-2xl glass-surface border border-white/10" />
            <input type="number" name="rewardGems" placeholder="Gems" class="px-4 py-3 rounded-2xl glass-surface border border-white/10" />
            <div class="md:col-span-2">
              <textarea name="metadata" placeholder='Metadata JSON' class="w-full px-4 py-3 rounded-2xl glass-surface border border-white/10"></textarea>
            </div>
            <button type="submit" class="md:col-span-2 px-5 py-4 rounded-2xl bg-gradient-to-r from-nebula via-starlight to-aurora text-obsidian font-semibold shadow-glow">Create Code</button>
          </form>
        </section>

        <section class="glass-surface border-gradient rounded-3xl p-8 shadow-card">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-semibold text-white">Existing Codes</h3>
            <span class="text-sm text-slate-400">${codes.length} codes</span>
          </div>
          <div class="space-y-4">
            ${codes.length ? codes.map(renderCodeRow).join('') : '<p class="text-slate-400">No codes yet.</p>'}
          </div>
        </section>
      </div>
    `;

    render(container, content);
    bindForm();
  }

  function renderCodeRow(code) {
    return `
      <article class="glass-surface border border-white/10 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-semibold text-white tracking-[0.3em] uppercase">${code.code}</p>
          <p class="text-xs text-slate-400">${code.rarity} • ${code.max_redemptions ?? '∞'} redemptions • ${code.reward_gold ?? 0} gold</p>
        </div>
        <button data-code="${code.id}" class="deactivate-code px-4 py-2 rounded-2xl glass-surface border border-white/10 text-xs uppercase tracking-[0.2em]">Deactivate</button>
      </article>
    `;
  }

  function bindForm() {
    const form = qs('#code-form');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const session = store.getState().session;
      if (!session?.user) return;
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      try {
        await services.admin.createRedemptionCode({
          code: payload.code,
          rarity: payload.rarity,
          maxRedemptions: Number(payload.maxRedemptions) || null,
          expiresAt: payload.expiresAt || null,
          rewardGold: Number(payload.rewardGold) || 0,
          rewardGems: Number(payload.rewardGems) || 0,
          metadata: payload.metadata ? JSON.parse(payload.metadata) : {}
        });
        form.reset();
      } catch (error) {
        console.error(error);
      }
    });

    container?.addEventListener('click', async (event) => {
      if (event.target.matches('.deactivate-code')) {
        const codeId = event.target.dataset.code;
        await services.admin.deactivateCode(codeId);
      }
    });
  }

  events.on('view:changed', (view) => {
    if (view === 'admin') renderAdmin(store.getState());
  });

  store.subscribe(renderAdmin);

  return {
    init() {
      renderAdmin(store.getState());
    }
  };
}
