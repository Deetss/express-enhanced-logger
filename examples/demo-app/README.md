# express-enhanced-logger Demo Application

This demo application showcases **all features** of the `express-enhanced-logger` library in a real-world Express + Prisma setup.

## 🎯 Purpose

1. **Testing During Development**: Test library changes live without `npm link` or `npm pack`
2. **Reference Implementation**: See all library features in action
3. **Documentation**: Practical examples for contributors and users

## 🚀 Quick Start

### 1. Install Dependencies

From the **root** of the repository:

```bash
npm install
```

This installs all required dependencies including `express`, `@prisma/client`, `prisma`, and `tsx`.

### 2. Generate Prisma Client

```bash
cd examples/demo-app
npx prisma generate
```

This generates the Prisma client based on `prisma/schema.prisma`.

### 3. Create and Seed Database

```bash
npx prisma migrate dev --name init
```

This creates the SQLite database at `prisma/dev.db`.

> **Note**: The database connection is configured via the `.env` file which contains:
> ```
> DATABASE_URL="file:./dev.db"
> ```

### 4. Run the Demo

From the **root** of the repository:

```bash
npm run demo
```

Or for development with auto-reload:

```bash
npm run demo:dev
```

The server will start on `http://localhost:3333`.

## 📚 What's Demonstrated

### Standard Logging

```typescript
import { info, warn, error, debug } from 'express-enhanced-logger';

info('Simple message');
warn({ message: 'Object-style logging', extra: 'data' });
error('Something went wrong', { details: 'error info' });
debug('Debug information');
```

**Route**: `GET /all-logs`

### Request/Response Logging

Automatically logs every HTTP request with duration, status, and performance metrics.

**Route**: Any route (middleware is global)

### Database Query Logging

Logs all Prisma queries with:
- SQL formatting
- Parameter extraction
- Query duration
- Caller location tracking

**Routes**: 
- `GET /users` - Find many with relations
- `GET /users/:id` - Find unique with nested relations
- `POST /users` - Create with transaction
- `GET /posts` - Complex query with multiple relations

### AsyncLocalStorage Duration Tracking

Tracks database query time within each request automatically.

**Routes**: All database routes show DB duration in request logs

### Error Handling

Demonstrates error logging with stack traces and context.

**Routes**:
- `GET /error` - Intentional error
- `GET /db-error` - Database error

### User Context Logging

Shows how to log user information from authenticated requests.

**Route**: `GET /context`

### Custom Timing with `measure()`

Time custom operations synchronously or asynchronously.

```typescript
import { measure } from 'express-enhanced-logger';

const result = await measure('operation-name', async () => {
  // Your code here
  return someValue;
});
```

**Routes**:
- `GET /measure` - Simple measure examples
- `GET /slow` - Multi-step operation with nested measure calls

### Controller Helpers

Rails-style controller/action organization for better log formatting.

```typescript
const usersController = createController('UsersController');

app.get('/users', usersController('index', handler));
// Logs: "Processing by UsersController#index as JSON"
```

**Routes**:
- `GET /controller` - Controller index action
- `GET /controller/:id` - Controller show action

### Prisma Extension

Tracks caller location for database queries (Rails-style ↳ indicator).

```typescript
const prisma = prismaClient.$extends(createPrismaExtension());
```

**Route**: All database routes show caller location in logs

## 🧪 Testing Routes

Visit `http://localhost:3000` for a full list of available routes, or try:

```bash
# Home page with route listing
curl http://localhost:3333

# Fetch users with database logging
curl http://localhost:3333/users

# Get specific user
curl http://localhost:3333/users/1

# Create a new user
curl -X POST http://localhost:3333/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","bio":"Hello!"}'

# View published posts
curl http://localhost:3333/posts

# Trigger error handling
curl http://localhost:3333/error

# User context demonstration
curl http://localhost:3333/context

# Custom timing examples
curl http://localhost:3333/measure

# Slow operation with nested timing
curl http://localhost:3333/slow

# Controller helpers
curl http://localhost:3333/controller
curl http://localhost:3333/controller/1

# All log levels showcase
curl http://localhost:3333/all-logs
```

## 📁 Structure

```
examples/demo-app/
├── prisma/
│   ├── schema.prisma      # SQLite database schema
│   └── generated/         # Generated Prisma client (after npx prisma generate)
├── server.ts              # Main demo application
├── tsconfig.json          # TypeScript config for demo
└── README.md              # This file
```

## 🔧 How It Works

### Live Library Updates

The demo imports directly from `../../src`:

```typescript
import { createLogger, measure } from '../../src/index.js';
```

This means:
- ✅ Changes to library source are reflected immediately
- ✅ No need to rebuild or link
- ✅ Fast iteration during development

### Zero Pollution

The demo is **completely isolated** from the published package:

1. **Root `tsconfig.json`**: Excludes `examples` from build
2. **Root `package.json`**: `files` array only includes `dist`, `README.md`, `LICENSE`
3. **Demo `tsconfig.json`**: Standalone config with `noEmit: true`

Result: Running `npm run build` will **never** include demo code in `dist/`.

### Dependencies

All dependencies needed for the demo (`express`, `@prisma/client`, `prisma`, `tsx`) are in the **root `devDependencies`**, so:
- ✅ Available during development
- ✅ **Not** required for library consumers
- ✅ **Not** included in published package

## 🎨 Features Showcased

| Feature | Route(s) | Description |
|---------|----------|-------------|
| Standard Logging | `/`, `/all-logs` | Info, warn, error, debug messages |
| Request Logger | All routes | Automatic HTTP request/response logging |
| Database Logging | `/users`, `/posts` | Prisma query logging with SQL formatting |
| AsyncLocalStorage | All DB routes | Request-scoped duration tracking |
| Error Handling | `/error`, `/db-error` | Error logging with stack traces |
| User Context | `/context` | Logging with user information |
| Custom Timing | `/measure`, `/slow` | `measure()` helper for timing operations |
| Controller Helpers | `/controller/*` | Rails-style action logging |
| Prisma Extension | All DB routes | Caller location tracking |

## 💡 Development Tips

1. **Watch Mode**: Use `npm run demo:dev` for auto-reload on changes
2. **Database Reset**: `cd examples/demo-app && npx prisma migrate reset` to reset DB
3. **View Logs**: All logs appear in the console with color formatting
4. **Inspect Database**: `cd examples/demo-app && npx prisma studio` to view data

## 🐛 Troubleshooting

### Prisma Client Not Found

```bash
cd examples/demo-app
npx prisma generate
```

### Database Locked Error

```bash
cd examples/demo-app
rm -f prisma/dev.db prisma/dev.db-journal
npx prisma migrate dev --name init
```

### Import Errors

Make sure you're running from the **root** directory:

```bash
cd /path/to/express-enhanced-logger
npm run demo
```

## 📝 Notes

- This demo uses **SQLite** for zero-config simplicity
- The database file is at `examples/demo-app/prisma/dev.db`
- Sample data is automatically seeded on first migration
- All routes include mock user authentication for context demonstration

---

**Happy Testing! 🎉**

For more information, see the [main README](../../README.md).
