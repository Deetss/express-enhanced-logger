# express-enhanced-logger

An enhanced Express.js logger with performance monitoring, SQL query formatting, and highly customizable features. Built on Winston with TypeScript support.

## Features

- 🚀 **Performance Monitoring** - Track slow requests, memory usage, and response times
- 🔍 **SQL Query Formatting** - Optional Prisma integration with parameter substitution and query beautification
- 🎨 **Colored Output** - Beautiful, readable console logs with syntax highlighting
- 📁 **File Logging** - Automatic log rotation with configurable retention
- ⚙️ **Highly Configurable** - Extensive customization options for any use case
- 🔧 **TypeScript Support** - Full type definitions included
- 🪶 **Zero Dependencies** - Only requires winston and chalk (peer dependency on Express)

## Installation

```bash
npm install express-enhanced-logger
# or
yarn add express-enhanced-logger
```

## Quick Start

### Basic Usage

```typescript
import express from 'express';
import { createLogger, requestLogger } from 'express-enhanced-logger';

const app = express();

// Create logger with default configuration
const logger = createLogger();

// Add request logging middleware
app.use(requestLogger());

// Use logger in your routes
app.get('/api/users', (req, res) => {
  logger.info('Fetching users');
  res.json({ users: [] });
});

app.listen(3000, () => {
  logger.info('Server started on port 3000');
});
```

### With Custom Configuration

```typescript
import { createLogger, requestLogger } from 'express-enhanced-logger';

const logger = createLogger({
  level: 'debug',
  enableFileLogging: true,
  logsDirectory: 'my-logs',
  slowRequestThreshold: 500,
  enableColors: true,
  enablePrismaIntegration: true, // Enable SQL query formatting
});

app.use(requestLogger({
  enablePrismaIntegration: true,
  getUserFromRequest: (req) => req.user, // Custom user extraction
  getRequestId: (req) => req.headers['x-request-id'] as string,
}));
```

## Configuration Options

### LoggerConfig Interface

```typescript
interface LoggerConfig {
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
  getUserFromRequest?: (req: Request) => { email?: string; id?: string; [key: string]: unknown } | undefined;
  
  /** Function to extract request ID from request */
  getRequestId?: (req: Request) => string | undefined;
  
  /** Custom log format function */
  customLogFormat?: (info: any) => string;
  
  /** Additional metadata to include in logs */
  additionalMetadata?: (req: Request, res: Response) => Record<string, unknown>;
}
```

## Usage Examples

### Basic Logging

```typescript
import { createLogger } from 'express-enhanced-logger';

const logger = createLogger();

logger.info('Application started');
logger.warn('This is a warning');
logger.error('An error occurred', { errorCode: 'USER_NOT_FOUND' });
logger.debug('Debug information', { userId: 123 });
```

### Request Logging Middleware

```typescript
import express from 'express';
import { requestLogger } from 'express-enhanced-logger';

const app = express();

// Basic request logging
app.use(requestLogger());

// With custom configuration
app.use(requestLogger({
  slowRequestThreshold: 500,
  getUserFromRequest: (req) => req.currentUser,
  additionalMetadata: (req, res) => ({
    tenantId: req.headers['x-tenant-id'],
    apiVersion: req.headers['api-version']
  })
}));
```

### Prisma Integration (SQL Query Logging)

```typescript
import { createLogger } from 'express-enhanced-logger';

const logger = createLogger({
  enablePrismaIntegration: true,
  enableSqlFormatting: true,
  level: 'query' // This will show SQL queries
});

// In your Prisma setup
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
});

prisma.$on('query', (e) => {
  logger.query({
    type: 'SELECT', // or 'INSERT', 'UPDATE', 'DELETE'
    query: e.query,
    params: JSON.stringify(e.params),
    duration: `${e.duration}ms`
  });
});
```

### Custom User Extraction

```typescript
// If you have custom user authentication
app.use(requestLogger({
  getUserFromRequest: (req) => {
    // Extract from JWT token
    if (req.headers.authorization) {
      const token = req.headers.authorization.replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return { email: decoded.email, id: decoded.userId };
    }
    return undefined;
  }
}));
```

