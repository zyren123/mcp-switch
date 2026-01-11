import { 
  IDEType, 
  IDEConfig, 
  MCPServer, 
  SyncConflict, 
  SyncOperation,
  MCPServerConfig,
  FieldValue
} from '../../shared/types';
import { ConfigService } from './ConfigService';
import { BackupService } from './BackupService';
import { ConfigErrorCode, createConfigError } from '../utils/errors';

/**
 * Sync strategy types
 */
export type SyncStrategy = 'overwrite' | 'merge' | 'keep-target' | 'manual';

/**
 * Resolution for a single conflict
 */
export interface ConflictResolution {
  serverId: string;
  field: 'command' | 'args' | 'env' | 'enabled' | 'server';
  resolution: 'keep-source' | 'keep-target' | 'merge';
  mergedValue?: any;
}

/**
 * Result of sync preview
 */
export interface SyncPreviewResult {
  sourceIDE: IDEType;
  targetIDE: IDEType;
  conflicts: SyncConflict[];
  additions: MCPServer[];  // Servers to be added to target
  deletions: MCPServer[];  // Servers to be removed from target (if overwrite)
  updates: MCPServer[];    // Servers to be updated in target
  hasConflicts: boolean;
}

/**
 * Result of sync execution
 */
export interface SyncExecutionResult {
  success: boolean;
  targetIDE: IDEType;
  serversAdded: number;
  serversUpdated: number;
  serversRemoved: number;
  backupId?: string;
  error?: string;
}

/**
 * Sync conflict resolver service
 * Handles detection and resolution of configuration conflicts during sync
 */
export class SyncConflictResolver {
  private configService: ConfigService;
  private backupService: BackupService;

  constructor(configService?: ConfigService, backupService?: BackupService) {
    this.backupService = backupService || new BackupService();
    this.configService = configService || new ConfigService(this.backupService);
  }

  /**
   * Detect conflicts between source and target configurations
   */
  detectConflicts(sourceConfig: IDEConfig, targetConfig: IDEConfig): SyncConflict[] {
    const conflicts: SyncConflict[] = [];
    const sourceServers = this.serversToMap(sourceConfig.servers);
    const targetServers = this.serversToMap(targetConfig.servers);

    const allServerIds = new Set([
      ...sourceServers.keys(),
      ...targetServers.keys()
    ]);

    for (const serverId of allServerIds) {
      const source = sourceServers.get(serverId);
      const target = targetServers.get(serverId);

      if (!source && target) {
        // Server exists in target but not in source
        conflicts.push({
          serverId,
          sourceValue: undefined,
          targetValue: this.serverToConfig(target),
          field: 'server',
          conflictType: 'missing_in_source'
        });
      } else if (source && !target) {
        // Server exists in source but not in target
        conflicts.push({
          serverId,
          sourceValue: this.serverToConfig(source),
          targetValue: undefined,
          field: 'server',
          conflictType: 'missing_in_target'
        });
      } else if (source && target) {
        // Both have the server - check field conflicts
        this.checkFieldConflicts(serverId, source, target, conflicts);
      }
    }

    return conflicts;
  }

  /**
   * Preview sync operation without executing
   */
  async previewSync(
    sourceIDE: IDEType,
    targetIDE: IDEType
  ): Promise<SyncPreviewResult> {
    const sourceConfig = await this.configService.loadConfig(sourceIDE);
    const targetConfig = await this.configService.loadConfig(targetIDE);

    const conflicts = this.detectConflicts(sourceConfig, targetConfig);
    const sourceServers = this.serversToMap(sourceConfig.servers);
    const targetServers = this.serversToMap(targetConfig.servers);

    const additions: MCPServer[] = [];
    const updates: MCPServer[] = [];
    const deletions: MCPServer[] = [];

    // Find additions (in source, not in target)
    for (const [id, server] of sourceServers) {
      if (!targetServers.has(id)) {
        additions.push(server);
      }
    }

    // Find updates (in both, with differences)
    for (const [id, sourceServer] of sourceServers) {
      const targetServer = targetServers.get(id);
      if (targetServer && !this.serversEqual(sourceServer, targetServer)) {
        updates.push(sourceServer);
      }
    }

    // Find deletions (in target, not in source)
    for (const [id, server] of targetServers) {
      if (!sourceServers.has(id)) {
        deletions.push(server);
      }
    }

    return {
      sourceIDE,
      targetIDE,
      conflicts,
      additions,
      deletions,
      updates,
      hasConflicts: conflicts.some(c => c.conflictType === 'value_mismatch')
    };
  }

