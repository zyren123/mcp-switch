import { IDEType } from '../../shared/types';
import { BaseAdapter } from './BaseAdapter';

/**
 * Adapter for Claude Code CLI
 *
 * Config format: JSON
 * Config path:
 *   - macOS: ~/.claude.json
 *   - Windows: %USERPROFILE%\.claude.json
 *   - Linux: ~/.claude.json
 *
 * Note: This adapter only manages MCP server configuration (.claude.json),
 * not settings.json which contains other non-MCP settings.
 *
 * Environment variable syntax: ${VAR} or ${VAR:-default}
 */
export class ClaudeCodeAdapter extends BaseAdapter {
  readonly ideType: IDEType = 'claude-code';
}
