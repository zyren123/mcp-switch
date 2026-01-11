import * as fs from 'fs';
import * as path from 'path';
import { IDEType } from '../../shared/types';
import { getAdapter } from '../adapters';
import { configParsers } from '../utils/configParser';

/**
 * File change event type
 */
export type FileChangeEvent = 'change' | 'rename' | 'delete';

/**
 * Callback for file changes
 */
export type ConfigChangeCallback = (event: FileChangeEvent, ideType: IDEType) => void;

/**
 * Refresh result
 */
export interface RefreshResult {
  success: boolean;
  config?: any;
  serversCount?: number;
  error?: string;
  message?: string;
}

/**
 * Config watcher service for monitoring configuration file changes
 */
export class ConfigWatcher {
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private debounceMs: number = 300;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private callbacks: Map<string, ConfigChangeCallback[]> = new Map();
  private isWatching: boolean = false;

  constructor(debounceMs: number = 300) {
    this.debounceMs = debounceMs;
  }

  /**
   * Start watching a configuration file
   */
  watchConfig(ideType: IDEType, callback: ConfigChangeCallback): void {
    const adapter = getAdapter(ideType);
    const configPath = adapter.getConfigPath();

    if (!configPath) {
      console.warn(`No config path for ${ideType}, skipping watch`);
      return;
    }

    // Store callback
    const callbacks = this.callbacks.get(configPath) || [];
    callbacks.push(callback);
    this.callbacks.set(configPath, callbacks);

    // Already watching this file
    if (this.watchers.has(configPath)) {
      return;
    }

    this.startWatcher(ideType, configPath);
  }

  /**
   * Stop watching a configuration file
   */
  unwatchConfig(configPath: string): void {
    // Clear debounce timers
    for (const [key, timer] of this.debounceTimers.entries()) {
      if (key.startsWith(configPath)) {
        clearTimeout(timer);
        this.debounceTimers.delete(key);
      }
    }

    // Close watcher
    const watcher = this.watchers.get(configPath);
    if (watcher) {
      try {
        watcher.close();
      } catch (error) {
        console.error(`Error closing watcher for: ${configPath}`, error);
      }
      this.watchers.delete(configPath);
    }

    // Remove callbacks
    this.callbacks.delete(configPath);
  }

  /**
   * Stop watching an IDE config
   */
  unwatchIDE(ideType: IDEType): void {
    const adapter = getAdapter(ideType);
    const configPath = adapter.getConfigPath();
    if (configPath) {
      this.unwatchConfig(configPath);
    }
  }

  /**
   * Stop all watchers
   */
  closeAll(): void {
    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Close all watchers
    for (const [configPath, watcher] of this.watchers.entries()) {
      try {
        watcher.close();
      } catch (error) {
        console.error(`Error closing watcher for: ${configPath}`, error);
      }
    }
    this.watchers.clear();
    this.callbacks.clear();
    this.isWatching = false;
  }

  /**
   * Refresh configuration from disk
   */
  async refreshConfig(ideType: IDEType): Promise<RefreshResult> {
    const adapter = getAdapter(ideType);
    const configPath = adapter.getConfigPath();

    if (!configPath) {
      return {
        success: false,
        error: 'NO_CONFIG_PATH',
        message: `No config path defined for ${ideType}`
      };
    }

    try {
      // Check file exists
      if (!fs.existsSync(configPath)) {
        return {
          success: false,
          error: 'CONFIG_NOT_FOUND',
          message: `配置文件不存在: ${configPath}`
        };
      }

      // Read and parse
      const content = await fs.promises.readFile(configPath, 'utf-8');
      const config = configParsers[ideType](content);

      // Verify integrity
      const integrityCheck = await this.checkConfigIntegrity(ideType, content);
      if (!integrityCheck.valid) {
        return {
          success: false,
          error: 'CONFIG_CORRUPTED',
          message: integrityCheck.message
        };
      }

      return {
        success: true,
        config,
        serversCount: Object.keys(config.mcpServers || {}).length
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'REFRESH_FAILED',
        message: error.message
      };
    }
  }

  /**
   * Check configuration integrity
   */
  async checkConfigIntegrity(
    ideType: string,
    content: string
  ): Promise<{ valid: boolean; message?: string }> {
    try {
      const config = configParsers[ideType](content);

      // Validate structure based on IDE type
      if (['claude-desktop', 'claude-code'].includes(ideType)) {
        if (!config.mcpServers || typeof config.mcpServers !== 'object') {
          return {
            valid: false,
            message: '缺少 mcpServers 字段'
          };
        }
      }

      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        message: `解析错误: ${error.message}`
      };
    }
  }

  /**
   * Set the debounce interval
   */
  setDebounceMs(ms: number): void {
    this.debounceMs = Math.max(0, ms);
  }

  /**
   * Get the debounce interval
   */
  getDebounceMs(): number {
    return this.debounceMs;
  }

  /**
   * Check if watching any configs
   */
  isActive(): boolean {
    return this.watchers.size > 0;
  }

  /**
   * Get the number of active watchers
   */
  getWatcherCount(): number {
    return this.watchers.size;
  }

  /**
   * Get the paths being watched
   */
  getWatchedPaths(): string[] {
    return Array.from(this.watchers.keys());
  }

  /**
   * Start watching a config file
   */
  private startWatcher(ideType: IDEType, configPath: string): void {
    try {
      const configDir = path.dirname(configPath);
      const configFilename = path.basename(configPath);

      // Ensure directory exists
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Watch directory instead of file (handles file creation)
      const watcher = fs.watch(configDir, { persistent: true }, (eventType, filename) => {
        // Only process if the target file changed
        if (filename !== configFilename) {
          return;
        }

        const event = eventType === 'rename' ? 'rename' : 'change';
        this.handleFileChange(event, ideType, configPath);
      });

      this.watchers.set(configPath, watcher);
      this.isWatching = true;
    } catch (error) {
      console.error(`Failed to watch config file: ${configPath}`, error);
    }
  }

  /**
   * Handle file change with debouncing
   */
  private handleFileChange(event: FileChangeEvent, ideType: IDEType, configPath: string): void {
    const timerKey = `${configPath}_${event}`;

    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(timerKey);

      // Get callbacks for this config
      const callbacks = this.callbacks.get(configPath) || [];

      // Call all registered callbacks
      for (const callback of callbacks) {
        try {
          callback(event, ideType);
        } catch (error) {
          console.error(`Error in config change callback for ${ideType}:`, error);
        }
      }
    }, this.debounceMs);

    this.debounceTimers.set(timerKey, timer);
  }
}

/**
 * Create a default ConfigWatcher instance
 */
export const createDefaultConfigWatcher = (): ConfigWatcher => {
  return new ConfigWatcher(300);
};
