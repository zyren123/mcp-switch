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

export class ImportExportService {
  private configService: ConfigService;

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
}
