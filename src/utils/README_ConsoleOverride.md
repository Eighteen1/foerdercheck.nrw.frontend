# Console Override Utility

This utility provides a global solution to disable console logs in production while keeping them visible in development mode.

## Features

- **Automatic Environment Detection**: Uses `process.env.NODE_ENV` to determine if running in development or production
- **Configurable Production Behavior**: Choose which console methods to keep in production
- **No Code Changes Required**: Works with existing `console.log()` statements throughout your codebase
- **Easy Testing**: Includes utilities to test and restore console functionality

## Usage

The console override is automatically set up when the app starts (in `index.tsx`). No additional configuration is needed for basic usage.

### Default Behavior

- **Development**: All console methods work normally
- **Production**: 
  - `console.error()` - **Enabled** (recommended for debugging)
  - `console.log()`, `console.warn()`, `console.info()`, `console.debug()` - **Disabled**
  - All other console methods (trace, group, table, etc.) - **Disabled**

### Customizing Production Behavior

You can modify which console methods are enabled in production by updating the `PRODUCTION_CONFIG` object in `consoleOverride.ts`:

```typescript
const PRODUCTION_CONFIG = {
  keepErrors: true,    // Keep console.error in production
  keepWarnings: false, // Disable console.warn in production
  keepInfo: false,     // Disable console.info in production
  keepDebug: false,    // Disable console.debug in production
  keepLogs: false,     // Disable console.log in production
};
```

### Runtime Configuration

You can also update the configuration at runtime:

```typescript
import { updateProductionConfig } from './utils/consoleOverride';

// Enable warnings in production
updateProductionConfig({ keepWarnings: true });
```

### Testing

Use the test utility to verify the console override is working:

```typescript
import { testConsoleOverride } from './utils/consoleTest';

// Call this in your app to test console behavior
testConsoleOverride();
```

### Restoring Console (for testing)

If you need to restore the original console methods:

```typescript
import { restoreConsole } from './utils/consoleOverride';

restoreConsole();
```

## How It Works

1. The utility stores references to all original console methods
2. When `setupConsoleOverride()` is called, it checks the environment
3. In production, it replaces console methods with no-op functions based on configuration
4. In development, it leaves console methods unchanged
5. The override is applied globally, affecting all console statements in your app

## Benefits

- **Performance**: Eliminates console overhead in production
- **Security**: Prevents sensitive information from being logged in production
- **Clean Production**: Users won't see debug information in the browser console
- **Zero Maintenance**: No need to remove or modify existing console statements
- **Flexible**: Easy to configure which logs to keep in production

## Files

- `consoleOverride.ts` - Main utility with configuration and override logic
- `consoleTest.ts` - Test utility (can be removed after testing)
- `README_ConsoleOverride.md` - This documentation file
