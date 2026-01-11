/**
 * Environment variable expansion utilities
 *
 * Supports multiple syntaxes:
 * - Claude Code: ${VAR} or ${VAR:-default}
 * - Windsurf: ${env:VAR}
 * - OpenCode: {env:VARIABLE_NAME}
 */

/**
 * Expand environment variables in a string
 *
 * @param content - String containing environment variable references
 * @param env - Environment variables object (defaults to process.env)
 * @returns String with environment variables expanded
 */
export const expandEnvVars = (
  content: string,
  env: Record<string, string | undefined> = process.env
): string => {
  let result = content;

  // Claude Code: ${VAR} or ${VAR:-default}
  result = result.replace(/\$\{([^}:]+)(?::-([^}]*))?\}/g, (_, name, defaultValue) => {
    return env[name] ?? defaultValue ?? '';
  });

  // Windsurf: ${env:VAR}
  result = result.replace(/\$\{env:([^}]+)\}/g, (_, name) => {
    return env[name] ?? '';
  });

  // OpenCode: {env:VARIABLE_NAME}
  result = result.replace(/\{env:([^}]+)\}/g, (_, name) => {
    return env[name] ?? '';
  });

  return result;
};

/**
 * Check if a string contains any environment variable syntax
 *
 * @param value - String to check
 * @returns True if the string contains environment variable references
 */
export const hasEnvVarSyntax = (value: string): boolean => {
  // Claude Code: ${VAR} or ${VAR:-default}
  if (/\$\{[^}]+\}/.test(value)) return true;

  // OpenCode: {env:VARIABLE_NAME}
  if (/\{env:[^}]+\}/.test(value)) return true;

  return false;
};

/**
 * Check if a string contains Claude Code default value syntax
 * Example: ${VAR:-default}
 */
export const hasDefaultValue = (value: string): boolean => {
  return /\$\{[^}:]+:-[^}]*\}/.test(value);
};

/**
 * Extract all environment variable names from a string
 *
 * @param content - String containing environment variable references
 * @returns Array of unique environment variable names
 */
export const extractEnvVarNames = (content: string): string[] => {
  const names = new Set<string>();

  // Claude Code: ${VAR} or ${VAR:-default}
  const claudeMatches = content.matchAll(/\$\{([^}:]+)(?::-[^}]*)?\}/g);
  for (const match of claudeMatches) {
    names.add(match[1]);
  }

  // Windsurf: ${env:VAR}
  const windsurfMatches = content.matchAll(/\$\{env:([^}]+)\}/g);
  for (const match of windsurfMatches) {
    names.add(match[1]);
  }

  // OpenCode: {env:VARIABLE_NAME}
  const opencodeMatches = content.matchAll(/\{env:([^}]+)\}/g);
  for (const match of opencodeMatches) {
    names.add(match[1]);
  }

  return Array.from(names);
};

/**
 * Expand environment variables recursively in an object
 *
 * @param obj - Object containing string values with environment variable references
 * @param env - Environment variables object (defaults to process.env)
 * @returns New object with environment variables expanded
 */
export const expandEnvVarsInObject = <T>(
  obj: T,
  env: Record<string, string | undefined> = process.env
): T => {
  if (typeof obj === 'string') {
    return expandEnvVars(obj, env) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => expandEnvVarsInObject(item, env)) as T;
  }

  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = expandEnvVarsInObject(value, env);
    }
    return result as T;
  }

  return obj;
};

/**
 * Check if any string in an object contains environment variable syntax
 */
export const objectHasEnvVars = (obj: unknown): boolean => {
  if (typeof obj === 'string') {
    return hasEnvVarSyntax(obj);
  }

  if (Array.isArray(obj)) {
    return obj.some(item => objectHasEnvVars(item));
  }

  if (obj && typeof obj === 'object') {
    return Object.values(obj).some(value => objectHasEnvVars(value));
  }

  return false;
};
