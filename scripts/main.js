import { bootstrapApp } from './app/bootstrap.js';
import { logger } from './core/logger.js';

try {
  const context = bootstrapApp();
  window.__COLLECTIBLE_REALM__ = {
    context,
    logger
  };
} catch (error) {
  logger.error('app', 'Failed to initialize application', error);
}
