import winston, { format } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { inspect } from 'util';
import chalk from 'chalk';
import { performance } from 'perf_hooks';
import { NextFunction, Request, Response } from 'express';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

import { LoggerConfig, RequestLogData, QueryLogData, WinstonLogInfo } from './types.js';
import {
  DEFAULT_CONFIG,
  createTruncateForLog,
  getDurationColor,
  getStatusColor,
  getLevelColor,
  getMethodColor,
  formatLogMessage,
  removeUndefinedDeep,
  LEVEL_EMOJIS,
} from './utils.js';
import { createSqlFormatter } from './sqlFormatter.js';

export class EnhancedLogger {
  private logger: winston.Logger;
  private config: Required<Omit<LoggerConfig, 'customLogFormat'>> & {
    customLogFormat?: (info: WinstonLogInfo) => string;
  };
  private truncateForLog: (value: unknown, depth?: number) => unknown;
  private formatSqlQuery: (query: string, params: string) => string;

  constructor(config: LoggerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.truncateForLog = createTruncateForLog(this.config);
    this.formatSqlQuery = createSqlFormatter(this.config);

    // Ensure logs directory exists if file logging is enabled
    if (this.config.enableFileLogging) {
      const logsDir = join(process.cwd(), this.config.logsDirectory);
      if (!existsSync(logsDir)) {
        mkdirSync(logsDir, { recursive: true });
        console.log(`Created logs directory at: ${logsDir}`);
      }
    }

    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const customFormat = this.config.customLogFormat
      ? format.printf((info) => this.config.customLogFormat!(info as unknown as WinstonLogInfo))
      : this.createDefaultFormat();

    const transports: winston.transport[] = [];

    // Console transport (always enabled unless in test)
    if (process.env.NODE_ENV !== 'test') {
      transports.push(new winston.transports.Console());
    } else {
      transports.push(new winston.transports.Console({ silent: true }));
    }

    // File transports (optional)
    if (this.config.enableFileLogging && process.env.NODE_ENV !== 'test') {
      const logsDir = join(process.cwd(), this.config.logsDirectory);

      transports.push(
        new DailyRotateFile({
          filename: join(logsDir, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          format: format.json(),
          maxFiles: this.config.maxFiles,
          maxSize: this.config.maxFileSize,
          zippedArchive: this.config.zippedArchive,
        }),
        new DailyRotateFile({
          filename: join(logsDir, 'combined-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          format: format.json(),
          maxFiles: this.config.maxFiles,
          maxSize: this.config.maxFileSize,
          zippedArchive: this.config.zippedArchive,
        })
      );
    }

    return winston.createLogger({
      levels: {
        error: 0,
        warn: 1,
        query: 2,
        info: 3,
        debug: 4,
      },
      level: this.config.level,
      format: customFormat,
      transports,
    });
  }

  private createDefaultFormat() {
    if (process.env.NODE_ENV === 'test') {
      return undefined;
    }

    return format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.printf((info: winston.Logform.TransformableInfo) => {
        // Simple logging mode - just return the message
        if (this.config.simpleLogging) {
          const logInfo = info as unknown as WinstonLogInfo;
          const { message } = logInfo;
          return typeof message === 'object'
            ? inspect(message, { colors: this.config.enableColors, depth: 5 })
            : String(message);
        }
        const { level, message, timestamp, ...meta } = info as unknown as WinstonLogInfo;

        const levelEmoji = LEVEL_EMOJIS[level as keyof typeof LEVEL_EMOJIS] || '📝';

        // Type guard for HTTP request logs
        const isHttpLog = (
          msg: unknown
        ): msg is {
          method: string;
          url: string;
          status: number;
          statusText: string;
          duration: string;
        } => {
          return typeof msg === 'object' && msg !== null && 'method' in msg && 'url' in msg;
        };

        // Handle HTTP request logs
        if (isHttpLog(message)) {
          const { method, url, status, statusText, duration } = message;
          const durationColor = getDurationColor(duration, this.config.enableColors);

          const coloredMethod = getMethodColor(method, this.config.enableColors);
          const statusColor = getStatusColor(status, this.config.enableColors);

          return formatLogMessage({
            timestamp,
            levelEmoji,
            coloredMethod,
            url,
            status,
            statusText,
            duration,
            message: message as {
              requestId?: string;
              userEmail?: string;
              query?: string;
              body?: unknown;
            },
            statusColor,
            durationColor,
            enableColors: this.config.enableColors,
          });
        }
        // Handle SQL query logs - Winston spreads data directly on info, not in message
        if (level === 'query' && this.config.enablePrismaIntegration && 'query' in info && 'type' in info) {
          const queryInfo = info as unknown as { type: string; query: string; params?: string; duration: string; timestamp: string };
          const { type, query, params = '', duration } = queryInfo;
          const formattedQuery = this.formatSqlQuery(query, params);
          const durationColor = getDurationColor(
            duration.replace('ms', ''),
            this.config.enableColors
          );

          const typeColors = this.config.enableColors
            ? {
                SELECT: chalk.cyan,
                INSERT: chalk.green,
                CREATE: chalk.green,
                UPDATE: chalk.yellow,
                DELETE: chalk.red,
              }
            : {
                SELECT: (text: string) => text,
                INSERT: (text: string) => text,
                CREATE: (text: string) => text,
                UPDATE: (text: string) => text,
                DELETE: (text: string) => text,
              };

          const colorFn = typeColors[type as keyof typeof typeColors] || 
            (this.config.enableColors ? chalk.white : (text: string) => text);

          const grayFn = this.config.enableColors ? chalk.gray : (text: string) => text;
          
          return `${grayFn(timestamp)} ${levelEmoji} ${colorFn(type)}: ${formattedQuery} ${durationColor(`(${duration})`)}`;
        }

        // Handle regular logs
        const colorFn = getLevelColor(level, this.config.enableColors);
        return `${timestamp} ${levelEmoji} ${colorFn(level)}: ${
          typeof message === 'object'
            ? inspect(message, { colors: this.config.enableColors, depth: 5 })
            : message
        }${
          Object.keys(meta).length
            ? `\n${inspect(meta, { colors: this.config.enableColors, depth: 5 })}`
            : ''
        }`;
      })
    );
  }

  // Public logging methods
  error(message: string | Record<string, unknown>, meta?: Record<string, unknown>) {
    this.logger.error(message as string, meta);
  }

  warn(message: string | Record<string, unknown>, meta?: Record<string, unknown>) {
    this.logger.warn(message as string, meta);
  }

  info(message: string | Record<string, unknown>, meta?: Record<string, unknown>) {
    this.logger.info(message as string, meta);
  }

  debug(message: string | Record<string, unknown>, meta?: Record<string, unknown>) {
    this.logger.debug(message as string, meta);
  }

  query(data: QueryLogData) {
    if (this.config.enablePrismaIntegration) {
      this.logger.log('query', data);
    }
  }

  // Request logging middleware
  requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    // Extract user and request ID using configured functions with null safety
    const user = this.config.getUserFromRequest ? this.config.getUserFromRequest(req) : undefined;
    const requestId = this.config.getRequestId ? this.config.getRequestId(req) : undefined;

    // Preserve request context with safe property access
    const reqContext = {
      ip: req?.ip || 'unknown',
      userAgent: req?.get?.('User-Agent') || undefined,
      referer: req?.get?.('Referer') || undefined,
      correlationId: requestId,
    };

    // Handler for logging errors
    const errorHandler = (error: Error) => {
      this.logger.error({
        requestId,
        error: error.message,
        stack: error.stack,
        context: reqContext,
      });
    };

    // Handler for logging after response finishes
    const finishHandler = () => {
      // Clean up error listener
      res.off('error', errorHandler);

      const duration = performance.now() - start;
      const memoryUsed = process.memoryUsage().heapUsed - startMemory;

      // Extract route parameters if they exist with null safety
      const routeParams = req?.params && typeof req.params === 'object' ? req.params : {};

      // Truncate large data structures before logging with type guards
      const truncatedBody =
        req?.body && typeof req.body === 'object' ? this.truncateForLog(req.body) : undefined;
      const truncatedQuery =
        req?.query && typeof req.query === 'object' ? this.truncateForLog(req.query) : undefined;
      const truncatedParams =
        Object.keys(routeParams).length > 0 ? this.truncateForLog(routeParams) : undefined;

      // Get additional metadata from config with safe function call
      const additionalMeta = this.config.additionalMetadata
        ? this.config.additionalMetadata(req, res)
        : {};

      const logData: RequestLogData = removeUndefinedDeep({
        timestamp: new Date().toISOString(),
        requestId,
        correlationId: reqContext.correlationId,
        method: req?.method || 'UNKNOWN',
        url: req?.url || req?.path || '/',
        status: res.statusCode || 0,
        statusText: res.statusMessage || '',
        duration: Math.round(duration),
        memoryUsed: Math.round(memoryUsed / 1024 / 1024) + 'MB',
        query: truncatedQuery,
        params: truncatedParams,
        body: truncatedBody,
        userEmail: user?.email,
        context: reqContext,
        headers: {
          contentType: res.get?.('Content-Type'),
          contentLength: res.get?.('Content-Length'),
        },
        ...additionalMeta,
      }) as RequestLogData;

      // Log at different levels based on conditions
      if (res.statusCode >= 500) {
        this.logger.error(logData);
      } else if (duration > this.config.slowRequestThreshold) {
        const durationColor = getDurationColor(String(duration), this.config.enableColors);
        this.logger.warn({
          ...logData,
          message: `Slow request detected - ${durationColor(`${duration}ms`)}`,
        });
      } else if (memoryUsed > this.config.memoryWarningThreshold) {
        this.logger.warn({ ...logData, message: 'High memory usage detected' });
      } else {
        this.logger.info(logData);
      }
    };

    // Register event listeners
    res.once('finish', finishHandler);
    res.once('error', errorHandler);

    next();
  };

  // Get the underlying winston logger instance
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }

  // Update configuration at runtime
  updateConfig(newConfig: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.truncateForLog = createTruncateForLog(this.config);
    this.formatSqlQuery = createSqlFormatter(this.config);
    // Recreate logger with new config
    this.logger = this.createLogger();
  }
}
