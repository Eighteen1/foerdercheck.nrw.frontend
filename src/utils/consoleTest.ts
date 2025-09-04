/**
 * Test utility to demonstrate console override functionality
 * This file can be removed after testing
 */

import { isDevelopment } from './consoleOverride';

export const testConsoleOverride = () => {
  console.log('=== Console Override Test ===');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Is Development:', isDevelopment);
  console.log('This log should be visible in development but not in production');
  console.warn('This warning should be visible in development but not in production');
  console.error('This error should be visible in development but not in production');
  console.info('This info should be visible in development but not in production');
  console.debug('This debug should be visible in development but not in production');
  console.log('=== End Console Override Test ===');
};
