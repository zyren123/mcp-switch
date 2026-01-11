import { BrowserWindow } from 'electron';
import { ConfigService } from '../services/ConfigService';
import { BackupService } from '../services/BackupService';
import { SyncConflictResolver } from '../services/SyncConflictResolver';
import { ConfigWatcher } from '../services/ConfigWatcher';
import { ImportExportService } from '../services/ImportExportService';
import {
  registerConfigHandlers,
  setupConfigWatchers,
  removeConfigHandlers
} from './config.handlers';

/**
 * IPC initialization result
 */
export interface IPCInitResult {
  configService: ConfigService;
  backupService: BackupService;
  syncResolver: SyncConflictResolver;
  configWatcher: ConfigWatcher;
  importExportService: ImportExportService;
}

/**
 * Initialize all IPC handlers
 */
export const initializeIPC = (
  getMainWindow: () => BrowserWindow | null
): IPCInitResult => {
  // Create service instances
  const backupService = new BackupService();
  const configService = new ConfigService(backupService);
  const syncResolver = new SyncConflictResolver(configService, backupService);
  const configWatcher = new ConfigWatcher();
  const importExportService = new ImportExportService(configService);

  // Register IPC handlers
  registerConfigHandlers(
    configService,
    backupService,
    syncResolver,
    configWatcher,
    importExportService,
    getMainWindow
  );

  // Setup config file watchers
  setupConfigWatchers(configWatcher, getMainWindow);

  return {
    configService,
    backupService,
    syncResolver,
    configWatcher,
    importExportService
  };
};

/**
 * Cleanup IPC handlers and watchers
 */
export const cleanupIPC = (configWatcher: ConfigWatcher): void => {
  removeConfigHandlers();
  configWatcher.closeAll();
};

// Re-export handlers
export { registerConfigHandlers, setupConfigWatchers, removeConfigHandlers } from './config.handlers';
