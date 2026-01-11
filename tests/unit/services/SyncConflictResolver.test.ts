import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncConflictResolver, SyncStrategy } from '../../../src/main/services/SyncConflictResolver';
import { ConfigService } from '../../../src/main/services/ConfigService';
import { BackupService } from '../../../src/main/services/BackupService';
import { IDEConfig, MCPServer } from '../../../src/shared/types';

// Mock ConfigService
vi.mock('../../../src/main/services/ConfigService', () => {
  return {
    ConfigService: vi.fn().mockImplementation(() => ({
      loadConfig: vi.fn(),
      saveConfig: vi.fn(),
      createBackup: vi.fn().mockResolvedValue('backup-123')
    }))
  };
});

// Mock BackupService
vi.mock('../../../src/main/services/BackupService', () => {
  return {
    BackupService: vi.fn().mockImplementation(() => ({
      createBackup: vi.fn().mockResolvedValue({ id: 'backup-123' }),
      restoreBackup: vi.fn(),
      listBackups: vi.fn().mockResolvedValue([])
    }))
  };
});

describe('SyncConflictResolver', () => {
  let syncResolver: SyncConflictResolver;
  let mockConfigService: any;
  let mockBackupService: any;

  const createMockConfig = (servers: MCPServer[]): IDEConfig => ({
    type: 'claude-desktop',
    name: 'claude-desktop',
    displayName: 'Claude Desktop',
    configPath: '/mock/path',
    configFormat: 'json',
    isInstalled: true,
    servers,
    syncStatus: 'synced'
  });

  const serverA: MCPServer = {
    id: 'server-a',
    name: 'server-a',
    command: 'npx',
    args: ['-y', 'server-a'],
    env: { KEY: 'value' },
    enabled: true
  };

  const serverB: MCPServer = {
    id: 'server-b',
    name: 'server-b',
    command: 'node',
    args: ['server-b.js'],
    env: {},
    enabled: true
  };

  const serverAModified: MCPServer = {
    ...serverA,
    args: ['-y', 'server-a-modified'],
    enabled: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockBackupService = new BackupService();
    mockConfigService = new ConfigService(mockBackupService);
    syncResolver = new SyncConflictResolver(mockConfigService, mockBackupService);
  });

  describe('detectConflicts', () => {
    it('should detect missing_in_source conflicts', () => {
      const sourceConfig = createMockConfig([serverA]);
      const targetConfig = createMockConfig([serverA, serverB]);

      const conflicts = syncResolver.detectConflicts(sourceConfig, targetConfig);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].serverId).toBe('server-b');
      expect(conflicts[0].conflictType).toBe('missing_in_source');
      expect(conflicts[0].field).toBe('server');
    });

    it('should detect missing_in_target conflicts', () => {
      const sourceConfig = createMockConfig([serverA, serverB]);
      const targetConfig = createMockConfig([serverA]);

      const conflicts = syncResolver.detectConflicts(sourceConfig, targetConfig);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].serverId).toBe('server-b');
      expect(conflicts[0].conflictType).toBe('missing_in_target');
      expect(conflicts[0].field).toBe('server');
    });

    it('should detect value_mismatch conflicts for command field', () => {
      const sourceConfig = createMockConfig([serverA]);
      const targetConfig = createMockConfig([{ ...serverA, command: 'node' }]);

      const conflicts = syncResolver.detectConflicts(sourceConfig, targetConfig);

      const commandConflict = conflicts.find(c => c.field === 'command');
      expect(commandConflict).toBeDefined();
      expect(commandConflict?.conflictType).toBe('value_mismatch');
      expect(commandConflict?.sourceValue).toBe('npx');
      expect(commandConflict?.targetValue).toBe('node');
    });

    it('should detect value_mismatch conflicts for args field', () => {
      const sourceConfig = createMockConfig([serverA]);
      const targetConfig = createMockConfig([serverAModified]);

      const conflicts = syncResolver.detectConflicts(sourceConfig, targetConfig);

      const argsConflict = conflicts.find(c => c.field === 'args');
      expect(argsConflict).toBeDefined();
      expect(argsConflict?.conflictType).toBe('value_mismatch');
    });

    it('should detect value_mismatch conflicts for enabled field', () => {
      const sourceConfig = createMockConfig([serverA]);
      const targetConfig = createMockConfig([{ ...serverA, enabled: false }]);

      const conflicts = syncResolver.detectConflicts(sourceConfig, targetConfig);

      const enabledConflict = conflicts.find(c => c.field === 'enabled');
      expect(enabledConflict).toBeDefined();
      expect(enabledConflict?.conflictType).toBe('value_mismatch');
    });

    it('should detect value_mismatch conflicts for env field', () => {
      const sourceConfig = createMockConfig([serverA]);
      const targetConfig = createMockConfig([{ ...serverA, env: { DIFFERENT: 'env' } }]);

      const conflicts = syncResolver.detectConflicts(sourceConfig, targetConfig);

      const envConflict = conflicts.find(c => c.field === 'env');
      expect(envConflict).toBeDefined();
      expect(envConflict?.conflictType).toBe('value_mismatch');
    });

    it('should return no conflicts for identical configs', () => {
      const sourceConfig = createMockConfig([serverA, serverB]);
      const targetConfig = createMockConfig([serverA, serverB]);

      const conflicts = syncResolver.detectConflicts(sourceConfig, targetConfig);

      expect(conflicts).toHaveLength(0);
    });

    it('should detect multiple conflicts', () => {
      const sourceConfig = createMockConfig([serverA, serverB]);
      const targetConfig = createMockConfig([serverAModified]);

      const conflicts = syncResolver.detectConflicts(sourceConfig, targetConfig);

      // Should have: server-b missing_in_target, server-a field mismatches
      expect(conflicts.length).toBeGreaterThan(1);
    });
  });

  describe('previewSync', () => {
    it('should preview sync operation', async () => {
      const sourceConfig = createMockConfig([serverA, serverB]);
      const targetConfig = createMockConfig([serverA]);

      mockConfigService.loadConfig
        .mockResolvedValueOnce(sourceConfig)
        .mockResolvedValueOnce(targetConfig);

      const preview = await syncResolver.previewSync('claude-desktop', 'cursor');

      expect(preview.sourceIDE).toBe('claude-desktop');
      expect(preview.targetIDE).toBe('cursor');
      expect(preview.additions).toHaveLength(1);
      expect(preview.additions[0].id).toBe('server-b');
      expect(preview.deletions).toHaveLength(0);
    });

    it('should identify updates correctly', async () => {
      const sourceConfig = createMockConfig([serverAModified]);
      const targetConfig = createMockConfig([serverA]);

      mockConfigService.loadConfig
        .mockResolvedValueOnce(sourceConfig)
        .mockResolvedValueOnce(targetConfig);

      const preview = await syncResolver.previewSync('claude-desktop', 'cursor');

      expect(preview.updates).toHaveLength(1);
      expect(preview.updates[0].id).toBe('server-a');
      expect(preview.hasConflicts).toBe(true);
    });

    it('should identify deletions correctly', async () => {
      const sourceConfig = createMockConfig([serverA]);
      const targetConfig = createMockConfig([serverA, serverB]);

      mockConfigService.loadConfig
        .mockResolvedValueOnce(sourceConfig)
        .mockResolvedValueOnce(targetConfig);

      const preview = await syncResolver.previewSync('claude-desktop', 'cursor');

      expect(preview.deletions).toHaveLength(1);
      expect(preview.deletions[0].id).toBe('server-b');
    });
  });

  describe('executeSync', () => {
    describe('overwrite strategy', () => {
      it('should replace target with source completely', async () => {
        const sourceConfig = createMockConfig([serverA, serverB]);
        const targetConfig = createMockConfig([{ ...serverA, command: 'old' }]);

        mockConfigService.loadConfig
          .mockResolvedValueOnce(sourceConfig)
          .mockResolvedValueOnce(targetConfig);

        const result = await syncResolver.executeSync(
          'claude-desktop',
          'cursor',
          'overwrite'
        );

        expect(result.success).toBe(true);
        expect(mockConfigService.saveConfig).toHaveBeenCalled();

        const savedConfig = mockConfigService.saveConfig.mock.calls[0][1];
        expect(savedConfig.servers).toHaveLength(2);
        expect(savedConfig.servers.map((s: MCPServer) => s.id)).toEqual(['server-a', 'server-b']);
      });
    });

    describe('keep-target strategy', () => {
      it('should keep target servers and only add new ones from source', async () => {
        const sourceConfig = createMockConfig([serverAModified, serverB]);
        const targetConfig = createMockConfig([serverA]);

        mockConfigService.loadConfig
          .mockResolvedValueOnce(sourceConfig)
          .mockResolvedValueOnce(targetConfig);

        const result = await syncResolver.executeSync(
          'claude-desktop',
          'cursor',
          'keep-target'
        );

        expect(result.success).toBe(true);

        const savedConfig = mockConfigService.saveConfig.mock.calls[0][1];
        expect(savedConfig.servers).toHaveLength(2);
        // server-a should be original (from target), server-b added from source
        const serverAResult = savedConfig.servers.find((s: MCPServer) => s.id === 'server-a');
        expect(serverAResult.command).toBe('npx'); // Original from target
        expect(serverAResult.enabled).toBe(true); // Original from target
      });
    });

    describe('merge strategy', () => {
      it('should merge configs with source winning conflicts', async () => {
        const sourceConfig = createMockConfig([serverAModified]);
        const targetConfig = createMockConfig([serverA, serverB]);

        mockConfigService.loadConfig
          .mockResolvedValueOnce(sourceConfig)
          .mockResolvedValueOnce(targetConfig);

        const result = await syncResolver.executeSync(
          'claude-desktop',
          'cursor',
          'merge'
        );

        expect(result.success).toBe(true);

        const savedConfig = mockConfigService.saveConfig.mock.calls[0][1];
        expect(savedConfig.servers).toHaveLength(2);
        // server-a should be from source, server-b kept from target
        const serverAResult = savedConfig.servers.find((s: MCPServer) => s.id === 'server-a');
        expect(serverAResult.enabled).toBe(false); // From source (modified)
      });
    });

    describe('manual strategy', () => {
      it('should apply manual resolutions', async () => {
        const sourceConfig = createMockConfig([serverAModified]);
        const targetConfig = createMockConfig([serverA]);

        mockConfigService.loadConfig
          .mockResolvedValueOnce(sourceConfig)
          .mockResolvedValueOnce(targetConfig);

        const resolutions = [
          { serverId: 'server-a', field: 'enabled' as const, resolution: 'keep-target' as const }
        ];

        const result = await syncResolver.executeSync(
          'claude-desktop',
          'cursor',
          'manual',
          resolutions
        );

        expect(result.success).toBe(true);

        const savedConfig = mockConfigService.saveConfig.mock.calls[0][1];
        const serverAResult = savedConfig.servers.find((s: MCPServer) => s.id === 'server-a');
        expect(serverAResult.enabled).toBe(true); // Kept from target
      });
    });

    it('should create backup before sync', async () => {
      const sourceConfig = createMockConfig([serverA]);
      const targetConfig = createMockConfig([serverB]);

      mockConfigService.loadConfig
        .mockResolvedValueOnce(sourceConfig)
        .mockResolvedValueOnce(targetConfig);

      const result = await syncResolver.executeSync(
        'claude-desktop',
        'cursor',
        'overwrite'
      );

      expect(result.backupId).toBe('backup-123');
      expect(mockConfigService.createBackup).toHaveBeenCalledWith('cursor');
    });

    it('should return sync statistics', async () => {
      const sourceConfig = createMockConfig([serverA, serverB]);
      const targetConfig = createMockConfig([{ ...serverA, command: 'old' }]);

      mockConfigService.loadConfig
        .mockResolvedValueOnce(sourceConfig)
        .mockResolvedValueOnce(targetConfig);

      const result = await syncResolver.executeSync(
        'claude-desktop',
        'cursor',
        'overwrite'
      );

      expect(result.serversAdded).toBe(1); // server-b
      expect(result.serversUpdated).toBe(1); // server-a
    });

    it('should handle sync errors gracefully', async () => {
      mockConfigService.loadConfig.mockRejectedValue(new Error('Load failed'));

      const result = await syncResolver.executeSync(
        'claude-desktop',
        'cursor',
        'overwrite'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Load failed');
    });
  });

  describe('executeSyncToMultiple', () => {
    it('should sync to multiple targets', async () => {
      const sourceConfig = createMockConfig([serverA]);
      const targetConfig1 = createMockConfig([]);
      const targetConfig2 = createMockConfig([]);

      mockConfigService.loadConfig
        .mockResolvedValueOnce(sourceConfig)
        .mockResolvedValueOnce(targetConfig1)
        .mockResolvedValueOnce(sourceConfig)
        .mockResolvedValueOnce(targetConfig2);

      const results = await syncResolver.executeSyncToMultiple(
        'claude-desktop',
        ['cursor', 'windsurf'],
        'overwrite'
      );

      expect(results).toHaveLength(2);
      expect(results[0].targetIDE).toBe('cursor');
      expect(results[1].targetIDE).toBe('windsurf');
    });

    it('should skip source IDE in targets', async () => {
      const sourceConfig = createMockConfig([serverA]);
      const targetConfig = createMockConfig([]);

      mockConfigService.loadConfig
        .mockResolvedValueOnce(sourceConfig)
        .mockResolvedValueOnce(targetConfig);

      const results = await syncResolver.executeSyncToMultiple(
        'claude-desktop',
        ['claude-desktop', 'cursor'],
        'overwrite'
      );

      expect(results).toHaveLength(1);
      expect(results[0].targetIDE).toBe('cursor');
    });
  });
});
