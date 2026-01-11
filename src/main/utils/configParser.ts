import * as toml from '@iarna/toml';
import { parse as parseJsonc, ParseError, printParseErrorCode } from 'jsonc-parser';
import { ConfigErrorCode, createConfigError } from './errors';

/**
 * Parse JSON config content
 */
export const parseJSON = (content: string): any => {
  try {
    return JSON.parse(content);
  } catch (error: any) {
    throw createConfigError(
      `JSON parse error: ${error.message}`,
      ConfigErrorCode.PARSE_JSON_ERROR,
      undefined,
      { originalError: error.message }
    );
  }
};

/**
 * Parse TOML config content (used by Codex CLI)
 */
export const parseTOML = (content: string): any => {
  try {
    return toml.parse(content);
  } catch (error: any) {
    throw createConfigError(
      `TOML parse error: ${error.message}`,
      ConfigErrorCode.PARSE_TOML_ERROR,
      undefined,
      { originalError: error.message }
    );
  }
};

/**
 * Parse JSONC config content (supports comments and trailing commas)
 * Used by OpenCode
 */
export const parseJSONC = (content: string): any => {
  const errors: ParseError[] = [];
  const result = parseJsonc(content, errors, {
    allowTrailingComma: true,
    allowEmptyContent: true
  });

  if (errors.length > 0) {
    const firstError = errors[0];
    const errorMessage = printParseErrorCode(firstError.error);
    throw createConfigError(
      `JSONC parse error at offset ${firstError.offset}: ${errorMessage}`,
      ConfigErrorCode.PARSE_JSON_ERROR,
      undefined,
      { errors: errors.map(e => ({ offset: e.offset, length: e.length, code: e.error })) }
    );
  }

  return result;
};

/**
 * Format JSON for output
 */
export const formatJSON = (data: any): string => {
  return JSON.stringify(data, null, 2);
};

/**
 * Format TOML for output
 */
export const formatTOML = (data: any): string => {
  return toml.stringify(data as toml.JsonMap);
};

/**
 * Format JSONC for output (outputs standard JSON, comments are not preserved)
 */
export const formatJSONC = (data: any): string => {
  return JSON.stringify(data, null, 2);
};

/**
 * Config parsers by IDE type
 */
export const configParsers: Record<string, (content: string) => any> = {
  'claude-desktop': parseJSON,
  'claude-code': parseJSON,
  'cursor': parseJSON,
  'windsurf': parseJSON,
  'codex': parseTOML,
  'opencode': parseJSONC
};

/**
 * Config formatters by IDE type
 */
export const configFormatters: Record<string, (data: any) => string> = {
  'claude-desktop': formatJSON,
  'claude-code': formatJSON,
  'cursor': formatJSON,
  'windsurf': formatJSON,
  'codex': formatTOML,
  'opencode': formatJSONC
};

/**
 * Deep merge multiple config objects
 * - Object types: recursively merge
 * - Array types: union (deduplicate)
 * - Primitive types: later values override earlier ones
 */
export const deepMerge = (...configs: any[]): any => {
  const result: any = {};

  for (const config of configs) {
    if (!config || typeof config !== 'object') continue;

    for (const key of Object.keys(config)) {
      if (config[key] === undefined) continue;

      if (Array.isArray(config[key])) {
        // Array: union with deduplication
        if (!Array.isArray(result[key])) {
          result[key] = [];
        }
        // For primitive arrays, use Set for deduplication
        // For object arrays, use JSON.stringify for comparison
        const existingSet = new Set(result[key].map((item: any) =>
          typeof item === 'object' ? JSON.stringify(item) : item
        ));
        for (const item of config[key]) {
          const itemKey = typeof item === 'object' ? JSON.stringify(item) : item;
          if (!existingSet.has(itemKey)) {
            result[key].push(item);
            existingSet.add(itemKey);
          }
        }
      } else if (config[key] && typeof config[key] === 'object') {
        // Object: recursive merge
        result[key] = deepMerge(result[key] || {}, config[key]);
      } else {
        // Primitive: override
        result[key] = config[key];
      }
    }
  }

  return result;
};

/**
 * Get parser for a specific IDE type
 */
export const getParser = (ideType: string): ((content: string) => any) => {
  const parser = configParsers[ideType];
  if (!parser) {
    throw createConfigError(
      `Unknown config format for IDE type: ${ideType}`,
      ConfigErrorCode.PARSE_UNKNOWN_FORMAT
    );
  }
  return parser;
};

/**
 * Get formatter for a specific IDE type
 */
export const getFormatter = (ideType: string): ((data: any) => string) => {
  const formatter = configFormatters[ideType];
  if (!formatter) {
    throw createConfigError(
      `Unknown config format for IDE type: ${ideType}`,
      ConfigErrorCode.PARSE_UNKNOWN_FORMAT
    );
  }
  return formatter;
};
