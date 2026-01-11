import { describe, it, expect } from 'vitest';
import {
  expandEnvVars,
  hasEnvVarSyntax,
  hasDefaultValue,
  extractEnvVarNames,
  expandEnvVarsInObject,
  objectHasEnvVars
} from '../../../src/main/utils/envExpander';

describe('envExpander.ts', () => {
  describe('expandEnvVars', () => {
    it('should expand ${VAR} syntax (Claude Code)', () => {
      const env = { API_KEY: 'secret123' };
      const result = expandEnvVars('Bearer ${API_KEY}', env);
      expect(result).toBe('Bearer secret123');
    });

    it('should expand ${VAR:-default} with default value', () => {
      const env = {};
      const result = expandEnvVars('${API_KEY:-default_key}', env);
      expect(result).toBe('default_key');
    });

    it('should use env value over default when present', () => {
      const env = { API_KEY: 'real_key' };
      const result = expandEnvVars('${API_KEY:-default_key}', env);
      expect(result).toBe('real_key');
    });

    it('should expand ${env:VAR} syntax (Windsurf)', () => {
      const env = { TOKEN: 'windsurf_token' };
      const result = expandEnvVars('${env:TOKEN}', env);
      expect(result).toBe('windsurf_token');
    });

    it('should expand {env:VAR} syntax (OpenCode)', () => {
      const env = { SECRET: 'opencode_secret' };
      const result = expandEnvVars('{env:SECRET}', env);
      expect(result).toBe('opencode_secret');
    });

    it('should return empty string when env var missing without default', () => {
      const env = {};
      const result = expandEnvVars('${MISSING_VAR}', env);
      expect(result).toBe('');
    });

    it('should handle multiple variables in one string', () => {
      const env = { USER: 'john', HOST: 'localhost' };
      const result = expandEnvVars('${USER}@${HOST}', env);
      expect(result).toBe('john@localhost');
    });

    it('should handle mixed syntax styles', () => {
      const env = { A: '1', B: '2', C: '3' };
      const result = expandEnvVars('${A} ${env:B} {env:C}', env);
      expect(result).toBe('1 2 3');
    });

    it('should preserve text without variables', () => {
      const env = {};
      const result = expandEnvVars('plain text without vars', env);
      expect(result).toBe('plain text without vars');
    });
  });

  describe('hasEnvVarSyntax', () => {
    it('should detect ${VAR} syntax', () => {
      expect(hasEnvVarSyntax('${API_KEY}')).toBe(true);
    });

    it('should detect ${VAR:-default} syntax', () => {
      expect(hasEnvVarSyntax('${API_KEY:-default}')).toBe(true);
    });

    it('should detect ${env:VAR} syntax', () => {
      expect(hasEnvVarSyntax('${env:TOKEN}')).toBe(true);
    });

    it('should detect {env:VAR} syntax', () => {
      expect(hasEnvVarSyntax('{env:SECRET}')).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(hasEnvVarSyntax('plain text')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(hasEnvVarSyntax('')).toBe(false);
    });
  });

  describe('hasDefaultValue', () => {
    it('should detect ${VAR:-default} syntax', () => {
      expect(hasDefaultValue('${API_KEY:-default}')).toBe(true);
    });

    it('should return false for ${VAR} without default', () => {
      expect(hasDefaultValue('${API_KEY}')).toBe(false);
    });

    it('should return false for other syntaxes', () => {
      expect(hasDefaultValue('${env:VAR}')).toBe(false);
      expect(hasDefaultValue('{env:VAR}')).toBe(false);
    });
  });

  describe('extractEnvVarNames', () => {
    it('should extract names from ${VAR} syntax', () => {
      const names = extractEnvVarNames('${API_KEY} ${SECRET}');
      expect(names).toContain('API_KEY');
      expect(names).toContain('SECRET');
    });

    it('should extract names from ${VAR:-default} syntax', () => {
      const names = extractEnvVarNames('${API_KEY:-default}');
      expect(names).toContain('API_KEY');
    });

    it('should extract names from ${env:VAR} syntax', () => {
      const names = extractEnvVarNames('${env:TOKEN}');
      expect(names).toContain('TOKEN');
    });

    it('should extract names from {env:VAR} syntax', () => {
      const names = extractEnvVarNames('{env:SECRET}');
      expect(names).toContain('SECRET');
    });

    it('should return unique names', () => {
      const names = extractEnvVarNames('${VAR} ${VAR} ${VAR}');
      expect(names).toHaveLength(1);
      expect(names).toContain('VAR');
    });

    it('should return empty array for no variables', () => {
      const names = extractEnvVarNames('plain text');
      expect(names).toHaveLength(0);
    });
  });

  describe('expandEnvVarsInObject', () => {
    it('should expand variables in nested objects', () => {
      const env = { KEY: 'value' };
      const obj = { a: { b: '${KEY}' } };
      const result = expandEnvVarsInObject(obj, env);
      expect(result.a.b).toBe('value');
    });

    it('should expand variables in arrays', () => {
      const env = { KEY: 'value' };
      const obj = { arr: ['${KEY}', 'static'] };
      const result = expandEnvVarsInObject(obj, env);
      expect(result.arr[0]).toBe('value');
      expect(result.arr[1]).toBe('static');
    });

    it('should preserve non-string values', () => {
      const env = {};
      const obj = { num: 42, bool: true, nil: null };
      const result = expandEnvVarsInObject(obj, env);
      expect(result.num).toBe(42);
      expect(result.bool).toBe(true);
      expect(result.nil).toBe(null);
    });

    it('should not modify original object', () => {
      const env = { KEY: 'new' };
      const obj = { a: '${KEY}' };
      expandEnvVarsInObject(obj, env);
      expect(obj.a).toBe('${KEY}');
    });
  });

  describe('objectHasEnvVars', () => {
    it('should detect variables in nested objects', () => {
      const obj = { a: { b: '${KEY}' } };
      expect(objectHasEnvVars(obj)).toBe(true);
    });

    it('should detect variables in arrays', () => {
      const obj = { arr: ['static', '${KEY}'] };
      expect(objectHasEnvVars(obj)).toBe(true);
    });

    it('should return false for objects without variables', () => {
      const obj = { a: 'plain', b: { c: 'text' } };
      expect(objectHasEnvVars(obj)).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(objectHasEnvVars(null)).toBe(false);
      expect(objectHasEnvVars(undefined)).toBe(false);
    });

    it('should handle primitive values', () => {
      expect(objectHasEnvVars('${VAR}')).toBe(true);
      expect(objectHasEnvVars('plain')).toBe(false);
      expect(objectHasEnvVars(42)).toBe(false);
    });
  });
});
