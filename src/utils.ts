import { inspect } from 'util';
import chalk from 'chalk';

type ChalkFunction = (text: string) => string;
import { LoggerConfig } from './types.js';

// Default configuration
export const DEFAULT_CONFIG: Required<LoggerConfig> = {
  level: 'info',
  enableFileLogging: true,
  logsDirectory: 'logs',
  maxFileSize: '20m',
  maxFiles: '7d',
  zippedArchive: true,
  slowRequestThreshold: 1000,
  memoryWarningThreshold: 1024 * 1024 * 100, // 100MB
  maxArrayLength: 5,
  maxStringLength: 100,
  maxObjectKeys: 20,
  enableColors: process.env.NODE_ENV !== 'production',
  enableSqlFormatting: true,
  enablePrismaIntegration: false,
  customQueryFormatter: (query: string, _params: string) => query,
  getUserFromRequest: (req) => req.currentUser,
  getRequestId: (req) => req.requestId,
  customLogFormat: (info: any) => JSON.stringify(info),
  additionalMetadata: () => ({})
};

// Helper function to truncate values for logging
export const createTruncateForLog = (config: LoggerConfig) => {
  const maxArrayLength = config.maxArrayLength ?? DEFAULT_CONFIG.maxArrayLength;
  const maxStringLength = config.maxStringLength ?? DEFAULT_CONFIG.maxStringLength;
  const maxObjectKeys = config.maxObjectKeys ?? DEFAULT_CONFIG.maxObjectKeys;

  const truncateForLog = (value: unknown, depth = 0): unknown => {
    if (depth > 3) return '[Nested Object]';
    
    if (Array.isArray(value)) {
      if (value.length <= maxArrayLength) {
        return value.map(item => truncateForLog(item, depth + 1));
      }
      
      const itemsToShow = Math.floor(maxArrayLength / 2);
      const firstItems = value.slice(0, itemsToShow).map(item => truncateForLog(item, depth + 1));
      const lastItems = value.slice(-itemsToShow).map(item => truncateForLog(item, depth + 1));
      
      return [
        ...firstItems,
        `[...${value.length - maxArrayLength} more items...]`,
        ...lastItems
      ];
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
      
      const truncatedObj = Object.fromEntries([
        ...firstEntries,
        ...lastEntries
      ].map(([k, v]) => [k, truncateForLog(v, depth + 1)]));
      
      return {
        ...truncatedObj,
        __truncated: `[...${keys.length - maxObjectKeys} more properties...]`
      };
    }
    
    return value;
  };

  return truncateForLog;
};

export const getDurationColor = (duration: string, enableColors: boolean) => {
  if (!enableColors) return (text: string) => text;
  
  return Number(duration) > 1000
    ? chalk.red
    : Number(duration) > 500
      ? chalk.yellow
      : chalk.green;
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
  enableColors = true
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
    durationColor(`${duration}ms`)
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