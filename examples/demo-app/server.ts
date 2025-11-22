/**
 * Demo Application for express-enhanced-logger
 * 
 * This server showcases ALL features of the express-enhanced-logger library:
 * - Standard logging (info, warn, error, debug)
 * - Request/response logging with duration tracking
 * - Prisma query logging with AsyncLocalStorage duration tracking
 * - Error handling and error logging
 * - User context logging
 * - Custom timing with measure() helper
 * - Controller helpers for Rails-style organization
 * - Prisma extension for caller location tracking
 */

import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from './prisma/generated/client/index.js';
import { 
  createLogger, 
  measure, 
  setupPrismaLogging,
  createPrismaExtension,
  createController,
  info,
  warn,
  error as logError,
  debug
} from '../../src/index.js';

// =============================================================================
// SETUP: Initialize Logger and Prisma
// =============================================================================

const logger = createLogger({
  enableFileLogging: false,   // Disable file logging for demo (console only)
  simpleLogging: false,       // Enable full SQL formatting
  enableColors: true,         // Enable colors in console
  level: 'debug'              // Show all log levels
});

// Initialize Prisma with event logging enabled
const prismaClient = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' }
  ]
});

// Extend Prisma with caller location tracking
const prisma = prismaClient.$extends(createPrismaExtension());

// Setup Prisma logging integration
setupPrismaLogging(prismaClient);

const app = express();
app.use(express.json());

// =============================================================================
// MIDDLEWARE: Request Logger (tracks duration automatically)
// =============================================================================

app.use(logger.requestLogger);

// =============================================================================
// MIDDLEWARE: Mock User Authentication (for context demonstration)
// =============================================================================

app.use((req: Request, _res: Response, next: NextFunction) => {
  // Simulate authenticated user
  (req as any).user = {
    id: Math.floor(Math.random() * 100),
    email: 'demo@example.com',
    name: 'Demo User'
  };
  next();
});

// =============================================================================
// ROUTE 1: Simple Info Logging
// =============================================================================

app.get('/', (_req: Request, res: Response) => {
  info('Home route accessed');
  info({ message: 'Object-style logging', extra: 'data' });
  
  res.json({
    message: 'express-enhanced-logger Demo Application',
    routes: [
      'GET / - This route (simple logging)',
      'GET /users - Database query demonstration',
      'GET /users/:id - Single user lookup',
      'POST /users - Create user with transaction',
      'GET /posts - Complex query with relations',
      'GET /error - Error handling demonstration',
      'GET /context - User context demonstration',
      'GET /measure - Custom timing with measure()',
      'GET /slow - Simulated slow operation',
      'GET /controller - Controller helper demonstration',
      'GET /all-logs - All log levels showcase'
    ]
  });
});

// =============================================================================
// ROUTE 2: Database Queries (demonstrates AsyncLocalStorage duration tracking)
// =============================================================================

