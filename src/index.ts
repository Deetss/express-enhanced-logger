import { EnhancedLogger } from './logger.js';
import { LoggerConfig, QueryLogData, RequestLogData } from './types.js';
import { DEFAULT_CONFIG } from './utils.js';

// Export main class and types
export { EnhancedLogger };
export type { LoggerConfig, QueryLogData, RequestLogData };

// Create a default logger instance
let defaultLogger: EnhancedLogger | null = null;

/**
 * Create and configure the default logger instance
 * @param config Logger configuration options
 * @returns EnhancedLogger instance
 */
export function createLogger(config: LoggerConfig = {}): EnhancedLogger {
  defaultLogger = new EnhancedLogger(config);
  return defaultLogger;
}

/**
 * Get the default logger instance (creates one with default config if none exists)
 * @returns EnhancedLogger instance
 */
export function getLogger(): EnhancedLogger {
  if (!defaultLogger) {
    defaultLogger = new EnhancedLogger();
  }
  return defaultLogger;
}

/**
 * Convenience function to get the request logger middleware
 * @param config Optional logger configuration
 * @returns Express middleware function
 */
export function requestLogger(config?: LoggerConfig) {
  const logger = config ? new EnhancedLogger(config) : getLogger();
  return logger.requestLogger;
}

/**
 * Log an error message
 * @param message Error message or object
 * @param meta Optional metadata
 */
export function error(message: string | Record<string, unknown>, meta?: Record<string, unknown>) {
  getLogger().error(message, meta);
}

/**
 * Log a warning message
 * @param message Warning message or object
 * @param meta Optional metadata
 */
export function warn(message: string | Record<string, unknown>, meta?: Record<string, unknown>) {
  getLogger().warn(message, meta);
}

/**
 * Log an info message
 * @param message Info message or object
 * @param meta Optional metadata
 */
export function info(message: string | Record<string, unknown>, meta?: Record<string, unknown>) {
  getLogger().info(message, meta);
}

/**
 * Log a debug message
 * @param message Debug message or object
 * @param meta Optional metadata
 */
export function debug(message: string | Record<string, unknown>, meta?: Record<string, unknown>) {
  getLogger().debug(message, meta);
}

/**
 * Log a SQL query (requires Prisma integration enabled)
 * @param data Query log data
 */
export function query(data: QueryLogData) {
  getLogger().query(data);
}

// Export default configuration for reference
export { DEFAULT_CONFIG };

// Export default logger instance
export default getLogger;