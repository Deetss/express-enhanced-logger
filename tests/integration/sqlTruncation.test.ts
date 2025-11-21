import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface TestResult {
  output: string;
  errorOutput: string;
}

describe('SQL Query Smart Truncation Integration Tests', () => {
  const createTestScript = (testCases: string): string => `
    import { createSqlFormatter } from '../../dist/sqlFormatter.js';
    
    const config = {
      enableColors: false,
      maxStringLength: 100,
      maxArrayLength: 5,
      maxObjectKeys: 20,
    };
    
    const formatSql = createSqlFormatter(config);

    ${testCases}
    
    console.log('TESTS_COMPLETE');
  `;

  const runTestScript = (testScript: string, timeout: number = 5000): Promise<TestResult> => {
    return new Promise((resolve, reject) => {
      const testFile = path.join(__dirname, 'temp-sql-test.mjs');
      fs.writeFileSync(testFile, testScript);

      const child = spawn('node', [testFile], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, NODE_ENV: 'development' },
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      child.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      let testCompleted = false;

      // Set timeout for the test
      const timeoutHandle = setTimeout(() => {
        if (testCompleted) return;
        testCompleted = true;

        child.kill();
        try {
          fs.unlinkSync(testFile);
        } catch (e) {
          // Ignore
        }
        reject(new Error('Test timeout'));
      }, timeout);

      child.on('close', (code) => {
        if (testCompleted) return;
        testCompleted = true;
        clearTimeout(timeoutHandle);

        // Clean up
        try {
          fs.unlinkSync(testFile);
        } catch (e) {
          // Ignore cleanup errors
        }

        if (code !== 0) {
          reject(new Error(`Test script failed with code ${code}. Error: ${errorOutput}`));
          return;
        }

        resolve({ output, errorOutput });
      });
    });
  };

  test('should NOT truncate SELECT queries with column lists', async () => {
    const testScript = createTestScript(`
      console.log('TEST_START');
      const query = 'SELECT [dbo].[Issues].[PKIssueID], [dbo].[Issues].[Description], [dbo].[Issues].[Status], [dbo].[Issues].[Created], [dbo].[Issues].[SubmittedBy] FROM [dbo].[Issues]';
      const result = formatSql(query, '[]');
      console.log('RESULT:', result);
      console.log('TEST_END');
    `);

    const { output } = await runTestScript(testScript);

    const section = output.split('RESULT:')[1]!.split('TEST_END')[0]!.trim();
    
    // Should contain full column list without truncation
    expect(section).toContain('PKIssueID');
    expect(section).toContain('Description');
    expect(section).toContain('Status');
    expect(section).toContain('Created');
    expect(section).toContain('SubmittedBy');
    
    // Should NOT contain truncation indicators
    expect(section).not.toContain('...');
    expect(section).not.toContain('more');
  });

  test('should NOT truncate small IN clauses (< 10 params)', async () => {
    const testScript = createTestScript(`
      console.log('TEST_START');
      const query = 'SELECT [dbo].[Role].[id], [dbo].[Role].[name] FROM [dbo].[Role] WHERE [dbo].[Role].[id] IN (@P1,@P2,@P3,@P4,@P5)';
      const result = formatSql(query, '[1,2,3,4,5]');
      console.log('RESULT:', result);
      console.log('TEST_END');
    `);

    const { output } = await runTestScript(testScript);

    const section = output.split('RESULT:')[1]!.split('TEST_END')[0]!.trim();
    
    // Should contain all parameters
    expect(section).toContain('IN (1,2,3,4,5)');
    
    // Should NOT contain truncation indicators
    expect(section).not.toContain('...');
    expect(section).not.toContain('more');
  });

  test('should truncate IN clauses with exactly 10 params threshold', async () => {
    const testScript = createTestScript(`
      console.log('TEST_START');
      const tenParams = [1,2,3,4,5,6,7,8,9,10];
      const query = 'SELECT * FROM Users WHERE id IN (@P1,@P2,@P3,@P4,@P5,@P6,@P7,@P8,@P9,@P10)';
      const result = formatSql(query, JSON.stringify(tenParams));
      console.log('RESULT:', result);
      console.log('TEST_END');
    `);

    const { output } = await runTestScript(testScript);

    const section = output.split('RESULT:')[1]!.split('TEST_END')[0]!.trim();
    
    // At exactly 10 params, should NOT truncate
    expect(section).toContain('1,2,3,4,5,6,7,8,9,10');
    expect(section).not.toContain('more');
  });

  test('should truncate IN clauses with 11+ params', async () => {
    const testScript = createTestScript(`
      console.log('TEST_START');
      const elevenParams = [1,2,3,4,5,6,7,8,9,10,11];
      const query = 'SELECT * FROM Users WHERE id IN (@P1,@P2,@P3,@P4,@P5,@P6,@P7,@P8,@P9,@P10,@P11)';
      const result = formatSql(query, JSON.stringify(elevenParams));
      console.log('RESULT:', result);
      console.log('TEST_END');
    `);

    const { output } = await runTestScript(testScript);

    const section = output.split('RESULT:')[1]!.split('TEST_END')[0]!.trim();
    
    // Should be truncated showing first 3, count, last 3
    expect(section).toContain('1,2,3');
    expect(section).toContain('9,10,11');
    expect(section).toContain('more');
    
    // Should NOT contain middle values
    expect(section).not.toContain(',4,');
    expect(section).not.toContain(',5,');
    expect(section).not.toContain(',6,');
    expect(section).not.toContain(',7,');
    expect(section).not.toContain(',8,');
  });

  test('should truncate large IN clauses (50 params)', async () => {
    const testScript = createTestScript(`
      console.log('TEST_START');
      const manyParams = Array.from({ length: 50 }, (_, i) => i + 1);
      const query = 'SELECT [dbo].[Lots].[PKLotID] FROM [dbo].[Lots] WHERE [dbo].[Lots].[PKLotID] IN (' + 
        manyParams.map((_, i) => '@P' + (i + 1)).join(',') + ')';
      const result = formatSql(query, JSON.stringify(manyParams));
      console.log('RESULT:', result);
      console.log('TEST_END');
    `);

    const { output } = await runTestScript(testScript);

    const section = output.split('RESULT:')[1]!.split('TEST_END')[0]!.trim();
    
    // Should show first 3 and last 3
    expect(section).toContain('1,2,3');
    expect(section).toContain('48,49,50');
    
    // Should show count of omitted items
    expect(section).toMatch(/\d+\s+more/);
    
    // Should NOT contain middle values
    expect(section).not.toContain(',25,');
    expect(section).not.toContain(',26,');
  });

  test('should truncate very large IN clauses (120 params)', async () => {
    const testScript = createTestScript(`
      console.log('TEST_START');
      const lotsOfParams = Array.from({ length: 120 }, (_, i) => i + 1);
      const query = 'SELECT * FROM Items WHERE id IN (' + 
        lotsOfParams.map((_, i) => '@P' + (i + 1)).join(',') + ')';
      const result = formatSql(query, JSON.stringify(lotsOfParams));
      console.log('RESULT:', result);
      console.log('TEST_END');
    `);

    const { output } = await runTestScript(testScript);

    const section = output.split('RESULT:')[1]!.split('TEST_END')[0]!.trim();
    
    // Should show first 3 and last 3
    expect(section).toContain('1,2,3');
    expect(section).toContain('118,119,120');
    
    // Should show count of omitted items (120 total - 6 shown = 114 omitted)
    expect(section).toMatch(/114\s+more/);
  });

  test('should NOT truncate long queries without IN clauses', async () => {
    const testScript = createTestScript(`
      console.log('TEST_START');
      const query = 'SELECT [dbo].[LotSales].[PKLotSaleID], [dbo].[LotSales].[Earnest], [dbo].[LotSales].[EarnestDue], [dbo].[LotSales].[FKLotID], [dbo].[LotSales].[SalePrice], [dbo].[LotSales].[SaleDate], [dbo].[LotSales].[CloseDate] FROM [dbo].[LotSales] LEFT JOIN [dbo].[Lots] ON [dbo].[LotSales].[FKLotID] = [dbo].[Lots].[PKLotID]';
      const result = formatSql(query, '[]');
      console.log('RESULT:', result);
      console.log('TEST_END');
    `);

    const { output } = await runTestScript(testScript);

    const section = output.split('RESULT:')[1]!.split('TEST_END')[0]!.trim();
    
    // Should contain full query
    expect(section).toContain('PKLotSaleID');
    expect(section).toContain('Earnest');
    expect(section).toContain('EarnestDue');
    expect(section).toContain('FKLotID');
    expect(section).toContain('SalePrice');
    expect(section).toContain('SaleDate');
    expect(section).toContain('CloseDate');
    expect(section).toContain('LEFT JOIN');
    
    // Should NOT be truncated
    expect(section).not.toContain('more');
  });

  test('should handle multiple IN clauses and truncate the first large one', async () => {
    const testScript = createTestScript(`
      console.log('TEST_START');
      const params = Array.from({ length: 15 }, (_, i) => i + 1);
      const query = 'SELECT * FROM Orders WHERE customerId IN (' + 
        params.map((_, i) => '@P' + (i + 1)).join(',') + 
        ') AND status IN (@P16,@P17)';
      const result = formatSql(query, JSON.stringify([...params, 'active', 'pending']));
      console.log('RESULT:', result);
      console.log('TEST_END');
    `);

    const { output } = await runTestScript(testScript);

    const section = output.split('RESULT:')[1]!.split('TEST_END')[0]!.trim();
    
    // First IN clause should be truncated (15 params)
    expect(section).toMatch(/1,2,3.*more.*13,14,15/);
    
    // Second IN clause should remain (2 params)
    expect(section).toContain('AND');
    expect(section).toContain('status');
  });

  test('should handle empty params', async () => {
    const testScript = createTestScript(`
      console.log('TEST_START');
      const query = 'SELECT * FROM Users';
      const result = formatSql(query, '');
      console.log('RESULT:', result);
      console.log('TEST_END');
    `);

    const { output } = await runTestScript(testScript);

    const section = output.split('RESULT:')[1]!.split('TEST_END')[0]!.trim();
    
    // Should handle gracefully without errors
    expect(section).toContain('SELECT * FROM Users');
    expect(output).toContain('TESTS_COMPLETE');
  });

  test('should handle malformed params gracefully', async () => {
    const testScript = createTestScript(`
      console.log('TEST_START');
      const query = 'SELECT * FROM Users WHERE id = @P1';
      const result = formatSql(query, 'not-valid-json');
      console.log('RESULT:', result);
      console.log('TEST_END');
    `);

    const { output } = await runTestScript(testScript);

    const section = output.split('RESULT:')[1]!.split('TEST_END')[0]!.trim();
    
    // Should handle gracefully and return original query
    expect(section).toContain('SELECT * FROM Users WHERE id = @P1');
    expect(output).toContain('TESTS_COMPLETE');
  });

  test('should properly format parameters in different query types', async () => {
    const testScript = createTestScript(`
      console.log('TEST_START');
      
      // INSERT with few params
      const insertQuery = 'INSERT INTO Users (name, email) VALUES (@P1, @P2)';
      const insertResult = formatSql(insertQuery, '["John Doe", "john@example.com"]');
      console.log('INSERT_RESULT:', insertResult);
      
      // UPDATE with large IN clause
      const ids = Array.from({ length: 20 }, (_, i) => i + 1);
      const updateQuery = 'UPDATE Users SET status = @P1 WHERE id IN (' + 
        ids.map((_, i) => '@P' + (i + 2)).join(',') + ')';
      const updateResult = formatSql(updateQuery, JSON.stringify(['active', ...ids]));
      console.log('UPDATE_RESULT:', updateResult);
      
      // DELETE with large IN clause
      const deleteQuery = 'DELETE FROM TempData WHERE id IN (' + 
        ids.map((_, i) => '@P' + (i + 1)).join(',') + ')';
      const deleteResult = formatSql(deleteQuery, JSON.stringify(ids));
      console.log('DELETE_RESULT:', deleteResult);
      
      console.log('TEST_END');
    `);

    const { output } = await runTestScript(testScript);
    
    // INSERT should not be truncated
    const insertSection = output.split('INSERT_RESULT:')[1]!.split('UPDATE_RESULT:')[0]!.trim();
    expect(insertSection).toContain('INSERT INTO Users');
    expect(insertSection).toContain('John Doe');
    expect(insertSection).not.toContain('more');
    
    // UPDATE should be truncated
    const updateSection = output.split('UPDATE_RESULT:')[1]!.split('DELETE_RESULT:')[0]!.trim();
    expect(updateSection).toContain('UPDATE Users');
    expect(updateSection).toContain('more');
    
    // DELETE should be truncated
    const deleteSection = output.split('DELETE_RESULT:')[1]!.split('TEST_END')[0]!.trim();
    expect(deleteSection).toContain('DELETE FROM TempData');
    expect(deleteSection).toContain('more');
  });
});
