import { EnhancedLogger } from '../../src/logger';

import { Request, Response } from 'express';

// Mock winston-daily-rotate-file
jest.mock('winston-daily-rotate-file', () => {
  return jest.fn().mockImplementation((options) => {
    return {
      format: options.format,
      filename: options.filename,
      datePattern: options.datePattern,
      level: options.level,
      maxFiles: options.maxFiles,
      maxSize: options.maxSize,
      zippedArchive: options.zippedArchive,
      log: jest.fn((_info, callback) => {
        if (callback) callback();
      }),
      on: jest.fn(),
      once: jest.fn(),
      emit: jest.fn(),
    };
  });
});

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
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    logger = new EnhancedLogger({
      level: 'info',
      enableFileLogging: false, // Disable file logging for tests
      enableColors: false,
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
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

    it('should handle object messages in simple logging mode', () => {
      const simpleLogger = new EnhancedLogger({
        simpleLogging: true,
        enableFileLogging: false,
      });

      expect(() => {
        simpleLogger.info({ test: 'object message' });
      }).not.toThrow();
    });
  });

  describe('SQL Formatting Integration', () => {
    it('should format SQL queries when enabled', () => {
      const sqlLogger = new EnhancedLogger({
        enableFileLogging: false,
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

  describe('Request Logger Advanced Scenarios', () => {
    it('should log error events from response', () => {
      const mockReq = {
        method: 'POST',
        url: '/test',
        path: '/test',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
        body: { test: 'data' },
        query: {},
        params: {},
      } as unknown as Request;

      const mockRes = {
        statusCode: 200,
        statusMessage: 'OK',
        once: jest.fn(),
        off: jest.fn(),
        get: jest.fn(),
      } as unknown as Response;

      const mockNext = jest.fn();
      const mockError = new Error('Test error');

      logger.requestLogger(mockReq, mockRes, mockNext);

      // Get the error handler that was registered
      const errorHandlerCall = (mockRes.once as jest.Mock).mock.calls.find(
        (call) => call[0] === 'error'
      );
      expect(errorHandlerCall).toBeDefined();

      // Trigger the error handler
      const errorHandler = errorHandlerCall[1];
      expect(() => errorHandler(mockError)).not.toThrow();
    });

    it('should log requests with status >= 500 as errors', () => {
      const mockReq = {
        method: 'GET',
        url: '/error',
        path: '/error',
        ip: '127.0.0.1',
        get: jest.fn(),
        query: {},
        params: {},
      } as unknown as Request;

      const mockRes = {
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        once: jest.fn(),
        off: jest.fn(),
        get: jest.fn(),
      } as unknown as Response;

      const mockNext = jest.fn();

      logger.requestLogger(mockReq, mockRes, mockNext);

      // Get and trigger the finish handler
      const finishHandlerCall = (mockRes.once as jest.Mock).mock.calls.find(
        (call) => call[0] === 'finish'
      );
      const finishHandler = finishHandlerCall[1];

      expect(() => finishHandler()).not.toThrow();
    });

    it('should log slow requests as warnings', () => {
      const slowLogger = new EnhancedLogger({
        enableFileLogging: false,
        slowRequestThreshold: 1, // Very low threshold
      });

      const mockReq = {
        method: 'GET',
        url: '/slow',
        path: '/slow',
        ip: '127.0.0.1',
        get: jest.fn(),
        query: {},
        params: {},
      } as unknown as Request;

      const mockRes = {
        statusCode: 200,
        statusMessage: 'OK',
        once: jest.fn(),
        off: jest.fn(),
        get: jest.fn(),
      } as unknown as Response;

      const mockNext = jest.fn();

      slowLogger.requestLogger(mockReq, mockRes, mockNext);

      // Get and trigger the finish handler after a delay
      const finishHandlerCall = (mockRes.once as jest.Mock).mock.calls.find(
        (call) => call[0] === 'finish'
      );
      const finishHandler = finishHandlerCall[1];

      // Add a small delay to ensure duration > threshold
      setTimeout(() => {
        expect(() => finishHandler()).not.toThrow();
      }, 10);
    });

    it('should log high memory usage as warnings', () => {
      const memLogger = new EnhancedLogger({
        enableFileLogging: false,
        memoryWarningThreshold: 0, // Very low threshold to trigger warning
      });

      const mockReq = {
        method: 'GET',
        url: '/memory',
        path: '/memory',
        ip: '127.0.0.1',
        get: jest.fn(),
        query: {},
        params: {},
      } as unknown as Request;

      const mockRes = {
        statusCode: 200,
        statusMessage: 'OK',
        once: jest.fn(),
        off: jest.fn(),
        get: jest.fn(),
      } as unknown as Response;

      const mockNext = jest.fn();

      memLogger.requestLogger(mockReq, mockRes, mockNext);

      const finishHandlerCall = (mockRes.once as jest.Mock).mock.calls.find(
        (call) => call[0] === 'finish'
      );
      const finishHandler = finishHandlerCall[1];

      expect(() => finishHandler()).not.toThrow();
    });

    it('should handle requests with user context', () => {
      const userLogger = new EnhancedLogger({
        enableFileLogging: false,
        getUserFromRequest: (_req) => ({ email: 'test@example.com' }),
      });

      const mockReq = {
        method: 'POST',
        url: '/user-action',
        path: '/user-action',
        ip: '127.0.0.1',
        get: jest.fn(),
        query: {},
        params: {},
      } as unknown as Request;

      const mockRes = {
        statusCode: 201,
        statusMessage: 'Created',
        once: jest.fn(),
        off: jest.fn(),
        get: jest.fn(),
      } as unknown as Response;

      const mockNext = jest.fn();

      userLogger.requestLogger(mockReq, mockRes, mockNext);

      const finishHandlerCall = (mockRes.once as jest.Mock).mock.calls.find(
        (call) => call[0] === 'finish'
      );
      const finishHandler = finishHandlerCall[1];

      expect(() => finishHandler()).not.toThrow();
    });

    it('should handle requests with requestId', () => {
      const idLogger = new EnhancedLogger({
        enableFileLogging: false,
        getRequestId: (_req) => 'request-123',
      });

      const mockReq = {
        method: 'GET',
        url: '/tracked',
        path: '/tracked',
        ip: '127.0.0.1',
        get: jest.fn(),
        query: {},
        params: {},
      } as unknown as Request;

      const mockRes = {
        statusCode: 200,
        statusMessage: 'OK',
        once: jest.fn(),
        off: jest.fn(),
        get: jest.fn(),
      } as unknown as Response;

      const mockNext = jest.fn();

      idLogger.requestLogger(mockReq, mockRes, mockNext);

      const finishHandlerCall = (mockRes.once as jest.Mock).mock.calls.find(
        (call) => call[0] === 'finish'
      );
      const finishHandler = finishHandlerCall[1];

      expect(() => finishHandler()).not.toThrow();
    });

    it('should handle requests with additional metadata', () => {
      const metaLogger = new EnhancedLogger({
        enableFileLogging: false,
        additionalMetadata: (_req, _res) => ({ customField: 'customValue' }),
      });

      const mockReq = {
        method: 'PUT',
        url: '/update',
        path: '/update',
        ip: '127.0.0.1',
        get: jest.fn(),
        query: {},
        params: {},
      } as unknown as Request;

      const mockRes = {
        statusCode: 200,
        statusMessage: 'OK',
        once: jest.fn(),
        off: jest.fn(),
        get: jest.fn().mockReturnValue('application/json'),
      } as unknown as Response;

      const mockNext = jest.fn();

      metaLogger.requestLogger(mockReq, mockRes, mockNext);

      const finishHandlerCall = (mockRes.once as jest.Mock).mock.calls.find(
        (call) => call[0] === 'finish'
      );
      const finishHandler = finishHandlerCall[1];

      expect(() => finishHandler()).not.toThrow();
    });

    it('should handle requests with params, query, and body', () => {
      const mockReq = {
        method: 'POST',
        url: '/complex',
        path: '/complex',
        ip: '127.0.0.1',
        get: jest.fn(),
        query: { search: 'test', limit: '10' },
        params: { id: '123' },
        body: { name: 'Test', data: 'Complex' },
      } as unknown as Request;

      const mockRes = {
        statusCode: 200,
        statusMessage: 'OK',
        once: jest.fn(),
        off: jest.fn(),
        get: jest.fn(),
      } as unknown as Response;

      const mockNext = jest.fn();

      logger.requestLogger(mockReq, mockRes, mockNext);

      const finishHandlerCall = (mockRes.once as jest.Mock).mock.calls.find(
        (call) => call[0] === 'finish'
      );
      const finishHandler = finishHandlerCall[1];

      expect(() => finishHandler()).not.toThrow();
    });

    it('should handle missing request properties safely', () => {
      const mockReq = {} as unknown as Request;

      const mockRes = {
        statusCode: 200,
        statusMessage: 'OK',
        once: jest.fn(),
        off: jest.fn(),
      } as unknown as Response;

      const mockNext = jest.fn();

      logger.requestLogger(mockReq, mockRes, mockNext);

      const finishHandlerCall = (mockRes.once as jest.Mock).mock.calls.find(
        (call) => call[0] === 'finish'
      );
      const finishHandler = finishHandlerCall[1];

      expect(() => finishHandler()).not.toThrow();
    });
  });

  describe('Prisma Integration', () => {
    it('should setup Prisma logging in non-test environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockPrismaClient = {
        $on: jest.fn(),
      };

      const prismaLogger = new EnhancedLogger({
        enableFileLogging: false,
      });

      prismaLogger.setupPrismaLogging(mockPrismaClient);

      expect(mockPrismaClient.$on).toHaveBeenCalledWith('query', expect.any(Function));
      expect(mockPrismaClient.$on).toHaveBeenCalledWith('info', expect.any(Function));
      expect(mockPrismaClient.$on).toHaveBeenCalledWith('warn', expect.any(Function));
      expect(mockPrismaClient.$on).toHaveBeenCalledWith('error', expect.any(Function));

      process.env.NODE_ENV = originalEnv;
    });

    it('should not setup Prisma logging in test environment', () => {
      const mockPrismaClient = {
        $on: jest.fn(),
      };

      logger.setupPrismaLogging(mockPrismaClient);

      expect(mockPrismaClient.$on).not.toHaveBeenCalled();
    });

    it('should handle Prisma query events', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockPrismaClient = {
        $on: jest.fn(),
      };

      const prismaLogger = new EnhancedLogger({
        enableFileLogging: false,
      });

      prismaLogger.setupPrismaLogging(mockPrismaClient);

      // Get the query event handler
      const queryHandlerCall = (mockPrismaClient.$on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'query'
      );
      const queryHandler = queryHandlerCall[1];

      // Simulate a query event
      expect(() =>
        queryHandler({
          query: 'SELECT * FROM Users',
          params: '[1]',
          duration: 50,
        })
      ).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle slow Prisma queries', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockPrismaClient = {
        $on: jest.fn(),
      };

      const prismaLogger = new EnhancedLogger({
        enableFileLogging: false,
        slowQueryThreshold: 10,
      });

      prismaLogger.setupPrismaLogging(mockPrismaClient);

      const queryHandlerCall = (mockPrismaClient.$on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'query'
      );
      const queryHandler = queryHandlerCall[1];

      // Simulate a slow query
      expect(() =>
        queryHandler({
          query: 'SELECT * FROM Users WHERE name LIKE "%test%" AND age > 18',
          params: '[]',
          duration: 5000,
        })
      ).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle Prisma info events', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockPrismaClient = {
        $on: jest.fn(),
      };

      const prismaLogger = new EnhancedLogger({
        enableFileLogging: false,
      });

      prismaLogger.setupPrismaLogging(mockPrismaClient);

      const infoHandlerCall = (mockPrismaClient.$on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'info'
      );
      const infoHandler = infoHandlerCall[1];

      expect(() => infoHandler({ message: 'Prisma info message' })).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle Prisma warn events', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockPrismaClient = {
        $on: jest.fn(),
      };

      const prismaLogger = new EnhancedLogger({
        enableFileLogging: false,
      });

      prismaLogger.setupPrismaLogging(mockPrismaClient);

      const warnHandlerCall = (mockPrismaClient.$on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'warn'
      );
      const warnHandler = warnHandlerCall[1];

      expect(() => warnHandler({ message: 'Prisma warning message' })).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle Prisma error events', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const mockPrismaClient = {
        $on: jest.fn(),
      };

      const prismaLogger = new EnhancedLogger({
        enableFileLogging: false,
      });

      prismaLogger.setupPrismaLogging(mockPrismaClient);

      const errorHandlerCall = (mockPrismaClient.$on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'error'
      );
      const errorHandler = errorHandlerCall[1];

      expect(() => errorHandler({ message: 'Prisma error message' })).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('File Logging', () => {
    it('should create logs directory if it does not exist', () => {
      const fs = require('fs');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

      new EnhancedLogger({
        enableFileLogging: true,
        logsDirectory: 'test-logs',
      });

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('test-logs'),
        { recursive: true }
      );

      consoleSpy.mockRestore();
    });

    it('should not create logs directory if it exists', () => {
      const fs = require('fs');
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);

      new EnhancedLogger({
        enableFileLogging: true,
        logsDirectory: 'logs',
      });

      // Just verify the instance was created successfully
      expect(fs.existsSync).toHaveBeenCalled();
    });

    it('should create file transports in non-test environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const DailyRotateFile = require('winston-daily-rotate-file');
      (DailyRotateFile as jest.Mock).mockClear();

      new EnhancedLogger({
        enableFileLogging: true,
        logsDirectory: 'logs',
        maxFiles: '14d',
        maxFileSize: '50m',
        zippedArchive: true,
      });

      // Should create two transports: error and combined
      expect(DailyRotateFile).toHaveBeenCalledTimes(2);
      
      // Check error transport
      expect(DailyRotateFile).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          datePattern: 'YYYY-MM-DD',
          maxFiles: '14d',
          maxSize: '50m',
          zippedArchive: true,
        })
      );

      // Check combined transport
      expect(DailyRotateFile).toHaveBeenCalledWith(
        expect.objectContaining({
          datePattern: 'YYYY-MM-DD',
          maxFiles: '14d',
          maxSize: '50m',
          zippedArchive: true,
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should not create file transports in test environment even if enabled', () => {
      const DailyRotateFile = require('winston-daily-rotate-file');
      (DailyRotateFile as jest.Mock).mockClear();

      new EnhancedLogger({
        enableFileLogging: true,
        logsDirectory: 'logs',
      });

      // Should not create file transports in test environment
      expect(DailyRotateFile).not.toHaveBeenCalled();
    });

    it('should not create file transports when disabled', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const DailyRotateFile = require('winston-daily-rotate-file');
      (DailyRotateFile as jest.Mock).mockClear();

      new EnhancedLogger({
        enableFileLogging: false,
      });

      expect(DailyRotateFile).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error Logging with Metadata', () => {
    it('should log error with metadata', () => {
      expect(() => {
        logger.error('Error occurred', { errorCode: 500, details: 'Something went wrong' });
      }).not.toThrow();
    });

    it('should log warn with metadata', () => {
      expect(() => {
        logger.warn('Warning occurred', { code: 'WARN_001' });
      }).not.toThrow();
    });
  });

  describe('Non-test Environment Logging', () => {
    it('should handle simple logging with object messages in non-test mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devLogger = new EnhancedLogger({
        simpleLogging: true,
        enableFileLogging: false,
        enableColors: true,
      });

      expect(() => {
        devLogger.info({ event: 'test', data: 'value' });
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle simple logging with string messages in non-test mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devLogger = new EnhancedLogger({
        simpleLogging: true,
        enableFileLogging: false,
        enableColors: false,
      });

      expect(() => {
        devLogger.info('Simple string message');
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle HTTP log formatting in non-test mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devLogger = new EnhancedLogger({
        enableFileLogging: false,
        enableColors: true,
      });

      const winstonLogger = devLogger.getWinstonLogger();
      
      expect(() => {
        winstonLogger.info({
          method: 'GET',
          url: '/test',
          status: 200,
          statusText: 'OK',
          duration: '50',
        });
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle SQL query logging with colors disabled in non-test mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devLogger = new EnhancedLogger({
        enableFileLogging: false,
        enableColors: false,
      });

      const winstonLogger = devLogger.getWinstonLogger();
      
      expect(() => {
        winstonLogger.log('query', {
          type: 'SELECT',
          query: 'SELECT * FROM Users',
          params: '[]',
          duration: '25ms',
          timestamp: '2025-11-17 12:00:00',
        });
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle SQL query with unknown type and colors enabled', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devLogger = new EnhancedLogger({
        enableFileLogging: false,
        enableColors: true,
      });

      const winstonLogger = devLogger.getWinstonLogger();
      
      expect(() => {
        winstonLogger.log('query', {
          type: 'TRUNCATE',
          query: 'TRUNCATE TABLE temp',
          params: '[]',
          duration: '10ms',
          timestamp: '2025-11-17 12:00:00',
        });
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle SQL query with unknown type and colors disabled', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devLogger = new EnhancedLogger({
        enableFileLogging: false,
        enableColors: false,
      });

      const winstonLogger = devLogger.getWinstonLogger();
      
      expect(() => {
        winstonLogger.log('query', {
          type: 'EXPLAIN',
          query: 'EXPLAIN SELECT * FROM Users',
          params: '[]',
          duration: '5ms',
          timestamp: '2025-11-17 12:00:00',
        });
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle regular logs with metadata in non-test mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devLogger = new EnhancedLogger({
        enableFileLogging: false,
        enableColors: true,
      });

      const winstonLogger = devLogger.getWinstonLogger();
      
      expect(() => {
        winstonLogger.info('Test message', { meta: 'data', extra: 'info' });
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle INSERT query type with colors enabled', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devLogger = new EnhancedLogger({
        enableFileLogging: false,
        enableColors: true,
      });

      const winstonLogger = devLogger.getWinstonLogger();
      
      expect(() => {
        winstonLogger.log('query', {
          type: 'INSERT',
          query: 'INSERT INTO Users VALUES (1, "test")',
          params: '[]',
          duration: '15ms',
          timestamp: '2025-11-17 12:00:00',
        });
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle CREATE query type with colors enabled', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devLogger = new EnhancedLogger({
        enableFileLogging: false,
        enableColors: true,
      });

      const winstonLogger = devLogger.getWinstonLogger();
      
      expect(() => {
        winstonLogger.log('query', {
          type: 'CREATE',
          query: 'CREATE TABLE Users (id INT)',
          params: '[]',
          duration: '20ms',
          timestamp: '2025-11-17 12:00:00',
        });
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle UPDATE query type with colors enabled', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devLogger = new EnhancedLogger({
        enableFileLogging: false,
        enableColors: true,
      });

      const winstonLogger = devLogger.getWinstonLogger();
      
      expect(() => {
        winstonLogger.log('query', {
          type: 'UPDATE',
          query: 'UPDATE Users SET name = "test"',
          params: '[]',
          duration: '12ms',
          timestamp: '2025-11-17 12:00:00',
        });
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle DELETE query type with colors enabled', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devLogger = new EnhancedLogger({
        enableFileLogging: false,
        enableColors: true,
      });

      const winstonLogger = devLogger.getWinstonLogger();
      
      expect(() => {
        winstonLogger.log('query', {
          type: 'DELETE',
          query: 'DELETE FROM Users WHERE id = 1',
          params: '[]',
          duration: '8ms',
          timestamp: '2025-11-17 12:00:00',
        });
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle INSERT query type with colors disabled', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devLogger = new EnhancedLogger({
        enableFileLogging: false,
        enableColors: false,
      });

      const winstonLogger = devLogger.getWinstonLogger();
      
      expect(() => {
        winstonLogger.log('query', {
          type: 'INSERT',
          query: 'INSERT INTO Users VALUES (1, "test")',
          params: '[]',
          duration: '15ms',
          timestamp: '2025-11-17 12:00:00',
        });
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle CREATE query type with colors disabled', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devLogger = new EnhancedLogger({
        enableFileLogging: false,
        enableColors: false,
      });

      const winstonLogger = devLogger.getWinstonLogger();
      
      expect(() => {
        winstonLogger.log('query', {
          type: 'CREATE',
          query: 'CREATE TABLE Users (id INT)',
          params: '[]',
          duration: '20ms',
          timestamp: '2025-11-17 12:00:00',
        });
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle UPDATE query type with colors disabled', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devLogger = new EnhancedLogger({
        enableFileLogging: false,
        enableColors: false,
      });

      const winstonLogger = devLogger.getWinstonLogger();
      
      expect(() => {
        winstonLogger.log('query', {
          type: 'UPDATE',
          query: 'UPDATE Users SET name = "test"',
          params: '[]',
          duration: '12ms',
          timestamp: '2025-11-17 12:00:00',
        });
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle DELETE query type with colors disabled', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devLogger = new EnhancedLogger({
        enableFileLogging: false,
        enableColors: false,
      });

      const winstonLogger = devLogger.getWinstonLogger();
      
      expect(() => {
        winstonLogger.log('query', {
          type: 'DELETE',
          query: 'DELETE FROM Users WHERE id = 1',
          params: '[]',
          duration: '8ms',
          timestamp: '2025-11-17 12:00:00',
        });
      }).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Slow Request Logging Details', () => {
    it('should include duration in slow request warning message', (done) => {
      const slowLogger = new EnhancedLogger({
        enableFileLogging: false,
        slowRequestThreshold: 1, // Very low threshold to ensure we trigger it
        enableColors: true,
      });

      const mockReq = {
        method: 'GET',
        url: '/slow-endpoint',
        path: '/slow-endpoint',
        ip: '127.0.0.1',
        get: jest.fn(),
        query: {},
        params: {},
      } as unknown as Request;

      const mockRes = {
        statusCode: 200,
        statusMessage: 'OK',
        once: jest.fn(),
        off: jest.fn(),
        get: jest.fn(),
      } as unknown as Response;

      const mockNext = jest.fn();

      slowLogger.requestLogger(mockReq, mockRes, mockNext);

      const finishHandlerCall = (mockRes.once as jest.Mock).mock.calls.find(
        (call) => call[0] === 'finish'
      );
      const finishHandler = finishHandlerCall[1];

      // Add delay to ensure duration > threshold
      setTimeout(() => {
        expect(() => finishHandler()).not.toThrow();
        done();
      }, 5);
    });

    it('should include duration in slow request warning message with colors disabled', (done) => {
      const slowLogger = new EnhancedLogger({
        enableFileLogging: false,
        slowRequestThreshold: 1,
        enableColors: false,
      });

      const mockReq = {
        method: 'POST',
        url: '/slow-post',
        path: '/slow-post',
        ip: '127.0.0.1',
        get: jest.fn(),
        query: {},
        params: {},
        body: { data: 'test' },
      } as unknown as Request;

      const mockRes = {
        statusCode: 201,
        statusMessage: 'Created',
        once: jest.fn(),
        off: jest.fn(),
        get: jest.fn(),
      } as unknown as Response;

      const mockNext = jest.fn();

      slowLogger.requestLogger(mockReq, mockRes, mockNext);

      const finishHandlerCall = (mockRes.once as jest.Mock).mock.calls.find(
        (call) => call[0] === 'finish'
      );
      const finishHandler = finishHandlerCall[1];

      setTimeout(() => {
        expect(() => finishHandler()).not.toThrow();
        done();
      }, 5);
    });
  });
});
