import { inspect } from 'util';
import chalk from 'chalk';
import { Request } from 'express';

type ChalkFunction = (text: string) => string;
import { LoggerConfig, WinstonLogInfo } from './types.js';

// Constants for log formatting
export const LEVEL_EMOJIS = {
  error: '❌',
  warn: '⚠️ ',
  info: 'ℹ️ ',
  debug: '🔍',
  query: '🛢️ ',
} as const;

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export const STATUS_CODE_RANGES = {
  SERVER_ERROR: 500,
  CLIENT_ERROR: 400,
  REDIRECT: 300,
  SUCCESS: 200,
} as const;

// Default configuration
export const DEFAULT_CONFIG: Required<Omit<LoggerConfig, 'customLogFormat'>> & {
  customLogFormat?: (info: WinstonLogInfo) => string;
} = Object.freeze({
  level: 'info' as const,
  enableFileLogging: true,
  logsDirectory: 'logs',
  maxFileSize: '20m',
  maxFiles: '7d',
  zippedArchive: true,
  slowRequestThreshold: 1000,
  slowQueryThreshold: 1000,
  memoryWarningThreshold: 1024 * 1024 * 100, // 100MB
  maxArrayLength: 5,
  maxStringLength: 100,
  maxObjectKeys: 20,
  enableColors: process.env.NODE_ENV !== 'production',
  simpleLogging: false,
  customQueryFormatter: (query: string, _params: string) => query,
  getUserFromRequest: (req: Request) => req.currentUser,
  getRequestId: (req: Request) => req.requestId,
  customLogFormat: undefined, // Use the default format instead of JSON
  additionalMetadata: () => ({}),
});

// Helper function to truncate values for logging
export const createTruncateForLog = (config: LoggerConfig) => {
  const maxArrayLength = config.maxArrayLength ?? DEFAULT_CONFIG.maxArrayLength;
  const maxStringLength = config.maxStringLength ?? DEFAULT_CONFIG.maxStringLength;
  const maxObjectKeys = config.maxObjectKeys ?? DEFAULT_CONFIG.maxObjectKeys;

  const truncateForLog = (value: unknown, depth = 0): unknown => {
    if (depth > 3) return '[Nested Object]';

    if (Array.isArray(value)) {
      if (value.length <= maxArrayLength) {
        return value.map((item) => truncateForLog(item, depth + 1));
      }

      const itemsToShow = Math.floor(maxArrayLength / 2);
      const firstItems = value.slice(0, itemsToShow).map((item) => truncateForLog(item, depth + 1));
      const lastItems = value.slice(-itemsToShow).map((item) => truncateForLog(item, depth + 1));

      return [...firstItems, `[...${value.length - maxArrayLength} more items...]`, ...lastItems];
    }

    if (typeof value === 'string' && value.length > maxStringLength) {
      return value.substring(0, maxStringLength) + '...';
    }

    if (value !== null && typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length <= maxObjectKeys) {
        return Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, truncateForLog(v, depth + 1)])
        );
      }

      const keysToShow = Math.floor(maxObjectKeys / 2);
      const firstEntries = Object.entries(value).slice(0, keysToShow);
      const lastEntries = Object.entries(value).slice(-keysToShow);

      const truncatedObj = Object.fromEntries(
        [...firstEntries, ...lastEntries].map(([k, v]) => [k, truncateForLog(v, depth + 1)])
      );

      return {
        ...truncatedObj,
        __truncated: `[...${keys.length - maxObjectKeys} more properties...]`,
      };
    }

    return value;
  };

  return truncateForLog;
};

export const getDurationColor = (duration: string, enableColors: boolean): ChalkFunction => {
  if (!enableColors) return (text: string) => text;

  return Number(duration) > 1000 ? chalk.red : Number(duration) > 500 ? chalk.yellow : chalk.green;
};

export const getStatusColor = (status: number, enableColors: boolean): ChalkFunction => {
  if (!enableColors) return (text: string) => text;

  return status >= STATUS_CODE_RANGES.SERVER_ERROR
    ? chalk.red
    : status >= STATUS_CODE_RANGES.CLIENT_ERROR
      ? chalk.yellow
      : status >= STATUS_CODE_RANGES.REDIRECT
        ? chalk.cyan
        : status >= STATUS_CODE_RANGES.SUCCESS
          ? chalk.green
          : chalk.blue;
};

export const getLevelColor = (level: string, enableColors: boolean): ChalkFunction => {
  if (!enableColors) return (text: string) => text;

  const levelColors = {
    error: chalk.red,
    warn: chalk.yellow,
    info: chalk.blue,
    debug: chalk.gray,
    query: chalk.cyan,
  };

  return levelColors[level as keyof typeof levelColors] || ((text: string) => text);
};

export const getMethodColor = (method: string, enableColors: boolean): string => {
  if (!enableColors) return method.padEnd(6);

  const methodColors: Record<string, ChalkFunction> = {
    GET: chalk.green,
    POST: chalk.yellow,
    PUT: chalk.blue,
    DELETE: chalk.red,
    PATCH: chalk.magenta,
  };

  const colorFn = methodColors[method] || chalk.white;
  return colorFn(method.padEnd(6));
};

