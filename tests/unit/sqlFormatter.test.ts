// Mock chalk to avoid ESM issues in Jest
jest.mock('chalk', () => ({
  default: {
    cyan: (text: string) => text,
    green: (text: string) => text,
    yellow: (text: string) => text,
    red: (text: string) => text,
    white: (text: string) => text,
    bold: (text: string) => text,
    dim: (text: string) => text,
    gray: (text: string) => text,
    blue: (text: string) => text,
  },
  cyan: (text: string) => text,
  green: (text: string) => text,
  yellow: (text: string) => text,
  red: (text: string) => text,
  white: (text: string) => text,
  bold: (text: string) => text,
  dim: (text: string) => text,
  gray: (text: string) => text,
  blue: (text: string) => text,
}));

import { createSqlFormatter } from '../../src/sqlFormatter';
import { LoggerConfig } from '../../src/types';

describe('SQL Formatter Unit Tests', () => {
  const baseConfig: LoggerConfig = {
    enableColors: false,
    maxStringLength: 100,
    maxArrayLength: 5,
    maxObjectKeys: 20,
  };

  describe('Smart Truncation', () => {
    it('should NOT truncate SELECT queries with column lists', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT [dbo].[Issues].[PKIssueID], [dbo].[Issues].[Description], [dbo].[Issues].[Status], [dbo].[Issues].[Created], [dbo].[Issues].[SubmittedBy] FROM [dbo].[Issues]';
      const result = formatSql(query, '[]');

      expect(result).toContain('PKIssueID');
      expect(result).toContain('Description');
      expect(result).toContain('Status');
      expect(result).toContain('Created');
      expect(result).toContain('SubmittedBy');
      expect(result).not.toContain('...');
      expect(result).not.toContain('more');
    });

    it('should NOT truncate small IN clauses (< 10 params)', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE id IN (@P1,@P2,@P3,@P4,@P5)';
      const result = formatSql(query, '[1,2,3,4,5]');

      expect(result).toBe('SELECT * FROM Users WHERE id IN (1,2,3,4,5)');
      expect(result).not.toContain('more');
    });

    it('should NOT truncate IN clauses with exactly 10 params', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const params = Array.from({ length: 10 }, (_, i) => i + 1);
      const query = `SELECT * FROM Users WHERE id IN (${params.map((_, i) => `@P${i + 1}`).join(',')})`;
      const result = formatSql(query, JSON.stringify(params));

      expect(result).toContain('1,2,3,4,5,6,7,8,9,10');
      expect(result).not.toContain('more');
    });

    it('should truncate IN clauses with 11 params', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const params = Array.from({ length: 11 }, (_, i) => i + 1);
      const query = `SELECT * FROM Users WHERE id IN (${params.map((_, i) => `@P${i + 1}`).join(',')})`;
      const result = formatSql(query, JSON.stringify(params));

      expect(result).toContain('1,2,3');
      expect(result).toContain('9,10,11');
      expect(result).toContain('more');
      expect(result).not.toContain(',4,');
      expect(result).not.toContain(',5,');
      expect(result).not.toContain(',6,');
    });

    it('should truncate large IN clauses (50 params)', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const params = Array.from({ length: 50 }, (_, i) => i + 1);
      const query = `SELECT * FROM Lots WHERE id IN (${params.map((_, i) => `@P${i + 1}`).join(',')})`;
      const result = formatSql(query, JSON.stringify(params));

      expect(result).toContain('1,2,3');
      expect(result).toContain('48,49,50');
      expect(result).toMatch(/\d+\s+more/);
      expect(result).not.toContain(',25,');
    });

    it('should truncate very large IN clauses (120 params)', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const params = Array.from({ length: 120 }, (_, i) => i + 1);
      const query = `SELECT * FROM Items WHERE id IN (${params.map((_, i) => `@P${i + 1}`).join(',')})`;
      const result = formatSql(query, JSON.stringify(params));

      expect(result).toContain('1,2,3');
      expect(result).toContain('118,119,120');
      expect(result).toMatch(/114\s+more/);
    });

    it('should NOT truncate long queries without IN clauses', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT [dbo].[LotSales].[PKLotSaleID], [dbo].[LotSales].[Earnest], [dbo].[LotSales].[EarnestDue], [dbo].[LotSales].[FKLotID], [dbo].[LotSales].[SalePrice] FROM [dbo].[LotSales] LEFT JOIN [dbo].[Lots] ON [dbo].[LotSales].[FKLotID] = [dbo].[Lots].[PKLotID]';
      const result = formatSql(query, '[]');

      expect(result).toContain('PKLotSaleID');
      expect(result).toContain('Earnest');
      expect(result).toContain('EarnestDue');
      expect(result).toContain('LEFT JOIN');
      expect(result).not.toContain('more');
    });

    it('should handle multiple IN clauses', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const params = Array.from({ length: 15 }, (_, i) => i + 1);
      const query = `SELECT * FROM Orders WHERE customerId IN (${params.map((_, i) => `@P${i + 1}`).join(',')}) AND status IN (@P16,@P17)`;
      const result = formatSql(query, JSON.stringify([...params, 'active', 'pending']));

      expect(result).toMatch(/1,2,3.*more.*13,14,15/);
      expect(result).toContain('AND');
      expect(result).toContain('status');
    });
  });

  describe('Parameter Replacement', () => {
    it('should replace simple parameters', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE id = @P1 AND name = @P2';
      const result = formatSql(query, '[1, "John"]');

      expect(result).toContain("id = 1");
      expect(result).toContain("name = 'John'");
    });

    it('should handle array parameters', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE id IN (@P1)';
      const result = formatSql(query, '[[1,2,3]]');

      expect(result).toContain('[1,2,3]');
    });

    it('should handle string parameters', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'INSERT INTO Users (name, email) VALUES (@P1, @P2)';
      const result = formatSql(query, '["John Doe", "john@example.com"]');

      expect(result).toContain("'John Doe'");
      expect(result).toContain("'john@example.com'");
    });

    it('should handle null parameters', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'UPDATE Users SET deletedAt = @P1 WHERE id = @P2';
      const result = formatSql(query, '[null, 1]');

      expect(result).toContain('deletedAt = null');
      expect(result).toContain('id = 1');
    });

    it('should handle boolean parameters', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'UPDATE Users SET active = @P1 WHERE id = @P2';
      const result = formatSql(query, '[true, 1]');

      expect(result).toContain('active = true');
    });

    it('should truncate long string parameters', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const longString = 'A'.repeat(150);
      const query = 'INSERT INTO Posts (content) VALUES (@P1)';
      const result = formatSql(query, `["${longString}"]`);

      expect(result).toContain("'AAAA");
      expect(result).toContain("...'");
      expect(result.length).toBeLessThan(query.length + 150);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty params', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users';
      const result = formatSql(query, '');

      expect(result).toBe(query);
    });

    it('should handle malformed JSON params gracefully', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE id = @P1';
      const result = formatSql(query, 'not-valid-json');

      expect(result).toBe(query);
    });

    it('should handle undefined params', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users';
      const result = formatSql(query, undefined as any);

      expect(result).toBe(query);
    });

    it('should handle whitespace-only params', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users';
      const result = formatSql(query, '   ');

      expect(result).toBe(query);
    });

    it('should handle double-stringified JSON', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE id = @P1';
      const doubleStringified = '"[1,2,3]"'; // Double quoted string
      const result = formatSql(query, doubleStringified);

      // Should parse and handle the array
      expect(result).toBeDefined();
      expect(result).toContain('SELECT * FROM Users');
    });

    it('should handle array params with quotes in manual parsing', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE name = @P1';
      const result = formatSql(query, '["Test \\"Quote\\""]');

      expect(result).toContain('Test');
    });

    it('should handle empty array params', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE id IN (@P1)';
      const result = formatSql(query, '[[]]');

      expect(result).toBeDefined();
    });

    it('should handle object parameters', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'INSERT INTO Users (data) VALUES (@P1)';
      const result = formatSql(query, '[{"name":"John","age":30}]');

      expect(result).toContain('name');
      expect(result).toContain('John');
    });

    it('should handle numeric parameters', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE age = @P1 AND id = @P2';
      const result = formatSql(query, '[25, 42]');

      expect(result).toContain('age = 25');
      expect(result).toContain('id = 42');
    });

    it('should handle params that need manual parsing', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE name = @P1';
      // Malformed array that triggers manual parsing
      const result = formatSql(query, '[Test String]');

      expect(result).toBeDefined();
    });

    it('should handle empty array in manual parsing', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE id IN (@P1)';
      const result = formatSql(query, '[]');

      // Empty array JSON.parse returns [] which has length 0, so no replacement occurs
      expect(result).toBe('SELECT * FROM Users WHERE id IN (@P1)');
    });

    it('should handle array with escaped characters', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE data = @P1';
      const result = formatSql(query, '["test\\nstring"]');

      expect(result).toContain('test');
    });

    it('should handle array with escaped backslash', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE path = @P1';
      const result = formatSql(query, '["C:\\\\Users\\\\test"]');

      expect(result).toBeDefined();
    });

    it('should trigger manual parsing with malformed JSON array', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE name IN (@P1,@P2)';
      // This is malformed JSON that will trigger manual parsing
      const result = formatSql(query, '[hello, "world"]');

      expect(result).toBeDefined();
    });

    it('should handle manual parsing with commas inside quotes', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE data IN (@P1,@P2)';
      // Malformed but parseable with manual parser
      const result = formatSql(query, '["test,value", other]');

      expect(result).toBeDefined();
    });

    it('should handle array with quoted strings properly', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE name = @P1';
      const result = formatSql(query, '["John", "Doe"]');

      expect(result).toContain('John');
    });

    it('should handle array with numbers in manual parsing', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE id IN (@P1,@P2)';
      const result = formatSql(query, '[123, 456]');

      expect(result).toContain('123');
      expect(result).toContain('456');
    });

    it('should handle malformed array that triggers sanitization', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE name = @P1';
      // Array with unescaped quotes that needs sanitization
      const result = formatSql(query, '["test]');

      // Should handle gracefully
      expect(result).toBeDefined();
    });

    it('should handle exception during formatting and return original query', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE id = @P1';
      // This will trigger the catch block due to invalid JSON
      const result = formatSql(query, '{invalid}');

      expect(result).toBe(query);
    });

    it('should truncate arrays with more than 10 inline items', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE id IN (@P1,@P2,@P3,@P4,@P5,@P6,@P7,@P8,@P9,@P10,@P11,@P12,@P13,@P14,@P15)';
      const params = JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
      const result = formatSql(query, params);

      // Should contain truncated output with "more"
      expect(result).toContain('more');
    });

    it('should not truncate query when IN clause has exactly threshold params', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const params = Array.from({ length: 10 }, (_, i) => `'val${i}'`).join(',');
      const query = `SELECT * FROM Users WHERE id IN (${params})`;

      // This should not be truncated because it's exactly at threshold
      const result = formatSql(query, '[]');

      // Query should be returned as-is since it doesn't need truncation
      expect(result).toBe(query);
    });

    it('should handle malformed IN clause without closing paren', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE id IN (1,2,3';

      const result = formatSql(query, '[]');

      // Should return original query when malformed
      expect(result).toBe(query);
    });
  });

  describe('Configuration Options', () => {
    it('should use custom query formatter if provided', () => {
      const customFormatter = jest.fn((query: string, _params: string) => `CUSTOM: ${query}`);
      const formatSql = createSqlFormatter({
        ...baseConfig,
        customQueryFormatter: customFormatter,
      });
      const query = 'SELECT * FROM Users';
      const result = formatSql(query, '[]');

      expect(customFormatter).toHaveBeenCalledWith(query, '[]');
      expect(result).toBe(`CUSTOM: ${query}`);
    });

    it('should handle colors enabled', () => {
      const formatSql = createSqlFormatter({
        ...baseConfig,
        enableColors: true,
      });
      const params = Array.from({ length: 15 }, (_, i) => i + 1);
      const query = `SELECT * FROM Items WHERE id IN (${params.map((_, i) => `@P${i + 1}`).join(',')})`;
      const result = formatSql(query, JSON.stringify(params));

      // With colors, the result will still contain the formatted query
      expect(result).toContain('1,2,3');
      expect(result).toContain('more');
    });
  });

  describe('Large Arrays', () => {
    it('should format large arrays in parameters', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const largeArray = Array.from({ length: 20 }, (_, i) => i + 1);
      const query = 'SELECT * FROM Users WHERE id = @P1';
      const result = formatSql(query, `[${JSON.stringify(largeArray)}]`);

      // Large arrays should be formatted with truncation
      expect(result).toContain('1,2,3,4,5');
      expect(result).toContain('more');
    });

    it('should handle small arrays without truncation', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const smallArray = [1, 2, 3];
      const query = 'SELECT * FROM Users WHERE id = @P1';
      const result = formatSql(query, `[${JSON.stringify(smallArray)}]`);

      expect(result).toContain('[1,2,3]');
    });

    it('should handle primitive arrays in IN clauses', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const params = [1, 2, 3, 4, 5];
      const query = 'SELECT * FROM Users WHERE id IN (@P1,@P2,@P3,@P4,@P5)';
      const result = formatSql(query, JSON.stringify(params));

      expect(result).toContain('IN (1,2,3,4,5)');
    });
  });

  describe('Complex Queries', () => {
    it('should handle INSERT queries', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'INSERT INTO Users (name, email, age) VALUES (@P1, @P2, @P3)';
      const result = formatSql(query, '["Alice", "alice@example.com", 25]');

      expect(result).toContain("'Alice'");
      expect(result).toContain("'alice@example.com'");
      expect(result).toContain('25');
    });

    it('should handle UPDATE queries with IN clause', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const params = Array.from({ length: 20 }, (_, i) => i + 1);
      const query = `UPDATE Users SET status = @P1 WHERE id IN (${params.map((_, i) => `@P${i + 2}`).join(',')})`;
      const result = formatSql(query, JSON.stringify(['active', ...params]));

      expect(result).toContain("'active'");
      expect(result).toContain('more');
    });

    it('should handle DELETE queries with IN clause', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const params = Array.from({ length: 25 }, (_, i) => i + 1);
      const query = `DELETE FROM TempData WHERE id IN (${params.map((_, i) => `@P${i + 1}`).join(',')})`;
      const result = formatSql(query, JSON.stringify(params));

      expect(result).toContain('DELETE FROM TempData');
      expect(result).toContain('more');
    });
  });

  describe('Sanitization Edge Cases', () => {
    it('should handle arrays with unbalanced quotes in sanitization', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE name = @P1';
      // This triggers the sanitization path
      const result = formatSql(query, '["test\\"unbalanced]');

      expect(result).toBeDefined();
    });

    it('should handle arrays with multiple unbalanced quotes', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE name IN (@P1,@P2)';
      const result = formatSql(query, '["test\\", "more\\"]');

      expect(result).toBeDefined();
    });

    it('should handle null in IN clause', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE id IN (@P1,@P2,@P3)';
      const result = formatSql(query, '[1, null, 3]');

      expect(result).toContain('1,null,3');
    });

    it('should handle mixed types in IN clause', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE value IN (@P1,@P2,@P3,@P4)';
      const result = formatSql(query, '[1, "test", null, true]');

      expect(result).toContain('1');
      expect(result).toContain('test');
      expect(result).toContain('null');
      expect(result).toContain('true');
    });
  });

  describe('Manual Parser Fallback', () => {
    it('should use manual parser when JSON.parse fails on nested arrays', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE name = @P1';
      // Invalid JSON that will trigger catch and manual parsing
      const result = formatSql(query, '[test value]');

      expect(result).toBeDefined();
    });

    it('should handle params with trailing comma in manual parser', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE id IN (@P1,@P2)';
      const result = formatSql(query, '[1, 2,]');

      expect(result).toBeDefined();
    });

    it('should handle params with whitespace variations', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE id = @P1';
      const result = formatSql(query, '[  1  ]');

      expect(result).toBeDefined();
    });

    it('should handle arrays with special characters in strings', () => {
      const formatSql = createSqlFormatter(baseConfig);
      const query = 'SELECT * FROM Users WHERE name = @P1';
      const result = formatSql(query, '["test@example.com"]');

      expect(result).toContain('test@example.com');
    });
  });
});
