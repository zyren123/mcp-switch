import { IDEType } from '../../shared/types';
import { BaseAdapter } from './BaseAdapter';

/**
 * Adapter for Claude Desktop application
 *
 * Config format: JSON
 * Config path:
 *   - macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
 *   - Windows: %APPDATA%\Claude\claude_desktop_config.json
 *   - Linux: ~/.config/Claude/claude_desktop_config.json
 */
export class ClaudeDesktopAdapter extends BaseAdapter {
  readonly ideType: IDEType = 'claude-desktop';
}
