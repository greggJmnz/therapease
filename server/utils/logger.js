/**
 * Environment-based logging utility
 * Controls log verbosity based on LOG_LEVEL environment variable
 * 
 * LOG_LEVEL options:
 * - 'error': Only errors
 * - 'warn': Errors and warnings
 * - 'info': Errors, warnings, and info (default in production)
 * - 'debug': All logs (development only)
 * - 'silent': No logs
 */

const LOG_LEVELS = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4
};

const getLogLevel = () => {
  const envLevel = (process.env.LOG_LEVEL || '').toLowerCase();
  if (envLevel in LOG_LEVELS) {
    return LOG_LEVELS[envLevel];
  }
  
  // Default based on environment
  if (process.env.NODE_ENV === 'production') {
    return LOG_LEVELS.info; // Production: info level by default
  }
  return LOG_LEVELS.debug; // Development: debug level
};

const currentLogLevel = getLogLevel();

const writeLog = (level, args) => {
  if (currentLogLevel < LOG_LEVELS[level]) {
    return;
  }

  const [message, meta] = args;
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message: typeof message === 'string' ? message : JSON.stringify(message)
  };

  if (meta !== undefined) {
    payload.meta = meta;
  }

  const output = JSON.stringify(payload);

  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
};

const logger = {
  error: (...args) => writeLog('error', args),
  
  warn: (...args) => writeLog('warn', args),
  
  info: (...args) => writeLog('info', args),
  
  debug: (...args) => writeLog('debug', args),
  
  // Convenience methods for common patterns
  log: (...args) => logger.info(...args),
  
  // Server startup messages (always shown unless silent)
  startup: (...args) => writeLog('info', args)
};

module.exports = logger;

