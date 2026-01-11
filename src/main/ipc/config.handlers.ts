import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS, IDEType, MCPServer, SyncConflict } from '../../shared/types';
import { ConfigService } from '../services/ConfigService';
import { BackupService } from '../services/BackupService';
import { SyncConflictResolver, SyncStrategy, ConflictResolution } from '../services/SyncConflictResolver';
import { ConfigWatcher } from '../services/ConfigWatcher';
import { ImportExportService } from '../services/ImportExportService';

/**
 * Register all config-related IPC handlers
 */
export const registerConfigHandlers = (
  configService: ConfigService,
  backupService: BackupService,
  syncResolver: SyncConflictResolver,
  configWatcher: ConfigWatcher,
  importExportService: ImportExportService,
  getMainWindow: () => BrowserWindow | null
): void => {
  // ============================================
  // Configuration Operations
  // ============================================

  /**
   * Load all IDE configurations
   */
  ipcMain.handle(IPC_CHANNELS.CONFIG_LOAD_ALL, async () => {
    try {
      const configs = await configService.loadAllConfigs();
      return { success: true, data: configs };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Load configuration for a specific IDE
   */
  ipcMain.handle(IPC_CHANNELS.CONFIG_LOAD_ONE, async (_, ideType: IDEType) => {
    try {
      const config = await configService.loadConfig(ideType);
      return { success: true, data: config };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Save configuration for a specific IDE
   */
  ipcMain.handle(IPC_CHANNELS.CONFIG_SAVE, async (_, ideType: IDEType, config: any) => {
    try {
      await configService.saveConfig(ideType, config);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Refresh configuration from disk
   */
  ipcMain.handle(IPC_CHANNELS.CONFIG_REFRESH, async (_, ideType: IDEType) => {
    try {
      const result = await configWatcher.refreshConfig(ideType);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Export configuration
   */
  ipcMain.handle(IPC_CHANNELS.CONFIG_EXPORT, async (_, ideType: IDEType) => {
    try {
      const result = await importExportService.exportConfig(ideType);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Import configuration
   */
  ipcMain.handle(IPC_CHANNELS.CONFIG_IMPORT, async (_, ideType: IDEType) => {
    try {
      const result = await importExportService.importConfig(ideType);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // Server Operations
  // ============================================

  /**
   * Toggle a server's enabled state
   */
  ipcMain.handle(
    IPC_CHANNELS.SERVER_TOGGLE,
    async (_, ideType: IDEType, serverId: string, enabled: boolean) => {
      try {
        const result = await configService.toggleServer(ideType, serverId, enabled);
        return result;
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
  );

  /**
   * Add a new server to an IDE configuration
   */
  ipcMain.handle(
    IPC_CHANNELS.SERVER_ADD,
    async (_, ideType: IDEType, server: MCPServer) => {
      try {
        const result = await configService.addServer(ideType, server);
        return result;
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
  );

  /**
   * Remove a server from an IDE configuration
   */
  ipcMain.handle(
    IPC_CHANNELS.SERVER_REMOVE,
    async (_, ideType: IDEType, serverId: string) => {
      try {
        const result = await configService.removeServer(ideType, serverId);
        return result;
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
  );

  /**
   * Update a server's configuration
   */
  ipcMain.handle(
    IPC_CHANNELS.SERVER_UPDATE,
    async (_, ideType: IDEType, serverId: string, updates: Partial<MCPServer>) => {
      try {
        const result = await configService.updateServer(ideType, serverId, updates);
        return result;
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
  );

  // ============================================
  // Sync Operations
  // ============================================

  /**
   * Preview sync operation
   */
  ipcMain.handle(
    IPC_CHANNELS.SYNC_PREVIEW,
    async (_, sourceIDE: IDEType, targetIDE: IDEType) => {
      try {
        const preview = await syncResolver.previewSync(sourceIDE, targetIDE);
        return { success: true, data: preview };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
  );

  /**
   * Execute sync operation
   */
  ipcMain.handle(
    IPC_CHANNELS.SYNC_EXECUTE,
    async (
      _,
      sourceIDE: IDEType,
      targetIDEs: IDEType[],
      strategy: SyncStrategy,
      resolutions?: ConflictResolution[]
    ) => {
      try {
        const results = await syncResolver.executeSyncToMultiple(
          sourceIDE,
          targetIDEs,
          strategy,
          resolutions
        );
        return { success: true, data: results };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
  );

  /**
   * Resolve a specific conflict
   */
  ipcMain.handle(
    IPC_CHANNELS.SYNC_RESOLVE_CONFLICT,
    async (
      _,
      sourceIDE: IDEType,
      targetIDE: IDEType,
      resolutions: ConflictResolution[]
    ) => {
      try {
        const result = await syncResolver.executeSync(
          sourceIDE,
          targetIDE,
          'manual',
          resolutions
        );
        return { success: true, data: result };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
  );

  // ============================================
  // Backup Operations
  // ============================================

  /**
   * Create a backup for an IDE configuration
   */
  ipcMain.handle(IPC_CHANNELS.BACKUP_CREATE, async (_, ideType: IDEType) => {
    try {
      const backupId = await configService.createBackup(ideType);
      return { success: true, data: { backupId } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  /**
   * Restore an IDE configuration from backup
   */
  ipcMain.handle(
    IPC_CHANNELS.BACKUP_RESTORE,
    async (_, ideType: IDEType, backupId: string) => {
      try {
        await configService.restoreFromBackup(ideType, backupId);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
  );

  /**
   * List all backups
   */
  ipcMain.handle(IPC_CHANNELS.BACKUP_LIST, async (_, ideType?: IDEType) => {
    try {
      const backups = await backupService.listBackups(ideType);
      return { success: true, data: backups };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
};

/**
 * Setup config file watchers and notify renderer on changes
 */
export const setupConfigWatchers = (
  configWatcher: ConfigWatcher,
  getMainWindow: () => BrowserWindow | null
): void => {
  const ideTypes: IDEType[] = [
    'claude-desktop',
    'claude-code',
    'cursor',
    'windsurf',
    'codex',
    'opencode'
  ];

  for (const ideType of ideTypes) {
    configWatcher.watchConfig(ideType, (event, changedIdeType) => {
      const mainWindow = getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.CONFIG_CHANGED, {
          event,
          ideType: changedIdeType
        });
      }
    });
  }
};

/**
 * Remove all IPC handlers (for cleanup)
 */
export const removeConfigHandlers = (): void => {
  const channels = Object.values(IPC_CHANNELS);
  for (const channel of channels) {
    ipcMain.removeHandler(channel);
  }
};
