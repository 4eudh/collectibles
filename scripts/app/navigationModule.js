import { qsa } from '../utils/dom.js';

export function createNavigationModule({ store, events }) {
  const navButtons = qsa('.nav-link');

  function activateButton(targetView) {
    navButtons.forEach((button) => {
      const isActive = button.dataset.nav === targetView;
      button.classList.toggle('bg-white/50', isActive);
      button.classList.toggle('dark:bg-white/10', isActive);
      button.classList.toggle('text-obsidian', isActive);
      button.classList.toggle('dark:text-white', isActive);
    });
  }

  function handleNavigation(event) {
    const view = event.currentTarget.dataset.nav;
    store.update((state) => ({ ui: { ...state.ui, activeView: view } }), { type: 'ui:view' });
    events.emit('view:changed', view);
    activateButton(view);
  }

  return {
    init() {
      navButtons.forEach((button) => button.addEventListener('click', handleNavigation));
      document.body.addEventListener('click', (event) => {
        const target = event.target.closest('[data-nav]');
        if (!target) return;
        if (navButtons.includes(target)) return; // already handled
        const view = target.dataset.nav;
        store.update((state) => ({ ui: { ...state.ui, activeView: view } }), { type: 'ui:view' });
        events.emit('view:changed', view);
        activateButton(view);
      });
      const currentView = store.getState().ui.activeView;
      activateButton(currentView);
      events.emit('view:changed', currentView);
    }
  };
}
