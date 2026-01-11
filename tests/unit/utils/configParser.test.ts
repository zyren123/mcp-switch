import { describe, it, expect } from 'vitest';
import {
  parseJSON,
  parseTOML,
  parseJSONC,
  formatJSON,
  formatTOML,
  formatJSONC,
  deepMerge,
  getParser,
  getFormatter,
  configParsers,
  configFormatters
} from '../../../src/main/utils/configParser';
import { ConfigErrorCode } from '../../../src/main/utils/errors';

describe('configParser.ts', () => {
  describe('parseJSON', () => {
    it('should parse valid JSON config', () => {
      const config = '{"mcpServers": {"test": {"command": "node"}}}';
      const result = parseJSON(config);
      expect(result.mcpServers.test.command).toBe('node');
    });

    it('should throw ConfigError on invalid JSON', () => {
      const config = '{invalid json}';
      expect(() => parseJSON(config)).toThrow();
      try {
        parseJSON(config);
      } catch (error: any) {
        expect(error.code).toBe(ConfigErrorCode.PARSE_JSON_ERROR);
      }
    });

    it('should handle empty mcpServers object', () => {
      const config = '{"mcpServers": {}}';
      const result = parseJSON(config);
      expect(result.mcpServers).toEqual({});
    });

    it('should parse nested objects', () => {
      const config = '{"mcpServers": {"test": {"command": "node", "env": {"KEY": "value"}}}}';
      const result = parseJSON(config);
      expect(result.mcpServers.test.env.KEY).toBe('value');
    });

    it('should parse arrays', () => {
      const config = '{"mcpServers": {"test": {"command": "node", "args": ["--flag", "value"]}}}';
      const result = parseJSON(config);
      expect(result.mcpServers.test.args).toEqual(['--flag', 'value']);
    });
  });

  describe('parseTOML', () => {
    it('should parse valid TOML config', () => {
      const config = `
[mcpServers.test]
command = "node"
args = ["index.js"]
`;
      const result = parseTOML(config);
      expect(result.mcpServers.test.command).toBe('node');
      expect(result.mcpServers.test.args).toEqual(['index.js']);
    });

    it('should throw ConfigError on invalid TOML', () => {
      const config = '[invalid toml';
      expect(() => parseTOML(config)).toThrow();
      try {
        parseTOML(config);
      } catch (error: any) {
        expect(error.code).toBe(ConfigErrorCode.PARSE_TOML_ERROR);
      }
    });

    it('should parse nested env tables', () => {
      const config = `
[mcpServers.test]
command = "node"

[mcpServers.test.env]
API_KEY = "secret"
`;
      const result = parseTOML(config);
      expect(result.mcpServers.test.env.API_KEY).toBe('secret');
    });
  });

  describe('parseJSONC', () => {
    it('should parse JSONC with line comments', () => {
      const config = `{
  // This is a comment
  "mcpServers": {
    "test": {
      "command": "node"
    }
  }
}`;
      const result = parseJSONC(config);
      expect(result.mcpServers.test.command).toBe('node');
    });

    it('should parse JSONC with block comments', () => {
      const config = `{
  "mcpServers": {
    "test": {
      "command": "node" /* inline comment */
    }
  }
}`;
      const result = parseJSONC(config);
      expect(result.mcpServers.test.command).toBe('node');
    });

    it('should handle trailing commas', () => {
      const config = '{"mcpServers": {"test": {"command": "node",},},}';
      const result = parseJSONC(config);
      expect(result.mcpServers.test.command).toBe('node');
    });

    it('should throw ConfigError on severely invalid JSONC', () => {
      const config = '{"mcpServers": {unclosed';
      expect(() => parseJSONC(config)).toThrow();
    });
  });

  describe('formatJSON', () => {
    it('should format object to JSON string', () => {
      const data = { mcpServers: { test: { command: 'node' } } };
      const result = formatJSON(data);
      expect(result).toContain('"mcpServers"');
      expect(result).toContain('"command"');
      expect(JSON.parse(result)).toEqual(data);
    });

    it('should format with 2-space indentation', () => {
      const data = { a: { b: 'c' } };
      const result = formatJSON(data);
      expect(result).toContain('  "a"');
    });
  });

  describe('formatTOML', () => {
    it('should format object to TOML string', () => {
      const data = { mcpServers: { test: { command: 'node' } } };
      const result = formatTOML(data);
      expect(result).toContain('[mcpServers.test]');
      expect(result).toContain('command = "node"');
    });
  });

  describe('formatJSONC', () => {
    it('should format same as JSON (comments not preserved)', () => {
      const data = { mcpServers: { test: { command: 'node' } } };
      const result = formatJSONC(data);
      expect(result).toBe(formatJSON(data));
    });
  });

  describe('deepMerge', () => {
    it('should merge objects recursively', () => {
      const result = deepMerge(
        { a: 1, b: { c: 2 } },
        { b: { d: 3 }, e: 4 }
      );
      expect(result).toEqual({ a: 1, b: { c: 2, d: 3 }, e: 4 });
    });

    it('should merge arrays with deduplication', () => {
      const result = deepMerge(
        { arr: ['a', 'b'] },
        { arr: ['b', 'c'] }
      );
      expect(result.arr).toEqual(['a', 'b', 'c']);
    });

    it('should override primitive values', () => {
      const result = deepMerge({ a: 1 }, { a: 2 });
      expect(result.a).toBe(2);
    });

    it('should handle undefined configs', () => {
      const result = deepMerge(undefined, { a: 1 }, null, { b: 2 });
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle empty objects', () => {
      const result = deepMerge({}, { a: 1 });
      expect(result).toEqual({ a: 1 });
    });

    it('should skip undefined values', () => {
      const result = deepMerge({ a: 1 }, { a: undefined, b: 2 });
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should deduplicate object arrays by JSON string', () => {
      const result = deepMerge(
        { arr: [{ id: 1 }] },
        { arr: [{ id: 1 }, { id: 2 }] }
      );
      expect(result.arr).toHaveLength(2);
    });
  });

  describe('getParser', () => {
    it('should return parser for known IDE type', () => {
      const parser = getParser('claude-desktop');
      expect(typeof parser).toBe('function');
    });

    it('should throw for unknown IDE type', () => {
      expect(() => getParser('unknown')).toThrow();
    });
  });

  describe('getFormatter', () => {
    it('should return formatter for known IDE type', () => {
      const formatter = getFormatter('claude-desktop');
      expect(typeof formatter).toBe('function');
    });

    it('should throw for unknown IDE type', () => {
      expect(() => getFormatter('unknown')).toThrow();
    });
  });

  describe('configParsers registry', () => {
    it('should have parsers for all 6 IDE types', () => {
      expect(configParsers['claude-desktop']).toBeDefined();
      expect(configParsers['claude-code']).toBeDefined();
      expect(configParsers['cursor']).toBeDefined();
      expect(configParsers['windsurf']).toBeDefined();
      expect(configParsers['codex']).toBeDefined();
      expect(configParsers['opencode']).toBeDefined();
    });
  });

  describe('configFormatters registry', () => {
    it('should have formatters for all 6 IDE types', () => {
      expect(configFormatters['claude-desktop']).toBeDefined();
      expect(configFormatters['claude-code']).toBeDefined();
      expect(configFormatters['cursor']).toBeDefined();
      expect(configFormatters['windsurf']).toBeDefined();
      expect(configFormatters['codex']).toBeDefined();
      expect(configFormatters['opencode']).toBeDefined();
    });
  });
});
