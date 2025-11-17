import chalk from 'chalk';
import { LoggerConfig } from './types.js';
import { createTruncateForLog } from './utils.js';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export const createSqlFormatter = (config: LoggerConfig) => {
  const truncateForLog = createTruncateForLog(config);
  const enableColors = config.enableColors ?? true;
  const maxStringLength = config.maxStringLength ?? 100;

  const formatSqlQuery = (query: string, params: string): string => {
    if (!config.enableSqlFormatting || !config.enablePrismaIntegration) {
      return config.customQueryFormatter?.(query, params) ?? query;
    }

    // Handle empty or undefined params - still truncate the query if needed
    if (!params || params.trim() === '') {
      return smartTruncateQuery(query, enableColors);
    }

    try {
      const parsedParams = parseQueryParams(params);
      if (!parsedParams) {
        // If params can't be parsed, still truncate the original query
        return smartTruncateQuery(query, enableColors);
      }

      const paramArray = Array.isArray(parsedParams) ? parsedParams : [];
      const formattedQuery = replaceParamsInQuery(query, paramArray, {
        truncateForLog,
        enableColors,
        maxStringLength,
      });

      // Only truncate if the query has large parameter lists (IN clauses, etc.)
      return smartTruncateQuery(formattedQuery, enableColors);
    } catch {
      // Silently return truncated original query if formatting fails
      return smartTruncateQuery(query, enableColors);
    }
  };

  return formatSqlQuery;
};

/**
 * Parse query params from JSON string with fallback strategies
 */
function parseQueryParams(params: string): JsonValue[] | null {
  try {
    // Try direct parse first
    const parsed = JSON.parse(params);
    return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
  } catch {
    // Try sanitizing quotes for arrays
    if (params.startsWith('[') && params.endsWith(']')) {
      const sanitized = params.replace(/(^|[^\\])"/g, '$1\\"');
      try {
        return JSON.parse(sanitized);
      } catch {
        // Try manual parsing as last resort
        return manualParseArray(params);
      }
    }
    return null;
  }
}

/**
 * Manually parse array when JSON.parse fails
 */
function manualParseArray(params: string): JsonValue[] | null {
  try {
    const content = params.slice(1, -1).trim();
    if (content === '') {
      return [];
    }

    const elements: string[] = [];
    let current = '';
    let inQuotes = false;
    let escapeNext = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      if (escapeNext) {
        current += char;
        escapeNext = false;
      } else if (char === '\\') {
        current += char;
        escapeNext = true;
      } else if (char === '"') {
        current += char;
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        elements.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) {
      elements.push(current.trim());
    }

    return elements.map((el) => {
      el = el.trim();
      if (el.startsWith('"') && el.endsWith('"')) {
        return el.slice(1, -1);
      }
      try {
        return JSON.parse(el);
      } catch {
        return el;
      }
    });
  } catch {
    return null;
  }
}

/**
 * Replace @P1, @P2 placeholders with actual parameter values
 */
function replaceParamsInQuery(
  query: string,
  paramArray: JsonValue[],
  options: {
    truncateForLog: (value: unknown) => unknown;
    enableColors: boolean;
    maxStringLength: number;
  }
): string {
  const { truncateForLog, enableColors, maxStringLength } = options;
  let formattedQuery = query;

  paramArray.forEach((param: JsonValue, index: number) => {
    const placeholder = `@P${index + 1}`;
    const displayParam = formatParamValue(param, { truncateForLog, enableColors, maxStringLength });

    formattedQuery = formattedQuery.replace(new RegExp(placeholder, 'g'), displayParam);
  });

  return formattedQuery;
}

/**
 * Format a single parameter value for display
 */
function formatParamValue(
  param: JsonValue,
  options: {
    truncateForLog: (value: unknown) => unknown;
    enableColors: boolean;
    maxStringLength: number;
  }
): string {
  const { truncateForLog, enableColors, maxStringLength } = options;

  let displayParam: string;

  if (Array.isArray(param)) {
    const allPrimitives = param.every(
      (item) =>
        typeof item === 'string' ||
        typeof item === 'number' ||
        typeof item === 'boolean' ||
        item === null
    );

    if (allPrimitives && param.length > 10) {
      displayParam = formatArrayForSql(param, enableColors);
    } else {
      displayParam = JSON.stringify(truncateForLog(param));
    }
  } else if (typeof param === 'string' && param.length > maxStringLength) {
    displayParam = `'${param.substring(0, maxStringLength)}...'`;
  } else if (param !== null && typeof param === 'object') {
    displayParam = JSON.stringify(truncateForLog(param));
  } else {
    displayParam = typeof param === 'string' ? `'${param}'` : String(param);
  }

  return enableColors ? chalk.bold(displayParam) : displayParam;
}

/**
 * Format large arrays for SQL display
 */
function formatArrayForSql(arr: JsonValue[], enableColors: boolean): string {
  const MAX_INLINE_ITEMS = 10;

  if (arr.length <= MAX_INLINE_ITEMS) {
    return arr.join(',');
  }

  const halfShow = Math.floor(MAX_INLINE_ITEMS / 2);
  const firstItems = arr.slice(0, halfShow);
  const lastItems = arr.slice(-halfShow);

  const dimFn = enableColors ? chalk.dim : (text: string) => text;
  return `${firstItems.join(',')}${dimFn(`,...${arr.length - MAX_INLINE_ITEMS} more...`)},${lastItems.join(',')}`;
}

/**
 * Smart truncation that only truncates queries with large parameter lists
 */
function smartTruncateQuery(query: string, enableColors: boolean): string {
  const PARAM_THRESHOLD = 10; // Only truncate if there are many consecutive parameters

  // Check if query has large parameter lists (IN clauses with many items)
  // Look for patterns like: IN (val1,val2,val3,...) or IN (@P1,@P2,@P3,...)
  const inClausePattern = /IN\s*\([^)]+\)/gi;
  const matches = query.match(inClausePattern);

  if (!matches) {
    // No IN clauses, return as-is
    return query;
  }

  // Check if any IN clause has many parameters
  let hasLargeInClause = false;
  for (const match of matches) {
    // Count commas to estimate number of parameters
    const commaCount = (match.match(/,/g) || []).length;
    if (commaCount >= PARAM_THRESHOLD - 1) {
      hasLargeInClause = true;
      break;
    }
  }

  if (!hasLargeInClause) {
    // No large IN clauses, return as-is
    return query;
  }

  // Truncate ALL large IN clauses in the query
  let truncatedQuery = query;
  const dimFn = enableColors ? chalk.dim : (text: string) => text;
  
  // Process each IN clause
  truncatedQuery = truncatedQuery.replace(/IN\s*\(([^)]+)\)/gi, (match, inParams) => {
    // Split parameters and count them
    const params = inParams.split(',').map((p: string) => p.trim());
    
    // Only truncate if there are many parameters
    if (params.length <= PARAM_THRESHOLD) {
      return match;
    }

    const showCount = 3;
    const firstParams = params.slice(0, showCount).join(',');
    const lastParams = params.slice(-showCount).join(',');
    const truncatedIn = `${firstParams}${dimFn(`,...${params.length - showCount * 2} more...`)},${lastParams}`;

    return `IN (${truncatedIn})`;
  });

  return truncatedQuery;
}

