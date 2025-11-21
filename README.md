# express-enhanced-logger

[![npm version](https://img.shields.io/npm/v/express-enhanced-logger.svg)](https://www.npmjs.com/package/express-enhanced-logger)
[![Test Coverage](https://img.shields.io/badge/coverage-86%25-brightgreen.svg)](https://github.com/Deetss/express-enhanced-logger)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An enhanced Express.js logger with performance monitoring, SQL query formatting, and highly customizable features. Built on Winston with full TypeScript support.

## ✨ Features

- 🚀 **Performance Monitoring** - Track slow requests, memory usage, and response times
- 🔍 **Smart SQL Formatting** - Intelligent truncation for large IN clauses with parameter substitution
- 🗄️ **Prisma Integration** - Plug-and-play Prisma logging with one line of code
- 🎨 **Colored Output** - Beautiful, readable console logs with syntax highlighting
- 📁 **File Logging** - Automatic log rotation with configurable retention
- ⚙️ **Highly Configurable** - Extensive customization options for any use case
- 🔧 **TypeScript First** - Full type definitions and interfaces included
- ✅ **Well Tested** - 86% test coverage with 201 passing tests
- 🪶 **Lightweight** - Minimal dependencies (winston, chalk, winston-daily-rotate-file)

## 📦 Installation

```bash
npm install express-enhanced-logger
# or
yarn add express-enhanced-logger
# or
pnpm add express-enhanced-logger
```

**Requirements:**

- Node.js >= 18.0.0
- Express.js >= 4.0.0 or >= 5.0.0 (peer dependency)

**Module System Support:**

This library supports **both ES modules and CommonJS**:

```javascript
// ES modules (import)
import { EnhancedLogger } from 'express-enhanced-logger';

// CommonJS (require)
const { EnhancedLogger } = require('express-enhanced-logger');
```

## 🚀 Quick Start

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

### Prisma Integration (One-Line Setup!)

```typescript
import { PrismaClient } from '@prisma/client';
import { setupPrismaLogging } from 'express-enhanced-logger';

const prismaClient = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' }
  ]
});

// That's it! Automatic logging for all Prisma events
setupPrismaLogging(prismaClient);

export default prismaClient;
```

> 🎯 **See the [Prisma Integration](#prisma-integration-sql-query-logging) section below for detailed usage and examples.**

### With Custom Configuration

```typescript
import { createLogger, requestLogger } from 'express-enhanced-logger';

const logger = createLogger({
  level: 'debug',
  enableFileLogging: true,
  logsDirectory: 'my-logs',
  slowRequestThreshold: 500, // Log requests slower than 500ms
  slowQueryThreshold: 1000, // Log slow Prisma queries
  enableColors: true,
  maxArrayLength: 10, // Truncate arrays longer than 10 items
});

// Use request logger with user extraction
app.use(
  requestLogger({
    getUserFromRequest: (req) => req.user?.email, // Extract user email
    getRequestId: (req) => req.headers['x-request-id'] as string, // Extract request ID
  })
);
```

## ⚙️ Configuration Options

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

  /** Slow query threshold in milliseconds for Prisma queries (default: 1000) */
  slowQueryThreshold?: number;

  /** Memory warning threshold in bytes (default: 100MB) */
  memoryWarningThreshold?: number;

  /** Maximum array length to show in logs before truncating (default: 5) */
  maxArrayLength?: number;

  /** Maximum string length to show in logs before truncating (default: 100) */
  maxStringLength?: number;

  /** Maximum object keys to show in logs before truncating (default: 20) */
  maxObjectKeys?: number;

  /** Enable colored console output (default: true in development, false in production) */
  enableColors?: boolean;

  /** Enable simple logging mode - shows only the message without level or formatting (default: false) */
  simpleLogging?: boolean;

  /** Enable SQL query formatting for Prisma (default: true when enablePrismaIntegration is true) */
  enableSqlFormatting?: boolean;

  /** Enable Prisma-specific features like SQL query logging (default: false) */
  enablePrismaIntegration?: boolean;

  /** Custom query formatter function for SQL queries */
  customQueryFormatter?: (query: string, params: string) => string;

  /** Function to extract user information from request */
  getUserFromRequest?: (req: Request) => string | { email?: string; id?: string; [key: string]: unknown } | undefined;

  /** Function to extract request ID from request */
  getRequestId?: (req: Request) => string | undefined;

  /** Custom log format function (replaces default formatting) */
  customLogFormat?: (info: WinstonLogInfo) => string;

  /** Additional metadata to include in request logs */
  additionalMetadata?: (req: Request, res: Response) => Record<string, unknown>;
}
```

## 📝 Usage Examples

### Basic Logging

```typescript
import { createLogger } from 'express-enhanced-logger';

const logger = createLogger();

// String messages
logger.info('Application started');
logger.warn('This is a warning');
logger.error('An error occurred');
logger.debug('Debug information');

// With metadata
logger.info('User login', { userId: 123, ip: '192.168.1.1' });
logger.error('Database error', { error: 'Connection timeout', query: 'SELECT * FROM users' });

// Object messages
logger.info({ event: 'user_login', userId: 456, success: true });
```

### Using Convenience Functions

```typescript
import { info, warn, error, debug } from 'express-enhanced-logger';

// Use exported functions directly (uses default logger)
info('Server starting...');
warn('Low memory warning');
error('Failed to connect to database');
debug('Request payload', { body: req.body });
```

### Simple Logging Mode

For cleaner output without timestamps, log levels, or formatting:

```typescript
import { createLogger } from 'express-enhanced-logger';

// Enable simple logging mode
const logger = createLogger({ simpleLogging: true });

logger.info('Just the message'); // Output: Just the message
logger.warn('A warning message'); // Output: A warning message
logger.error({ code: 500, msg: 'Error' }); // Output: { code: 500, msg: 'Error' }

// Compare with normal logging:
const normalLogger = createLogger({ simpleLogging: false });
normalLogger.info('With formatting'); // Output: 2025-11-16 17:52:15 ℹ️ info: With formatting
```

### Request Logging Middleware

```typescript
import express from 'express';
import { requestLogger } from 'express-enhanced-logger';

const app = express();

// Basic request logging
app.use(requestLogger());

// With custom configuration
app.use(
  requestLogger({
    slowRequestThreshold: 500,
    getUserFromRequest: (req) => req.currentUser,
    additionalMetadata: (req, res) => ({
      tenantId: req.headers['x-tenant-id'],
      apiVersion: req.headers['api-version'],
    }),
  })
);
```

### Prisma Integration (SQL Query Logging)

The logger includes smart SQL formatting that efficiently truncates large queries, particularly IN clauses with many parameters.

**⚠️ IMPORTANT:** Prisma integration is **incompatible with `simpleLogging: true`**. Make sure to set `simpleLogging: false` (or omit it, as false is the default) when using `logger.query()`.

#### Plug-and-Play Setup (Recommended)

The easiest way to integrate Prisma logging is using the `setupPrismaLogging()` function:

```typescript
import { PrismaClient } from '@prisma/client';
import { createLogger, setupPrismaLogging } from 'express-enhanced-logger';

// Create logger with Prisma integration
const logger = createLogger({
  level: 'query', // Enable query-level logging
  slowQueryThreshold: 1000, // Log queries slower than 1 second as warnings
});

// Create Prisma client with event logging
const prismaClient = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' }
  ]
});

// Setup Prisma logging - automatically configures all event handlers
setupPrismaLogging(prismaClient);

// That's it! All Prisma events are now logged through the enhanced logger
export default prismaClient;
```

The `setupPrismaLogging()` function automatically:

- Enables Prisma integration
- Sets up event handlers for `query`, `info`, `warn`, and `error` events
- Formats and logs queries with smart truncation
- Highlights slow queries based on `slowQueryThreshold`
- Only activates in non-test environments

#### Using with Custom Logger Instance

If you're using a custom logger instance:

```typescript
import { EnhancedLogger } from 'express-enhanced-logger';
import { PrismaClient } from '@prisma/client';

const logger = new EnhancedLogger({
  level: 'query',
  slowQueryThreshold: 500, // Custom threshold
});

const prismaClient = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' }
  ]
});

