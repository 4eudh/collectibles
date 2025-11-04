import { qs, render } from '../utils/dom.js';
import { REALM_THEMES } from '../config.js';

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

  function updateConnectionState(isConnected) {
    if (!statusPill) return;
    statusPill.textContent = isConnected ? 'Connected' : 'Disconnected';
    statusPill.className = `glass-surface border rounded-full px-3 py-1 ${isConnected ? 'border-emerald-400/60 text-emerald-200' : 'border-white/10 text-slate-400'}`;
  }

  store.subscribe((state) => {
    if (!state.session) {
      render(container, '<div class="max-w-7xl mx-auto text-center py-24 text-slate-500">Sign in to begin your journey.</div>');
    }
  });

  events.on('session:changed', (session) => {
    updateConnectionState(Boolean(session));
  });

  return {
    init() {
      restoreTheme();
      themeToggle?.addEventListener('click', handleThemeToggle);
    }
  };
}
