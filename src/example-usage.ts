// Example of how to use the new logging systems

import { debug, warn, transaction } from './logger';
import { log, ifDev, trace, debugAssert, dumpTree } from './debug';

// Example function showing different logging approaches
export function exampleFunction() {
  // Approach 1: Environment-based logging (runtime check)
  // These logs will be executed but output nothing in production
  debug('This is a debug message that respects NODE_ENV');
  warn('This is a warning that respects DEBUG_BTREE env var');
  transaction('Transaction started with ID: tx-123');

  // Approach 2: Build-time elimination (compile-time removal)
  // These logs are completely removed from production builds
  log('This debug log is eliminated in production builds');

  // Expensive operations that are completely eliminated in production
  ifDev(() => {
    // This entire block is removed in production builds
    const expensiveDebugData = generateExpensiveDebugInfo();
    log('Expensive debug data:', expensiveDebugData);
  });

  // Performance tracing that's eliminated in production
  const result = trace('expensive-operation', () => {
    // Some expensive operation
    return performExpensiveOperation();
  });

  // Debug assertions that are removed in production
  debugAssert(result !== null, 'Result should not be null');

  // Tree dumping for debugging (eliminated in production)
  const tree = { root: 1, nodes: new Map(), size: 10 };
  dumpTree(tree, 'Example Tree State');

  return result;
}

// Helper functions for the example
function generateExpensiveDebugInfo() {
  return { timestamp: Date.now(), memory: process.memoryUsage() };
}

function performExpensiveOperation() {
  return { success: true, data: 'result' };
}

// Usage examples in different environments:

// Development (NODE_ENV !== 'production'):
// - All logs from both systems will be shown
// - DEBUG_BTREE=true enables verbose logging
// - VERBOSE_BTREE=true enables even more detailed logs

// Production (NODE_ENV === 'production'):
// - Logger system: logs are executed but produce no output
// - DEBUG system: logs are completely eliminated from the bundle
// - Result: zero performance impact and smaller bundle size

// Test with different configurations:
// npm run test:debug    # Shows debug logs
// npm run test:verbose  # Shows verbose logs
// npm run test:silent   # No logs (production mode)
// npm run test          # Default behavior