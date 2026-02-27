/**
 * Logger utility for environment-aware logging
 * 
 * In development: All logs are shown
 * In production: Only errors are shown, debug/log/warn are suppressed
 * 
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.log('Info message');
 *   logger.error('Error message');
 *   logger.warn('Warning message');
 *   logger.debug('Debug message');
 */

const isDev = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

export const logger = {
  /**
   * Log informational messages (only in development)
   */
  log: (...args: any[]): void => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Log error messages (always shown, even in production)
   */
  error: (...args: any[]): void => {
    console.error(...args);
    // In production, you might want to send errors to an error tracking service
    // if (isProduction) {
    //   // Send to error tracking service (e.g., Sentry, LogRocket)
    // }
  },

  /**
   * Log warning messages (only in development)
   */
  warn: (...args: any[]): void => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Log debug messages (only in development)
   */
  debug: (...args: any[]): void => {
    if (isDev) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Log with a specific level (for programmatic control)
   */
  logWithLevel: (level: 'log' | 'error' | 'warn' | 'debug', ...args: any[]): void => {
    switch (level) {
      case 'log':
        logger.log(...args);
        break;
      case 'error':
        logger.error(...args);
        break;
      case 'warn':
        logger.warn(...args);
        break;
      case 'debug':
        logger.debug(...args);
        break;
    }
  },
};

// Export default for convenience
export default logger;
