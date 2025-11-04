/**
 * Client-side logging utility
 * Automatically disabled in production builds (Vite removes console.log)
 * Can be controlled via environment variable in development
 */

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;
const logLevel = import.meta.env.VITE_LOG_LEVEL?.toLowerCase() || (isDevelopment ? 'debug' : 'error');

const LOG_LEVELS = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4
};

const currentLogLevel = LOG_LEVELS[logLevel] || LOG_LEVELS.error;

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
    if (currentLogLevel >= LOG_LEVELS.debug && isDevelopment) {
      console.log(...args);
    }
  },
  
  // Convenience method
  log: (...args) => logger.info(...args)
};

// In production builds, Vite will remove these anyway
// But this provides a cleaner API and environment-based control
export default logger;

