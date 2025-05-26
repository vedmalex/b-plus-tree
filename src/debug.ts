// Debug macros that are completely removed in production builds
// This approach uses conditional compilation to eliminate debug code entirely

declare const PRODUCTION: boolean;

// Type-safe debug functions that are eliminated in production
export const DEBUG = {
  log: (message: string, ...args: any[]): void => {
    if (typeof PRODUCTION === 'undefined' || !PRODUCTION) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  warn: (message: string, ...args: any[]): void => {
    if (typeof PRODUCTION === 'undefined' || !PRODUCTION) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  error: (message: string, ...args: any[]): void => {
    // Errors are always logged, even in production
    console.error(`[ERROR] ${message}`, ...args);
  },

  transaction: (message: string, ...args: any[]): void => {
    if (typeof PRODUCTION === 'undefined' || !PRODUCTION) {
      console.log(`[TRANSACTION] ${message}`, ...args);
    }
  },

  performance: (message: string, ...args: any[]): void => {
    if (typeof PRODUCTION === 'undefined' || !PRODUCTION) {
      console.log(`[PERF] ${message}`, ...args);
    }
  },

  // Conditional execution - completely eliminated in production
  ifDev: (fn: () => void): void => {
    if (typeof PRODUCTION === 'undefined' || !PRODUCTION) {
      fn();
    }
  },

  // Expensive debug operations that should be completely eliminated
  trace: (label: string, fn: () => any): any => {
    if (typeof PRODUCTION === 'undefined' || !PRODUCTION) {
      console.time(label);
      const result = fn();
      console.timeEnd(label);
      return result;
    }
    return fn();
  },

  // Debug assertions that are removed in production
  assert: (condition: boolean, message: string): void => {
    if (typeof PRODUCTION === 'undefined' || !PRODUCTION) {
      if (!condition) {
        throw new Error(`[ASSERTION FAILED] ${message}`);
      }
    }
  },

  // Tree structure debugging
  dumpTree: <T, K>(tree: any, label?: string): void => {
    if (typeof PRODUCTION === 'undefined' || !PRODUCTION) {
      console.group(`[TREE DUMP] ${label || 'Tree Structure'}`);
      console.log('Root:', tree.root);
      console.log('Nodes count:', tree.nodes?.size || 0);
      console.log('Tree size:', tree.size);

      if (tree.nodes) {
        for (const [nodeId, node] of tree.nodes) {
          console.log(`Node ${nodeId}:`, {
            keys: node.keys,
            leaf: node.leaf,
            children: node.children,
            parent: node._parent
          });
        }
      }
      console.groupEnd();
    }
  }
};

// Export individual functions for convenience
export const { log, warn, error, transaction, performance, ifDev, trace, assert: debugAssert, dumpTree } = DEBUG;