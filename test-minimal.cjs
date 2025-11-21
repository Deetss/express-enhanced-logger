/**
 * Minimal test - set FORCE_COLOR then create formatter
 */

// Set FORCE_COLOR BEFORE requiring chalk
process.env.FORCE_COLOR = '3';

console.log('FORCE_COLOR set to:', process.env.FORCE_COLOR);

// Now require and test
const { createSqlFormatter } = require('./dist/sqlFormatter.cjs');

const formatter = createSqlFormatter({ enableColors: true });
const result = formatter('SELECT * FROM users WHERE id = $1', '');

console.log('\nFormatted query:');
console.log(result);

console.log('\nChecking for colors:');
console.log('Has \\x1b:', result.includes('\x1b'));
console.log('Length:', result.length, 'vs plain:', 'SELECT * FROM users WHERE id = $1'.length);

if (result.includes('\x1b')) {
  console.log('✓ Colors ARE present!');
} else {
  console.log('✗ NO colors!');
}
