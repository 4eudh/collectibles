import { qs, render, formatNumber } from '../utils/dom.js';
import { MARKETPLACE_FILTERS } from '../config.js';

export function createMarketplaceModule({ store, services, events }) {
  const container = qs('#view-container');

  function renderMarketplace(state) {
    if (store.getState().ui.activeView !== 'marketplace') return;
    const listings = state.marketplaceListings ?? [];
    const suggestions = state.marketplaceSuggestions ?? [];
    const wallet = state.wallet ?? { gold_balance: 0, gem_balance: 0 };
    const showcase = state.marketplaceShowcase ?? [];

    const content = `
      <div class="max-w-7xl mx-auto grid gap-10">
        <header class="glass-surface border-gradient rounded-3xl p-8 shadow-card grid lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2">
            <h2 class="text-3xl font-display font-semibold text-white">Marketplace</h2>
            <p class="mt-2 text-slate-400">Trade with the realm. Discover curated spotlights, rare listings, and community offers.</p>
            <div class="mt-6 flex flex-wrap gap-3">
              <span class="glass-surface border border-white/10 rounded-2xl px-4 py-2 text-sm">Gold: ${formatNumber(wallet.gold_balance)}</span>
              <span class="glass-surface border border-white/10 rounded-2xl px-4 py-2 text-sm">Gems: ${formatNumber(wallet.gem_balance)}</span>
            </div>
          </div>
          <div class="space-y-4">
            <select id="marketplace-sort" class="w-full px-4 py-3 rounded-2xl glass-surface border border-white/10">
              ${MARKETPLACE_FILTERS.sortOptions.map((option) => `<option value="${option.id}">${option.label}</option>`).join('')}
            </select>
            <div class="flex flex-wrap gap-2" id="rarity-filters">
              ${MARKETPLACE_FILTERS.rarities.map((rarity) => `<button data-rarity="${rarity}" class="rarity-filter px-3 py-2 rounded-full glass-surface border border-white/10 text-xs uppercase tracking-[0.2em]">${rarity}</button>`).join('')}
            </div>
          </div>
        </header>

        <section class="glass-surface border-gradient rounded-3xl p-8 shadow-card">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-semibold text-white">Curated Showcase</h3>
            <span class="text-sm text-slate-400">Realm approved</span>
          </div>
          <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            ${showcase.length ? showcase.map(renderShowcaseCard).join('') : '<p class="text-slate-400">Curators are preparing a new batch of treasures.</p>'}
          </div>
        </section>

        <section class="grid lg:grid-cols-[2fr_1fr] gap-6">
          <div class="glass-surface border-gradient rounded-3xl p-8 shadow-card">
            <h3 class="text-xl font-semibold text-white mb-6">All Listings</h3>
            <div class="grid md:grid-cols-2 gap-5" id="marketplace-grid">
              ${listings.length ? listings.map(renderListingCard).join('') : '<p class="text-slate-400">No listings yet. Create one to start trading.</p>'}
            </div>
          </div>
          <aside class="glass-surface border-gradient rounded-3xl p-6 shadow-card space-y-5">
            <div>
              <h4 class="text-lg font-semibold text-white">Quick Suggestions</h4>
              <p class="text-xs text-slate-400">Hand picked for you</p>
            </div>
            <div class="space-y-4">
              ${suggestions.length ? suggestions.map(renderSuggestion).join('') : '<p class="text-slate-400 text-sm">Browse listings to generate personalized suggestions.</p>'}
            </div>
          </aside>
        </section>
      </div>
    `;

    render(container, content);
    bindInteractions();
  }

  function renderListingCard(listing) {
    return `
      <article class="glass-surface border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-slate-400">${listing.collectible?.rarity ?? 'Unknown'}</p>
            <h4 class="text-xl font-semibold text-white">${listing.collectible?.name ?? 'Mystery Relic'}</h4>
            <p class="text-xs text-slate-400">Seller: ${listing.seller?.username ?? 'Collector'}</p>
          </div>
          <button data-listing="${listing.id}" class="purchase-listing px-4 py-2 rounded-2xl bg-gradient-to-r from-nebula to-aurora text-obsidian text-sm font-semibold">Purchase</button>
        </div>
        <p class="text-sm text-slate-400">${listing.collectible?.lore ?? 'Lore encrypted by curators.'}</p>
        <div class="flex gap-3 text-sm">
          <span class="glass-surface border border-white/10 rounded-2xl px-3 py-1">${formatNumber(listing.price_gold)} Gold</span>
          <span class="glass-surface border border-white/10 rounded-2xl px-3 py-1">${formatNumber(listing.price_gems)} Gems</span>
        </div>
      </article>
    `;
  }

  function renderSuggestion(suggestion) {
    return `
      <div class="glass-surface border border-white/10 rounded-2xl p-4">
        <p class="text-sm font-semibold text-white">${suggestion.title}</p>
        <p class="text-xs text-slate-400">${formatNumber(suggestion.price_gold)} gold • ${formatNumber(suggestion.price_gems)} gems</p>
        <p class="text-xs text-slate-500">Seller: ${suggestion.seller}</p>
      </div>
    `;
  }

  function renderShowcaseCard(entry) {
    return `
      <article class="glass-surface border border-white/10 rounded-3xl p-6 relative overflow-hidden">
        <div class="absolute inset-0 opacity-20" style="background-image: linear-gradient(120deg, rgba(127,91,255,0.4), rgba(0,245,160,0.2));"></div>
        <div class="relative">
          <p class="text-xs uppercase tracking-[0.3em] text-slate-400">${entry.category}</p>
          <h4 class="mt-2 text-2xl font-semibold text-white">${entry.collectible?.name ?? entry.title}</h4>
          <p class="mt-3 text-sm text-slate-300">${entry.collectible?.lore ?? entry.description ?? 'Curated highlight'}</p>
        </div>
      </article>
    `;
  }

  function bindInteractions() {
    const grid = qs('#marketplace-grid');
    grid?.addEventListener('click', async (event) => {
      if (event.target.matches('.purchase-listing')) {
        const listingId = event.target.dataset.listing;
        const session = store.getState().session;
        if (!session?.user) return;
        event.target.disabled = true;
        try {
          await services.marketplace.purchaseListing({ listingId, buyerId: session.user.id });
          events.emit('economy:refresh');
        } catch (error) {
          console.error(error);
        } finally {
          event.target.disabled = false;
        }
      }
    });
  }

  events.on('view:changed', (view) => {
    if (view === 'marketplace') renderMarketplace(store.getState());
  });

  store.subscribe(renderMarketplace);

  return {
    init() {
      renderMarketplace(store.getState());
    }
  };
}
