// IDE 类型
export type IDEType = 'claude-desktop' | 'claude-code' | 'cursor' | 'windsurf' | 'codex' | 'opencode';

// MCP 服务器配置
export interface MCPServer {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
}

// IDE 配置
export interface IDEConfig {
  type: IDEType;
  name: string;
  displayName: string;
  configPath: string;
  configFormat: 'json' | 'toml' | 'jsonc';
  isInstalled: boolean;
  servers: MCPServer[];
  lastSynced?: number;
  syncStatus: 'synced' | 'pending' | 'error' | 'unknown';
}

// 同步冲突
export interface SyncConflict {
  serverId: string;
  sourceValue: MCPServerConfig | FieldValue | undefined;
  targetValue: MCPServerConfig | FieldValue | undefined;
  field: 'command' | 'args' | 'env' | 'enabled' | 'server';
  conflictType: 'value_mismatch' | 'missing_in_source' | 'missing_in_target';
}

// 单个字段的值类型
export type FieldValue = string | string[] | Record<string, string> | boolean;

// 服务器配置类型（用于整个服务器缺失的情况）
export interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  enabled?: boolean;
}

// 同步操作
export interface SyncOperation {
  id: string;
  sourceIDE: IDEType;
  targetIDEs: IDEType[];
  strategy: 'overwrite' | 'merge' | 'keep-target' | 'manual';
  conflicts: SyncConflict[];
  timestamp: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

// 备份信息
export interface BackupInfo {
  id: string;
  ideType: IDEType;
  timestamp: number;
  path: string;
  size: number;
}

// IPC 通道定义
export const IPC_CHANNELS = {
  // 配置操作
  CONFIG_LOAD_ALL: 'config:load-all',
  CONFIG_LOAD_ONE: 'config:load-one',
  CONFIG_SAVE: 'config:save',
  CONFIG_REFRESH: 'config:refresh',

  // 服务器操作
  SERVER_TOGGLE: 'server:toggle',
  SERVER_ADD: 'server:add',
  SERVER_REMOVE: 'server:remove',
  SERVER_UPDATE: 'server:update',

  // 同步操作
  SYNC_PREVIEW: 'sync:preview',
  SYNC_EXECUTE: 'sync:execute',
  SYNC_RESOLVE_CONFLICT: 'sync:resolve-conflict',

  // 备份操作
  BACKUP_CREATE: 'backup:create',
  BACKUP_RESTORE: 'backup:restore',
  BACKUP_LIST: 'backup:list',

  // 事件通知
  CONFIG_CHANGED: 'config:changed',
  SYNC_STATUS_UPDATE: 'sync:status-update',
} as const;

// IPC 通道类型
export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
