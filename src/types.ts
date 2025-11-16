import { Request, Response } from 'express';

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
  
  /** Enable SQL query formatting (requires enablePrismaIntegration: true) */
  enableSqlFormatting?: boolean;
  
  /** Enable Prisma-specific features like SQL query formatting */
  enablePrismaIntegration?: boolean;
  
  /** Custom query formatter function for SQL queries */
  customQueryFormatter?: (query: string, params: string) => string;
  
  /** Function to extract user information from request */
  getUserFromRequest?: (req: Request) => { email?: string; id?: string | number; [key: string]: unknown } | undefined;
  
  /** Function to extract request ID from request */
  getRequestId?: (req: Request) => string | undefined;
  
  /** Custom log format function */
  customLogFormat?: (info: any) => string;
  
  /** Additional metadata to include in logs */
  additionalMetadata?: (req: Request, res: Response) => Record<string, unknown>;
}

export interface QueryLogData {
  type: string;
  query: string;
  params: string;
  duration: string;
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
}