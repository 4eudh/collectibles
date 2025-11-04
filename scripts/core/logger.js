const history = [];
const MAX_HISTORY = 500;

function pushEntry(level, scope, message, meta, consoleMethod) {
  const entry = { level, scope, message, meta, timestamp: Date.now() };
  history.push(entry);
  if (history.length > MAX_HISTORY) history.shift();
  if (typeof consoleMethod === 'function') {
    consoleMethod.call(console, `[${scope}] ${message}`, meta ?? '');
  }
}

export const logger = {
  log(scope, message, meta) {
    pushEntry('info', scope, message, meta, console.log);
  },
  info(scope, message, meta) {
    pushEntry('info', scope, message, meta, console.info);
  },
  warn(scope, message, meta) {
    pushEntry('warn', scope, message, meta, console.warn);
  },
  debug(scope, message, meta) {
    pushEntry('debug', scope, message, meta, console.debug);
  },
  error(scope, message, meta) {
    pushEntry('error', scope, message, meta, console.error);
  },
  history() {
    return [...history];
  }
};