  /**
   * Execute sync with specified strategy
   */
  async executeSync(
    sourceIDE: IDEType,
    targetIDE: IDEType,
    strategy: SyncStrategy,
    resolutions?: ConflictResolution[]
  ): Promise<SyncExecutionResult> {
    try {
      const sourceConfig = await this.configService.loadConfig(sourceIDE);
      const targetConfig = await this.configService.loadConfig(targetIDE);

      // Create backup before sync
      let backupId: string | undefined;
      try {
        backupId = await this.configService.createBackup(targetIDE);
      } catch {
        // Continue even if backup fails (target might not exist)
      }

      // Resolve conflicts and merge configs
      const mergedServers = this.resolveAndMerge(
        sourceConfig.servers,
        targetConfig.servers,
        strategy,
        resolutions
      );

      // Count changes
      const targetServerIds = new Set(targetConfig.servers.map(s => s.id));
      const mergedServerIds = new Set(mergedServers.map(s => s.id));
      const sourceServerIds = new Set(sourceConfig.servers.map(s => s.id));

      let serversAdded = 0;
      let serversUpdated = 0;
      let serversRemoved = 0;

      for (const id of mergedServerIds) {
        if (!targetServerIds.has(id)) {
          serversAdded++;
        } else if (sourceServerIds.has(id)) {
          serversUpdated++;
        }
      }

      for (const id of targetServerIds) {
        if (!mergedServerIds.has(id)) {
          serversRemoved++;
        }
      }

      // Save merged config
      const newConfig: IDEConfig = {
        ...targetConfig,
        servers: mergedServers,
        lastSynced: Date.now(),
        syncStatus: 'synced'
      };

      await this.configService.saveConfig(targetIDE, newConfig);

      return {
        success: true,
        targetIDE,
        serversAdded,
        serversUpdated,
        serversRemoved,
        backupId
      };
    } catch (error: any) {
      return {
        success: false,
        targetIDE,
        serversAdded: 0,
        serversUpdated: 0,
        serversRemoved: 0,
        error: error.message
      };
    }
  }

  /**
   * Execute sync to multiple targets
   */
  async executeSyncToMultiple(
    sourceIDE: IDEType,
    targetIDEs: IDEType[],
    strategy: SyncStrategy,
    resolutions?: ConflictResolution[]
  ): Promise<SyncExecutionResult[]> {
    const results: SyncExecutionResult[] = [];

    for (const targetIDE of targetIDEs) {
      if (targetIDE === sourceIDE) continue;
      const result = await this.executeSync(sourceIDE, targetIDE, strategy, resolutions);
      results.push(result);
    }

    return results;
  }

  /**
   * Resolve conflicts and merge server lists
   */
  private resolveAndMerge(
    sourceServers: MCPServer[],
    targetServers: MCPServer[],
    strategy: SyncStrategy,
    resolutions?: ConflictResolution[]
  ): MCPServer[] {
    const sourceMap = this.serversToMap(sourceServers);
    const targetMap = this.serversToMap(targetServers);
    const result: MCPServer[] = [];
    const processedIds = new Set<string>();

    switch (strategy) {
      case 'overwrite':
        // Source completely replaces target
        return [...sourceServers];

      case 'keep-target':
        // Keep all target servers, only add new ones from source
        for (const server of targetServers) {
          result.push(server);
          processedIds.add(server.id);
        }
        for (const server of sourceServers) {
          if (!processedIds.has(server.id)) {
            result.push(server);
          }
        }
        return result;

      case 'merge':
        // Merge: source wins for conflicts, but keep unique target servers
        for (const server of sourceServers) {
          result.push(server);
          processedIds.add(server.id);
        }
        for (const server of targetServers) {
          if (!processedIds.has(server.id)) {
            result.push(server);
          }
        }
        return result;

      case 'manual':
        // Apply manual resolutions
        return this.applyManualResolutions(
          sourceServers,
          targetServers,
          resolutions || []
        );

      default:
        return [...sourceServers];
    }
  }

