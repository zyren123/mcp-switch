/**
 * Error codes for configuration operations
 */
export enum ConfigErrorCode {
  // Success
  SUCCESS = 0,

  // File operation errors (1xx)
  FILE_NOT_FOUND = 100,
  FILE_READ_ERROR = 101,
  FILE_WRITE_ERROR = 102,
  FILE_PERMISSION_DENIED = 103,

  // Parse errors (2xx)
  PARSE_JSON_ERROR = 200,
  PARSE_TOML_ERROR = 201,
  PARSE_UNKNOWN_FORMAT = 202,

  // Sync errors (3xx)
  SYNC_SOURCE_INVALID = 300,
  SYNC_TARGET_INVALID = 301,
  SYNC_CONFLICT = 302,
  SYNC_BACKUP_FAILED = 303,

  // Config errors (4xx)
  CONFIG_INVALID_STRUCTURE = 400,
  CONFIG_MISSING_REQUIRED_FIELD = 401,

  // System errors (5xx)
  PLATFORM_UNSUPPORTED = 500,
  IPC_COMMUNICATION_ERROR = 501
}

/**
 * Configuration error interface
 */
export interface ConfigError extends Error {
  code: ConfigErrorCode;
  path?: string;
  details?: any;
}

/**
 * Create a configuration error
 */
export const createConfigError = (
  message: string,
  code: ConfigErrorCode,
  path?: string,
  details?: any
): ConfigError => {
  const error = new Error(message) as ConfigError;
  error.name = 'ConfigError';
  error.code = code;
  error.path = path;
  error.details = details;
  return error;
};

/**
 * Check if an error is a ConfigError
 */
export const isConfigError = (error: unknown): error is ConfigError => {
  return error instanceof Error && 'code' in error && typeof (error as any).code === 'number';
};

/**
 * Get human-readable error message for an error code
 */
export const getErrorMessage = (code: ConfigErrorCode): string => {
  const messages: Record<ConfigErrorCode, string> = {
    [ConfigErrorCode.SUCCESS]: 'Operation completed successfully',
    [ConfigErrorCode.FILE_NOT_FOUND]: 'Configuration file not found',
    [ConfigErrorCode.FILE_READ_ERROR]: 'Failed to read configuration file',
    [ConfigErrorCode.FILE_WRITE_ERROR]: 'Failed to write configuration file',
    [ConfigErrorCode.FILE_PERMISSION_DENIED]: 'Permission denied accessing configuration file',
    [ConfigErrorCode.PARSE_JSON_ERROR]: 'Failed to parse JSON configuration',
    [ConfigErrorCode.PARSE_TOML_ERROR]: 'Failed to parse TOML configuration',
    [ConfigErrorCode.PARSE_UNKNOWN_FORMAT]: 'Unknown configuration format',
    [ConfigErrorCode.SYNC_SOURCE_INVALID]: 'Invalid sync source',
    [ConfigErrorCode.SYNC_TARGET_INVALID]: 'Invalid sync target',
    [ConfigErrorCode.SYNC_CONFLICT]: 'Sync conflict detected',
    [ConfigErrorCode.SYNC_BACKUP_FAILED]: 'Failed to create backup before sync',
    [ConfigErrorCode.CONFIG_INVALID_STRUCTURE]: 'Invalid configuration structure',
    [ConfigErrorCode.CONFIG_MISSING_REQUIRED_FIELD]: 'Missing required configuration field',
    [ConfigErrorCode.PLATFORM_UNSUPPORTED]: 'Platform not supported',
    [ConfigErrorCode.IPC_COMMUNICATION_ERROR]: 'IPC communication error'
  };
  return messages[code] || 'Unknown error';
};

/**
 * Wrap an async function with error handling
 */
export const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  defaultCode: ConfigErrorCode = ConfigErrorCode.FILE_READ_ERROR
): T => {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (isConfigError(error)) {
        throw error;
      }
      throw createConfigError(
        error instanceof Error ? error.message : 'Unknown error',
        defaultCode,
        undefined,
        { originalError: error }
      );
    }
  }) as T;
};
