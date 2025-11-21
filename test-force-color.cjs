/**
 * Test FORCE_COLOR setting
 */

console.log('FORCE_COLOR before requiring:', process.env.FORCE_COLOR);

const { EnhancedLogger } = require('./dist/index.cjs');

console.log('FORCE_COLOR after requiring:', process.env.FORCE_COLOR);

const logger = new EnhancedLogger({
  enableColors: true,
  level: 'query',
  enableFileLogging: false,
});

console.log('FORCE_COLOR after creating logger:', process.env.FORCE_COLOR);

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

mockPrisma._triggerQuery(
  'SELECT * FROM users WHERE id = $1',
  '["123"]',
  2.5
);
