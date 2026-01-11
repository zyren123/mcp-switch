import { IDEType } from '../../shared/types';
import { BaseAdapter } from './BaseAdapter';

/**
 * Adapter for Cursor IDE
 *
 * Config format: JSON
 * Config path:
 *   - macOS: ~/Library/Application Support/Cursor/User/globalStorage/mcp.json
 *   - Windows: %USERPROFILE%\.cursor\mcp.json
 *   - Linux: ~/.config/Cursor/User/globalStorage/mcp.json
 */
export class CursorAdapter extends BaseAdapter {
  readonly ideType: IDEType = 'cursor';
}
