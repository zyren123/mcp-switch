import * as os from 'os';
import * as path from 'path';

export interface PlatformConfig {
  darwin: string;  // macOS
  win32: string;   // Windows
  linux: string;   // Linux
}

export type Platform = 'darwin' | 'win32' | 'linux';

/**
 * Get the current platform
 */
export const getCurrentPlatform = (): Platform => {
  const platform = process.platform;
  if (platform === 'darwin' || platform === 'win32' || platform === 'linux') {
    return platform;
  }
  // Default to linux for other Unix-like systems
  return 'linux';
};

/**
 * Get the configuration file path for a specific IDE
 *
 * Windows path strategy:
 * - APPDATA: Used for apps that need roaming config (Claude Desktop, Windsurf)
 * - USERPROFILE: Used for apps following cross-platform ~/.config convention (Claude Code, OpenCode, Codex, Cursor)
 */
export const getConfigPath = (ideType: string, _scope: 'user' | 'project' | 'local' = 'user'): string => {
  const platform = getCurrentPlatform();
  const homeDir = os.homedir();
  const appData = process.env.APPDATA || '';
  const userProfile = process.env.USERPROFILE || os.homedir();

  const paths: Record<string, PlatformConfig> = {
    'claude-desktop': {
      darwin: path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
      win32: path.join(appData, 'Claude', 'claude_desktop_config.json'),
      linux: path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json')
    },
    'claude-code': {
      darwin: path.join(homeDir, '.claude.json'),
      win32: path.join(userProfile, '.claude.json'),
      linux: path.join(homeDir, '.claude.json')
    },
    'cursor': {
      darwin: path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'mcp.json'),
      win32: path.join(userProfile, '.cursor', 'mcp.json'),
      linux: path.join(homeDir, '.config', 'Cursor', 'User', 'globalStorage', 'mcp.json')
    },
    'windsurf': {
      darwin: path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json'),
      win32: path.join(appData, 'Codeium', 'Windsurf', 'mcp_config.json'),
      linux: path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json')
    },
    'codex': {
      darwin: path.join(homeDir, '.codex', 'config.toml'),
      win32: path.join(userProfile, '.codex', 'config.toml'),
      linux: path.join(homeDir, '.codex', 'config.toml')
    },
    'opencode': {
      darwin: path.join(homeDir, '.config', 'opencode', 'opencode.json'),
      win32: path.join(userProfile, '.config', 'opencode', 'opencode.json'),
      linux: path.join(homeDir, '.config', 'opencode', 'opencode.json')
    }
  };

  return paths[ideType]?.[platform] || '';
};

/**
 * Get Claude Code MCP configuration file path
 * Note: Only returns MCP server config path, not settings.json (other settings)
 * Returns the same path as getConfigPath('claude-code')
 */
export const getClaudeCodeConfigPath = (): string => {
  return getConfigPath('claude-code');
};

/**
 * Get the backup directory path
 */
export const getBackupDir = (): string => {
  return path.join(os.homedir(), '.mcp-switch', 'backup');
};

/**
 * Get all supported IDE types
 */
export const getSupportedIDETypes = (): string[] => {
  return ['claude-desktop', 'claude-code', 'cursor', 'windsurf', 'codex', 'opencode'];
};

/**
 * Get display name for an IDE type
 */
export const getIDEDisplayName = (ideType: string): string => {
  const displayNames: Record<string, string> = {
    'claude-desktop': 'Claude Desktop',
    'claude-code': 'Claude Code CLI',
    'cursor': 'Cursor IDE',
    'windsurf': 'Windsurf IDE',
    'codex': 'Codex CLI',
    'opencode': 'OpenCode'
  };
  return displayNames[ideType] || ideType;
};

/**
 * Get config format for an IDE type
 */
export const getConfigFormat = (ideType: string): 'json' | 'toml' | 'jsonc' => {
  if (ideType === 'codex') {
    return 'toml';
  }
  if (ideType === 'opencode') {
    return 'jsonc';
  }
  return 'json';
};
