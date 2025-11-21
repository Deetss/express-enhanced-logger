#!/usr/bin/env node

/**
 * Terminal Color Test - Run this directly in your terminal
 * NOT through yarn or npm scripts
 * 
 * Usage: node verify-colors.cjs
 */

process.env.NODE_ENV = 'development';

const { EnhancedLogger } = require('./dist/index.cjs');

console.log('\n' + '='.repeat(60));
console.log('TERMINAL COLOR VERIFICATION TEST');
console.log('='.repeat(60) + '\n');

console.log('If your terminal supports colors, you should see:');
console.log('- BLUE text for SQL keywords (SELECT, FROM, WHERE, etc.)');
console.log('- YELLOW text for table names in quotes ("users", etc.)');
console.log('\n' + '='.repeat(60) + '\n');

const logger = new EnhancedLogger({
  enableColors: true,
  level: 'query',
  enableFileLogging: false,
});

const mockPrisma = {
  _handlers: {},
  $on: function(event, handler) {
    this._handlers[event] = handler;
  },
  _triggerQuery: function(query, params, duration) {
    if (this._handlers.query) {
      this._handlers.query({ query, params, duration });
    }
  }
};

logger.setupPrismaLogging(mockPrisma);

// Test query
mockPrisma._triggerQuery(
  'SELECT "users"."id", "users"."email" FROM "users" WHERE "users"."id" = $1 ORDER BY "users"."created_at" DESC LIMIT $2',
  '["123", "10"]',
  2.5
);

console.log('\n' + '='.repeat(60));
console.log('END OF TEST');
console.log('='.repeat(60) + '\n');

console.log('✓ If you saw colored SQL keywords above, colors are working!');
console.log('✗ If everything was plain white/gray, check your terminal settings\n');
