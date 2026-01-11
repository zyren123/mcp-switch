import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import { registerConfigHandlers, removeConfigHandlers } from '@main/ipc/config.handlers';
import { ConfigService } from '@main/services/ConfigService';
import { BackupService } from '@main/services/BackupService';
import { SyncConflictResolver } from '@main/services/SyncConflictResolver';
import { ConfigWatcher } from '@main/services/ConfigWatcher';
import { ImportExportService } from '@main/services/ImportExportService';
import { IPC_CHANNELS } from '@shared/types';

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn()
  },
  BrowserWindow: vi.fn(),
  dialog: {
    showSaveDialog: vi.fn(),
    showOpenDialog: vi.fn()
  }
}));

// Mock services
vi.mock('../../../src/main/services/ConfigService');
vi.mock('../../../src/main/services/BackupService');
vi.mock('../../../src/main/services/SyncConflictResolver');
vi.mock('../../../src/main/services/ConfigWatcher');
vi.mock('../../../src/main/services/ImportExportService');

describe('IPC Integration', () => {
  let mockConfigService: any;
  let mockBackupService: any;
  let mockSyncResolver: any;
  let mockConfigWatcher: any;
  let mockImportExportService: any;
  let mockMainWindow: any;
  let handlers: Record<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset handlers storage
    handlers = {};

    // Mock ipcMain.handle to store handlers
    (ipcMain.handle as Mock).mockImplementation((channel: string, handler: Function) => {
      handlers[channel] = handler;
    });

    // Create mock services
    mockConfigService = {
      loadAllConfigs: vi.fn().mockResolvedValue([]),
      loadConfig: vi.fn().mockResolvedValue({ servers: [] }),
      saveConfig: vi.fn().mockResolvedValue(undefined),
      toggleServer: vi.fn().mockResolvedValue({ success: true }),
      addServer: vi.fn().mockResolvedValue({ success: true }),
      removeServer: vi.fn().mockResolvedValue({ success: true }),
      updateServer: vi.fn().mockResolvedValue({ success: true }),
      createBackup: vi.fn().mockResolvedValue('backup-123'),
      restoreFromBackup: vi.fn().mockResolvedValue(undefined)
    };

    mockBackupService = {
      listBackups: vi.fn().mockResolvedValue([]),
      createBackup: vi.fn().mockResolvedValue({ id: 'backup-123' }),
      restoreBackup: vi.fn().mockResolvedValue({ content: '{}' })
    };

    mockSyncResolver = {
      previewSync: vi.fn().mockResolvedValue({ conflicts: [], additions: [] }),
      executeSync: vi.fn().mockResolvedValue({ success: true }),
      executeSyncToMultiple: vi.fn().mockResolvedValue([{ success: true }])
    };

    mockConfigWatcher = {
      refreshConfig: vi.fn().mockResolvedValue({ success: true }),
      watchConfig: vi.fn()
    };

    mockImportExportService = {
      exportConfig: vi.fn().mockResolvedValue({ success: true, filePath: '/path/to/export.json' }),
      importConfig: vi.fn().mockResolvedValue({ success: true, config: { servers: [] } }),
      exportBatch: vi.fn().mockResolvedValue({ success: true, filePath: '/path/to/batch.json', exportedCount: 3, errors: [] }),
      importBatch: vi.fn().mockResolvedValue({ success: true, importedCount: 3, errors: [] }),
      exportAll: vi.fn().mockResolvedValue({ success: true, filePath: '/path/to/all.json', exportedCount: 6, errors: [] })
    };

    mockMainWindow = {
      webContents: {
        send: vi.fn()
      },
      isDestroyed: vi.fn().mockReturnValue(false)
    };

    // Register handlers
    registerConfigHandlers(
      mockConfigService,
      mockBackupService,
      mockSyncResolver,
      mockConfigWatcher,
      mockImportExportService,
      () => mockMainWindow
    );
  });

  describe('Config handlers', () => {
    it('should register CONFIG_LOAD_ALL handler', async () => {
      const handler = handlers[IPC_CHANNELS.CONFIG_LOAD_ALL];
      expect(handler).toBeDefined();

      mockConfigService.loadAllConfigs.mockResolvedValue([{ type: 'claude-desktop' }]);
      const result = await handler({});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should register CONFIG_LOAD_ONE handler', async () => {
      const handler = handlers[IPC_CHANNELS.CONFIG_LOAD_ONE];
      expect(handler).toBeDefined();

      mockConfigService.loadConfig.mockResolvedValue({ type: 'claude-desktop', servers: [] });
      const result = await handler({}, 'claude-desktop');

      expect(result.success).toBe(true);
      expect(mockConfigService.loadConfig).toHaveBeenCalledWith('claude-desktop');
    });

    it('should register CONFIG_SAVE handler', async () => {
      const handler = handlers[IPC_CHANNELS.CONFIG_SAVE];
      expect(handler).toBeDefined();

      const config = { type: 'claude-desktop', servers: [] };
      const result = await handler({}, 'claude-desktop', config);

      expect(result.success).toBe(true);
      expect(mockConfigService.saveConfig).toHaveBeenCalledWith('claude-desktop', config);
    });

    it('should register CONFIG_REFRESH handler', async () => {
      const handler = handlers[IPC_CHANNELS.CONFIG_REFRESH];
      expect(handler).toBeDefined();

      const result = await handler({}, 'claude-desktop');

      expect(result.success).toBe(true);
      expect(mockConfigWatcher.refreshConfig).toHaveBeenCalledWith('claude-desktop');
    });

    it('should handle errors in config handlers', async () => {
      const handler = handlers[IPC_CHANNELS.CONFIG_LOAD_ALL];
      mockConfigService.loadAllConfigs.mockRejectedValue(new Error('Load failed'));

      const result = await handler({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Load failed');
    });
  });

  describe('Server handlers', () => {
    it('should register SERVER_TOGGLE handler', async () => {
      const handler = handlers[IPC_CHANNELS.SERVER_TOGGLE];
      expect(handler).toBeDefined();

      const result = await handler({}, 'claude-desktop', 'server-1', false);

      expect(result.success).toBe(true);
      expect(mockConfigService.toggleServer).toHaveBeenCalledWith('claude-desktop', 'server-1', false);
    });

    it('should register SERVER_ADD handler', async () => {
      const handler = handlers[IPC_CHANNELS.SERVER_ADD];
      expect(handler).toBeDefined();

      const server = { id: 'new-server', command: 'npx', args: [], enabled: true };
      const result = await handler({}, 'claude-desktop', server);

      expect(result.success).toBe(true);
      expect(mockConfigService.addServer).toHaveBeenCalledWith('claude-desktop', server);
    });

    it('should register SERVER_REMOVE handler', async () => {
      const handler = handlers[IPC_CHANNELS.SERVER_REMOVE];
      expect(handler).toBeDefined();

      const result = await handler({}, 'claude-desktop', 'server-1');

      expect(result.success).toBe(true);
      expect(mockConfigService.removeServer).toHaveBeenCalledWith('claude-desktop', 'server-1');
    });

    it('should register SERVER_UPDATE handler', async () => {
      const handler = handlers[IPC_CHANNELS.SERVER_UPDATE];
      expect(handler).toBeDefined();

      const updates = { command: 'node' };
      const result = await handler({}, 'claude-desktop', 'server-1', updates);

      expect(result.success).toBe(true);
      expect(mockConfigService.updateServer).toHaveBeenCalledWith('claude-desktop', 'server-1', updates);
    });
  });

  describe('Sync handlers', () => {
    it('should register SYNC_PREVIEW handler', async () => {
      const handler = handlers[IPC_CHANNELS.SYNC_PREVIEW];
      expect(handler).toBeDefined();

      mockSyncResolver.previewSync.mockResolvedValue({
        conflicts: [],
        additions: [{ id: 'server-1' }]
      });

      const result = await handler({}, 'claude-desktop', 'cursor');

      expect(result.success).toBe(true);
      expect(mockSyncResolver.previewSync).toHaveBeenCalledWith('claude-desktop', 'cursor');
    });

    it('should register SYNC_EXECUTE handler', async () => {
      const handler = handlers[IPC_CHANNELS.SYNC_EXECUTE];
      expect(handler).toBeDefined();

      const result = await handler({}, 'claude-desktop', ['cursor'], 'overwrite', []);

      expect(result.success).toBe(true);
      expect(mockSyncResolver.executeSyncToMultiple).toHaveBeenCalledWith(
        'claude-desktop',
        ['cursor'],
        'overwrite',
        []
      );
    });

    it('should register SYNC_RESOLVE_CONFLICT handler', async () => {
      const handler = handlers[IPC_CHANNELS.SYNC_RESOLVE_CONFLICT];
      expect(handler).toBeDefined();

      const resolutions = [{ serverId: 'server-1', field: 'command', resolution: 'keep-source' }];
      const result = await handler({}, 'claude-desktop', 'cursor', resolutions);

      expect(result.success).toBe(true);
      expect(mockSyncResolver.executeSync).toHaveBeenCalledWith(
        'claude-desktop',
        'cursor',
        'manual',
        resolutions
      );
    });
  });

  describe('Backup handlers', () => {
    it('should register BACKUP_CREATE handler', async () => {
      const handler = handlers[IPC_CHANNELS.BACKUP_CREATE];
      expect(handler).toBeDefined();

      const result = await handler({}, 'claude-desktop');

      expect(result.success).toBe(true);
      expect(result.data.backupId).toBe('backup-123');
    });

    it('should register BACKUP_RESTORE handler', async () => {
      const handler = handlers[IPC_CHANNELS.BACKUP_RESTORE];
      expect(handler).toBeDefined();

      const result = await handler({}, 'claude-desktop', 'backup-123');

      expect(result.success).toBe(true);
      expect(mockConfigService.restoreFromBackup).toHaveBeenCalledWith('claude-desktop', 'backup-123');
    });

    it('should register BACKUP_LIST handler', async () => {
      const handler = handlers[IPC_CHANNELS.BACKUP_LIST];
      expect(handler).toBeDefined();

      mockBackupService.listBackups.mockResolvedValue([{ id: 'backup-1' }]);
      const result = await handler({}, 'claude-desktop');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('Handler cleanup', () => {
    it('should remove all handlers on cleanup', () => {
      removeConfigHandlers();

      const channelCount = Object.values(IPC_CHANNELS).length;
      expect(ipcMain.removeHandler).toHaveBeenCalledTimes(channelCount);
    });
  });
});
