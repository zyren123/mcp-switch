import * as fs from 'fs';
import * as path from 'path';
import { IDEType, IDEConfig, MCPServer } from '../../shared/types';
import { getConfigPath, getIDEDisplayName, getConfigFormat } from '../utils/platform';
import { getParser, getFormatter } from '../utils/configParser';
import { ConfigErrorCode, createConfigError } from '../utils/errors';

/**
 * Raw MCP server configuration as stored in config files
 */
export interface RawMCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  disabled?: boolean;
}

/**
 * Raw configuration structure with mcpServers
 */
export interface RawConfig {
  mcpServers?: Record<string, RawMCPServerConfig>;
  [key: string]: unknown;
}

/**
 * Abstract base class for IDE configuration adapters
 *
 * Each IDE has its own adapter that handles:
 * - Reading and writing config files
 * - Parsing and formatting config data
 * - Normalizing server configs to a common format
 */
export abstract class BaseAdapter {
  abstract readonly ideType: IDEType;

  /**
   * Get the display name for this IDE
   */
  get displayName(): string {
    return getIDEDisplayName(this.ideType);
  }

  /**
   * Get the config format for this IDE
   */
  get configFormat(): 'json' | 'toml' | 'jsonc' {
    return getConfigFormat(this.ideType);
  }

  /**
   * Get the configuration file path for this IDE
   */
  getConfigPath(): string {
    return getConfigPath(this.ideType);
  }

  /**
   * Parse configuration file content
   */
  parseConfig(content: string): RawConfig {
    const parser = getParser(this.ideType);
    return parser(content);
  }

  /**
   * Format configuration data for writing
   */
  formatConfig(config: RawConfig): string {
    const formatter = getFormatter(this.ideType);
    return formatter(config);
  }

  /**
   * Normalize raw server configs to MCPServer array
   */
  normalizeServers(rawConfig: RawConfig): MCPServer[] {
    const servers: MCPServer[] = [];
    const mcpServers = rawConfig.mcpServers || {};

    for (const [id, serverConfig] of Object.entries(mcpServers)) {
      servers.push({
        id,
        name: id,
        command: serverConfig.command,
        args: serverConfig.args || [],
        env: serverConfig.env,
        enabled: !serverConfig.disabled
      });
    }

    return servers;
  }

  /**
   * Convert MCPServer array back to raw config format
   */
  denormalizeServers(servers: MCPServer[]): Record<string, RawMCPServerConfig> {
    const mcpServers: Record<string, RawMCPServerConfig> = {};

    for (const server of servers) {
      const rawServer: RawMCPServerConfig = {
        command: server.command,
        args: server.args.length > 0 ? server.args : undefined,
        env: server.env && Object.keys(server.env).length > 0 ? server.env : undefined
      };

      // Only add disabled field if server is disabled
      if (!server.enabled) {
        rawServer.disabled = true;
      }

      mcpServers[server.id] = rawServer;
    }

    return mcpServers;
  }

  /**
   * Check if the IDE is installed (config directory exists)
   */
  async checkInstalled(): Promise<boolean> {
    const configPath = this.getConfigPath();
    if (!configPath) return false;

    try {
      const configDir = path.dirname(configPath);
      await fs.promises.access(configDir, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if config file exists
   */
  async configExists(): Promise<boolean> {
    const configPath = this.getConfigPath();
    if (!configPath) return false;

    try {
      await fs.promises.access(configPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read and parse the configuration file
   */
  async readConfig(): Promise<IDEConfig> {
    const configPath = this.getConfigPath();

    if (!configPath) {
      throw createConfigError(
        `No config path defined for ${this.ideType}`,
        ConfigErrorCode.PLATFORM_UNSUPPORTED
      );
    }

    const isInstalled = await this.checkInstalled();

    // If config file doesn't exist, return empty config
    const exists = await this.configExists();
    if (!exists) {
      return {
        type: this.ideType,
        name: this.ideType,
        displayName: this.displayName,
        configPath,
        configFormat: this.configFormat,
        isInstalled,
        servers: [],
        syncStatus: 'unknown'
      };
    }

    try {
      const content = await fs.promises.readFile(configPath, 'utf-8');
      const rawConfig = this.parseConfig(content);
      const servers = this.normalizeServers(rawConfig);

      return {
        type: this.ideType,
        name: this.ideType,
        displayName: this.displayName,
        configPath,
        configFormat: this.configFormat,
        isInstalled,
        servers,
        syncStatus: 'synced'
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return {
          type: this.ideType,
          name: this.ideType,
          displayName: this.displayName,
          configPath,
          configFormat: this.configFormat,
          isInstalled,
          servers: [],
          syncStatus: 'unknown'
        };
      }

      throw createConfigError(
        `Failed to read config for ${this.ideType}: ${error.message}`,
        ConfigErrorCode.FILE_READ_ERROR,
        configPath,
        { originalError: error }
      );
    }
  }

  /**
   * Write configuration to file
   */
  async writeConfig(config: IDEConfig): Promise<void> {
    const configPath = this.getConfigPath();

    if (!configPath) {
      throw createConfigError(
        `No config path defined for ${this.ideType}`,
        ConfigErrorCode.PLATFORM_UNSUPPORTED
      );
    }

    try {
      // Read existing config to preserve non-MCP fields
      let existingRawConfig: RawConfig = {};
      const exists = await this.configExists();
      if (exists) {
        const content = await fs.promises.readFile(configPath, 'utf-8');
        existingRawConfig = this.parseConfig(content);
      }

      // Update mcpServers while preserving other fields
      const mcpServers = this.denormalizeServers(config.servers);
      const newRawConfig: RawConfig = {
        ...existingRawConfig,
        mcpServers
      };

      // Format and write
      const formattedContent = this.formatConfig(newRawConfig);

      // Ensure directory exists
      const configDir = path.dirname(configPath);
      await fs.promises.mkdir(configDir, { recursive: true });

      await fs.promises.writeFile(configPath, formattedContent, 'utf-8');
    } catch (error: any) {
      throw createConfigError(
        `Failed to write config for ${this.ideType}: ${error.message}`,
        ConfigErrorCode.FILE_WRITE_ERROR,
        configPath,
        { originalError: error }
      );
    }
  }

  /**
   * Read raw configuration content
   */
  async readRawContent(): Promise<string> {
    const configPath = this.getConfigPath();

    if (!configPath) {
      throw createConfigError(
        `No config path defined for ${this.ideType}`,
        ConfigErrorCode.PLATFORM_UNSUPPORTED
      );
    }

    try {
      return await fs.promises.readFile(configPath, 'utf-8');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return '';
      }
      throw createConfigError(
        `Failed to read raw config for ${this.ideType}: ${error.message}`,
        ConfigErrorCode.FILE_READ_ERROR,
        configPath,
        { originalError: error }
      );
    }
  }

  /**
   * Write raw configuration content
   */
  async writeRawContent(content: string): Promise<void> {
    const configPath = this.getConfigPath();

    if (!configPath) {
      throw createConfigError(
        `No config path defined for ${this.ideType}`,
        ConfigErrorCode.PLATFORM_UNSUPPORTED
      );
    }

    try {
      const configDir = path.dirname(configPath);
      await fs.promises.mkdir(configDir, { recursive: true });
      await fs.promises.writeFile(configPath, content, 'utf-8');
    } catch (error: any) {
      throw createConfigError(
        `Failed to write raw config for ${this.ideType}: ${error.message}`,
        ConfigErrorCode.FILE_WRITE_ERROR,
        configPath,
        { originalError: error }
      );
    }
  }
}
