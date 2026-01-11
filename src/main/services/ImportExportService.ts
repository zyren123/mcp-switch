import { dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { IDEType, IDEConfig } from '../../shared/types';
import { ConfigService } from './ConfigService';

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  config?: IDEConfig;
  error?: string;
}

export interface BatchExportResult {
  success: boolean;
  filePath?: string;
  exportedCount: number;
  errors: Array<{ ideType: IDEType; error: string }>;
}

export interface BatchImportResult {
  success: boolean;
  importedCount: number;
  errors: Array<{ ideType: IDEType; error: string }>;
}

export interface ExportData {
  version: string;
  exportedAt: number;
  configs: Array<{
    ideType: IDEType;
    displayName: string;
    servers: IDEConfig['servers'];
  }>;
}

export class ImportExportService {
  private configService: ConfigService;
  private readonly EXPORT_VERSION = '1.0';

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  /**
   * Export configuration for a specific IDE to a file
   */
  async exportConfig(ideType: IDEType): Promise<ExportResult> {
    try {
      const config = await this.configService.loadConfig(ideType);

      const { filePath } = await dialog.showSaveDialog({
        title: `Export ${config.displayName} Configuration`,
        defaultPath: `${ideType}-config.json`,
        filters: [
          { name: 'JSON Config', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (!filePath) {
        return { success: false, error: 'Export cancelled' };
      }

      // Export as formatted JSON
      const content = JSON.stringify(config, null, 2);
      await fs.promises.writeFile(filePath, content, 'utf-8');

      return { success: true, filePath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Import configuration from a file to a specific IDE
   */
  async importConfig(ideType: IDEType): Promise<ImportResult> {
    try {
      const { filePaths } = await dialog.showOpenDialog({
        title: `Import Configuration for ${ideType}`,
        properties: ['openFile'],
        filters: [
          { name: 'JSON Config', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (filePaths.length === 0) {
        return { success: false, error: 'Import cancelled' };
      }

      const filePath = filePaths[0];
      const content = await fs.promises.readFile(filePath, 'utf-8');

      let importedConfig: any;
      try {
        importedConfig = JSON.parse(content);
      } catch (e) {
        return { success: false, error: 'Invalid JSON file' };
      }

      // Validate imported config structure
      if (!importedConfig.servers || !Array.isArray(importedConfig.servers)) {
        return { success: false, error: 'Invalid configuration format: missing servers array' };
      }

      // Create backup before importing
      await this.configService.createBackup(ideType);

      // Save imported configuration
      // We merge imported servers with existing metadata to ensure type consistency
      const currentConfig = await this.configService.loadConfig(ideType);

      const newConfig: IDEConfig = {
        ...currentConfig,
        servers: importedConfig.servers, // Overwrite servers
        lastSynced: Date.now()
      };

      await this.configService.saveConfig(ideType, newConfig);

      return { success: true, config: newConfig };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Export configurations from multiple IDEs to a single file
   */
  async exportBatch(ideTypes: IDEType[]): Promise<BatchExportResult> {
    const errors: Array<{ ideType: IDEType; error: string }> = [];
    const exportedConfigs: ExportData['configs'] = [];

    // Load all configs
    for (const ideType of ideTypes) {
      try {
        const config = await this.configService.loadConfig(ideType);
        if (config.isInstalled && config.servers.length > 0) {
          exportedConfigs.push({
            ideType,
            displayName: config.displayName,
            servers: config.servers
          });
        }
      } catch (error: any) {
        errors.push({ ideType, error: error.message });
      }
    }

    if (exportedConfigs.length === 0) {
      return {
        success: false,
        exportedCount: 0,
        errors: errors.length > 0 ? errors : [{ ideType: ideTypes[0], error: 'No configurations to export' }]
      };
    }

    // Show save dialog
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export All Configurations',
      defaultPath: `mcp-switch-backup-${Date.now()}.json`,
      filters: [
        { name: 'MCP Switch Backup', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!filePath) {
      return { success: false, exportedCount: 0, errors: [{ ideType: ideTypes[0], error: 'Export cancelled' }] };
    }

    // Create export data
    const exportData: ExportData = {
      version: this.EXPORT_VERSION,
      exportedAt: Date.now(),
      configs: exportedConfigs
    };

    // Write to file
    try {
      await fs.promises.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');
      return {
        success: true,
        filePath,
        exportedCount: exportedConfigs.length,
        errors
      };
    } catch (error: any) {
      return {
        success: false,
        exportedCount: 0,
        errors: [{ ideType: ideTypes[0], error: error.message }]
      };
    }
  }

  /**
   * Import configurations from a batch export file to multiple IDEs
   */
  async importBatch(): Promise<BatchImportResult> {
    const errors: Array<{ ideType: IDEType; error: string }> = [];
    let importedCount = 0;

    // Show open dialog
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Import Configurations',
      properties: ['openFile'],
      filters: [
        { name: 'MCP Switch Backup', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (filePaths.length === 0) {
      return { success: false, importedCount: 0, errors: [{ ideType: 'claude-desktop', error: 'Import cancelled' }] };
    }

    const filePath = filePaths[0];

    // Read and parse file
    let exportData: ExportData;
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      exportData = JSON.parse(content);
    } catch (error: any) {
      return { success: false, importedCount: 0, errors: [{ ideType: 'claude-desktop', error: 'Invalid JSON file' }] };
    }

    // Validate export data structure
    if (!exportData.version || !exportData.configs || !Array.isArray(exportData.configs)) {
      return {
        success: false,
        importedCount: 0,
        errors: [{ ideType: 'claude-desktop', error: 'Invalid backup file format' }]
      };
    }

    // Import each config
    for (const configData of exportData.configs) {
      const { ideType, servers } = configData;

      try {
        // Check if IDE is installed
        const currentConfig = await this.configService.loadConfig(ideType);
        if (!currentConfig.isInstalled) {
          errors.push({ ideType, error: `${configData.displayName} is not installed` });
          continue;
        }

        // Create backup before importing
        await this.configService.createBackup(ideType);

        // Update config with imported servers
        const newConfig: IDEConfig = {
          ...currentConfig,
          servers,
          lastSynced: Date.now()
        };

        await this.configService.saveConfig(ideType, newConfig);
        importedCount++;
      } catch (error: any) {
        errors.push({ ideType, error: error.message });
      }
    }

    return {
      success: importedCount > 0,
      importedCount,
      errors
    };
  }

  /**
   * Export all installed IDE configurations
   */
  async exportAll(): Promise<BatchExportResult> {
    const allIDETypes: IDEType[] = ['claude-desktop', 'claude-code', 'cursor', 'windsurf', 'codex', 'opencode'];
    return this.exportBatch(allIDETypes);
  }
}
