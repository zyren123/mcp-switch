import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ipcMain } from 'electron';
import { registerConfigHandlers } from '@main/ipc/config.handlers';
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

describe('Import/Export Integration', () => {
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

  describe('Single IDE Import/Export', () => {
    it('should register CONFIG_EXPORT handler', async () => {
      const handler = handlers[IPC_CHANNELS.CONFIG_EXPORT];
      expect(handler).toBeDefined();

      const result = await handler({}, 'claude-desktop');

      expect(result.success).toBe(true);
      expect(result.filePath).toBe('/path/to/export.json');
      expect(mockImportExportService.exportConfig).toHaveBeenCalledWith('claude-desktop');
    });

    it('should register CONFIG_IMPORT handler', async () => {
      const handler = handlers[IPC_CHANNELS.CONFIG_IMPORT];
      expect(handler).toBeDefined();

      const result = await handler({}, 'claude-desktop');

      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(mockImportExportService.importConfig).toHaveBeenCalledWith('claude-desktop');
    });

    it('should handle export cancellation', async () => {
      const handler = handlers[IPC_CHANNELS.CONFIG_EXPORT];
      mockImportExportService.exportConfig.mockResolvedValue({ success: false, error: 'Export cancelled' });

      const result = await handler({}, 'claude-desktop');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Export cancelled');
    });

    it('should handle import cancellation', async () => {
      const handler = handlers[IPC_CHANNELS.CONFIG_IMPORT];
      mockImportExportService.importConfig.mockResolvedValue({ success: false, error: 'Import cancelled' });

      const result = await handler({}, 'claude-desktop');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Import cancelled');
    });

    it('should handle export errors', async () => {
      const handler = handlers[IPC_CHANNELS.CONFIG_EXPORT];
      mockImportExportService.exportConfig.mockRejectedValue(new Error('File write failed'));

      const result = await handler({}, 'claude-desktop');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File write failed');
    });

    it('should handle import errors', async () => {
      const handler = handlers[IPC_CHANNELS.CONFIG_IMPORT];
      mockImportExportService.importConfig.mockRejectedValue(new Error('Invalid JSON'));

      const result = await handler({}, 'claude-desktop');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON');
    });
  });

  describe('Batch Import/Export', () => {
    it('should register CONFIG_EXPORT_BATCH handler', async () => {
      const handler = handlers[IPC_CHANNELS.CONFIG_EXPORT_BATCH];
      expect(handler).toBeDefined();

      const ideTypes = ['claude-desktop', 'cursor', 'windsurf'];
      const result = await handler({}, ideTypes);

      expect(result.success).toBe(true);
      expect(result.exportedCount).toBe(3);
      expect(result.filePath).toBe('/path/to/batch.json');
      expect(mockImportExportService.exportBatch).toHaveBeenCalledWith(ideTypes);
    });

    it('should register CONFIG_IMPORT_BATCH handler', async () => {
      const handler = handlers[IPC_CHANNELS.CONFIG_IMPORT_BATCH];
      expect(handler).toBeDefined();

      const result = await handler({});

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(3);
      expect(mockImportExportService.importBatch).toHaveBeenCalled();
    });

    it('should register CONFIG_EXPORT_ALL handler', async () => {
      const handler = handlers[IPC_CHANNELS.CONFIG_EXPORT_ALL];
      expect(handler).toBeDefined();

      const result = await handler({});

      expect(result.success).toBe(true);
      expect(result.exportedCount).toBe(6);
      expect(mockImportExportService.exportAll).toHaveBeenCalled();
    });

    it('should handle batch export with partial failures', async () => {
      const handler = handlers[IPC_CHANNELS.CONFIG_EXPORT_BATCH];
      mockImportExportService.exportBatch.mockResolvedValue({
        success: true,
        exportedCount: 2,
        errors: [{ ideType: 'codex', error: 'Not installed' }]
      });

      const result = await handler({}, ['claude-desktop', 'cursor', 'codex']);

      expect(result.success).toBe(true);
      expect(result.exportedCount).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].ideType).toBe('codex');
    });

    it('should handle batch import with partial failures', async () => {
      const handler = handlers[IPC_CHANNELS.CONFIG_IMPORT_BATCH];
      mockImportExportService.importBatch.mockResolvedValue({
        success: true,
        importedCount: 2,
        errors: [{ ideType: 'opencode', error: 'Not installed' }]
      });

      const result = await handler({});

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(2);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle batch export cancellation', async () => {
      const handler = handlers[IPC_CHANNELS.CONFIG_EXPORT_BATCH];
      mockImportExportService.exportBatch.mockResolvedValue({
        success: false,
        exportedCount: 0,
        errors: [{ ideType: 'claude-desktop', error: 'Export cancelled' }]
      });

      const result = await handler({}, ['claude-desktop']);

      expect(result.success).toBe(false);
      expect(result.exportedCount).toBe(0);
    });

    it('should handle batch import with no valid configs', async () => {
      const handler = handlers[IPC_CHANNELS.CONFIG_IMPORT_BATCH];
      mockImportExportService.importBatch.mockResolvedValue({
        success: false,
        importedCount: 0,
        errors: [{ ideType: 'claude-desktop', error: 'Invalid backup file format' }]
      });

      const result = await handler({});

      expect(result.success).toBe(false);
      expect(result.importedCount).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should handle batch export service errors', async () => {
      const handler = handlers[IPC_CHANNELS.CONFIG_EXPORT_BATCH];
      mockImportExportService.exportBatch.mockRejectedValue(new Error('Service unavailable'));

      const result = await handler({}, ['claude-desktop']);

      expect(result.success).toBe(false);
      expect(result.exportedCount).toBe(0);
      expect(result.errors).toBeDefined();
    });

    it('should handle batch import service errors', async () => {
      const handler = handlers[IPC_CHANNELS.CONFIG_IMPORT_BATCH];
      mockImportExportService.importBatch.mockRejectedValue(new Error('Service unavailable'));

      const result = await handler({});

      expect(result.success).toBe(false);
      expect(result.importedCount).toBe(0);
    });

    it('should handle export all service errors', async () => {
      const handler = handlers[IPC_CHANNELS.CONFIG_EXPORT_ALL];
      mockImportExportService.exportAll.mockRejectedValue(new Error('Disk full'));

      const result = await handler({});

      expect(result.success).toBe(false);
      expect(result.exportedCount).toBe(0);
    });
  });
});
