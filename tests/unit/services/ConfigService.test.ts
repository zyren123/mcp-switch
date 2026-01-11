import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ConfigService } from '../../../src/main/services/ConfigService';
import { BackupService } from '../../../src/main/services/BackupService';
import { IDEType, IDEConfig, MCPServer } from '../../../src/shared/types';
import * as adaptersModule from '../../../src/main/adapters';

// Mock the adapters module
vi.mock('../../../src/main/adapters', () => {
  const mockAdapter = {
    ideType: 'claude-desktop' as IDEType,
    displayName: 'Claude Desktop',
    configFormat: 'json' as const,
    getConfigPath: vi.fn(() => '/mock/path/config.json'),
    readConfig: vi.fn(),
    writeConfig: vi.fn(),
    readRawContent: vi.fn(),
    writeRawContent: vi.fn(),
    checkInstalled: vi.fn()
  };

  return {
    getAdapter: vi.fn(() => mockAdapter),
    getAllAdapters: vi.fn(() => [mockAdapter]),
    getAllIDETypes: vi.fn(() => ['claude-desktop'] as IDEType[])
  };
});

// Mock BackupService
vi.mock('../../../src/main/services/BackupService', () => {
  return {
    BackupService: vi.fn().mockImplementation(() => ({
      createBackup: vi.fn().mockResolvedValue({ id: 'backup-123', ideType: 'claude-desktop', timestamp: Date.now(), path: '/mock/backup', size: 100 }),
      restoreBackup: vi.fn().mockResolvedValue({ content: '{}', info: {} }),
      listBackups: vi.fn().mockResolvedValue([])
    }))
  };
});

/**
 * Creates a fresh copy of mock config to avoid mutation issues
 */
const createMockConfig = (): IDEConfig => ({
  type: 'claude-desktop',
  name: 'claude-desktop',
  displayName: 'Claude Desktop',
  configPath: '/mock/path/config.json',
  configFormat: 'json',
  isInstalled: true,
  servers: [
    {
      id: 'server-1',
      name: 'server-1',
      command: 'npx',
      args: ['-y', '@anthropic/mcp-server'],
      env: {},
      enabled: true
    }
  ],
  syncStatus: 'synced'
});

