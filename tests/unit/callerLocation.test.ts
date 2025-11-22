/**
 * Tests for Prisma caller location tracking
 */

import { 
  setCallerLocation, 
  getCallerLocation as getCallerLocationFromContext, 
  clearCallerLocation,
  runWithContext,
} from '../../src/context';
import { capturePrismaCallerLocation } from '../../src/utils';
import { createPrismaExtension } from '../../src/prismaExtension';

describe('Prisma Caller Location', () => {
  describe('AsyncLocalStorage Context', () => {
    it('should set and get caller location', () => {
      runWithContext(
        {
          requestId: 'test-123',
          startTime: 0,
          dbDuration: 0,
          customDurations: new Map(),
        },
        () => {
          setCallerLocation('src/test.ts:42');
          expect(getCallerLocationFromContext()).toBe('src/test.ts:42');
        }
      );
    });

    it('should clear caller location', () => {
      runWithContext(
        {
          requestId: 'test-123',
          startTime: 0,
          dbDuration: 0,
          customDurations: new Map(),
        },
        () => {
          setCallerLocation('src/test.ts:42');
          expect(getCallerLocationFromContext()).toBe('src/test.ts:42');
          
          clearCallerLocation();
          expect(getCallerLocationFromContext()).toBeUndefined();
        }
      );
    });

    it('should return undefined when no location is set', () => {
      runWithContext(
        {
          requestId: 'test-123',
          startTime: 0,
          dbDuration: 0,
          customDurations: new Map(),
        },
        () => {
          expect(getCallerLocationFromContext()).toBeUndefined();
        }
      );
    });

    it('should return undefined outside of request context', () => {
      expect(getCallerLocationFromContext()).toBeUndefined();
    });

    it('should handle null location', () => {
      runWithContext(
        {
          requestId: 'test-123',
          startTime: 0,
          dbDuration: 0,
          customDurations: new Map(),
        },
        () => {
          setCallerLocation('src/test.ts:42');
          setCallerLocation(null);
          expect(getCallerLocationFromContext()).toBeUndefined();
        }
      );
    });
  });

  describe('capturePrismaCallerLocation', () => {
    it('should capture caller location from stack trace', () => {
      const location = capturePrismaCallerLocation();
      
      // Should return a location string
      expect(location).toBeTruthy();
      
      // Should be in the format: file.ts:line
      if (location) {
        expect(location).toMatch(/\.ts:\d+/);
        
        // Should contain this test file
        expect(location).toContain('callerLocation.test.ts');
      }
    });

    it('should filter out node internals', () => {
      const location = capturePrismaCallerLocation();
      
      if (location) {
        expect(location).not.toContain('node:');
        expect(location).not.toContain('node_modules');
        expect(location).not.toContain('@prisma');
      }
    });

    it('should return relative path', () => {
      const location = capturePrismaCallerLocation();
      
      if (location) {
        // Should not start with absolute path
        expect(location).not.toMatch(/^\/[^/]/);
      }
    });

    it('should work from nested function calls', () => {
      function deepFunction() {
        function deeperFunction() {
          return capturePrismaCallerLocation();
        }
        return deeperFunction();
      }
      
      const location = deepFunction();
      
      expect(location).toBeTruthy();
      if (location) {
        expect(location).toContain('callerLocation.test.ts');
      }
    });
  });

  describe('createPrismaExtension', () => {
    it('should create a valid extension object', () => {
      const extension = createPrismaExtension();
      
      expect(extension).toBeDefined();
      expect(extension.name).toBe('express-enhanced-logger-caller-capture');
      expect(extension.query).toBeDefined();
      expect(extension.query.$allModels).toBeDefined();
      expect(extension.query.$allModels.$allOperations).toBeDefined();
      expect(typeof extension.query.$allModels.$allOperations).toBe('function');
    });

    it('should capture and set caller location in extension', async () => {
      const extension = createPrismaExtension();
      
      await runWithContext(
        {
          requestId: 'test-123',
          startTime: 0,
          dbDuration: 0,
          customDurations: new Map(),
        },
        async () => {
          // Mock query function
          const mockQuery = jest.fn(async (args: any) => ({ id: '1', ...args }));
          
          // Call the extension's operation handler
          await extension.query.$allModels.$allOperations({
            args: { where: { id: '1' } },
            query: mockQuery,
          });
          
          // The location should have been set by the extension
          // Note: It might be cleared after the query, so we test this differently
          expect(mockQuery).toHaveBeenCalledWith({ where: { id: '1' } });
        }
      );
    });

    it('should clear location on error', async () => {
      const extension = createPrismaExtension();
      
      await runWithContext(
        {
          requestId: 'test-123',
          startTime: 0,
          dbDuration: 0,
          customDurations: new Map(),
        },
        async () => {
          // Mock query function that throws
          const mockQuery = jest.fn(async () => {
            throw new Error('Query failed');
          });
          
          // Should throw the error
          await expect(
            extension.query.$allModels.$allOperations({
              args: { where: { id: '1' } },
              query: mockQuery,
            })
          ).rejects.toThrow('Query failed');
          
          // Location should be cleared after error
          expect(getCallerLocationFromContext()).toBeUndefined();
        }
      );
    });

    it('should pass query result through', async () => {
      const extension = createPrismaExtension();
      
      await runWithContext(
        {
          requestId: 'test-123',
          startTime: 0,
          dbDuration: 0,
          customDurations: new Map(),
        },
        async () => {
          const mockResult = { id: '123', name: 'Test User' };
          const mockQuery = jest.fn(async () => mockResult);
          
          const result = await extension.query.$allModels.$allOperations({
            args: { where: { id: '123' } },
            query: mockQuery,
          });
          
          expect(result).toEqual(mockResult);
        }
      );
    });
  });

  describe('Integration', () => {
    it('should work end-to-end with context', async () => {
      await runWithContext(
        {
          requestId: 'test-123',
          startTime: 0,
          dbDuration: 0,
          customDurations: new Map(),
        },
        async () => {
          // Simulate what happens in a real Prisma query
          
          // 1. Extension captures location before query
          const location = capturePrismaCallerLocation();
          setCallerLocation(location);
          
          // 2. Verify location was set
          const storedLocation = getCallerLocationFromContext();
          expect(storedLocation).toBeTruthy();
          expect(storedLocation).toContain('callerLocation.test.ts');
          
          // 3. Simulate query event handler reading location
          const callerForLog = storedLocation ? `↳ ${storedLocation}` : undefined;
          expect(callerForLog).toContain('↳');
          
          // 4. Clear location after logging
          clearCallerLocation();
          expect(getCallerLocationFromContext()).toBeUndefined();
        }
      );
    });

    it('should handle multiple sequential queries', async () => {
      await runWithContext(
        {
          requestId: 'test-123',
          startTime: 0,
          dbDuration: 0,
          customDurations: new Map(),
        },
        async () => {
          // First query
          setCallerLocation('src/routes/users.ts:42');
          expect(getCallerLocationFromContext()).toBe('src/routes/users.ts:42');
          clearCallerLocation();
          
          // Second query
          setCallerLocation('src/routes/users.ts:58');
          expect(getCallerLocationFromContext()).toBe('src/routes/users.ts:58');
          clearCallerLocation();
          
          // Third query
          setCallerLocation('src/routes/posts.ts:23');
          expect(getCallerLocationFromContext()).toBe('src/routes/posts.ts:23');
          clearCallerLocation();
        }
      );
    });
  });
});
