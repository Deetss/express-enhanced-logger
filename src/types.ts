import { Request, Response } from 'express';

// Winston log info interface
export interface WinstonLogInfo {
  level: string;
  message: unknown;
  timestamp: string;
  [key: string]: unknown;
}

export interface LoggerConfig {
  /** Log level (default: 'info') */
  level?: 'error' | 'warn' | 'info' | 'debug' | 'query';

  /** Enable file logging (default: true) */
  enableFileLogging?: boolean;

  /** Directory for log files (default: 'logs') */
  logsDirectory?: string;

  /** Maximum file size before rotation (default: '20m') */
  maxFileSize?: string;

  /** Number of days to keep log files (default: '7d') */
  maxFiles?: string;

  /** Enable gzip compression of rotated logs (default: true) */
  zippedArchive?: boolean;

  /** Slow request threshold in milliseconds (default: 1000) */
  slowRequestThreshold?: number;

  /** Memory warning threshold in bytes (default: 100MB) */
  memoryWarningThreshold?: number;

  /** Maximum array length to show in logs before truncating (default: 5) */
  maxArrayLength?: number;

  /** Maximum string length to show in logs before truncating (default: 100) */
  maxStringLength?: number;

  /** Maximum object keys to show in logs before truncating (default: 20) */
  maxObjectKeys?: number;

  /** Enable colored console output (default: true in development) */
  enableColors?: boolean;

  /** Slow query threshold in milliseconds for Prisma queries (default: 1000) */
  slowQueryThreshold?: number;

  /** Enable simple logging mode - shows only the message without level or formatting (default: false) */
  simpleLogging?: boolean;

  /** Custom query formatter function for SQL queries */
  customQueryFormatter?: (query: string, params: string) => string;

  /** Function to extract user information from request */
  getUserFromRequest?: (
    req: Request
  ) => { email?: string; id?: string | number; [key: string]: unknown } | undefined;

  /** Function to extract request ID from request */
  getRequestId?: (req: Request) => string | undefined;

  /** Custom log format function */
  customLogFormat?: (info: WinstonLogInfo) => string;

  /** Additional metadata to include in logs */
  additionalMetadata?: (req: Request, res: Response) => Record<string, unknown>;
}

export interface QueryLogData {
  type: string;
  query: string;
  params: string;
  duration: string;
  /** Optional caller location (Rails-style ↳ indicator) */
  caller?: string;
}

export interface RequestLogData {
  timestamp: string;
  requestId?: string;
  correlationId?: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  duration: number;
  memoryUsed: string;
  query?: unknown;
  params?: unknown;
  body?: unknown;
  userEmail?: string;
  context?: Record<string, unknown>;
  headers?: Record<string, string | undefined>;
}

// Prisma Client types for integration
export interface PrismaQueryEvent {
  timestamp: Date;
  query: string;
  params: string;
  duration: number;
  target: string;
}

export interface PrismaLogEvent {
  timestamp: Date;
  message: string;
  target: string;
}

export type PrismaLogLevel = 'query' | 'info' | 'warn' | 'error';

export interface PrismaClientLike {
  $on: <T extends PrismaLogLevel>(
    eventType: T,
    callback: (event: T extends 'query' ? PrismaQueryEvent : PrismaLogEvent) => void
  ) => void;
}

// Extend Express Request type
declare module 'express' {
  interface Request {
    requestId?: string;
    currentUser?: {
      email?: string;
      id?: string | number;
      [key: string]: unknown;
    };
  }
  
  interface Route {
    /** Optional controller name for Rails-style logging */
    controller?: string;
    /** Optional action name for Rails-style logging */
    action?: string;
  }
}
