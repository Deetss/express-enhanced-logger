import { EnhancedLogger } from './logger.js';
import { LoggerConfig, QueryLogData, RequestLogData, PrismaClientLike } from './types.js';
import { DEFAULT_CONFIG } from './utils.js';
import { measure } from './context.js';

// Export main class and types
export { EnhancedLogger };
export type { LoggerConfig, QueryLogData, RequestLogData, PrismaClientLike };

// Export measure helper and context utilities
export { measure };
export { getContext, incrementDbDuration, setCallerLocation, getCallerLocation, clearCallerLocation } from './context.js';

// Export Prisma extension for caller location tracking
export { createPrismaExtension } from './prismaExtension.js';

// Export controller helpers for Rails-style organization
export { controllerAction, createController, BaseController } from './controllerHelpers.js';

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
 * Convenience function to get the request logger middleware from the default logger
 * @returns Express middleware function
 */
export function requestLogger() {
  return getLogger().requestLogger;
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

/**
 * Setup Prisma logging integration with the default logger
 * @param prismaClient Prisma client instance with $on method
 * @example
 * ```typescript
 * import { PrismaClient } from '@prisma/client';
 * import { setupPrismaLogging } from 'express-enhanced-logger';
 * 
 * const prismaClient = new PrismaClient({
 *   log: [
 *     { emit: 'event', level: 'query' },
 *     { emit: 'event', level: 'info' },
 *     { emit: 'event', level: 'warn' },
 *     { emit: 'event', level: 'error' }
 *   ]
 * });
 * 
 * setupPrismaLogging(prismaClient);
 * ```
 */
export function setupPrismaLogging(prismaClient: PrismaClientLike) {
  getLogger().setupPrismaLogging(prismaClient);
}

// Export default configuration for reference
export { DEFAULT_CONFIG };

// Export default logger instance
export default getLogger;
