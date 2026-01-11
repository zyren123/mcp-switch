// Re-export all shared types for renderer usage
export type {
  IDEType,
  MCPServer,
  MCPServerConfig,
  IDEConfig,
  SyncConflict,
  FieldValue,
  SyncOperation,
  BackupInfo,
  IPCChannel,
} from '../../shared/types';

export { IPC_CHANNELS } from '../../shared/types';

// Renderer-specific types

/**
 * UI state for an IDE card in the sidebar
 */
export interface IDECardState {
  isExpanded: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

/**
 * UI state for a server toggle
 */
export interface ServerToggleState {
  isToggling: boolean;
  optimisticEnabled: boolean | null;
}

/**
 * Sync preview item for display in the UI
 */
export interface SyncPreviewItem {
  serverId: string;
  serverName: string;
  action: 'add' | 'update' | 'remove' | 'unchanged';
  sourceConfig?: {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  };
  targetConfig?: {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  };
  hasConflict: boolean;
}

/**
 * Sync panel state
 */
export interface SyncPanelState {
  isOpen: boolean;
  isPreviewing: boolean;
  isSyncing: boolean;
  previewItems: SyncPreviewItem[];
  selectedStrategy: 'overwrite' | 'merge' | 'keep-target' | 'manual';
}

/**
 * Conflict resolution choice made by user
 */
export interface ConflictResolution {
  serverId: string;
  field: 'command' | 'args' | 'env' | 'enabled' | 'server';
  choice: 'keep-source' | 'keep-target' | 'merge';
  customValue?: unknown;
}

/**
 * Toast notification type
 */
export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

/**
 * App-wide UI state
 */
export interface AppUIState {
  sidebarCollapsed: boolean;
  activeView: 'dashboard' | 'sync' | 'settings' | 'backups';
  notifications: ToastNotification[];
}
