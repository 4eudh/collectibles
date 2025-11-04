const history = [];
const MAX_HISTORY = 500;

export const logger = {
  log(scope, message, meta) {
    const entry = { level: 'info', scope, message, meta, timestamp: Date.now() };
    history.push(entry);
    if (history.length > MAX_HISTORY) history.shift();
    console.log(`[${scope}] ${message}`, meta ?? '');
  },
  error(scope, message, meta) {
    const entry = { level: 'error', scope, message, meta, timestamp: Date.now() };
    history.push(entry);
    if (history.length > MAX_HISTORY) history.shift();
    console.error(`[${scope}] ${message}`, meta ?? '');
  },
  history() {
    return [...history];
  }
};
