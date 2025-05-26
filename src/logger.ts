// Centralized logging system with conditional output
export class Logger {
  private static readonly isDebugEnabled = process.env.NODE_ENV === 'development' || process.env.DEBUG_BTREE === 'true';
  private static readonly isVerboseEnabled = process.env.VERBOSE_BTREE === 'true';

  static debug(message: string, ...args: any[]): void {
    if (this.isDebugEnabled) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  static warn(message: string, ...args: any[]): void {
    // Warnings are always logged, like errors
    console.warn(`[WARN] ${message}`, ...args);
  }

  static error(message: string, ...args: any[]): void {
    // Errors are always logged
    console.error(`[ERROR] ${message}`, ...args);
  }

  static verbose(message: string, ...args: any[]): void {
    if (this.isVerboseEnabled) {
      console.log(`[VERBOSE] ${message}`, ...args);
    }
  }

  static transaction(message: string, ...args: any[]): void {
    if (this.isDebugEnabled) {
      console.log(`[TRANSACTION] ${message}`, ...args);
    }
  }

  static performance(message: string, ...args: any[]): void {
    if (this.isDebugEnabled) {
      console.log(`[PERF] ${message}`, ...args);
    }
  }

  // Helper method to conditionally execute expensive logging operations
  static ifDebug(fn: () => void): void {
    if (this.isDebugEnabled) {
      fn();
    }
  }

  static ifVerbose(fn: () => void): void {
    if (this.isVerboseEnabled) {
      fn();
    }
  }
}

// Export convenience functions
export const debug = Logger.debug.bind(Logger);
export const warn = Logger.warn.bind(Logger);
export const error = Logger.error.bind(Logger);
export const verbose = Logger.verbose.bind(Logger);
export const transaction = Logger.transaction.bind(Logger);
export const performance = Logger.performance.bind(Logger);
export const ifDebug = Logger.ifDebug.bind(Logger);
export const ifVerbose = Logger.ifVerbose.bind(Logger);