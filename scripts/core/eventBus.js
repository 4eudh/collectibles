export function createEventBus() {
  const listeners = new Map();

  return {
    on(event, handler) {
      const existing = listeners.get(event) ?? new Set();
      existing.add(handler);
      listeners.set(event, existing);
      return () => {
        existing.delete(handler);
      };
    },
    once(event, handler) {
      const off = this.on(event, (...args) => {
        off();
        handler(...args);
      });
      return off;
    },
    emit(event, payload) {
      const handlers = listeners.get(event);
      if (!handlers) return;
      for (const handler of handlers) {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Event handler for ${event} failed`, error);
        }
      }
    },
    clear(event) {
      if (event) listeners.delete(event);
      else listeners.clear();
    }
  };
}