export const formatLogMessage = ({
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
  enableColors = true,
}: {
  timestamp: string;
  levelEmoji: string;
  coloredMethod?: string;
  url: string;
  status?: number;
  statusText: string;
  duration: string;
  message: {
    requestId?: string;
    userEmail?: string;
    query?: string;
    body?: unknown;
  };
  statusColor: ChalkFunction;
  durationColor: ChalkFunction;
  enableColors?: boolean;
}) => {
  const grayFn = enableColors ? chalk.gray : (text: string) => text;
  const cyanFn = enableColors ? chalk.cyan : (text: string) => text;
  const dimFn = enableColors ? chalk.dim : (text: string) => text;
  const blueFn = enableColors ? chalk.blue : (text: string) => text;

  const parts = [
    grayFn(timestamp),
    levelEmoji,
    coloredMethod,
    cyanFn(url),
    status ? statusColor(`${status} ${statusText}`) : null,
    durationColor(`${duration}ms`),
  ].filter((part) => part !== null && part !== undefined);

  if (message.requestId) {
    parts.push(`\n${grayFn('├')} RequestID: ${dimFn(message.requestId)}`);
  }

  if (message.body) {
    parts.push(`\n${grayFn('├')} Body: ${dimFn(inspect(message.body))}`);
  }

  if (message.userEmail) {
    parts.push(`\n${grayFn('├')} User: ${blueFn(message.userEmail || 'anonymous')}`);
  }

  return parts.join(' ');
};

export const removeUndefinedDeep = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedDeep);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, removeUndefinedDeep(v)])
    );
  }
  return obj;
};

// Prisma helper functions
export function getQueryType(
  query: string
): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'COMMIT' | 'ROLLBACK' | 'BEGIN' | 'CREATE' | 'OTHER' {
  const type = query.split(' ')[0]?.toUpperCase() || 'OTHER';
  return ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'COMMIT', 'ROLLBACK', 'BEGIN', 'CREATE'].includes(type)
    ? (type as 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'COMMIT' | 'ROLLBACK' | 'BEGIN' | 'CREATE')
    : 'OTHER';
}

export function formatParams(params: unknown): string {
  try {
    // If params is already a string, check if it's valid JSON
    if (typeof params === 'string') {
      try {
        // Try to parse and re-stringify to ensure valid JSON
        JSON.parse(params);
        return params;
      } catch {
        // If it's not valid JSON, wrap it in quotes
        return JSON.stringify(params);
      }
    }
    return JSON.stringify(params, null, 2);
  } catch (error) {
    console.warn('Error formatting params for logging:', error);
    // Fallback: convert to string safely
    return String(params);
  }
}

/**
 * Get caller location from stack trace (Rails-style ↳ indicator)
 * Returns formatted location like "↳ app/controllers/users.ts:42:in `getUser`"
 */
export function getCallerLocation(): string {
  const oldLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = 50; // Capture enough frames
  
  const stack = new Error().stack || '';
  Error.stackTraceLimit = oldLimit;
  
  const lines = stack.split('\n');
  
  // Start from frame 1 (skip "Error" line)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    if (!line) continue;
    
    // Skip internal frames we want to ignore
    if (
      line.includes('node_modules') ||
      line.includes('node:internal') ||
      line.includes('node:diagnostics_channel') ||
      line.includes('node:async_hooks') ||
      line.includes('/dist/') ||         // Our compiled library code
      line.includes('logger.cjs') ||
      line.includes('logger.js') ||
      line.includes('utils.cjs') ||
      line.includes('utils.js') ||
      line.includes('sqlFormatter') ||
      line.includes('EnhancedLogger') ||
      line.includes('setupPrismaLogging') ||
      line.includes('getCallerLocation') ||
      line.includes('winston') ||
      line.includes('prisma/client') ||
      line.includes('prisma-client') ||
      line.includes('@prisma') ||
      line.includes('TracingChannel') ||
      line.includes('Module._compile') ||
      line.includes('Module.load') ||
      line.includes('Function._load') ||
      line.includes('_triggerQuery') ||  // Mock Prisma trigger
      line.includes('.$on(') ||           // Prisma event registration
      line.includes('PrismaClient')       // Prisma client internals
    ) {
      continue;
    }
    
    // Try to extract file location
    // Format: "    at functionName (file:line:column)" or "    at file:line:column"
    const match = line.match(/at\s+(?:([^\s]+)\s+\()?([^)]+):(\d+):(\d+)\)?/);
    
    if (match) {
      const functionName = match[1] || 'anonymous';
      let filePath = match[2] || '';
      const lineNum = match[3];
      
      if (!filePath) continue;
      
      // Clean up file path - remove file:// protocol
      filePath = filePath.replace('file://', '');
      
      // Try to make it relative to current working directory
      const cwd = process.cwd();
      if (filePath.startsWith(cwd)) {
        filePath = filePath.substring(cwd.length + 1);
      }
      
      // Format like Rails: ↳ path/to/file.ts:line:in `function`
      return `↳ ${filePath}:${lineNum}:in \`${functionName}\``;
    }
  }
  
  return ''; // No suitable caller found
}
