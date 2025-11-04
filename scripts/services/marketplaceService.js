import { getSupabaseClient } from './supabaseClient.js';
import { logger } from '../core/logger.js';
import { FEATURE_FLAGS } from '../config.js';
import { getUTCNow } from '../utils/time.js';

export function createMarketplaceService(store, events, economyService) {
  const supabase = getSupabaseClient();

  async function loadMarketplace(userId) {
    if (!FEATURE_FLAGS.enableMarketplace) return { listings: [], suggestions: [] };
    const { data: listings, error } = await supabase
      .from('marketplace_listings')
      .select('*, collectible:collectibles(*), seller:user_profiles!inner(username, flair_title)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) {
      logger.error('marketplace', 'Failed to load listings', error);
      events.emit('supabase:error', { scope: 'marketplace', action: 'loadMarketplace', error });
      throw error;
    }
    store.patch({ marketplaceListings: listings }, { type: 'marketplace:listings' });
    const suggestions = buildSuggestions(listings, userId);
    store.patch({ marketplaceSuggestions: suggestions }, { type: 'marketplace:suggestions' });
    return { listings, suggestions };
  }

  function buildSuggestions(listings, userId) {
    return listings
      .filter((listing) => listing.seller_id !== userId)
      .slice(0, 6)
      .map((listing) => ({
        id: listing.id,
        title: listing.collectible?.name ?? 'Collectible',
        rarity: listing.collectible?.rarity,
        price_gold: listing.price_gold,
        price_gems: listing.price_gems,
        seller: listing.seller?.username ?? 'Collector'
      }));
  }

  async function createListing({ userId, collectibleId, priceGold, priceGems, expiresAt }) {
    const { data, error } = await supabase
      .from('marketplace_listings')
      .insert({
        seller_id: userId,
        collectible_id: collectibleId,
        price_gold: priceGold,
        price_gems: priceGems,
        status: 'active',
        expires_at: expiresAt ?? null
      })
      .select('*, collectible:collectibles(*), seller:user_profiles(username, flair_title)')
      .single();
    if (error) {
      logger.error('marketplace', 'Failed to create listing', error);
      events.emit('supabase:error', { scope: 'marketplace', action: 'createListing', error });
      throw error;
    }
    store.update((prev) => ({
      marketplaceListings: [data, ...(prev.marketplaceListings ?? [])]
    }), { type: 'marketplace:created' });
    return data;
  }

  async function purchaseListing({ listingId, buyerId }) {
    const { data: listing, error } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('id', listingId)
      .single();
    if (error || !listing) {
      const loadError = error ?? new Error('Listing missing');
      logger.error('marketplace', 'Failed to load listing for purchase', loadError);
      events.emit('supabase:error', { scope: 'marketplace', action: 'loadListingForPurchase', error: loadError });
      throw (error ?? new Error('Listing no longer available'));
    }
    await economyService.applyMarketplacePurchase(buyerId, {
      goldCost: listing.price_gold,
      gemCost: listing.price_gems,
      listingId
    });
    const { error: updateError } = await supabase
      .from('marketplace_listings')
      .update({ status: 'sold', buyer_id: buyerId, sold_at: getUTCNow() })
      .eq('id', listingId);
    if (updateError) {
      logger.error('marketplace', 'Failed to complete purchase', updateError);
      events.emit('supabase:error', { scope: 'marketplace', action: 'completePurchase', error: updateError });
      throw updateError;
    }
    const { error: transactionError } = await supabase.from('marketplace_transactions').insert({
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: listing.seller_id,
      price_gold: listing.price_gold,
      price_gems: listing.price_gems,
      completed_at: getUTCNow()
    });
    if (transactionError) {
      logger.error('marketplace', 'Failed to log marketplace transaction', transactionError);
      events.emit('supabase:error', { scope: 'marketplace', action: 'logTransaction', error: transactionError });
    }
    events.emit('marketplace:purchased', { listingId, buyerId });
    await loadMarketplace(buyerId);
    return listing;
  }

  async function loadCuratedShowcase() {
    const { data, error } = await supabase
      .from('marketplace_showcase')
      .select('*, collectible:collectibles(*)')
      .order('priority', { ascending: true });
    if (error) {
      logger.error('marketplace', 'Failed to load showcase', error);
      events.emit('supabase:error', { scope: 'marketplace', action: 'loadCuratedShowcase', error });
      throw error;
    }
    store.patch({ marketplaceShowcase: data }, { type: 'marketplace:showcase' });
    return data;
  }

  return { loadMarketplace, createListing, purchaseListing, loadCuratedShowcase };
}
