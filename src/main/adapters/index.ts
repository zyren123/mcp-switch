import { IDEType } from '../../shared/types';
import { BaseAdapter } from './BaseAdapter';
import { ClaudeDesktopAdapter } from './ClaudeDesktopAdapter';
import { ClaudeCodeAdapter } from './ClaudeCodeAdapter';
import { CursorAdapter } from './CursorAdapter';
import { WindsurfAdapter } from './WindsurfAdapter';
import { CodexAdapter } from './CodexAdapter';
import { OpenCodeAdapter } from './OpenCodeAdapter';

/**
 * Registry of all IDE adapters
 */
export const adapters: Record<IDEType, BaseAdapter> = {
  'claude-desktop': new ClaudeDesktopAdapter(),
  'claude-code': new ClaudeCodeAdapter(),
  'cursor': new CursorAdapter(),
  'windsurf': new WindsurfAdapter(),
  'codex': new CodexAdapter(),
  'opencode': new OpenCodeAdapter()
};

/**
 * Get adapter for a specific IDE type
 */
export const getAdapter = (ideType: IDEType): BaseAdapter => {
  const adapter = adapters[ideType];
  if (!adapter) {
    throw new Error(`No adapter found for IDE type: ${ideType}`);
  }
  return adapter;
};

/**
 * Get all registered adapters
 */
export const getAllAdapters = (): BaseAdapter[] => {
  return Object.values(adapters);
};

/**
 * Get all registered IDE types
 */
export const getAllIDETypes = (): IDEType[] => {
  return Object.keys(adapters) as IDEType[];
};

// Re-export adapter classes
export { BaseAdapter } from './BaseAdapter';
export { ClaudeDesktopAdapter } from './ClaudeDesktopAdapter';
export { ClaudeCodeAdapter } from './ClaudeCodeAdapter';
export { CursorAdapter } from './CursorAdapter';
export { WindsurfAdapter } from './WindsurfAdapter';
export { CodexAdapter } from './CodexAdapter';
export { OpenCodeAdapter } from './OpenCodeAdapter';
