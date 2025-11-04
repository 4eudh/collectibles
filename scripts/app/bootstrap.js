import { createStore } from '../core/store.js';
import { createEventBus } from '../core/eventBus.js';
import { createModuleRegistry } from '../core/moduleRegistry.js';
import { logger } from '../core/logger.js';
import { APP_VERSION, REALM_THEMES } from '../config.js';
import { attachStoreToElement } from '../core/store.js';
import { qs } from '../utils/dom.js';

import { createSessionService } from '../services/sessionService.js';
import { createProfileService } from '../services/profileService.js';
import { createCollectiblesService } from '../services/collectiblesService.js';
import { createEconomyService } from '../services/economyService.js';
import { createMarketplaceService } from '../services/marketplaceService.js';
import { createEngagementService } from '../services/engagementService.js';
import { createRedeemService } from '../services/redeemService.js';
import { createAdminService } from '../services/adminService.js';
import { createNetworkService } from '../services/networkService.js';

import { createLayoutModule } from './layoutModule.js';
import { createNavigationModule } from './navigationModule.js';
import { createDashboardModule } from './dashboardModule.js';
import { createCollectionModule } from './collectionModule.js';
import { createRedeemModule } from './redeemModule.js';
import { createMarketplaceModule } from './marketplaceModule.js';
import { createQuestModule } from './questModule.js';
import { createAdminModule } from './adminModule.js';

const defaultOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

const initialState = Object.freeze({
  session: null,
  profile: null,
  collectibles: [],
  wallet: null,
  ledger: [],
  achievements: [],
  quests: [],
  seasonalEvents: [],
  marketplaceListings: [],
  marketplaceSuggestions: [],
  marketplaceShowcase: [],
  adminCodes: [],
  ui: {
    activeView: 'dashboard',
    theme: REALM_THEMES.light,
    toasts: [],
    connection: {
      online: defaultOnline,
      supabase: 'checking',
      lastUpdated: new Date().toISOString()
    }
  }
});

export function bootstrapApp() {
  const store = createStore(initialState);
  const events = createEventBus();
  const registry = createModuleRegistry();

  const sessionService = createSessionService(store, events);
  const profileService = createProfileService(store, events);
  const collectiblesService = createCollectiblesService(store, events);
  const economyService = createEconomyService(store, events);
  const marketplaceService = createMarketplaceService(store, events, economyService);
  const engagementService = createEngagementService(store, events, economyService);
  const redeemService = createRedeemService(store, events, collectiblesService, economyService);
  const adminService = createAdminService(store, events);
  const networkService = createNetworkService(store, events);

  const context = {
    store,
    events,
    services: {
      session: sessionService,
      profile: profileService,
      collectibles: collectiblesService,
      economy: economyService,
      marketplace: marketplaceService,
      engagement: engagementService,
      redeem: redeemService,
      admin: adminService,
      network: networkService
    }
  };

  attachStoreToElement(store, document.body);
  initializeFooter();

  networkService.init();

  registry.register('layout', () => createLayoutModule(context));
  registry.register('navigation', () => createNavigationModule(context));
  registry.register('dashboard', () => createDashboardModule(context));
  registry.register('collection', () => createCollectionModule(context));
  registry.register('redeem', () => createRedeemModule(context));
  registry.register('marketplace', () => createMarketplaceModule(context));
  registry.register('quests', () => createQuestModule(context));
  registry.register('admin', () => createAdminModule(context));

  registry.initAll(context).then(async () => {
    logger.log('app', 'Modules initialized');
    await sessionService.hydrate();
  });

  events.on('session:changed', async (session) => {
    if (!session?.user) {
      store.patch({
        profile: null,
        collectibles: [],
        wallet: null,
        ledger: [],
        achievements: [],
        quests: []
      }, { type: 'session:cleared' });
      return;
    }
    const userId = session.user.id;
    await Promise.all([
      profileService.loadProfile(userId),
      collectiblesService.loadCollectibles(userId),
      economyService.loadWallet(userId),
      economyService.loadLedger(userId, 10),
      engagementService.loadAchievements(userId),
      engagementService.ensureQuests(userId),
      engagementService.loadSeasonalSpotlights(),
      marketplaceService.loadMarketplace(userId),
      marketplaceService.loadCuratedShowcase(),
      adminService.loadRedemptionCodes()
    ]);
  });

  events.on('economy:refresh', async () => {
    const session = store.getState().session;
    if (session?.user) {
      await economyService.loadWallet(session.user.id);
      await economyService.loadLedger(session.user.id, 10);
    }
  });

  return context;
}

function initializeFooter() {
  const year = new Date().getFullYear();
  const footerYear = qs('#footer-year');
  const versionLabel = qs('#app-version');
  if (footerYear) footerYear.textContent = year;
  if (versionLabel) versionLabel.textContent = APP_VERSION;
}
