import { qs, render } from '../utils/dom.js';
import { REALM_THEMES } from '../config.js';
import { networkStatus } from '../services/networkService.js';

export function createLayoutModule({ store, events }) {
  const container = qs('#view-container');
  const statusPill = qs('#status-pill');
  const themeToggle = qs('#theme-toggle');
  const themeIcon = themeToggle?.querySelector('.theme-icon');

  function applyTheme(theme) {
    document.documentElement.classList.toggle('dark', theme === REALM_THEMES.dark);
    store.update((state) => ({ ui: { ...state.ui, theme } }), { type: 'ui:theme' });
    if (themeIcon) {
      themeIcon.textContent = theme === REALM_THEMES.dark ? '🌙' : '☀️';
    }
  }

  function restoreTheme() {
    const saved = localStorage.getItem('collectible-theme');
    const theme = saved === REALM_THEMES.dark ? REALM_THEMES.dark : REALM_THEMES.light;
    applyTheme(theme);
  }

  function handleThemeToggle() {
    const current = store.getState().ui.theme;
    const next = current === REALM_THEMES.dark ? REALM_THEMES.light : REALM_THEMES.dark;
    localStorage.setItem('collectible-theme', next);
    applyTheme(next);
  }

  function connectionClasses({ online, supabase }) {
    if (!online) {
      return {
        text: 'Offline',
        classes: 'border-rose-400/60 text-rose-200'
      };
    }

    switch (supabase) {
      case networkStatus.CHECKING:
        return {
          text: 'Connecting…',
          classes: 'border-amber-300/60 text-amber-200 animate-pulse'
        };
      case networkStatus.ERROR:
        return {
          text: 'Supabase issues',
          classes: 'border-rose-400/60 text-rose-200'
        };
      case networkStatus.AUTH_ONLY:
        return {
          text: 'Awaiting sign-in',
          classes: 'border-slate-400/60 text-slate-200'
        };
      case networkStatus.CONNECTED:
        return {
          text: 'Connected',
          classes: 'border-emerald-400/60 text-emerald-200'
        };
      case networkStatus.OFFLINE:
        return {
          text: 'Supabase offline',
          classes: 'border-rose-400/60 text-rose-200'
        };
      default:
        return {
          text: 'Status pending',
          classes: 'border-slate-400/60 text-slate-200'
        };
    }
  }

  function updateConnectionPill(connection) {
    if (!statusPill) return;
    const { text, classes } = connectionClasses(connection ?? { online: false, supabase: networkStatus.UNKNOWN });
    statusPill.textContent = text;
    statusPill.className = `glass-surface border rounded-full px-3 py-1 ${classes}`;
  }

  store.subscribe((state) => {
    if (!state.session) {
      render(container, '<div class="max-w-7xl mx-auto text-center py-24 text-slate-500">Sign in to begin your journey.</div>');
    }
    updateConnectionPill(state.ui?.connection);
  });

  events.on('network:status', (connection) => {
    updateConnectionPill(connection);
  });

  return {
    init() {
      restoreTheme();
      themeToggle?.addEventListener('click', handleThemeToggle);
      updateConnectionPill(store.getState().ui.connection);
    }
  };
}
