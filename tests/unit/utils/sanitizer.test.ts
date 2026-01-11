import { describe, it, expect } from 'vitest';
import {
  sanitizeConfig,
  containsSensitiveInfo,
  getSensitiveFieldPaths,
  sanitizeLogMessage,
  looksLikeCredential
} from '../../../src/main/utils/sanitizer';

describe('sanitizer.ts', () => {
  describe('sanitizeConfig', () => {
    it('should redact apiKey fields', () => {
      const config = { apiKey: 'secret123' };
      const result = sanitizeConfig(config);
      expect(result.apiKey).toBe('[REDACTED]');
    });

    it('should redact api_key fields', () => {
      const config = { api_key: 'secret123' };
      const result = sanitizeConfig(config);
      expect(result.api_key).toBe('[REDACTED]');
    });

    it('should redact nested sensitive fields', () => {
      const config = {
        server: {
          auth: {
            apiKey: 'nested_secret'
          }
        }
      };
      const result = sanitizeConfig(config);
      expect(result.server.auth.apiKey).toBe('[REDACTED]');
    });

    it('should redact token fields', () => {
      const config = { accessToken: 'token123', authToken: 'auth123' };
      const result = sanitizeConfig(config);
      expect(result.accessToken).toBe('[REDACTED]');
      expect(result.authToken).toBe('[REDACTED]');
    });

    it('should redact password fields', () => {
      const config = { password: 'pass123' };
      const result = sanitizeConfig(config);
      expect(result.password).toBe('[REDACTED]');
    });

    it('should redact secret fields', () => {
      const config = { clientSecret: 'secret' };
      const result = sanitizeConfig(config);
      expect(result.clientSecret).toBe('[REDACTED]');
    });

    it('should preserve non-sensitive fields', () => {
      const config = { name: 'test', command: 'node', args: ['--flag'] };
      const result = sanitizeConfig(config);
      expect(result.name).toBe('test');
      expect(result.command).toBe('node');
      expect(result.args).toEqual(['--flag']);
    });

    it('should not modify original object', () => {
      const config = { apiKey: 'original' };
      sanitizeConfig(config);
      expect(config.apiKey).toBe('original');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeConfig(null)).toBe(null);
      expect(sanitizeConfig(undefined)).toBe(undefined);
    });

    it('should skip empty sensitive fields', () => {
      const config = { apiKey: '' };
      const result = sanitizeConfig(config);
      expect(result.apiKey).toBe('');
    });

    it('should handle arrays', () => {
      const config = {
        servers: [
          { name: 'a', apiKey: 'key1' },
          { name: 'b', apiKey: 'key2' }
        ]
      };
      const result = sanitizeConfig(config);
      expect(result.servers[0].name).toBe('a');
      expect(result.servers[0].apiKey).toBe('[REDACTED]');
      expect(result.servers[1].apiKey).toBe('[REDACTED]');
    });
  });

  describe('containsSensitiveInfo', () => {
    it('should return true for config with apiKey', () => {
      const config = { apiKey: 'secret' };
      expect(containsSensitiveInfo(config)).toBe(true);
    });

    it('should return true for nested sensitive fields', () => {
      const config = { deep: { nested: { password: 'secret' } } };
      expect(containsSensitiveInfo(config)).toBe(true);
    });

    it('should return false for config without sensitive fields', () => {
      const config = { name: 'test', value: 123 };
      expect(containsSensitiveInfo(config)).toBe(false);
    });

    it('should return false for empty sensitive fields', () => {
      const config = { apiKey: '' };
      expect(containsSensitiveInfo(config)).toBe(false);
    });

    it('should return false for already redacted fields', () => {
      const config = { apiKey: '[REDACTED]' };
      expect(containsSensitiveInfo(config)).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(containsSensitiveInfo(null)).toBe(false);
      expect(containsSensitiveInfo(undefined)).toBe(false);
    });
  });

  describe('getSensitiveFieldPaths', () => {
    it('should return paths to sensitive fields', () => {
      const config = { apiKey: 'secret', nested: { token: 'token123' } };
      const paths = getSensitiveFieldPaths(config);
      expect(paths).toContain('apiKey');
      expect(paths).toContain('nested.token');
    });

    it('should return empty array for no sensitive fields', () => {
      const config = { name: 'test' };
      const paths = getSensitiveFieldPaths(config);
      expect(paths).toHaveLength(0);
    });

    it('should skip empty and redacted values', () => {
      const config = { apiKey: '', token: '[REDACTED]' };
      const paths = getSensitiveFieldPaths(config);
      expect(paths).toHaveLength(0);
    });
  });

  describe('sanitizeLogMessage', () => {
    it('should redact long alphanumeric strings (API keys)', () => {
      const message = 'API key is sk-1234567890abcdefghijklmnopqrstuvwxyz';
      const result = sanitizeLogMessage(message);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('sk-1234567890');
    });

    it('should redact Bearer tokens', () => {
      const message = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const result = sanitizeLogMessage(message);
      expect(result).toContain('Bearer [REDACTED]');
    });

    it('should redact JSON-style api_key values', () => {
      const message = '{"api_key": "secret123"}';
      const result = sanitizeLogMessage(message);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('secret123');
    });

    it('should preserve normal text', () => {
      const message = 'Loading config from /path/to/file';
      const result = sanitizeLogMessage(message);
      expect(result).toBe(message);
    });
  });

  describe('looksLikeCredential', () => {
    it('should detect long alphanumeric strings', () => {
      expect(looksLikeCredential('sk-1234567890abcdefghijklmnopqrstuvwxyz')).toBe(true);
    });

    it('should detect JWT-like tokens', () => {
      expect(looksLikeCredential('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U')).toBe(true);
    });

    it('should return false for environment variable references', () => {
      expect(looksLikeCredential('${API_KEY}')).toBe(false);
      expect(looksLikeCredential('{env:API_KEY}')).toBe(false);
    });

    it('should return false for short strings', () => {
      expect(looksLikeCredential('short')).toBe(false);
    });

    it('should return false for normal values', () => {
      expect(looksLikeCredential('node')).toBe(false);
      expect(looksLikeCredential('/path/to/file')).toBe(false);
    });
  });
});
