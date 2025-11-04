export const SUPABASE_CONFIG = {
  url: window.__COLLECTIBLE_REALM_CONFIG?.supabaseUrl ?? 'https://your-project.supabase.co',
  anonKey: window.__COLLECTIBLE_REALM_CONFIG?.supabaseAnonKey ?? 'public-anon-key'
};

export const APP_VERSION = '2.0.0';

export const FEATURE_FLAGS = {
  enableMarketplace: true,
  enableQuests: true,
  enableAchievements: true,
  enableCommandPalette: true,
  enableEconomy: true,
  enableSeasonalEvents: true,
  enableRealtimeActivity: false
};

export const UI_COPY = {
  dashboard: {
    welcomeTitle: 'Welcome back to the Realm',
    welcomeSubtitle: 'Claim quests, redeem codes, and dominate the multiversal marketplace.'
  }
};

export const ECONOMY_RULES = {
  stipendIntervalHours: 24,
  stipendGoldAmount: 500,
  stipendGemAmount: 5,
  duplicateConversion: {
    common: { gold: 25 },
    uncommon: { gold: 45 },
    rare: { gold: 90, gems: 1 },
    epic: { gold: 180, gems: 3 },
    legendary: { gold: 350, gems: 6 },
    mythic: { gold: 600, gems: 10 }
  },
  marketplaceFeePercent: 3
};

export const MARKETPLACE_FILTERS = {
  rarities: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'],
  sortOptions: [
    { id: 'newest', label: 'Newest' },
    { id: 'priceAsc', label: 'Price: Low to High' },
    { id: 'priceDesc', label: 'Price: High to Low' },
    { id: 'rarity', label: 'Rarity' }
  ]
};

export const QUEST_RULES = {
  maxActiveQuests: 3,
  questTypes: ['redeem', 'collect', 'marketplace', 'login'],
  refreshHourUTC: 4
};

export const REALM_THEMES = {
  light: 'light',
  dark: 'dark'
};
