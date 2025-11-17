import {
  createTruncateForLog,
  getDurationColor,
  getStatusColor,
  getLevelColor,
  getMethodColor,
  formatLogMessage,
  removeUndefinedDeep,
  LEVEL_EMOJIS,
  DEFAULT_CONFIG,
  STATUS_CODE_RANGES,
} from '../src/utils';
import { LoggerConfig } from '../src/types';

// Mock chalk
jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    red: (text: string) => `[RED]${text}[/RED]`,
    yellow: (text: string) => `[YELLOW]${text}[/YELLOW]`,
    green: (text: string) => `[GREEN]${text}[/GREEN]`,
    blue: (text: string) => `[BLUE]${text}[/BLUE]`,
    cyan: (text: string) => `[CYAN]${text}[/CYAN]`,
    gray: (text: string) => `[GRAY]${text}[/GRAY]`,
    dim: (text: string) => `[DIM]${text}[/DIM]`,
    magenta: (text: string) => `[MAGENTA]${text}[/MAGENTA]`,
    white: (text: string) => `[WHITE]${text}[/WHITE]`,
  },
}));

describe('Utils Unit Tests', () => {
  describe('createTruncateForLog', () => {
    const config: LoggerConfig = {
      maxArrayLength: 4,
      maxStringLength: 10,
      maxObjectKeys: 4,
    };

    it('should truncate long arrays', () => {
      const truncate = createTruncateForLog(config);
      const longArray = [1, 2, 3, 4, 5, 6, 7, 8];
      const result = truncate(longArray);

      expect(Array.isArray(result)).toBe(true);
      const arr = result as any[];
      expect(arr).toContain('[...4 more items...]');
      expect(arr[0]).toBe(1);
      expect(arr[1]).toBe(2);
    });

    it('should not truncate short arrays', () => {
      const truncate = createTruncateForLog(config);
      const shortArray = [1, 2, 3];
      const result = truncate(shortArray);

      expect(result).toEqual([1, 2, 3]);
    });

    it('should truncate long strings', () => {
      const truncate = createTruncateForLog(config);
      const longString = 'This is a very long string that exceeds the limit';
      const result = truncate(longString);

      expect(result).toBe('This is a ...');
    });

    it('should not truncate short strings', () => {
      const truncate = createTruncateForLog(config);
      const shortString = 'Short';
      const result = truncate(shortString);

      expect(result).toBe('Short');
    });

    it('should truncate objects with many keys', () => {
      const truncate = createTruncateForLog(config);
      const largeObject = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 };
      const result = truncate(largeObject) as any;

      expect(result.__truncated).toContain('[...2 more properties...]');
    });

    it('should not truncate objects with few keys', () => {
      const truncate = createTruncateForLog(config);
      const smallObject = { a: 1, b: 2 };
      const result = truncate(smallObject);

      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle nested objects', () => {
      const truncate = createTruncateForLog(config);
      const nested = {
        level1: {
          level2: {
            level3: {
              level4: {
                deep: 'value',
              },
            },
          },
        },
      };
      const result = truncate(nested) as any;

      // Should truncate at depth 3 (level4 is at depth 3, so it returns [Nested Object])
      expect(result.level1.level2.level3.level4).toBe('[Nested Object]');
    });

    it('should handle arrays in objects', () => {
      const truncate = createTruncateForLog(config);
      const obj = {
        items: [1, 2, 3],
      };
      const result = truncate(obj);

      expect(result).toEqual({ items: [1, 2, 3] });
    });

    it('should handle null values', () => {
      const truncate = createTruncateForLog(config);
      const result = truncate(null);

      expect(result).toBeNull();
    });

    it('should handle primitive values', () => {
      const truncate = createTruncateForLog(config);

      expect(truncate(42)).toBe(42);
      expect(truncate(true)).toBe(true);
      expect(truncate(undefined)).toBeUndefined();
    });

    it('should use default config values when not provided', () => {
      const truncate = createTruncateForLog({});
      const longArray = new Array(20).fill(1);
      const result = truncate(longArray) as any[];

      // Should use default maxArrayLength from DEFAULT_CONFIG
      expect(Array.isArray(result)).toBe(true);
      expect(result.some((item) => typeof item === 'string' && item.includes('more items'))).toBe(
        true
      );
    });
  });

  describe('getDurationColor', () => {
    it('should return red for slow requests (> 1000ms)', () => {
      const colorFn = getDurationColor('1500', true);
      const result = colorFn('1500ms');

      expect(result).toBe('[RED]1500ms[/RED]');
    });

    it('should return yellow for moderate requests (> 500ms)', () => {
      const colorFn = getDurationColor('750', true);
      const result = colorFn('750ms');

      expect(result).toBe('[YELLOW]750ms[/YELLOW]');
    });

    it('should return green for fast requests (<= 500ms)', () => {
      const colorFn = getDurationColor('200', true);
      const result = colorFn('200ms');

      expect(result).toBe('[GREEN]200ms[/GREEN]');
    });

    it('should return uncolored text when colors disabled', () => {
      const colorFn = getDurationColor('1500', false);
      const result = colorFn('1500ms');

      expect(result).toBe('1500ms');
    });
  });

  describe('getStatusColor', () => {
    it('should return red for 5xx errors', () => {
      const colorFn = getStatusColor(500, true);
      const result = colorFn('500');

      expect(result).toBe('[RED]500[/RED]');
    });

    it('should return yellow for 4xx errors', () => {
      const colorFn = getStatusColor(404, true);
      const result = colorFn('404');

      expect(result).toBe('[YELLOW]404[/YELLOW]');
    });

    it('should return cyan for 3xx redirects', () => {
      const colorFn = getStatusColor(301, true);
      const result = colorFn('301');

      expect(result).toBe('[CYAN]301[/CYAN]');
    });

    it('should return green for 2xx success', () => {
      const colorFn = getStatusColor(200, true);
      const result = colorFn('200');

      expect(result).toBe('[GREEN]200[/GREEN]');
    });

    it('should return blue for 1xx informational', () => {
      const colorFn = getStatusColor(100, true);
      const result = colorFn('100');

      expect(result).toBe('[BLUE]100[/BLUE]');
    });

    it('should return uncolored text when colors disabled', () => {
      const colorFn = getStatusColor(500, false);
      const result = colorFn('500');

      expect(result).toBe('500');
    });
  });

  describe('getLevelColor', () => {
    it('should return red for error level', () => {
      const colorFn = getLevelColor('error', true);
      const result = colorFn('error');

      expect(result).toBe('[RED]error[/RED]');
    });

    it('should return yellow for warn level', () => {
      const colorFn = getLevelColor('warn', true);
      const result = colorFn('warn');

      expect(result).toBe('[YELLOW]warn[/YELLOW]');
    });

    it('should return blue for info level', () => {
      const colorFn = getLevelColor('info', true);
      const result = colorFn('info');

      expect(result).toBe('[BLUE]info[/BLUE]');
    });

    it('should return gray for debug level', () => {
      const colorFn = getLevelColor('debug', true);
      const result = colorFn('debug');

      expect(result).toBe('[GRAY]debug[/GRAY]');
    });

    it('should return cyan for query level', () => {
      const colorFn = getLevelColor('query', true);
      const result = colorFn('query');

      expect(result).toBe('[CYAN]query[/CYAN]');
    });

    it('should handle unknown levels', () => {
      const colorFn = getLevelColor('unknown', true);
      const result = colorFn('unknown');

      expect(result).toBe('unknown');
    });

    it('should return uncolored text when colors disabled', () => {
      const colorFn = getLevelColor('error', false);
      const result = colorFn('error');

      expect(result).toBe('error');
    });
  });

  describe('getMethodColor', () => {
    it('should return green for GET', () => {
      const result = getMethodColor('GET', true);

      expect(result).toBe('[GREEN]GET   [/GREEN]');
    });

    it('should return yellow for POST', () => {
      const result = getMethodColor('POST', true);

      expect(result).toBe('[YELLOW]POST  [/YELLOW]');
    });

    it('should return blue for PUT', () => {
      const result = getMethodColor('PUT', true);

      expect(result).toBe('[BLUE]PUT   [/BLUE]');
    });

    it('should return red for DELETE', () => {
      const result = getMethodColor('DELETE', true);

      expect(result).toBe('[RED]DELETE[/RED]');
    });

    it('should return magenta for PATCH', () => {
      const result = getMethodColor('PATCH', true);

      expect(result).toBe('[MAGENTA]PATCH [/MAGENTA]');
    });

    it('should handle unknown methods', () => {
      const result = getMethodColor('OPTIONS', true);

      expect(result).toBe('[WHITE]OPTIONS[/WHITE]');
    });

    it('should return uncolored padded text when colors disabled', () => {
      const result = getMethodColor('GET', false);

      expect(result).toBe('GET   ');
    });
  });

  describe('formatLogMessage', () => {
    it('should format basic log message', () => {
      const result = formatLogMessage({
        timestamp: '2025-01-01 12:00:00',
        levelEmoji: '✓',
        url: '/api/test',
        statusText: 'OK',
        duration: '100',
        message: {},
        statusColor: (text) => text,
        durationColor: (text) => text,
        enableColors: false,
      });

      expect(result).toContain('2025-01-01 12:00:00');
      expect(result).toContain('✓');
      expect(result).toContain('/api/test');
      expect(result).toContain('100ms');
    });

    it('should include method when provided', () => {
      const result = formatLogMessage({
        timestamp: '2025-01-01 12:00:00',
        levelEmoji: '✓',
        coloredMethod: 'GET',
        url: '/api/test',
        statusText: 'OK',
        duration: '100',
        message: {},
        statusColor: (text) => text,
        durationColor: (text) => text,
        enableColors: false,
      });

      expect(result).toContain('GET');
    });

    it('should include status when provided', () => {
      const result = formatLogMessage({
        timestamp: '2025-01-01 12:00:00',
        levelEmoji: '✓',
        url: '/api/test',
        status: 200,
        statusText: 'OK',
        duration: '100',
        message: {},
        statusColor: (text) => `[COLOR]${text}[/COLOR]`,
        durationColor: (text) => text,
        enableColors: false,
      });

      expect(result).toContain('[COLOR]200 OK[/COLOR]');
    });

    it('should include requestId when provided', () => {
      const result = formatLogMessage({
        timestamp: '2025-01-01 12:00:00',
        levelEmoji: '✓',
        url: '/api/test',
        statusText: 'OK',
        duration: '100',
        message: { requestId: 'req-123' },
        statusColor: (text) => text,
        durationColor: (text) => text,
        enableColors: false,
      });

      expect(result).toContain('RequestID');
      expect(result).toContain('req-123');
    });

    it('should include body when provided', () => {
      const result = formatLogMessage({
        timestamp: '2025-01-01 12:00:00',
        levelEmoji: '✓',
        url: '/api/test',
        statusText: 'OK',
        duration: '100',
        message: { body: { test: 'data' } },
        statusColor: (text) => text,
        durationColor: (text) => text,
        enableColors: false,
      });

      expect(result).toContain('Body');
      expect(result).toContain('test');
    });

    it('should include userEmail when provided', () => {
      const result = formatLogMessage({
        timestamp: '2025-01-01 12:00:00',
        levelEmoji: '✓',
        url: '/api/test',
        statusText: 'OK',
        duration: '100',
        message: { userEmail: 'user@test.com' },
        statusColor: (text) => text,
        durationColor: (text) => text,
        enableColors: false,
      });

      expect(result).toContain('User');
      expect(result).toContain('user@test.com');
    });

    it('should apply colors when enabled', () => {
      const result = formatLogMessage({
        timestamp: '2025-01-01 12:00:00',
        levelEmoji: '✓',
        url: '/api/test',
        statusText: 'OK',
        duration: '100',
        message: {},
        statusColor: (text) => text,
        durationColor: (text) => text,
        enableColors: true,
      });

      expect(result).toContain('[GRAY]');
      expect(result).toContain('[CYAN]');
    });
  });

  describe('removeUndefinedDeep', () => {
    it('should remove undefined values from objects', () => {
      const obj = {
        a: 1,
        b: undefined,
        c: 'test',
      };

      const result = removeUndefinedDeep(obj);

      expect(result).toEqual({ a: 1, c: 'test' });
    });

    it('should handle nested objects', () => {
      const obj = {
        a: 1,
        b: {
          c: 2,
          d: undefined,
        },
      };

      const result = removeUndefinedDeep(obj);

      expect(result).toEqual({ a: 1, b: { c: 2 } });
    });

    it('should handle arrays', () => {
      const arr = [1, undefined, 3];

      const result = removeUndefinedDeep(arr);

      expect(result).toEqual([1, undefined, 3]); // Arrays keep undefined
    });

    it('should handle arrays of objects', () => {
      const arr = [{ a: 1, b: undefined }, { c: 2 }];

      const result = removeUndefinedDeep(arr);

      expect(result).toEqual([{ a: 1 }, { c: 2 }]);
    });

    it('should handle primitive values', () => {
      expect(removeUndefinedDeep(42)).toBe(42);
      expect(removeUndefinedDeep('test')).toBe('test');
      expect(removeUndefinedDeep(null)).toBeNull();
    });
  });

  describe('Constants', () => {
    it('should have correct LEVEL_EMOJIS', () => {
      expect(LEVEL_EMOJIS.error).toBe('❌');
      expect(LEVEL_EMOJIS.warn).toBe('⚠️ ');
      expect(LEVEL_EMOJIS.info).toBe('ℹ️ ');
      expect(LEVEL_EMOJIS.debug).toBe('🔍');
      expect(LEVEL_EMOJIS.query).toBe('🛢️ ');
    });

    it('should have correct STATUS_CODE_RANGES', () => {
      expect(STATUS_CODE_RANGES.SERVER_ERROR).toBe(500);
      expect(STATUS_CODE_RANGES.CLIENT_ERROR).toBe(400);
      expect(STATUS_CODE_RANGES.REDIRECT).toBe(300);
      expect(STATUS_CODE_RANGES.SUCCESS).toBe(200);
    });

    it('should have valid DEFAULT_CONFIG', () => {
      expect(DEFAULT_CONFIG.level).toBe('info');
      expect(DEFAULT_CONFIG.enableFileLogging).toBe(true);
      expect(DEFAULT_CONFIG.maxArrayLength).toBe(5);
      expect(DEFAULT_CONFIG.maxStringLength).toBe(100);
      expect(DEFAULT_CONFIG.maxObjectKeys).toBe(20);
    });

    it('should have working default functions in DEFAULT_CONFIG', () => {
      // Test customQueryFormatter
      const formattedQuery = DEFAULT_CONFIG.customQueryFormatter('SELECT * FROM users', '[]');
      expect(formattedQuery).toBe('SELECT * FROM users');

      // Test getUserFromRequest
      const mockReq = { currentUser: 'testuser' } as any;
      const user = DEFAULT_CONFIG.getUserFromRequest(mockReq);
      expect(user).toBe('testuser');

      // Test getRequestId
      const mockReqWithId = { requestId: 'req-123' } as any;
      const reqId = DEFAULT_CONFIG.getRequestId(mockReqWithId);
      expect(reqId).toBe('req-123');

      // Test additionalMetadata
      const mockRes = {} as any;
      const metadata = DEFAULT_CONFIG.additionalMetadata(mockReq, mockRes);
      expect(metadata).toEqual({});
    });
  });
});
