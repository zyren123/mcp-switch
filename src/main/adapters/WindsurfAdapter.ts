import { IDEType } from '../../shared/types';
import { BaseAdapter } from './BaseAdapter';

/**
 * Adapter for Windsurf IDE
 *
 * Config format: JSON
 * Config path:
 *   - macOS: ~/.codeium/windsurf/mcp_config.json
 *   - Windows: %APPDATA%\Codeium\Windsurf\mcp_config.json
 *   - Linux: ~/.codeium/windsurf/mcp_config.json
 *
 * Environment variable syntax: ${env:VAR}
 */
export class WindsurfAdapter extends BaseAdapter {
  readonly ideType: IDEType = 'windsurf';
}
