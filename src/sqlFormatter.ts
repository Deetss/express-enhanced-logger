import chalk from 'chalk';
import { LoggerConfig } from './types.js';
import { createTruncateForLog } from './utils.js';

export const createSqlFormatter = (config: LoggerConfig) => {
  const truncateForLog = createTruncateForLog(config);
  const enableColors = config.enableColors ?? true;
  const maxStringLength = config.maxStringLength ?? 100;

  const formatSqlQuery = (query: string, params: string): string => {
    if (!config.enableSqlFormatting || !config.enablePrismaIntegration) {
      return config.customQueryFormatter?.(query, params) ?? query;
    }

    try {
      // Handle empty or undefined params
      if (!params || params.trim() === '') {
        return query;
      }

      let parsedParams;
      try {
        parsedParams = JSON.parse(params);
      } catch (parseError) {
        console.warn('Initial JSON parse failed, attempting to sanitize params:', params);
        
        let sanitizedParams = params;
        
        if (params.startsWith('[') && params.endsWith(']')) {
          sanitizedParams = params.replace(/(^|[^\\])"/g, '$1\\"');
          try {
            parsedParams = JSON.parse(sanitizedParams);
          } catch (secondError) {
            console.warn('Sanitized JSON parse also failed, trying alternative approach');
            
            try {
              const content = params.slice(1, -1);
              if (content.trim() === '') {
                parsedParams = [];
              } else {
                const elements = [];
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
                
                parsedParams = elements.map(el => {
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
              }
            } catch (manualError) {
              console.warn('Manual parsing also failed, returning original query');
              return query;
            }
          }
        } else {
          console.warn('Params do not appear to be valid JSON array, returning original query');
          return query;
        }
      }

      if (typeof parsedParams === 'string') {
        try {
          parsedParams = JSON.parse(parsedParams);
        } catch (stringParseError) {
          console.warn('Failed to parse double-encoded JSON string, using as-is');
          return query;
        }
      }
      
      const paramArray = Array.isArray(parsedParams) ? parsedParams : [];
      let formattedQuery = query;
      
      type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
      
      const formatArrayForSql = (arr: JsonValue[]): string => {
        const MAX_INLINE_ITEMS = 10;
        
        if (arr.length <= MAX_INLINE_ITEMS) {
          return arr.join(',');
        }
        
        const halfShow = Math.floor(MAX_INLINE_ITEMS / 2);
        const firstItems = arr.slice(0, halfShow);
        const lastItems = arr.slice(-halfShow);
        
        const dimFn = enableColors ? chalk.dim : (text: string) => text;
        return `${firstItems.join(',')}${dimFn(`,...${arr.length - MAX_INLINE_ITEMS} more...`)},${lastItems.join(',')}`;
      };
      
      paramArray.forEach((param: JsonValue, index: number) => {
        const placeholder = `@P${index + 1}`;
        let displayParam: string;
        
        if (Array.isArray(param)) {
          const allPrimitives = param.every(item => 
            typeof item === 'string' || 
            typeof item === 'number' || 
            typeof item === 'boolean' || 
            item === null
          );
          
          if (allPrimitives && param.length > 10) {
            displayParam = formatArrayForSql(param);
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
        
        const coloredParam = enableColors ? chalk.bold(displayParam) : displayParam;
        formattedQuery = formattedQuery.replace(
          new RegExp(placeholder, 'g'),
          coloredParam
        );
      });

      return formattedQuery;
    } catch (e) {
      console.error('Error in formatSqlQuery:', e);
      console.error('Original params string:', params);
      console.error('Query:', query);
      return query;
    }
  };

  return formatSqlQuery;
};