// Setup logging on the custom instance
logger.setupPrismaLogging(prismaClient);
```

#### Manual Setup (Advanced)

If you need more control, you can manually setup the event handlers:

```typescript
import { createLogger } from 'express-enhanced-logger';
import { PrismaClient } from '@prisma/client';

const logger = createLogger({
  enablePrismaIntegration: true,
  enableSqlFormatting: true,
  level: 'query', // Enable query-level logging
  simpleLogging: false, // REQUIRED: Must be false for Prisma integration
});

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
});

// Subscribe to Prisma query events
prisma.$on('query', (e) => {
  // Use logger.query() with proper data structure
  logger.query({
    type: e.query.split(' ')[0].toUpperCase(), // Extract query type (SELECT, INSERT, etc.)
    query: e.query,
    params: JSON.stringify(e.params),
    duration: `${e.duration}ms`,
  });
});
```

**Smart Query Truncation:**

The logger intelligently truncates only queries with large parameter lists (10+ parameters in IN clauses):

```typescript
// Short queries - displayed in full
SELECT * FROM users WHERE id IN (1, 2, 3)

// Large IN clauses - smartly truncated
SELECT * FROM users WHERE id IN (1,2,3,...12 more...,18,19,20)

// Works even without parameter values - truncates placeholders
SELECT * FROM lots WHERE id IN (@P1,@P2,@P3,...530 more...,@P534,@P535,@P536)
```

**Common Issues:**

- **"undefined" in logs**: You have `simpleLogging: true` enabled. Set it to `false`.
- **Queries not truncated**: Make sure you're calling `logger.query()` (not `logger.info()`) with the correct data structure `{type, query, params, duration}`.
- **Configuration warning on startup**: The logger will warn you if you have incompatible settings enabled.

### Custom User Extraction

```typescript
import jwt from 'jsonwebtoken';

