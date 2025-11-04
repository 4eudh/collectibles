import { bootstrapApp } from './app/bootstrap.js';
import { logger } from './core/logger.js';

async function loadLocalConfig() {
  try {
    const module = await import('./config.local.js');
    const overrides = module?.default ?? module?.CONFIG ?? null;

    if (overrides && typeof overrides === 'object') {
      const existing = window.__COLLECTIBLE_REALM_CONFIG ?? {};
      window.__COLLECTIBLE_REALM_CONFIG = {
        ...existing,
        ...overrides
      };
      logger.log('config', 'Loaded local configuration overrides');
    }
  } catch (error) {
    const message = error?.message ?? '';

    if (error?.code === 'ERR_MODULE_NOT_FOUND' || message.includes('Cannot find module') || message.includes('Failed to fetch dynamically imported module')) {
      if (window.__COLLECTIBLE_REALM_CONFIG) {
        logger.debug('config', 'Using inline configuration overrides');
      } else {
        logger.debug('config', 'No local configuration overrides detected');
      }
      return;
    }

    logger.warn('config', 'Failed to load local configuration overrides', error);
  }
}

(async () => {
  try {
    await loadLocalConfig();

    const context = bootstrapApp();
    window.__COLLECTIBLE_REALM__ = {
      context,
      logger
    };
  } catch (error) {
    logger.error('app', 'Failed to initialize application', error);
  }
})();
