import { AsyncLocalStorage } from 'node:async_hooks';
import { performance } from 'node:perf_hooks';

/**
 * Request context stored in AsyncLocalStorage
 * This allows tracking timing information across async boundaries
 * without passing request objects around
 */
export interface RequestContext {
  /** Unique request identifier */
  requestId: string;
  
  /** Request start time in milliseconds (from performance.now()) */
  startTime: number;
  
  /** Accumulated database query duration in milliseconds */
  dbDuration: number;
  
  /** Custom operation durations (e.g., from measure() calls) */
  customDurations: Map<string, number>;
  
  /** Caller location for the current Prisma query (captured before execution) */
  callerLocation?: string;
}

/**
 * Singleton AsyncLocalStorage instance for request context
 * This is safe for concurrent requests - each async chain gets its own context
 */
const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current request context from AsyncLocalStorage
 * Returns undefined if called outside of a request context
 */
export function getContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Run a function within a new request context
 * This should be called by the request logger middleware
 * @param context Initial context to store
 * @param fn Function to execute within the context
 */
export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}

/**
 * Increment the database duration for the current request context
 * This should be called by the Prisma query event handler
 * @param duration Duration in milliseconds to add
 */
export function incrementDbDuration(duration: number): void {
  const context = getContext();
  if (context) {
    context.dbDuration += duration;
  }
}

/**
 * Add a custom operation duration to the current request context
 * This is used by the measure() helper function
 * @param name Name of the operation
 * @param duration Duration in milliseconds
 */
export function addCustomDuration(name: string, duration: number): void {
  const context = getContext();
  if (context) {
    context.customDurations.set(name, duration);
  }
}

/**
 * Get all custom durations for the current request context
 * @returns Map of operation names to durations, or undefined if no context
 */
export function getCustomDurations(): Map<string, number> | undefined {
  const context = getContext();
  return context?.customDurations;
}

/**
 * Set the caller location for the current request context
 * This is used by Prisma extensions to capture where a query was called from
 * @param location The caller location string (e.g., "src/controllers/users.ts:42")
 */
export function setCallerLocation(location: string | null): void {
  const context = getContext();
  if (context) {
    context.callerLocation = location || undefined;
  }
}

/**
 * Get the caller location for the current request context
 * @returns The caller location string, or undefined if not set
 */
export function getCallerLocation(): string | undefined {
  const context = getContext();
  return context?.callerLocation;
}

/**
 * Clear the caller location for the current request context
 * This should be called after logging a query to prevent stale locations
 */
export function clearCallerLocation(): void {
  const context = getContext();
  if (context) {
    context.callerLocation = undefined;
  }
}

/**
 * Measure the execution time of a synchronous or async function
 * Logs the operation duration and optionally stores it in the request context
 * 
 * @param name Name of the operation being measured
 * @param fn Function to execute and measure
 * @param logger Optional logger instance to log the operation (defaults to no logging)
 * @returns The result of executing the function
 * 
 * @example
 * ```typescript
 * import { measure, createLogger } from 'express-enhanced-logger';
 * 
 * const logger = createLogger();
 * 
 * // Measure async operations
 * const users = await measure('Fetching users from database', async () => {
 *   return await prisma.user.findMany();
 * }, logger);
 * 
 * // Measure sync operations
 * const result = measure('Heavy calculation', () => {
 *   return performComplexCalculation();
 * }, logger);
 * ```
 */
export async function measure<T>(
  name: string,
  fn: () => T | Promise<T>,
  logger?: { info: (message: string) => void }
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    // Add to context if available
    addCustomDuration(name, duration);
    
    // Log the operation if logger is provided
    if (logger) {
      logger.info(`  ${name} (Duration: ${duration.toFixed(1)}ms)`);
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    
    // Log error with duration if logger is provided
    if (logger) {
      logger.info(`  ${name} (Duration: ${duration.toFixed(1)}ms) - FAILED`);
    }
    
    throw error;
  }
}
