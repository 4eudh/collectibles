import { logger } from '../core/logger.js';
import { getSupabaseClient } from './supabaseClient.js';

const STATUS = {
  CONNECTED: 'connected',
  CHECKING: 'checking',
  ERROR: 'error',
  OFFLINE: 'offline',
  UNKNOWN: 'unknown',
  AUTH_ONLY: 'auth-only'
};

function timestamp() {
  return new Date().toISOString();
}

export function createNetworkService(store, events) {
  let supabase;

  function ensureClient() {
    if (supabase) return supabase;
    try {
      supabase = getSupabaseClient();
      return supabase;
    } catch (error) {
      logger.debug('network', 'Supabase client not yet available for health checks', error);
      return null;
    }
  }

  function updateConnection(patch, context) {
    store.update((state) => ({
      ui: {
        ...state.ui,
        connection: {
          ...(state.ui?.connection ?? {}),
          ...patch,
          lastUpdated: timestamp()
        }
      }
    }), context ?? { type: 'ui:connection' });
    events.emit('network:status', store.getState().ui.connection);
  }

  function handleOnline() {
    updateConnection({ online: true }, { type: 'network:online' });
  }

  function handleOffline() {
    updateConnection({ online: false, supabase: STATUS.OFFLINE }, { type: 'network:offline' });
  }

  events.on('session:changed', (session) => {
    updateConnection({ supabase: session ? STATUS.CONNECTED : STATUS.AUTH_ONLY }, { type: 'network:supabase_session' });
  });

  events.on('supabase:error', () => {
    updateConnection({ supabase: STATUS.ERROR }, { type: 'network:supabase_error' });
  });

  function bindBrowserEvents() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  async function pingSupabase() {
    const client = ensureClient();
    if (!client) {
      updateConnection({ supabase: STATUS.UNKNOWN }, { type: 'network:ping_skipped' });
      return false;
    }

    updateConnection({ supabase: STATUS.CHECKING }, { type: 'network:ping_start' });
    try {
      const { error } = await client
        .from('app_health')
        .select('status')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      updateConnection({ supabase: STATUS.CONNECTED }, { type: 'network:ping_success' });
      return true;
    } catch (error) {
      logger.warn('network', 'Supabase health check failed', error);
      updateConnection({ supabase: STATUS.ERROR }, { type: 'network:ping_error' });
      events.emit('network:supabase_error', error);
      return false;
    }
  }

  function init() {
    bindBrowserEvents();
    if (typeof navigator !== 'undefined') {
      updateConnection({ online: navigator.onLine }, { type: 'network:init' });
    }
    pingSupabase();
  }

  return { init, pingSupabase };
}

export const networkStatus = STATUS;
