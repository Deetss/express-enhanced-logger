import { setCallerLocation } from './context.js';
import { capturePrismaCallerLocation } from './utils.js';

/**
 * Prisma Client Extension for capturing caller location
 * 
 * This extension wraps all Prisma queries to capture the caller location
 * BEFORE the query executes, storing it in AsyncLocalStorage so the
 * logger can access it when the query event fires.
 * 
 * @example
 * ```typescript
 * import { PrismaClient } from '@prisma/client';
 * import { createPrismaExtension, setupPrismaLogging } from 'express-enhanced-logger';
 * 
 * const prisma = new PrismaClient({
 *   log: [
 *     { emit: 'event', level: 'query' },
 *     { emit: 'event', level: 'error' },
 *     { emit: 'event', level: 'info' },
 *     { emit: 'event', level: 'warn' },
 *   ],
 * });
 * 
 * // Apply the extension
 * const extendedPrisma = prisma.$extends(createPrismaExtension());
 * 
 * // Setup logging
 * setupPrismaLogging(prisma);
 * 
 * // Export the extended client
 * export default extendedPrisma;
 * ```
 */
export function createPrismaExtension() {
  return {
    name: 'express-enhanced-logger-caller-capture',
    query: {
      $allModels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async $allOperations({ args, query }: any) {
          // Capture caller location BEFORE query execution
          const location = capturePrismaCallerLocation();
          
          // Store in AsyncLocalStorage for the logger to access
          setCallerLocation(location);
          
          try {
            // Execute the actual query
            const result = await query(args);
            return result;
          } catch (error) {
            // Clear location on error to prevent stale data
            setCallerLocation(null);
            throw error;
          }
        },
      },
    },
  };
}