describe('ConfigService', () => {
  let configService: ConfigService;
  let mockBackupService: BackupService;
  let mockAdapter: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBackupService = new BackupService();
    configService = new ConfigService(mockBackupService);
    mockAdapter = (adaptersModule.getAdapter as Mock)();
    // Return a fresh copy each time to avoid mutation issues
    mockAdapter.readConfig.mockImplementation(() => Promise.resolve(createMockConfig()));
    mockAdapter.writeConfig.mockResolvedValue(undefined);
    mockAdapter.readRawContent.mockResolvedValue('{"mcpServers": {}}');
    mockAdapter.checkInstalled.mockResolvedValue(true);
  });

  describe('loadAllConfigs', () => {
    it('should load all IDE configurations', async () => {
      const configs = await configService.loadAllConfigs();

      expect(configs).toHaveLength(1);
      expect(configs[0].type).toBe('claude-desktop');
      expect(adaptersModule.getAllAdapters).toHaveBeenCalled();
    });

    it('should return error config on load failure', async () => {
      mockAdapter.readConfig.mockRejectedValue(new Error('Read failed'));

      const configs = await configService.loadAllConfigs();

      expect(configs).toHaveLength(1);
      expect(configs[0].syncStatus).toBe('error');
      expect(configs[0].servers).toEqual([]);
    });
  });

  describe('loadConfig', () => {
    it('should load configuration for a specific IDE', async () => {
      const config = await configService.loadConfig('claude-desktop');

      expect(config.type).toBe('claude-desktop');
      expect(config.servers).toHaveLength(1);
      expect(adaptersModule.getAdapter).toHaveBeenCalledWith('claude-desktop');
      expect(mockAdapter.readConfig).toHaveBeenCalled();
    });

    it('should cache the loaded configuration', async () => {
      await configService.loadConfig('claude-desktop');
      const cached = configService.getCachedConfig('claude-desktop');

      expect(cached).toBeDefined();
      expect(cached?.type).toBe('claude-desktop');
    });
  });

  describe('saveConfig', () => {
    it('should save configuration for a specific IDE', async () => {
      const config = createMockConfig();
      await configService.saveConfig('claude-desktop', config);

      expect(mockAdapter.writeConfig).toHaveBeenCalledWith(config);
    });

    it('should update the cache after saving', async () => {
      const updatedConfig = { ...createMockConfig(), servers: [] };
      await configService.saveConfig('claude-desktop', updatedConfig);
      const cached = configService.getCachedConfig('claude-desktop');

      expect(cached).toEqual(updatedConfig);
    });
  });

  describe('toggleServer', () => {
    it('should toggle server enabled state', async () => {
      const result = await configService.toggleServer('claude-desktop', 'server-1', false);

      expect(result.success).toBe(true);
      expect(mockAdapter.writeConfig).toHaveBeenCalled();
      const savedConfig = mockAdapter.writeConfig.mock.calls[0][0];
      expect(savedConfig.servers[0].enabled).toBe(false);
    });

    it('should return error if server not found', async () => {
      const result = await configService.toggleServer('claude-desktop', 'nonexistent', false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should create backup before toggling', async () => {
      await configService.toggleServer('claude-desktop', 'server-1', false);

      expect(mockBackupService.createBackup).toHaveBeenCalledWith('claude-desktop', expect.any(String));
    });
  });

  describe('addServer', () => {
    const newServer: MCPServer = {
      id: 'server-2',
      name: 'server-2',
      command: 'node',
      args: ['server.js'],
      env: {},
      enabled: true
    };

    it('should add a new server', async () => {
      const result = await configService.addServer('claude-desktop', newServer);

      expect(result.success).toBe(true);
      expect(mockAdapter.writeConfig).toHaveBeenCalled();
      const savedConfig = mockAdapter.writeConfig.mock.calls[0][0];
      expect(savedConfig.servers).toHaveLength(2);
    });

    it('should return error if server already exists', async () => {
      const existingServer = { ...newServer, id: 'server-1' };
      const result = await configService.addServer('claude-desktop', existingServer);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });

  describe('removeServer', () => {
    it('should remove a server', async () => {
      const result = await configService.removeServer('claude-desktop', 'server-1');

      expect(result.success).toBe(true);
      expect(mockAdapter.writeConfig).toHaveBeenCalled();
      const savedConfig = mockAdapter.writeConfig.mock.calls[0][0];
      expect(savedConfig.servers).toHaveLength(0);
    });

    it('should return error if server not found', async () => {
      const result = await configService.removeServer('claude-desktop', 'nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('updateServer', () => {
    it('should update a server', async () => {
      const updates = { command: 'node', args: ['updated.js'] };
      const result = await configService.updateServer('claude-desktop', 'server-1', updates);

      expect(result.success).toBe(true);
      expect(mockAdapter.writeConfig).toHaveBeenCalled();
      const savedConfig = mockAdapter.writeConfig.mock.calls[0][0];
      expect(savedConfig.servers[0].command).toBe('node');
      expect(savedConfig.servers[0].args).toEqual(['updated.js']);
    });

    it('should preserve server id during update', async () => {
      const updates = { id: 'new-id', command: 'node' };
      await configService.updateServer('claude-desktop', 'server-1', updates);

      const savedConfig = mockAdapter.writeConfig.mock.calls[0][0];
      expect(savedConfig.servers[0].id).toBe('server-1');
    });

    it('should return error if server not found', async () => {
      const result = await configService.updateServer('claude-desktop', 'nonexistent', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('getServer', () => {
    it('should return a server by ID', async () => {
      const server = await configService.getServer('claude-desktop', 'server-1');

      expect(server).toBeDefined();
      expect(server?.id).toBe('server-1');
    });

    it('should return null for nonexistent server', async () => {
      const server = await configService.getServer('claude-desktop', 'nonexistent');

      expect(server).toBeNull();
    });
  });

  describe('getServers', () => {
    it('should return all servers for an IDE', async () => {
      const servers = await configService.getServers('claude-desktop');

      expect(servers).toHaveLength(1);
      expect(servers[0].id).toBe('server-1');
    });
  });

  describe('clearCache', () => {
    it('should clear all cached configurations', async () => {
      await configService.loadConfig('claude-desktop');
      expect(configService.getCachedConfig('claude-desktop')).toBeDefined();

      configService.clearCache();

      expect(configService.getCachedConfig('claude-desktop')).toBeUndefined();
    });
  });

  describe('isIDEInstalled', () => {
    it('should check if IDE is installed', async () => {
      const result = await configService.isIDEInstalled('claude-desktop');

      expect(result).toBe(true);
      expect(mockAdapter.checkInstalled).toHaveBeenCalled();
    });
  });

  describe('getInstalledIDEs', () => {
    it('should return list of installed IDEs', async () => {
      const installed = await configService.getInstalledIDEs();

      expect(installed).toContain('claude-desktop');
    });
  });

  describe('createBackup', () => {
    it('should create a backup', async () => {
      const backupId = await configService.createBackup('claude-desktop');

      expect(backupId).toBe('backup-123');
      expect(mockBackupService.createBackup).toHaveBeenCalled();
    });

    it('should throw if no content to backup', async () => {
      mockAdapter.readRawContent.mockResolvedValue('');

      await expect(configService.createBackup('claude-desktop')).rejects.toThrow();
    });
  });

  describe('restoreFromBackup', () => {
    it('should restore from backup', async () => {
      await configService.restoreFromBackup('claude-desktop', 'backup-123');

      expect(mockBackupService.restoreBackup).toHaveBeenCalledWith('backup-123');
      expect(mockAdapter.writeRawContent).toHaveBeenCalled();
    });
  });
});
