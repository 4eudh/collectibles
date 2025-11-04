import { qs, render } from '../utils/dom.js';

export function createCollectionModule({ store, services, events }) {
  const container = qs('#view-container');

  function renderCollection(state) {
    if (store.getState().ui.activeView !== 'collection') return;
    const collectibles = state.collectibles ?? [];
    const byRarity = groupByRarity(collectibles);

    const content = `
      <div class="max-w-7xl mx-auto grid gap-8">
        <header class="glass-surface border-gradient rounded-3xl p-8 shadow-card flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 class="text-3xl font-display font-semibold text-white">Your Collection</h2>
            <p class="mt-2 text-slate-400">${collectibles.length} collectibles discovered. Filter by rarity to dive deeper.</p>
          </div>
          <div class="flex gap-3">
            <input id="collection-search" type="search" placeholder="Search collectibles" class="px-4 py-3 rounded-2xl glass-surface border border-white/10" />
            <select id="rarity-filter" class="px-4 py-3 rounded-2xl glass-surface border border-white/10">
              <option value="all">All rarities</option>
              ${Object.keys(byRarity).map((rarity) => `<option value="${rarity}">${rarity}</option>`).join('')}
            </select>
          </div>
        </header>
        <section class="grid md:grid-cols-2 xl:grid-cols-3 gap-6" id="collection-grid">
          ${collectibles.length ? collectibles.map(renderCard).join('') : emptyState()}
        </section>
      </div>
    `;
    render(container, content);
    bindInteractions();
  }

  function bindInteractions() {
    const searchInput = qs('#collection-search');
    const rarityFilter = qs('#rarity-filter');
    if (searchInput) {
      searchInput.addEventListener('input', renderFiltered);
    }
    if (rarityFilter) {
      rarityFilter.addEventListener('change', renderFiltered);
    }
  }

  function renderFiltered() {
    const searchValue = qs('#collection-search')?.value.toLowerCase() ?? '';
    const rarity = qs('#rarity-filter')?.value ?? 'all';
    const state = store.getState();
    const filtered = state.collectibles.filter((item) => {
      const matchesSearch = item.name?.toLowerCase().includes(searchValue) || item.lore?.toLowerCase().includes(searchValue);
      const matchesRarity = rarity === 'all' || item.rarity === rarity;
      return matchesSearch && matchesRarity;
    });
    const grid = qs('#collection-grid');
    if (grid) {
      grid.innerHTML = filtered.length ? filtered.map(renderCard).join('') : emptyState();
    }
  }

  function groupByRarity(list) {
    return list.reduce((acc, item) => {
      const key = item.rarity ?? 'unknown';
      acc[key] = acc[key] ?? [];
      acc[key].push(item);
      return acc;
    }, {});
  }

  function renderCard(item) {
    return `
      <article class="collectible-card glass-surface border-gradient rounded-3xl p-6 shadow-card relative overflow-hidden">
        <div class="absolute inset-0 pointer-events-none opacity-20" style="background-image: radial-gradient(circle at top left, rgba(127,91,255,0.3), transparent), radial-gradient(circle at bottom right, rgba(0,245,160,0.2), transparent);"></div>
        <header class="relative flex items-start justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-slate-400">${item.rarity_label}</p>
            <h3 class="mt-2 text-2xl font-semibold text-white">${item.name}</h3>
          </div>
          <button data-id="${item.acquisition_id}" data-rarity="${item.rarity}" class="convert-duplicate px-3 py-1 text-xs rounded-full border border-white/20">Convert</button>
        </header>
        <p class="relative mt-4 text-sm text-slate-300">${item.lore ?? 'Hidden lore awaits discovery.'}</p>
        <footer class="relative mt-6 flex items-center justify-between text-xs text-slate-400">
          <span>Power: ${item.power_score ?? '—'}</span>
          <span>Serial #${item.serial_number ?? '—'}</span>
        </footer>
      </article>
    `;
  }

  function emptyState() {
    return `<div class="glass-surface border border-dashed border-white/20 rounded-3xl p-12 text-center col-span-full text-slate-400">No collectibles yet. Redeem codes or visit the marketplace.</div>`;
  }

  events.on('view:changed', (view) => {
    if (view === 'collection') {
      renderCollection(store.getState());
    }
  });

  store.subscribe(renderCollection);

  events.on('redeem:completed', () => renderCollection(store.getState()));

  return {
    init() {
      renderCollection(store.getState());
      container?.addEventListener('click', async (event) => {
        if (event.target.matches('.convert-duplicate')) {
          const id = event.target.dataset.id;
          const collectible = store.getState().collectibles.find((item) => String(item.acquisition_id) === String(id));
          if (!collectible) return;
          const session = store.getState().session;
          if (!session?.user) return;
          await services.economy.convertDuplicate(session.user.id, collectible.rarity);
          events.emit('economy:refresh');
        }
      });
    }
  };
}
