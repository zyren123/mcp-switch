import { describe, it, expect } from 'vitest';
import {
  ConfigErrorCode,
  ConfigError,
  createConfigError,
  isConfigError,
  getErrorMessage,
  withErrorHandling
} from '../../../src/main/utils/errors';

describe('errors.ts', () => {
  describe('ConfigErrorCode', () => {
    it('should have SUCCESS as 0', () => {
      expect(ConfigErrorCode.SUCCESS).toBe(0);
    });

    it('should have file errors in 1xx range', () => {
      expect(ConfigErrorCode.FILE_NOT_FOUND).toBe(100);
      expect(ConfigErrorCode.FILE_READ_ERROR).toBe(101);
      expect(ConfigErrorCode.FILE_WRITE_ERROR).toBe(102);
      expect(ConfigErrorCode.FILE_PERMISSION_DENIED).toBe(103);
    });

    it('should have parse errors in 2xx range', () => {
      expect(ConfigErrorCode.PARSE_JSON_ERROR).toBe(200);
      expect(ConfigErrorCode.PARSE_TOML_ERROR).toBe(201);
      expect(ConfigErrorCode.PARSE_UNKNOWN_FORMAT).toBe(202);
    });

    it('should have sync errors in 3xx range', () => {
      expect(ConfigErrorCode.SYNC_SOURCE_INVALID).toBe(300);
      expect(ConfigErrorCode.SYNC_TARGET_INVALID).toBe(301);
      expect(ConfigErrorCode.SYNC_CONFLICT).toBe(302);
      expect(ConfigErrorCode.SYNC_BACKUP_FAILED).toBe(303);
    });

    it('should have config errors in 4xx range', () => {
      expect(ConfigErrorCode.CONFIG_INVALID_STRUCTURE).toBe(400);
      expect(ConfigErrorCode.CONFIG_MISSING_REQUIRED_FIELD).toBe(401);
    });

    it('should have system errors in 5xx range', () => {
      expect(ConfigErrorCode.PLATFORM_UNSUPPORTED).toBe(500);
      expect(ConfigErrorCode.IPC_COMMUNICATION_ERROR).toBe(501);
    });
  });

  describe('createConfigError', () => {
    it('should create error with message and code', () => {
      const error = createConfigError('Test error', ConfigErrorCode.FILE_NOT_FOUND);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ConfigErrorCode.FILE_NOT_FOUND);
      expect(error.name).toBe('ConfigError');
    });

    it('should include optional path', () => {
      const error = createConfigError('Test error', ConfigErrorCode.FILE_NOT_FOUND, '/path/to/file');
      expect(error.path).toBe('/path/to/file');
    });

    it('should include optional details', () => {
      const details = { line: 10, column: 5 };
      const error = createConfigError('Test error', ConfigErrorCode.PARSE_JSON_ERROR, undefined, details);
      expect(error.details).toEqual(details);
    });

    it('should be an instance of Error', () => {
      const error = createConfigError('Test', ConfigErrorCode.SUCCESS);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('isConfigError', () => {
    it('should return true for ConfigError', () => {
      const error = createConfigError('Test', ConfigErrorCode.SUCCESS);
      expect(isConfigError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Regular error');
      expect(isConfigError(error)).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(isConfigError({ message: 'not an error' })).toBe(false);
      expect(isConfigError(null)).toBe(false);
      expect(isConfigError(undefined)).toBe(false);
      expect(isConfigError('string')).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should return message for SUCCESS', () => {
      expect(getErrorMessage(ConfigErrorCode.SUCCESS)).toBe('Operation completed successfully');
    });

    it('should return message for FILE_NOT_FOUND', () => {
      expect(getErrorMessage(ConfigErrorCode.FILE_NOT_FOUND)).toBe('Configuration file not found');
    });

    it('should return message for PARSE_JSON_ERROR', () => {
      expect(getErrorMessage(ConfigErrorCode.PARSE_JSON_ERROR)).toBe('Failed to parse JSON configuration');
    });

    it('should return message for all error codes', () => {
      const codes = Object.values(ConfigErrorCode).filter(v => typeof v === 'number');
      for (const code of codes) {
        const message = getErrorMessage(code as ConfigErrorCode);
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('withErrorHandling', () => {
    it('should return result on success', async () => {
      const fn = async () => 'success';
      const wrapped = withErrorHandling(fn);
      const result = await wrapped();
      expect(result).toBe('success');
    });

    it('should re-throw ConfigError as-is', async () => {
      const originalError = createConfigError('Original', ConfigErrorCode.PARSE_JSON_ERROR);
      const fn = async () => { throw originalError; };
      const wrapped = withErrorHandling(fn);

      await expect(wrapped()).rejects.toThrow(originalError);
    });

    it('should wrap regular errors with ConfigError', async () => {
      const fn = async () => { throw new Error('Regular error'); };
      const wrapped = withErrorHandling(fn, ConfigErrorCode.FILE_READ_ERROR);

      try {
        await wrapped();
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(isConfigError(error)).toBe(true);
        expect(error.code).toBe(ConfigErrorCode.FILE_READ_ERROR);
        expect(error.message).toBe('Regular error');
      }
    });

    it('should handle non-Error throws', async () => {
      const fn = async () => { throw 'string error'; };
      const wrapped = withErrorHandling(fn);

      try {
        await wrapped();
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(isConfigError(error)).toBe(true);
        expect(error.message).toBe('Unknown error');
      }
    });
  });
});
