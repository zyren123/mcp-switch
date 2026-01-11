import { IDEType } from '../../shared/types';
import { BaseAdapter } from './BaseAdapter';

/**
 * Adapter for OpenCode
 *
 * Config format: JSONC (JSON with Comments)
 * Config path:
 *   - macOS: ~/.config/opencode/opencode.json
 *   - Windows: %USERPROFILE%\.config\opencode\opencode.json
 *   - Linux: ~/.config/opencode/opencode.json
 *
 * Features:
 *   - Supports line and block comments
 *   - Supports trailing commas in arrays and objects
 *
 * Environment variable syntax: {env:VARIABLE_NAME}
 */
export class OpenCodeAdapter extends BaseAdapter {
  readonly ideType: IDEType = 'opencode';
}
