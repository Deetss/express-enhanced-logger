import winston, { format } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { inspect } from 'util';
import chalk from 'chalk';
import { performance } from 'perf_hooks';
import { NextFunction, Request, Response } from 'express';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

import { LoggerConfig, RequestLogData, QueryLogData } from './types.js';
import { DEFAULT_CONFIG, createTruncateForLog, getDurationColor, formatLogMessage, removeUndefinedDeep } from './utils.js';
import { createSqlFormatter } from './sqlFormatter.js';

export class EnhancedLogger {
  private logger: winston.Logger;
  private config: Required<LoggerConfig>;
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
      ? format.printf(this.config.customLogFormat)
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
          zippedArchive: this.config.zippedArchive
        }),
        new DailyRotateFile({
          filename: join(logsDir, 'combined-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          format: format.json(),
          maxFiles: this.config.maxFiles,
          maxSize: this.config.maxFileSize,
          zippedArchive: this.config.zippedArchive
        })
      );
    }

    return winston.createLogger({
      levels: {
        error: 0,
        warn: 1,
        query: 2,
        info: 3,
        debug: 4
      },
      level: this.config.level,
      format: customFormat,
      transports
    });
  }

  private createDefaultFormat() {
    if (process.env.NODE_ENV === 'test') {
      return undefined;
    }

    return format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.printf((info: winston.Logform.TransformableInfo) => {
        const { level, message, timestamp, ...meta } = info as {
          level: string;
          message: any;
          timestamp: string;
        };

        const levelColors = this.config.enableColors ? {
          error: chalk.red,
          warn: chalk.yellow,
          info: chalk.blue,
          debug: chalk.gray,
          query: chalk.cyan
        } : {
          error: (text: string) => text,
          warn: (text: string) => text,
          info: (text: string) => text,
          debug: (text: string) => text,
          query: (text: string) => text
        };

        const levelEmoji = {
          error: '❌',
          warn: '⚠️ ',
          info: 'ℹ️ ',
          debug: '🔍',
          query: '🛢️ '
        }[level] || '📝';

        const duration = message?.duration || '0';
        const durationColor = getDurationColor(duration, this.config.enableColors);

        // Handle HTTP request logs
        if (typeof message === 'object' && message.method) {
          const { method, url, status, statusText } = message;

          const methodColors = this.config.enableColors ? {
            GET: chalk.green(method.padEnd(6)),
            POST: chalk.yellow(method.padEnd(6)),
            PUT: chalk.blue(method.padEnd(6)),
            DELETE: chalk.red(method.padEnd(6)),
            PATCH: chalk.magenta(method.padEnd(6))
          } : {
            GET: method.padEnd(6),
            POST: method.padEnd(6),
            PUT: method.padEnd(6),
            DELETE: method.padEnd(6),
            PATCH: method.padEnd(6)
          };

          const coloredMethod = methodColors[method as keyof typeof methodColors] || 
            (this.config.enableColors ? chalk.white(method.padEnd(6)) : method.padEnd(6));

          const statusColor = this.config.enableColors ? (
            status >= 500 ? chalk.red :
            status >= 400 ? chalk.yellow :
            status >= 300 ? chalk.cyan :
            status >= 200 ? chalk.green :
            chalk.blue
          ) : (text: string) => text;

          return formatLogMessage({
            timestamp,
            levelEmoji,
            coloredMethod,
            url,
            status,
            statusText,
            duration,
            message,
            statusColor,
            durationColor,
            enableColors: this.config.enableColors
          });
        } 
        // Handle SQL query logs
        else if (typeof message === 'object' && level === 'query' && this.config.enablePrismaIntegration) {
          const { type, query, params, duration } = message;
          const formattedQuery = this.formatSqlQuery(query, params);

          const typeColors = this.config.enableColors ? {
            SELECT: chalk.cyan(formattedQuery),
            INSERT: chalk.green(formattedQuery),
            CREATE: chalk.green(formattedQuery),
            UPDATE: chalk.yellow(formattedQuery),
            DELETE: chalk.red(formattedQuery)
          } : {
            SELECT: formattedQuery,
            INSERT: formattedQuery,
            CREATE: formattedQuery,
            UPDATE: formattedQuery,
            DELETE: formattedQuery
          };

          const coloredQuery = typeColors[type as keyof typeof typeColors] ||
            (formattedQuery.startsWith('DECLARE @generated_keys table([id] BIGINT)') ?
              (this.config.enableColors ? chalk.green(formattedQuery) : formattedQuery) :
              (this.config.enableColors ? chalk.white(formattedQuery) : formattedQuery));

          const statusColor = this.config.enableColors ? chalk.dim : (text: string) => text;

          return formatLogMessage({
            timestamp,
            levelEmoji,
            url: coloredQuery,
            statusText: '',
            duration: duration.replace('ms', ''),
            message: {
              ...message,
              query: undefined
            },
            statusColor,
            durationColor,
            enableColors: this.config.enableColors
          });
        }

        // Handle regular logs
        const colorFn = levelColors[level as keyof typeof levelColors];
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
  error(message: any, meta?: any) {
    this.logger.error(message, meta);
  }

  warn(message: any, meta?: any) {
    this.logger.warn(message, meta);
  }

  info(message: any, meta?: any) {
    this.logger.info(message, meta);
  }

  debug(message: any, meta?: any) {
    this.logger.debug(message, meta);
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

    // Extract user and request ID using configured functions
    const user = this.config.getUserFromRequest(req);
    const requestId = this.config.getRequestId(req);

    // Preserve request context
    const reqContext = {
      ip: req?.ip,
      userAgent: req?.get('User-Agent'),
      referer: req?.get('Referer'),
      correlationId: requestId
    };
    
    res.on('finish', () => {
      const duration = performance.now() - start;
      const memoryUsed = process.memoryUsage().heapUsed - startMemory;

      // Extract route parameters if they exist
      const routeParams = req?.params || {};
      
      // Truncate large data structures before logging
      const truncatedBody = req?.body ? this.truncateForLog(req.body) : undefined;
      const truncatedQuery = req?.query ? this.truncateForLog(req.query) : undefined;
      const truncatedParams = Object.keys(routeParams).length ? this.truncateForLog(routeParams) : undefined;
      
      // Get additional metadata from config
      const additionalMeta = this.config.additionalMetadata(req, res);

      const logData: RequestLogData = removeUndefinedDeep({
        timestamp: new Date().toISOString(),
        requestId,
        correlationId: reqContext.correlationId,
        method: req?.method,
        url: req?.url,
        status: res.statusCode,
        statusText: res.statusMessage,
        duration: Math.round(duration),
        memoryUsed: Math.round(memoryUsed / 1024 / 1024) + 'MB',
        query: truncatedQuery,
        params: truncatedParams,
        body: truncatedBody,
        userEmail: user?.email,
        context: reqContext,
        headers: {
          contentType: res.get('Content-Type'),
          contentLength: res.get('Content-Length')
        },
        ...additionalMeta
      }) as RequestLogData;

      // Log at different levels based on conditions
      if (res.statusCode >= 500) {
        this.logger.error(logData);
      } else if (duration > this.config.slowRequestThreshold) {
        const durationColor = getDurationColor(String(duration), this.config.enableColors);
        this.logger.warn({
          ...logData,
          message: `Slow request detected - ${durationColor(`${duration}ms`)}`
        });
      } else if (memoryUsed > this.config.memoryWarningThreshold) {
        this.logger.warn({ ...logData, message: 'High memory usage detected' });
      } else {
        this.logger.info(logData);
      }
    });

    // Log unhandled errors
    res.on('error', (error) => {
      this.logger.error({
        requestId,
        error: error.message,
        stack: error.stack,
        context: reqContext
      });
    });

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