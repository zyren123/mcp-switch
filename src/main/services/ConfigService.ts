import { IDEType, IDEConfig, MCPServer } from '../../shared/types';
import { getAdapter, getAllAdapters, getAllIDETypes } from '../adapters';
import { BaseAdapter } from '../adapters/BaseAdapter';
import { BackupService } from './BackupService';
import { ConfigErrorCode, createConfigError } from '../utils/errors';

/**
 * Result of a config operation
 */
export interface ConfigOperationResult {
  success: boolean;
  error?: string;
  errorCode?: ConfigErrorCode;
}

/**
 * Unified configuration management service
 * Aggregates all adapter operations and provides a single API for config management
 */
export class ConfigService {
  private backupService: BackupService;
  private configCache: Map<IDEType, IDEConfig> = new Map();

  constructor(backupService?: BackupService) {
    this.backupService = backupService || new BackupService();
  }

  /**
   * Load all IDE configurations
   */
  async loadAllConfigs(): Promise<IDEConfig[]> {
    const configs: IDEConfig[] = [];
    const adapters = getAllAdapters();

    for (const adapter of adapters) {
      try {
        const config = await adapter.readConfig();
        configs.push(config);
        this.configCache.set(adapter.ideType, config);
      } catch (error: any) {
        // Return error config for failed loads
        configs.push({
          type: adapter.ideType,
          name: adapter.ideType,
          displayName: adapter.displayName,
          configPath: adapter.getConfigPath(),
          configFormat: adapter.configFormat,
          isInstalled: false,
          servers: [],
          syncStatus: 'error'
        });
      }
    }

    return configs;
  }

  /**
   * Load configuration for a specific IDE
   */
  async loadConfig(ideType: IDEType): Promise<IDEConfig> {
    const adapter = getAdapter(ideType);
    const config = await adapter.readConfig();
    this.configCache.set(ideType, config);
    return config;
  }

  /**
   * Save configuration for a specific IDE
   */
  async saveConfig(ideType: IDEType, config: IDEConfig): Promise<void> {
    const adapter = getAdapter(ideType);
    await adapter.writeConfig(config);
    this.configCache.set(ideType, config);
  }

