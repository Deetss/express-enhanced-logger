import { EnhancedLogger } from '../src/logger';
import { Request, Response } from 'express';

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

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
}));

describe('EnhancedLogger Unit Tests', () => {
  let logger: EnhancedLogger;

  beforeEach(() => {
    logger = new EnhancedLogger({
      level: 'info',
      enableFileLogging: false, // Disable file logging for tests
      enableColors: false,
    });
  });

  describe('Constructor', () => {
    it('should create logger with default config', () => {
      const defaultLogger = new EnhancedLogger();

      expect(defaultLogger).toBeDefined();
    });

    it('should create logger with custom config', () => {
      const customLogger = new EnhancedLogger({
        level: 'debug',
        enableColors: false,
        maxArrayLength: 10,
      });

      expect(customLogger).toBeDefined();
    });
  });

  describe('Basic Logging Methods', () => {
    it('should log info messages', () => {
      expect(() => {
        logger.info('Test info message');
      }).not.toThrow();
    });

    it('should log error messages', () => {
      expect(() => {
        logger.error('Test error message');
      }).not.toThrow();
    });

    it('should log warn messages', () => {
      expect(() => {
        logger.warn('Test warning message');
      }).not.toThrow();
    });

    it('should log debug messages', () => {
      const debugLogger = new EnhancedLogger({ level: 'debug', enableFileLogging: false });

      expect(() => {
        debugLogger.debug('Test debug message');
      }).not.toThrow();
    });

    it('should log with metadata objects', () => {
      expect(() => {
        logger.info('Message with metadata', { userId: 123, action: 'test' });
      }).not.toThrow();
    });

    it('should log objects as messages', () => {
      expect(() => {
        logger.info({ event: 'user_login', userId: 456 });
      }).not.toThrow();
    });
  });

  describe('Query Logging', () => {
    it('should log query data when Prisma integration enabled', () => {
      const prismaLogger = new EnhancedLogger({
        enableFileLogging: false,
        enablePrismaIntegration: true,
      });

      expect(() => {
        prismaLogger.query({
          type: 'query',
          query: 'SELECT * FROM Users WHERE id = @P1',
          params: '[123]',
          duration: '50',
        });
      }).not.toThrow();
    });

    it('should not log query when Prisma integration disabled', () => {
      expect(() => {
        logger.query({
          type: 'query',
          query: 'SELECT * FROM Users',
          params: '[]',
          duration: '10',
        });
      }).not.toThrow();
    });
  });

  describe('Request Logger Middleware', () => {
    it('should create request logger middleware', () => {
      const middleware = logger.requestLogger;

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should call next in middleware', () => {
      const mockReq = {
        get: jest.fn(),
      } as unknown as Request;

      const mockRes = {
        once: jest.fn(),
      } as unknown as Response;

      const mockNext = jest.fn();

      logger.requestLogger(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should attach finish listener to response', () => {
      const mockReq = {
        get: jest.fn(),
      } as unknown as Request;

      const mockRes = {
        once: jest.fn(),
      } as unknown as Response;

      const mockNext = jest.fn();

      logger.requestLogger(mockReq, mockRes, mockNext);

      expect(mockRes.once).toHaveBeenCalledWith('finish', expect.any(Function));
    });
  });

  describe('Get Winston Instance', () => {
    it('should return winston logger instance', () => {
      const winstonLogger = logger.getWinstonLogger();

      expect(winstonLogger).toBeDefined();
      expect(winstonLogger.info).toBeDefined();
    });
  });

  describe('Update Config', () => {
    it('should update logger configuration', () => {
      expect(() => {
        logger.updateConfig({ level: 'debug', maxArrayLength: 10 });
      }).not.toThrow();
    });
  });

  describe('Custom Formatters', () => {
    it('should work with custom log format', () => {
      const customLogger = new EnhancedLogger({
        enableFileLogging: false,
        customLogFormat: (info) => `CUSTOM: ${info.message}`,
      });

      expect(() => {
        customLogger.info('Test message');
      }).not.toThrow();
    });

    it('should work with custom query formatter', () => {
      const customLogger = new EnhancedLogger({
        enableFileLogging: false,
        enablePrismaIntegration: true,
        customQueryFormatter: (query, params) => `${query} WITH ${params}`,
      });

      expect(() => {
        customLogger.query({
          type: 'query',
          query: 'SELECT * FROM Users',
          params: '[123]',
          duration: '25',
        });
      }).not.toThrow();
    });
  });

  describe('Complex Log Data', () => {
    it('should handle complex nested objects', () => {
      const complexData = {
        user: {
          id: 123,
          profile: {
            name: 'Test User',
            settings: {
              theme: 'dark',
              notifications: true,
            },
          },
        },
        items: [1, 2, 3, 4, 5],
      };

      expect(() => {
        logger.info('Complex data', complexData);
      }).not.toThrow();
    });

    it('should truncate large arrays in logs', () => {
      const largeArray = Array.from({ length: 100 }, (_, i) => i);

      expect(() => {
        logger.info('Large array', { data: largeArray });
      }).not.toThrow();
    });

    it('should truncate large objects in logs', () => {
      const largeObject = Object.fromEntries(
        Array.from({ length: 50 }, (_, i) => [`key${i}`, `value${i}`])
      );

      expect(() => {
        logger.info('Large object', largeObject);
      }).not.toThrow();
    });
  });

  describe('Simple Logging Mode', () => {
    it('should work with simple logging enabled', () => {
      const simpleLogger = new EnhancedLogger({
        simpleLogging: true,
        enableFileLogging: false,
      });

      expect(() => {
        simpleLogger.info('Simple log message');
      }).not.toThrow();
    });
  });

  describe('SQL Formatting Integration', () => {
    it('should format SQL queries when enabled', () => {
      const sqlLogger = new EnhancedLogger({
        enableFileLogging: false,
        enablePrismaIntegration: true,
        enableSqlFormatting: true,
      });

      expect(() => {
        sqlLogger.query({
          type: 'query',
          query: 'SELECT * FROM Users WHERE id = @P1',
          params: '[123]',
          duration: '50',
        });
      }).not.toThrow();
    });

    it('should not format SQL when disabled', () => {
      const noSqlLogger = new EnhancedLogger({
        enableFileLogging: false,
        enablePrismaIntegration: true,
        enableSqlFormatting: false,
      });

      expect(() => {
        noSqlLogger.query({
          type: 'query',
          query: 'SELECT * FROM Users WHERE id = @P1',
          params: '[123]',
          duration: '30',
        });
      }).not.toThrow();
    });
  });
});
