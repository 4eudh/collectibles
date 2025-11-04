import { qs, render } from '../utils/dom.js';

export function createRedeemModule({ store, services, events }) {
  const container = qs('#view-container');

  function renderRedeem() {
    if (store.getState().ui.activeView !== 'redeem') return;
    const content = `
      <div class="max-w-4xl mx-auto glass-surface border-gradient rounded-3xl p-10 shadow-card">
        <h2 class="text-3xl font-display font-semibold text-white">Redeem a Code</h2>
        <p class="mt-2 text-slate-400">Enter a realm code to unlock new collectibles, gold, and gems instantly.</p>
        <form id="redeem-form" class="mt-8 grid gap-6">
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2" for="redeem-code">Realm Code</label>
            <input id="redeem-code" name="code" required maxlength="32" placeholder="ABC-123-XYZ" class="w-full px-5 py-4 rounded-2xl glass-surface border border-white/10 focus:border-aurora outline-none uppercase tracking-[0.3em]" />
          </div>
          <button type="submit" class="px-5 py-4 rounded-2xl bg-gradient-to-r from-nebula via-starlight to-aurora text-obsidian font-semibold shadow-glow">Redeem Now</button>
        </form>
        <div id="redeem-feedback" class="mt-6 text-sm text-slate-300"></div>
      </div>
    `;
    render(container, content);
    bindForm();
  }

  function bindForm() {
    const form = qs('#redeem-form');
    const feedback = qs('#redeem-feedback');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const session = store.getState().session;
      if (!session?.user) {
        feedback.textContent = 'You must be signed in to redeem codes.';
        return;
      }
      const formData = new FormData(form);
      const code = formData.get('code');
      form.classList.add('opacity-70');
      try {
        const reward = await services.redeem.redeemCode(session.user.id, code);
        feedback.textContent = `Success! ${reward?.collectible?.name ?? 'Reward delivered.'}`;
        events.emit('economy:refresh');
        events.emit('redeem:completed', reward);
      } catch (error) {
        feedback.textContent = error.message ?? 'Failed to redeem code.';
      } finally {
        form.classList.remove('opacity-70');
      }
    });
  }

  events.on('view:changed', (view) => {
    if (view === 'redeem') renderRedeem();
  });

  return {
    init() {
      renderRedeem();
    }
  };
}