app.get('/users', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    info('Fetching all users from database');
    
    // This query will be logged with duration tracked via AsyncLocalStorage
    const users = await prisma.user.findMany({
      include: {
        profile: true,
        posts: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    info(`Found ${users.length} users`);
    
    res.json({
      count: users.length,
      users
    });
  } catch (err) {
    next(err);
  }
});

app.get('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = parseInt(req.params.id!);
    
    info(`Fetching user with ID: ${userId}`);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        posts: {
          include: {
            tags: true
          }
        }
      }
    });
    
    if (!user) {
      warn(`User not found: ${userId}`);
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// =============================================================================
// ROUTE 3: Create User with Transaction
// =============================================================================

app.post('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, name, bio } = req.body;
    
    info('Creating new user with profile', { email, name });
    
    // Transaction - multiple queries will be logged
    const user = await prisma.$transaction(async (tx: any) => {
      const newUser = await tx.user.create({
        data: {
          email,
          name,
          profile: bio ? {
            create: { bio }
          } : undefined
        },
        include: {
          profile: true
        }
      });
      
      info(`User created with ID: ${newUser.id}`);
      return newUser;
    });
    
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// =============================================================================
// ROUTE 4: Complex Query with Multiple Relations
// =============================================================================

app.get('/posts', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    info('Fetching published posts with authors and tags');
    
    const posts = await prisma.post.findMany({
      where: { published: true },
      include: {
        author: {
          include: {
            profile: true
          }
        },
        tags: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    info(`Found ${posts.length} published posts`);
    
    res.json({
      count: posts.length,
      posts
    });
  } catch (err) {
    next(err);
  }
});

// =============================================================================
// ROUTE 5: Error Handling (demonstrates error logging)
// =============================================================================

app.get('/error', (_req: Request, _res: Response) => {
  warn('About to throw an intentional error for demonstration');
  
  // This will trigger the error handler
  throw new Error('This is a demonstration error!');
});

app.get('/db-error', async (_req: Request, _res: Response) => {
  // This will cause a database error
  await prisma.$queryRaw`SELECT * FROM non_existent_table`;
});

// =============================================================================
// ROUTE 6: User Context Logging
// =============================================================================

app.get('/context', (req: Request, res: Response) => {
  const user = (req as any).user;
  
  // Log with user context
  info('User-specific action', {
    userId: user.id,
    userEmail: user.email,
    action: 'viewed_context_page',
    timestamp: new Date().toISOString()
  });
  
  logger.info(`User ${user.name} accessed context route`, {
    user: {
      id: user.id,
      email: user.email
    }
  });
  
  res.json({
    message: 'Check the logs to see user context!',
    user
  });
});

// =============================================================================
// ROUTE 7: Custom Timing with measure()
// =============================================================================

app.get('/measure', async (_req: Request, res: Response) => {
  info('Demonstrating measure() helper for custom timing');
  
  // Measure a synchronous operation
  const syncResult = measure('sync-calculation', () => {
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
      sum += i;
    }
    return sum;
  });
  
  info(`Sync calculation result: ${syncResult}`);
  
  // Measure an async operation
  const asyncResult = await measure('async-operation', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return 'Async operation completed';
  });
  
  info(`Async operation result: ${asyncResult}`);
  
  // Measure a database query
  const userCount = await measure('count-users', async () => {
    return await prisma.user.count();
  });
  
  res.json({
    message: 'Custom timing completed - check logs!',
    results: {
      syncCalculation: syncResult,
      asyncOperation: asyncResult,
      userCount
    }
  });
});

// =============================================================================
// ROUTE 8: Simulated Slow Operation
// =============================================================================

app.get('/slow', async (_req: Request, res: Response) => {
  info('Starting slow operation...');
  
  const result = await measure('slow-multi-step-operation', async () => {
    // Step 1: Slow calculation
    await measure('step-1-calculation', async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      info('Step 1 complete');
    });
    
    // Step 2: Database query
    const users = await measure('step-2-db-query', async () => {
      return await prisma.user.findMany({ take: 5 });
    });
    
    // Step 3: Processing
    await measure('step-3-processing', async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      info('Step 3 complete');
    });
    
    return { processedUsers: users.length };
  });
  
  info('Slow operation completed!', result);
  
  res.json({
    message: 'Slow operation completed',
    ...result
  });
});

// =============================================================================
// ROUTE 9: Controller Helpers (Rails-style organization)
// =============================================================================

const usersController = createController('UsersController');

app.get('/controller', usersController('index', async (_req: Request, res: Response) => {
  info('UsersController#index called');
  const users = await prisma.user.findMany({ take: 5 });
  res.json({ users });
}));

app.get('/controller/:id', usersController('show', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id!);
  info(`UsersController#show called for user ${id}`);
  
  const user = await prisma.user.findUnique({ where: { id } });
  
  if (!user) {
    warn(`User not found: ${id}`);
    res.status(404).json({ error: 'User not found' });
    return;
  }
  
  res.json(user);
}));

// =============================================================================
// ROUTE 10: All Log Levels Showcase
// =============================================================================

app.get('/all-logs', (_req: Request, res: Response) => {
  debug('This is a DEBUG message - lowest priority');
  info('This is an INFO message - general information');
  warn('This is a WARN message - warning about something');
  logError('This is an ERROR message - something went wrong');
  
  logger.debug('Debug with logger instance', { detail: 'extra debug info' });
  logger.info('Info with logger instance', { detail: 'extra info' });
  logger.warn('Warn with logger instance', { detail: 'extra warning info' });
  logger.error('Error with logger instance', { detail: 'extra error info' });
  
  res.json({
    message: 'All log levels demonstrated - check console!',
    levels: ['debug', 'info', 'warn', 'error']
  });
});

// =============================================================================
// ERROR HANDLER: Catches all errors and logs them
// =============================================================================

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logError('Unhandled error caught by error handler', {
    error: err.message,
    stack: err.stack,
    name: err.name
  });
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// START SERVER
// =============================================================================

const PORT = process.env.PORT || 3333;

async function startServer() {
  try {
    // Connect to database
    await prisma.$connect();
    info('✓ Database connected');
    
    // Start Express server
    app.listen(PORT, () => {
      info(`✓ Server started on port ${PORT}`);
      info('='.repeat(60));
      info('express-enhanced-logger Demo Application');
      info('='.repeat(60));
      info(`Visit http://localhost:${PORT} for route information`);
      info('='.repeat(60));
    });
  } catch (err) {
    logError('Failed to start server', { error: err });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  info('Shutting down gracefully...');
  await prisma.$disconnect();
  info('✓ Database disconnected');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  info('Shutting down gracefully...');
  await prisma.$disconnect();
  info('✓ Database disconnected');
  process.exit(0);
});

startServer();
