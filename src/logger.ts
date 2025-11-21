import winston, { format } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { inspect } from 'util';
import { performance } from 'perf_hooks';
import { NextFunction, Request, Response } from 'express';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

import { LoggerConfig, QueryLogData, WinstonLogInfo, PrismaClientLike } from './types.js';
import {
  DEFAULT_CONFIG,
  createTruncateForLog,
  getQueryType,
  formatParams,
  getCallerLocation,
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
    
    // Validate configuration
    if (this.config.simpleLogging && config.customQueryFormatter) {
      console.warn(
        '[express-enhanced-logger] Warning: simpleLogging is enabled, but customQueryFormatter is provided. ' +
        'SQL query formatting will be disabled in simple logging mode.'
      );
    }
    
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
        const { level, message } = info as unknown as WinstonLogInfo;

        // Handle SQL query logs - Winston spreads data directly on info, not in message
        if (level === 'query' && 'query' in info && 'type' in info) {
          const queryInfo = info as unknown as { type: string; query: string; params?: string; duration: string; timestamp: string; caller?: string };
          const { query, params = '', duration, type, caller } = queryInfo;
          
          // Determine query type for color coding
          const queryType = type.toUpperCase();
          
          // Rails-style query logging: model name, duration, then SQL query with syntax highlighting
          let formattedQuery = query;
          
          // Apply syntax highlighting to SQL keywords (Rails-style)
          if (this.config.enableColors) {
            formattedQuery = this.formatSqlQuery(query, ''); // Don't replace params, just highlight
          }
          
          // Parse params for display at the end (Rails format)
          let paramsDisplay = '';
          if (params && params.trim() !== '') {
            try {
              const parsedParams = JSON.parse(params);
              if (Array.isArray(parsedParams) && parsedParams.length > 0) {
                // Rails format: show params as named array with proper formatting
                // Example: [["email", "test@example.com"], ["LIMIT", 1]]
                paramsDisplay = `  ${JSON.stringify(parsedParams)}`;
              }
            } catch {
              // If parsing fails, skip params
            }
          }
          
          // Extract model name from query (Rails shows "User Load", "Post Create", etc.)
          let modelName = '';
          let actionName = 'Load';
          
          // Determine action based on query type
          switch (queryType) {
            case 'INSERT':
              actionName = 'Create';
              break;
            case 'UPDATE':
              actionName = 'Update';
              break;
            case 'DELETE':
              actionName = 'Destroy';
              break;
            case 'SELECT':
              // Check for specific SELECT patterns
              const upperQuery = query.toUpperCase();
              if (upperQuery.includes('SELECT 1 AS ONE') || upperQuery.includes('EXISTS')) {
                actionName = 'Exists?';
              } else if (upperQuery.includes('COUNT(')) {
                actionName = 'Count';
              } else {
                actionName = 'Load';
              }
              break;
            default:
              actionName = '';
          }
          
          // Extract table name from query
          const fromMatch = query.match(/FROM\s+"?(\w+)"?/i);
          const intoMatch = query.match(/INTO\s+"?(\w+)"?/i);
          const updateMatch = query.match(/UPDATE\s+"?(\w+)"?/i);
          
          const tableName = fromMatch?.[1] || intoMatch?.[1] || updateMatch?.[1];
          
          if (tableName) {
            // Convert table name to model name (capitalize, remove trailing 's')
            modelName = tableName.charAt(0).toUpperCase() + tableName.slice(1);
            // Remove trailing 's' for common plural forms (simple heuristic)
            if (modelName.endsWith('s') && modelName.length > 1 && !modelName.endsWith('ss')) {
              modelName = modelName.slice(0, -1);
            }
          }
          
          // Rails format: "  Model Action (duration)  QUERY  [params]"
          // Example: "  User Load (1.2ms)  SELECT..."
          const modelPrefix = modelName && actionName 
            ? `${modelName} ${actionName} ` 
            : queryType === 'BEGIN' || queryType === 'COMMIT' || queryType === 'ROLLBACK'
            ? 'TRANSACTION '
            : '';
            
          let logLine = `  ${modelPrefix}(${duration})  ${formattedQuery}${paramsDisplay}`;
          
          // Apply color based on query type
          if (this.config.enableColors) {
            switch (queryType) {
              case 'SELECT':
                logLine = chalk.cyan(logLine);  // Light blue for all SELECT queries
                break;
              case 'UPDATE':
                logLine = chalk.yellow(logLine);
                break;
              case 'DELETE':
              case 'ROLLBACK':
                // Both DELETE and ROLLBACK are "negative" operations - use red
                logLine = chalk.red(logLine);
                break;
              case 'INSERT':
              case 'CREATE':
                logLine = chalk.green(logLine);
                break;
              case 'BEGIN':
              case 'COMMIT':
                logLine = chalk.magenta(logLine);
                break;
              // Default: keep syntax highlighting from formatSqlQuery
            }
          }
          
          // Add caller location if available (Rails-style ↳ indicator)
          if (caller) {
            const callerLine = this.config.enableColors ? chalk.dim(`  ${caller}`) : `  ${caller}`;
            logLine += `\n${callerLine}`;
          }
          
          return logLine;
        }

        // Handle regular logs - simple Rails style without emojis or fancy formatting
        return typeof message === 'object'
          ? inspect(message, { colors: this.config.enableColors, depth: 5 })
          : String(message);
      })
    );
  }

  // Public logging methods
  error(message: string | object, meta?: Record<string, unknown>) {
    this.logger.error(message as string, meta);
  }

  warn(message: string | object, meta?: Record<string, unknown>) {
    this.logger.warn(message as string, meta);
  }

  info(message: string | object, meta?: Record<string, unknown>) {
    this.logger.info(message as string, meta);
  }

  debug(message: string | object, meta?: Record<string, unknown>) {
    this.logger.debug(message as string, meta);
  }

  query(data: QueryLogData, meta?: Record<string, unknown>) {
    this.logger.log('query', '', { ...data, ...meta });
  }

  // Request logging middleware
  requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = performance.now();

    // Rails-style: Log request start
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timeZoneName: 'short',
    });
    const ip = req?.ip || req?.connection?.remoteAddress || '127.0.0.1';
    this.info(`Started ${req?.method || 'UNKNOWN'} "${req?.url || '/'}" for ${ip} at ${timestamp}`);
    
    // Log route/controller if available
    const route = req?.route?.path || req?.path || req?.url;
    const acceptHeader = req?.get?.('Accept') || 'HTML';
    const format = acceptHeader.includes('json') ? 'JSON' : acceptHeader.includes('xml') ? 'XML' : 'HTML';
    
    // Try to get controller-like information
    let controllerInfo = route;
    
    // Check if route has a custom name/controller property
    if (req?.route) {
      // Check for custom controller metadata (you can set this on routes)
      const routeWithMeta = req.route as { controller?: string; action?: string; stack?: Array<{ handle?: { name?: string } }> };
      const customController = routeWithMeta.controller;
      const customAction = routeWithMeta.action;
      
      if (customController && customAction) {
        controllerInfo = `${customController}#${customAction}`;
      } else if (customController) {
        controllerInfo = `${customController}`;
      } else {
        // Try to get handler function name
        const handler = req.route.stack?.[0]?.handle;
        if (handler && handler.name && handler.name !== 'anonymous') {
          controllerInfo = `${route} (${handler.name})`;
        }
      }
    }
    
    if (controllerInfo) {
      this.info(`Processing by ${controllerInfo} as ${format}`);
    }

    // Log parameters if they exist
    const hasParams = (req?.params && Object.keys(req.params).length > 0) ||
                     (req?.query && Object.keys(req.query).length > 0) ||
                     (req?.body && Object.keys(req.body).length > 0);
    
    if (hasParams) {
      const allParams = {
        ...req?.params,
        ...req?.query,
        ...req?.body,
      };
      this.info(`  Parameters: ${inspect(allParams, { depth: 5, compact: true })}`);
    }

    // Extract request ID using configured function with null safety
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
      this.error({
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

      // Rails-style completion log - simple and clean
      const statusText = res.statusMessage || 'OK';
      const durationMs = Math.round(duration);
      
      // Simple Rails format: Completed 200 OK in 88ms
      if (res.statusCode >= 500) {
        this.error(`Completed ${res.statusCode} ${statusText} in ${durationMs}ms`);
      } else if (duration > this.config.slowRequestThreshold) {
        this.warn(`Completed ${res.statusCode} ${statusText} in ${durationMs}ms (Slow request)`);
      } else {
        this.info(`Completed ${res.statusCode} ${statusText} in ${durationMs}ms`);
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

  // Setup Prisma logging integration
  setupPrismaLogging(prismaClient: PrismaClientLike) {
    // Only setup if not in test environment
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    // Query event handler
    prismaClient.$on('query', (e) => {
      const queryType = getQueryType(e.query);
      const formattedParams = formatParams(e.params);
      const duration = Number(e.duration);
      
      // Capture caller location
      const caller = getCallerLocation();

      if (duration > this.config.slowQueryThreshold) {
        // Truncate both query and params for slow queries
        const truncatedQuery = e.query.substring(0, 200) + (e.query.length > 200 ? '...' : '');
        const truncatedParams = this.truncateForLog(formattedParams);
        
        // Rails-style slow query logging
        this.warn(`  ${queryType} (${duration}ms)  ${truncatedQuery}  ${truncatedParams}`);
        if (caller) {
          this.warn(`  ${caller}`);
        }
        this.warn(`  Slow query detected`);
      } else {
        // Use logger.query() with proper QueryLogData format for Rails-style formatting
        this.query({
          type: queryType,
          query: e.query,
          params: formattedParams,
          duration: `${duration}ms`,
          caller, // Add caller location
        });
      }
    });

    // Info event handler
    prismaClient.$on('info', (e) => {
      this.info(`PRISMA - ${e.message}`);
    });

    // Warn event handler
    prismaClient.$on('warn', (e) => {
      this.warn(`PRISMA - ${e.message}`);
    });

    // Error event handler
    prismaClient.$on('error', (e) => {
      this.error(`PRISMA ERROR - ${e.message}`);
    });
  }
}