  /**
   * Toggle a server's enabled state
   */
  async toggleServer(
    ideType: IDEType,
    serverId: string,
    enabled: boolean
  ): Promise<ConfigOperationResult> {
    try {
      const config = await this.loadConfig(ideType);
      const serverIndex = config.servers.findIndex(s => s.id === serverId);

      if (serverIndex === -1) {
        return {
          success: false,
          error: `Server ${serverId} not found`,
          errorCode: ConfigErrorCode.CONFIG_MISSING_REQUIRED_FIELD
        };
      }

      // Create backup before modification
      const adapter = getAdapter(ideType);
      const rawContent = await adapter.readRawContent();
      if (rawContent) {
        await this.backupService.createBackup(ideType, rawContent);
      }

      // Update server state
      config.servers[serverIndex].enabled = enabled;
      await this.saveConfig(ideType, config);

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        errorCode: error.code || ConfigErrorCode.FILE_WRITE_ERROR
      };
    }
  }

  /**
   * Add a new server to an IDE configuration
   */
  async addServer(ideType: IDEType, server: MCPServer): Promise<ConfigOperationResult> {
    try {
      const config = await this.loadConfig(ideType);

      // Check if server already exists
      if (config.servers.some(s => s.id === server.id)) {
        return {
          success: false,
          error: `Server ${server.id} already exists`,
          errorCode: ConfigErrorCode.CONFIG_INVALID_STRUCTURE
        };
      }

      // Create backup before modification
      const adapter = getAdapter(ideType);
      const rawContent = await adapter.readRawContent();
      if (rawContent) {
        await this.backupService.createBackup(ideType, rawContent);
      }

      // Add server
      config.servers.push(server);
      await this.saveConfig(ideType, config);

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        errorCode: error.code || ConfigErrorCode.FILE_WRITE_ERROR
      };
    }
  }

  /**
   * Remove a server from an IDE configuration
   */
  async removeServer(ideType: IDEType, serverId: string): Promise<ConfigOperationResult> {
    try {
      const config = await this.loadConfig(ideType);
      const serverIndex = config.servers.findIndex(s => s.id === serverId);

      if (serverIndex === -1) {
        return {
          success: false,
          error: `Server ${serverId} not found`,
          errorCode: ConfigErrorCode.CONFIG_MISSING_REQUIRED_FIELD
        };
      }

      // Create backup before modification
      const adapter = getAdapter(ideType);
      const rawContent = await adapter.readRawContent();
      if (rawContent) {
        await this.backupService.createBackup(ideType, rawContent);
      }

      // Remove server
      config.servers.splice(serverIndex, 1);
      await this.saveConfig(ideType, config);

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        errorCode: error.code || ConfigErrorCode.FILE_WRITE_ERROR
      };
    }
  }

  /**
   * Update a server's configuration
   */
  async updateServer(
    ideType: IDEType,
    serverId: string,
    updates: Partial<MCPServer>
  ): Promise<ConfigOperationResult> {
    try {
      const config = await this.loadConfig(ideType);
      const serverIndex = config.servers.findIndex(s => s.id === serverId);

      if (serverIndex === -1) {
        return {
          success: false,
          error: `Server ${serverId} not found`,
          errorCode: ConfigErrorCode.CONFIG_MISSING_REQUIRED_FIELD
        };
      }

      // Create backup before modification
      const adapter = getAdapter(ideType);
      const rawContent = await adapter.readRawContent();
      if (rawContent) {
        await this.backupService.createBackup(ideType, rawContent);
      }

      // Update server (preserve id)
      config.servers[serverIndex] = {
        ...config.servers[serverIndex],
        ...updates,
        id: serverId // Ensure id is not changed
      };
      await this.saveConfig(ideType, config);

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        errorCode: error.code || ConfigErrorCode.FILE_WRITE_ERROR
      };
    }
  }

  /**
   * Get a server by ID from an IDE configuration
   */
  async getServer(ideType: IDEType, serverId: string): Promise<MCPServer | null> {
    const config = await this.loadConfig(ideType);
    return config.servers.find(s => s.id === serverId) || null;
  }

  /**
   * Get all servers from an IDE configuration
   */
  async getServers(ideType: IDEType): Promise<MCPServer[]> {
    const config = await this.loadConfig(ideType);
    return config.servers;
  }

  /**
   * Get cached configuration (without reading from disk)
   */
  getCachedConfig(ideType: IDEType): IDEConfig | undefined {
    return this.configCache.get(ideType);
  }

  /**
   * Clear configuration cache
   */
  clearCache(): void {
    this.configCache.clear();
  }

  /**
   * Check if an IDE is installed
   */
  async isIDEInstalled(ideType: IDEType): Promise<boolean> {
    const adapter = getAdapter(ideType);
    return adapter.checkInstalled();
  }

  /**
   * Get all installed IDEs
   */
  async getInstalledIDEs(): Promise<IDEType[]> {
    const installed: IDEType[] = [];
    const ideTypes = getAllIDETypes();

    for (const ideType of ideTypes) {
      if (await this.isIDEInstalled(ideType)) {
        installed.push(ideType);
      }
    }

    return installed;
  }

  /**
   * Get the backup service instance
   */
  getBackupService(): BackupService {
    return this.backupService;
  }

  /**
   * Create a backup for an IDE configuration
   */
  async createBackup(ideType: IDEType): Promise<string> {
    const adapter = getAdapter(ideType);
    const rawContent = await adapter.readRawContent();
    
    if (!rawContent) {
      throw createConfigError(
        `No content to backup for ${ideType}`,
        ConfigErrorCode.FILE_NOT_FOUND
      );
    }

    const backupInfo = await this.backupService.createBackup(ideType, rawContent);
    return backupInfo.id;
  }

  /**
   * Restore an IDE configuration from backup
   */
  async restoreFromBackup(ideType: IDEType, backupId: string): Promise<void> {
    const { content } = await this.backupService.restoreBackup(backupId);
    const adapter = getAdapter(ideType);
    await adapter.writeRawContent(content);
    
    // Reload config into cache
    await this.loadConfig(ideType);
  }
}

/**
 * Create a default ConfigService instance
 */
export const createDefaultConfigService = (): ConfigService => {
  return new ConfigService();
};