// Extract user from JWT token
app.use(
  requestLogger({
    getUserFromRequest: (req) => {
      if (req.headers.authorization) {
        try {
          const token = req.headers.authorization.replace('Bearer ', '');
          const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
          return decoded.email; // Return string
          // OR return object: { email: decoded.email, id: decoded.userId }
        } catch {
          return undefined;
        }
      }
      return undefined;
    },
    getRequestId: (req) => {
      // Extract from header or generate
      return req.headers['x-request-id'] as string || crypto.randomUUID();
    },
  })
);
```

### Multiple Logger Instances

```typescript
import { EnhancedLogger } from 'express-enhanced-logger';

// Create specific loggers for different modules
const authLogger = new EnhancedLogger({
  level: 'debug',
  logsDirectory: 'logs/auth',
  additionalMetadata: (req, res) => ({ module: 'auth' }),
});

const apiLogger = new EnhancedLogger({
  level: 'info',
  logsDirectory: 'logs/api',
  slowRequestThreshold: 2000,
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
  },
});
```

### Performance Monitoring

The logger automatically tracks request performance and memory usage:

```typescript
const logger = createLogger({
  slowRequestThreshold: 1000, // Warn about requests slower than 1 second
  memoryWarningThreshold: 50 * 1024 * 1024, // Warn when heap exceeds 50MB
});

