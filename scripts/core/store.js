const listeners = new WeakMap();

export function createStore(initialState = {}) {
  let state = structuredClone(initialState);
  const subscriptions = new Map();
  let subscriptionId = 0;

  const notify = (patch, context) => {
    for (const [, callback] of subscriptions.entries()) {
      try {
        callback(state, patch, context);
      } catch (error) {
        console.error('Store subscription error', error);
      }
    }
  };

  return {
    getState() {
      return state;
    },
    setState(nextState, context) {
      state = Object.freeze({ ...nextState });
      notify(state, context);
    },
    patch(partial, context) {
      const previous = state;
      state = Object.freeze({ ...state, ...partial });
      notify({ previous, next: state }, context);
    },
    update(updater, context) {
      const previous = state;
      const next = updater(previous);
      state = Object.freeze({ ...previous, ...next });
      notify({ previous, next: state }, context);
    },
    reset() {
      state = Object.freeze(structuredClone(initialState));
      notify(state, { type: 'reset' });
    },
    subscribe(callback) {
      const id = ++subscriptionId;
      subscriptions.set(id, callback);
      callback(state, { next: state }, { type: 'hydrate' });
      return () => subscriptions.delete(id);
    },
    derive(selector, onChange) {
      let prevValue = selector(state);
      const unsubscribe = this.subscribe((nextState) => {
        const nextValue = selector(nextState);
        if (Object.is(prevValue, nextValue)) return;
        prevValue = nextValue;
        onChange(nextValue, nextState);
      });
      return unsubscribe;
    }
  };
}

export function attachStoreToElement(store, element) {
  if (!element) return () => {};
  listeners.set(element, store);
  return () => listeners.delete(element);
}

export function getStoreFromElement(element) {
  return listeners.get(element);
}