### Multiple Logger Instances

```typescript
import { EnhancedLogger } from 'express-enhanced-logger';

// Create specific loggers for different modules
const authLogger = new EnhancedLogger({
  level: 'debug',
  logsDirectory: 'logs/auth',
  additionalMetadata: (req, res) => ({ module: 'auth' })
});

const apiLogger = new EnhancedLogger({
  level: 'info',
  logsDirectory: 'logs/api',
  slowRequestThreshold: 2000
});

// Use different loggers for different routes
app.use('/auth', authLogger.requestLogger);
app.use('/api', apiLogger.requestLogger);
```

### Custom Log Format

```typescript
const logger = createLogger({
  customLogFormat: (info) => {
    const { timestamp, level, message } = info;
    return `[${timestamp}] ${level.toUpperCase()}: ${JSON.stringify(message)}`;
  }
});
```

### Performance Monitoring

The logger automatically tracks:

- **Request Duration** - Logs slow requests above the threshold
- **Memory Usage** - Warns about high memory consumption
- **HTTP Status Codes** - Color-coded by status ranges
- **Response Sizes** - Tracks Content-Length headers

```typescript
// Configure performance thresholds
const logger = createLogger({
  slowRequestThreshold: 1000,      // 1 second
  memoryWarningThreshold: 50 * 1024 * 1024, // 50MB
});
```

## Sample Output

### HTTP Request Log
```
2024-01-15 10:30:45 ℹ️  GET    /api/users/123 200 OK 245ms
├ RequestID: req_abc123
├ Body: { "includeProfile": true }
├ User: john@example.com
```

### SQL Query Log (with Prisma)
```
2024-01-15 10:30:45 🛢️  SELECT * FROM users WHERE id = '123' AND status = 'ACTIVE' 45ms
```

### Error Log
```
2024-01-15 10:30:45 ❌ error: {
  "requestId": "req_abc123",
  "error": "User not found",
  "stack": "Error: User not found\n    at UserService.findById...",
  "context": {
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0..."
  }
}
```

## Express Type Extensions

The package automatically extends Express Request interface:

```typescript
declare module 'express' {
  interface Request {
    requestId?: string;
    currentUser?: {
      email?: string;
      id?: string;
      [key: string]: unknown;
    };
  }
}
```

## File Logging

Logs are automatically rotated and organized:

```
logs/
├── combined-2024-01-15.log     # All logs
├── error-2024-01-15.log        # Error logs only
├── combined-2024-01-14.log.gz  # Compressed old logs
└── error-2024-01-14.log.gz
```

## API Reference

### Functions

- `createLogger(config?: LoggerConfig)` - Create a new logger instance
- `getLogger()` - Get the default logger instance
- `requestLogger(config?: LoggerConfig)` - Get request logging middleware
- `error(message, meta?)` - Log error using default logger
- `warn(message, meta?)` - Log warning using default logger
- `info(message, meta?)` - Log info using default logger
- `debug(message, meta?)` - Log debug using default logger
- `query(data: QueryLogData)` - Log SQL query using default logger

### Classes

- `EnhancedLogger` - Main logger class
  - `error(message, meta?)` - Log error
  - `warn(message, meta?)` - Log warning
  - `info(message, meta?)` - Log info
  - `debug(message, meta?)` - Log debug
  - `query(data)` - Log SQL query
  - `requestLogger` - Express middleware property
  - `getWinstonLogger()` - Get underlying Winston instance
  - `updateConfig(newConfig)` - Update configuration at runtime

## Migration from Winston

If you're migrating from Winston, it's straightforward:

```typescript
// Before (Winston)
import winston from 'winston';
const logger = winston.createLogger({ ... });

// After (Enhanced Logger)
import { createLogger } from 'express-enhanced-logger';
const logger = createLogger({ ... });

// The logging methods remain the same
logger.info('message');
logger.error('error message');
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - see LICENSE file for details