app.use(requestLogger());
```

**What's tracked automatically:**

- ⏱️ **Request Duration** - Logs slow requests above threshold with warning emoji
- 💾 **Memory Usage** - Shows heap memory delta per request
- 📊 **HTTP Status Codes** - Color-coded by status ranges (2xx green, 4xx yellow, 5xx red)
- 📦 **Response Sizes** - Tracks Content-Length headers
- 👤 **User Context** - Includes user email/ID when available
- 🔗 **Request IDs** - Tracks request correlation IDs

## 📊 Sample Output

### HTTP Request Log

```text
2025-11-17 10:30:45 ℹ️  GET    /api/users/123 200 OK 245ms
├ RequestID: req_abc123
├ User: john@example.com
└ Memory: +2.5MB
```

### Slow Request Warning

```text
2025-11-17 10:30:45 ⚠️  POST   /api/reports 200 OK 1850ms (SLOW)
├ RequestID: req_def456
├ Body: { "type": "monthly", "year": 2025 }
└ User: admin@example.com
```

### SQL Query Log (with Prisma)

```sql
2025-11-17 10:30:45 🛢️  SELECT * FROM users WHERE id = '123' AND status = 'ACTIVE' 45ms
```

### Large IN Clause (Smart Truncation)

```sql
2025-11-17 10:30:45 🛢️  SELECT * FROM orders WHERE id IN (1,2,3,...47 more...,53,54,55) 120ms
```

### Error Log

```json
2025-11-17 10:30:45 ❌ error: User not found
{
  "requestId": "req_abc123",
  "errorCode": "USER_NOT_FOUND",
  "userId": 123,
  "stack": "Error: User not found\n    at UserService.findById..."
}
```

### TypeScript Types

```typescript
// Query log data for Prisma integration
interface QueryLogData {
  type: string;        // Query type (e.g., 'query', 'SELECT', 'INSERT')
  query: string;       // SQL query string
  params: string;      // JSON stringified parameters
  duration: string;    // Query duration (e.g., '50' or '50ms')
}

// Request log data (internal)
interface RequestLogData {
  timestamp: string;
  requestId?: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  duration: number;
  memoryUsed: string;
  userEmail?: string;
  body?: unknown;
  // ... additional fields
}
```

### Express Type Extensions

The package extends Express types for better TypeScript support:

```typescript
declare module 'express' {
  interface Request {
    requestId?: string;
    currentUser?: string | {
      email?: string;
      id?: string;
      [key: string]: unknown;
    };
  }
}
```

You can use these in your Express routes:

```typescript
app.get('/api/profile', (req, res) => {
  // TypeScript knows about these properties
  console.log(req.requestId);
  console.log(req.currentUser);
});
```

## 📁 File Logging

Logs are automatically rotated and organized by date:

```text
logs/
├── combined-2025-11-17.log      # All logs for today
├── error-2025-11-17.log         # Error logs only for today
├── combined-2025-11-16.log.gz   # Compressed logs from yesterday
└── error-2025-11-16.log.gz      # Compressed error logs from yesterday
```

**Configuration:**

```typescript
const logger = createLogger({
  enableFileLogging: true,
  logsDirectory: 'logs',
  maxFileSize: '20m',      // Rotate when file reaches 20MB
  maxFiles: '7d',          // Keep logs for 7 days
  zippedArchive: true,     // Compress old logs
});
```

**Log Format:**

File logs use JSON format for easy parsing and analysis:

```json
{
  "timestamp": "2025-11-17T10:30:45.123Z",
  "level": "info",
  "message": "GET /api/users 200 OK",
  "requestId": "req_abc123",
  "method": "GET",
  "url": "/api/users",
  "status": 200,
  "duration": 245,
  "userEmail": "john@example.com"
}
```

## 🔌 API Reference

### Exported Functions

#### `createLogger(config?: LoggerConfig): EnhancedLogger`

Creates a new logger instance and sets it as the default logger.

```typescript
const logger = createLogger({ level: 'debug' });
```

#### `getLogger(): EnhancedLogger`

Gets the default logger instance (creates one with default config if none exists).

```typescript
const logger = getLogger();
logger.info('Using default logger');
```

#### `requestLogger(config?: LoggerConfig): RequestHandler`

Returns Express middleware for request logging.

```typescript
app.use(requestLogger({ slowRequestThreshold: 500 }));
```

#### Convenience Logging Functions

Use the default logger directly without creating an instance:

```typescript
import { error, warn, info, debug, query } from 'express-enhanced-logger';

info('Server started');
warn('Low disk space');
error('Database connection failed', { code: 'ECONNREFUSED' });
debug('Processing request', { requestId: '123' });
query({ type: 'query', query: 'SELECT ...', params: '[]', duration: '50' });
```

### EnhancedLogger Class

#### Methods

- **`error(message, meta?)`** - Log error message
- **`warn(message, meta?)`** - Log warning message
- **`info(message, meta?)`** - Log info message
- **`debug(message, meta?)`** - Log debug message
- **`query(data: QueryLogData)`** - Log SQL query (requires `enablePrismaIntegration: true`)
- **`getWinstonLogger(): winston.Logger`** - Get underlying Winston instance
- **`updateConfig(newConfig: Partial<LoggerConfig>)`** - Update configuration at runtime

#### Properties

- **`requestLogger`** - Express middleware function for request logging

#### Example

```typescript
import { EnhancedLogger } from 'express-enhanced-logger';

