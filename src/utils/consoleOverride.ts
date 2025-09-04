/**
 * Console override utility to disable console logs in production
 * This ensures that console statements are only visible in development mode
 */

const isDevelopment = process.env.NODE_ENV === 'development';

// Configuration for production logging behavior
const PRODUCTION_CONFIG = {
  // Set to true to keep error logs in production (recommended for debugging)
  keepErrors: true,
  // Set to true to keep warnings in production
  keepWarnings: false,
  // Set to true to keep info logs in production
  keepInfo: false,
  // Set to true to keep debug logs in production
  keepDebug: false,
  // Set to true to keep log statements in production
  keepLogs: false,
};

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
  trace: console.trace,
  group: console.group,
  groupEnd: console.groupEnd,
  groupCollapsed: console.groupCollapsed,
  table: console.table,
  time: console.time,
  timeEnd: console.timeEnd,
  timeLog: console.timeLog,
  count: console.count,
  countReset: console.countReset,
  clear: console.clear,
  dir: console.dir,
  dirxml: console.dirxml,
  assert: console.assert
};

// Create no-op functions for production
const noop = () => {};

// Override console methods based on environment
export const setupConsoleOverride = () => {
  if (!isDevelopment) {
    // In production, replace console methods based on configuration
    console.log = PRODUCTION_CONFIG.keepLogs ? originalConsole.log : noop;
    console.warn = PRODUCTION_CONFIG.keepWarnings ? originalConsole.warn : noop;
    console.error = PRODUCTION_CONFIG.keepErrors ? originalConsole.error : noop;
    console.info = PRODUCTION_CONFIG.keepInfo ? originalConsole.info : noop;
    console.debug = PRODUCTION_CONFIG.keepDebug ? originalConsole.debug : noop;
    
    // Always disable these methods in production as they're typically for debugging
    console.trace = noop;
    console.group = noop;
    console.groupEnd = noop;
    console.groupCollapsed = noop;
    console.table = noop;
    console.time = noop;
    console.timeEnd = noop;
    console.timeLog = noop;
    console.count = noop;
    console.countReset = noop;
    console.clear = noop;
    console.dir = noop;
    console.dirxml = noop;
    console.assert = noop;
  }
  // In development, keep original console methods (no override needed)
};

// Function to restore original console methods (useful for testing)
export const restoreConsole = () => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
  console.trace = originalConsole.trace;
  console.group = originalConsole.group;
  console.groupEnd = originalConsole.groupEnd;
  console.groupCollapsed = originalConsole.groupCollapsed;
  console.table = originalConsole.table;
  console.time = originalConsole.time;
  console.timeEnd = originalConsole.timeEnd;
  console.timeLog = originalConsole.timeLog;
  console.count = originalConsole.count;
  console.countReset = originalConsole.countReset;
  console.clear = originalConsole.clear;
  console.dir = originalConsole.dir;
  console.dirxml = originalConsole.dirxml;
  console.assert = originalConsole.assert;
};

// Function to update production configuration
export const updateProductionConfig = (newConfig: Partial<typeof PRODUCTION_CONFIG>) => {
  Object.assign(PRODUCTION_CONFIG, newConfig);
  // Re-apply console override with new configuration
  setupConsoleOverride();
};

// Export environment check for other utilities
export { isDevelopment };