  /**
   * Apply manual conflict resolutions
   */
  private applyManualResolutions(
    sourceServers: MCPServer[],
    targetServers: MCPServer[],
    resolutions: ConflictResolution[]
  ): MCPServer[] {
    const sourceMap = this.serversToMap(sourceServers);
    const targetMap = this.serversToMap(targetServers);
    const result: MCPServer[] = [];
    const processedIds = new Set<string>();

    // Build resolution map
    const resolutionMap = new Map<string, ConflictResolution>();
    for (const resolution of resolutions) {
      resolutionMap.set(`${resolution.serverId}_${resolution.field}`, resolution);
    }

    // Process all server IDs
    const allIds = new Set([...sourceMap.keys(), ...targetMap.keys()]);

    for (const serverId of allIds) {
      const source = sourceMap.get(serverId);
      const target = targetMap.get(serverId);
      const serverResolution = resolutionMap.get(`${serverId}_server`);

      if (serverResolution) {
        // Handle server-level resolution
        if (serverResolution.resolution === 'keep-source' && source) {
          result.push(source);
        } else if (serverResolution.resolution === 'keep-target' && target) {
          result.push(target);
        }
        // 'merge' at server level doesn't make sense, skip
      } else if (source && !target) {
        // Only in source, add it
        result.push(source);
      } else if (!source && target) {
        // Only in target - check if there's a resolution
        // Default: keep target servers that aren't in source
        result.push(target);
      } else if (source && target) {
        // Both exist - apply field-level resolutions
        const merged = this.applyFieldResolutions(
          source,
          target,
          resolutions.filter(r => r.serverId === serverId)
        );
        result.push(merged);
      }

      processedIds.add(serverId);
    }

    return result;
  }

  /**
   * Apply field-level resolutions to merge two servers
   */
  private applyFieldResolutions(
    source: MCPServer,
    target: MCPServer,
    resolutions: ConflictResolution[]
  ): MCPServer {
    const result: MCPServer = { ...source };

    for (const resolution of resolutions) {
      if (resolution.field === 'server') continue;

      if (resolution.resolution === 'keep-target') {
        (result as any)[resolution.field] = (target as any)[resolution.field];
      } else if (resolution.resolution === 'merge' && resolution.mergedValue !== undefined) {
        (result as any)[resolution.field] = resolution.mergedValue;
      }
      // 'keep-source' is default (already in result)
    }

    return result;
  }

  /**
   * Check for field-level conflicts between two servers
   */
  private checkFieldConflicts(
    serverId: string,
    source: MCPServer,
    target: MCPServer,
    conflicts: SyncConflict[]
  ): void {
    const fields: Array<'command' | 'args' | 'env' | 'enabled'> = [
      'command', 'args', 'env', 'enabled'
    ];

    for (const field of fields) {
      const sourceValue = source[field];
      const targetValue = target[field];

      if (!this.valuesEqual(sourceValue, targetValue)) {
        conflicts.push({
          serverId,
          sourceValue: sourceValue as FieldValue,
          targetValue: targetValue as FieldValue,
          field,
          conflictType: 'value_mismatch'
        });
      }
    }
  }

  /**
   * Convert server array to Map for easier lookup
   */
  private serversToMap(servers: MCPServer[]): Map<string, MCPServer> {
    return new Map(servers.map(s => [s.id, s]));
  }

  /**
   * Convert MCPServer to MCPServerConfig
   */
  private serverToConfig(server: MCPServer): MCPServerConfig {
    return {
      command: server.command,
      args: server.args,
      env: server.env,
      enabled: server.enabled
    };
  }

  /**
   * Check if two servers are equal
   */
  private serversEqual(a: MCPServer, b: MCPServer): boolean {
    return (
      a.command === b.command &&
      this.valuesEqual(a.args, b.args) &&
      this.valuesEqual(a.env, b.env) &&
      a.enabled === b.enabled
    );
  }

  /**
   * Check if two values are equal (deep comparison)
   */
  private valuesEqual(a: any, b: any): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  /**
   * Get the config service instance
   */
  getConfigService(): ConfigService {
    return this.configService;
  }

  /**
   * Get the backup service instance
   */
  getBackupService(): BackupService {
    return this.backupService;
  }
}

/**
 * Create a default SyncConflictResolver instance
 */
export const createDefaultSyncConflictResolver = (): SyncConflictResolver => {
  return new SyncConflictResolver();
};