const logger = new EnhancedLogger({
  level: 'info',
  enableFileLogging: true,
});

logger.info('Application started');
logger.error('Something went wrong', { errorCode: 500 });

// Update config at runtime
logger.updateConfig({ level: 'debug' });

// Access Winston logger directly
const winston = logger.getWinstonLogger();
winston.log('custom', 'Custom log level');
```

## 🔄 Migration from Winston

If you're migrating from Winston, it's straightforward:

```typescript
// Before (Winston)
import winston from 'winston';
const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});

// After (Enhanced Logger)
import { createLogger } from 'express-enhanced-logger';
const logger = createLogger({
  level: 'info',
  enableFileLogging: true,
  logsDirectory: 'logs'
});

// The logging methods remain the same
logger.info('message');
logger.error('error message', { context: 'additional data' });

// Plus you get additional features
app.use(logger.requestLogger); // Built-in request logging
```

## 🎯 Best Practices

### 1. Environment-Based Configuration

```typescript
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  enableFileLogging: process.env.NODE_ENV === 'production',
  enableColors: process.env.NODE_ENV !== 'production',
  slowRequestThreshold: Number(process.env.SLOW_REQUEST_THRESHOLD) || 1000,
});
```

### 2. Structured Logging

Always include context in your logs:

```typescript
// Good ✅
logger.info('User login successful', {
  userId: user.id,
  ip: req.ip,
  timestamp: new Date().toISOString(),
});

// Less useful ❌
logger.info('Login successful');
```

### 3. Error Handling

Log errors with full context:

```typescript
try {
  await processPayment(order);
} catch (error) {
  logger.error('Payment processing failed', {
    orderId: order.id,
    amount: order.total,
    error: error.message,
    stack: error.stack,
  });
  throw error;
}
```

### 4. Request Correlation

Use request IDs to trace requests through your system:

```typescript
app.use(requestLogger({
  getRequestId: (req) => {
    // Use existing ID or generate new one
    return req.headers['x-request-id'] as string || crypto.randomUUID();
  },
}));

// Then in your route handlers
app.get('/api/users/:id', async (req, res) => {
  logger.info('Fetching user', { 
    requestId: req.requestId,
    userId: req.params.id 
  });
});
```

### 5. Sensitive Data

Never log sensitive information:

```typescript
// Bad ❌
logger.info('User login', { 
  email: user.email,
  password: user.password  // Never log passwords!
});

// Good ✅
logger.info('User login', {
  userId: user.id,
  email: user.email,
  // password is omitted
});
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

**Quick Start for Contributors:**

```bash
# Clone and install
git clone https://github.com/Deetss/express-enhanced-logger.git
cd express-enhanced-logger
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build
npm run build

# Lint and format
npm run lint
npm run format
```

**Current Test Coverage:** 86% (201 passing tests)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with:

- [Winston](https://github.com/winstonjs/winston) - Logging framework
- [Chalk](https://github.com/chalk/chalk) - Terminal string styling
- [winston-daily-rotate-file](https://github.com/winstonjs/winston-daily-rotate-file) - Log rotation

## 📞 Support

- 🐛 [Report bugs](https://github.com/Deetss/express-enhanced-logger/issues)
- 💡 [Request features](https://github.com/Deetss/express-enhanced-logger/issues)
- 📖 [Documentation](https://github.com/Deetss/express-enhanced-logger#readme)
- 📦 [NPM Package](https://www.npmjs.com/package/express-enhanced-logger)

## 🔗 Related Projects

- [express-winston](https://github.com/bithavoc/express-winston) - Alternative Express logging middleware
- [morgan](https://github.com/expressjs/morgan) - HTTP request logger middleware
- [pino](https://github.com/pinojs/pino) - Fast JSON logger

---

Made with ❤️ by [Dylan Dietz](https://github.com/Deetss)
