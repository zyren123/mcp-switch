/**
 * Sensitive information handling utilities
 *
 * Used to redact sensitive fields from configs before logging or displaying
 */

/**
 * List of field names that are considered sensitive
 */
const SENSITIVE_FIELDS = [
  'apikey',
  'api_key',
  'apiKey',
  'secret',
  'password',
  'token',
  'authtoken',
  'auth_token',
  'authToken',
  'accesstoken',
  'access_token',
  'accessToken',
  'privatekey',
  'private_key',
  'privateKey',
  'credentials',
  'bearer'
];

/**
 * Placeholder text for redacted values
 */
const REDACTED_PLACEHOLDER = '[REDACTED]';

/**
 * Check if a field name is sensitive (case-insensitive)
 */
const isSensitiveFieldName = (fieldName: string): boolean => {
  const lowerName = fieldName.toLowerCase();
  return SENSITIVE_FIELDS.some(sensitive => lowerName.includes(sensitive.toLowerCase()));
};

/**
 * Sanitize a config object by redacting sensitive fields
 *
 * @param config - Configuration object to sanitize
 * @returns New object with sensitive fields redacted
 */
export const sanitizeConfig = <T>(config: T): T => {
  if (!config || typeof config !== 'object') {
    return config;
  }

  // Deep clone to avoid modifying original
  const sanitized = JSON.parse(JSON.stringify(config));

  const sanitizeObject = (obj: any): void => {
    if (!obj || typeof obj !== 'object') return;

    for (const key of Object.keys(obj)) {
      if (isSensitiveFieldName(key)) {
        // Redact sensitive field
        if (typeof obj[key] === 'string' && obj[key].length > 0) {
          obj[key] = REDACTED_PLACEHOLDER;
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        // Recursively sanitize nested objects
        sanitizeObject(obj[key]);
      }
    }
  };

  sanitizeObject(sanitized);
  return sanitized;
};

/**
 * Check if a config object contains any sensitive information
 *
 * @param config - Configuration object to check
 * @returns True if config contains sensitive fields with non-empty values
 */
export const containsSensitiveInfo = (config: unknown): boolean => {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const checkObject = (obj: any): boolean => {
    if (!obj || typeof obj !== 'object') return false;

    for (const key of Object.keys(obj)) {
      if (isSensitiveFieldName(key)) {
        // Check if the sensitive field has a non-empty value
        const value = obj[key];
        if (typeof value === 'string' && value.length > 0 && value !== REDACTED_PLACEHOLDER) {
          return true;
        }
      }
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (checkObject(obj[key])) {
          return true;
        }
      }
    }

    return false;
  };

  return checkObject(config);
};

/**
 * Get list of sensitive field paths in a config object
 *
 * @param config - Configuration object to analyze
 * @returns Array of dot-notation paths to sensitive fields
 */
export const getSensitiveFieldPaths = (config: unknown): string[] => {
  const paths: string[] = [];

  const findPaths = (obj: any, currentPath: string = ''): void => {
    if (!obj || typeof obj !== 'object') return;

    for (const key of Object.keys(obj)) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;

      if (isSensitiveFieldName(key)) {
        const value = obj[key];
        if (typeof value === 'string' && value.length > 0 && value !== REDACTED_PLACEHOLDER) {
          paths.push(newPath);
        }
      }

      if (typeof obj[key] === 'object' && obj[key] !== null) {
        findPaths(obj[key], newPath);
      }
    }
  };

  findPaths(config);
  return paths;
};

/**
 * Sanitize a string that may contain sensitive data
 * Used for log messages
 */
export const sanitizeLogMessage = (message: string): string => {
  let sanitized = message;

  // Redact potential API keys (long alphanumeric strings)
  sanitized = sanitized.replace(/[a-zA-Z0-9_-]{32,}/g, REDACTED_PLACEHOLDER);

  // Redact potential bearer tokens
  sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, `Bearer ${REDACTED_PLACEHOLDER}`);

  // Redact patterns like "api_key": "value" or "apiKey": "value"
  sanitized = sanitized.replace(
    /("(?:api[_-]?key|token|secret|password|credentials)":\s*")[^"]+(")/gi,
    `$1${REDACTED_PLACEHOLDER}$2`
  );

  return sanitized;
};

/**
 * Check if a string value looks like a sensitive credential
 */
export const looksLikeCredential = (value: string): boolean => {
  // Skip environment variable references
  if (/^\$\{.*\}$/.test(value) || /^\{env:.*\}$/.test(value)) {
    return false;
  }

  // Check for long alphanumeric strings (typical of API keys)
  if (/^[a-zA-Z0-9_-]{32,}$/.test(value)) {
    return true;
  }

  // Check for JWT-like tokens
  if (/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(value)) {
    return true;
  }

  return false;
};
