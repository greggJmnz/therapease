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

const logger = {
  error: (...args) => {
    if (currentLogLevel >= LOG_LEVELS.error) {
      console.error(...args);
    }
  },
  
  warn: (...args) => {
    if (currentLogLevel >= LOG_LEVELS.warn) {
      console.warn(...args);
    }
  },
  
  info: (...args) => {
    if (currentLogLevel >= LOG_LEVELS.info) {
      console.log(...args);
    }
  },
  
  debug: (...args) => {
    if (currentLogLevel >= LOG_LEVELS.debug) {
      console.log(...args);
    }
  },
  
  // Convenience methods for common patterns
  log: (...args) => logger.info(...args),
  
  // Server startup messages (always shown unless silent)
  startup: (...args) => {
    if (currentLogLevel >= LOG_LEVELS.info) {
      console.log(...args);
    }
  }
};

module.exports = logger;

