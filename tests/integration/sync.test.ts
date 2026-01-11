import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@main/services/ConfigService';
import { BackupService } from '@main/services/BackupService';
import { SyncConflictResolver } from '@main/services/SyncConflictResolver';
import { IDEConfig, MCPServer } from '@shared/types';

// Shared config store that persists across mock calls
const mockConfigs: Record<string, IDEConfig> = {};

// Helper to clear the store
const clearMockConfigs = () => {
  Object.keys(mockConfigs).forEach(key => delete mockConfigs[key]);
};

// Mock fs module for file operations
vi.mock('fs', () => {
  return {
    promises: {
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue('{}'),
      readdir: vi.fn().mockResolvedValue([]),
      stat: vi.fn().mockResolvedValue({ size: 100 }),
      access: vi.fn().mockResolvedValue(undefined),
      unlink: vi.fn().mockResolvedValue(undefined)
    },
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    watch: vi.fn(() => ({ close: vi.fn() })),
    constants: {
      F_OK: 0
    }
  };
});

// Mock os module
vi.mock('os', () => ({
  homedir: vi.fn(() => '/mock/home')
}));

// Mock adapters - this needs to reference the shared mockConfigs
vi.mock('@main/adapters', () => {
  const createMockAdapter = (ideType: string) => ({
    ideType,
    displayName: ideType.replace('-', ' '),
    configFormat: 'json' as const,
    getConfigPath: vi.fn(() => `/mock/path/${ideType}/config.json`),
    readConfig: vi.fn(async () => {
      // Access the outer mockConfigs - this works because we reference it through closure
      const configs = (globalThis as any).__mockConfigs__;
      if (configs && configs[ideType]) {
        // Return a deep copy to avoid mutation issues
        return JSON.parse(JSON.stringify(configs[ideType]));
      }
      return {
        type: ideType,
        name: ideType,
        displayName: ideType,
        configPath: `/mock/path/${ideType}/config.json`,
        configFormat: 'json',
        isInstalled: true,
        servers: [],
        syncStatus: 'synced'
      };
    }),
    writeConfig: vi.fn(async (config: IDEConfig) => {
      const configs = (globalThis as any).__mockConfigs__;
      if (configs) {
        configs[ideType] = JSON.parse(JSON.stringify(config));
      }
    }),
    readRawContent: vi.fn(async () => {
      const configs = (globalThis as any).__mockConfigs__;
      return JSON.stringify(configs?.[ideType] || {});
    }),
    writeRawContent: vi.fn(),
    checkInstalled: vi.fn(async () => true)
  });

  return {
    getAdapter: vi.fn((ideType: string) => createMockAdapter(ideType)),
    getAllAdapters: vi.fn(() => [
      createMockAdapter('claude-desktop'),
      createMockAdapter('cursor')
    ]),
    getAllIDETypes: vi.fn(() => ['claude-desktop', 'cursor'])
  };
});

describe('Sync Integration', () => {
  let configService: ConfigService;
  let backupService: BackupService;
  let syncResolver: SyncConflictResolver;

  const serverA: MCPServer = {
    id: 'server-a',
    name: 'Server A',
    command: 'npx',
    args: ['-y', '@anthropic/mcp-server-a'],
    env: { API_KEY: '${API_KEY}' },
    enabled: true
  };

  const serverB: MCPServer = {
    id: 'server-b',
    name: 'Server B',
    command: 'node',
    args: ['server-b.js'],
    env: {},
    enabled: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear and expose mockConfigs via globalThis for the hoisted mock to access
    clearMockConfigs();
    (globalThis as any).__mockConfigs__ = mockConfigs;

    backupService = new BackupService();
    configService = new ConfigService(backupService);
    syncResolver = new SyncConflictResolver(configService, backupService);
  });

  describe('Full sync flow', () => {
    it('should sync configs from source to target IDE', async () => {
      // Setup source config
      mockConfigs['claude-desktop'] = {
        type: 'claude-desktop',
        name: 'claude-desktop',
        displayName: 'Claude Desktop',
        configPath: '/mock/path/claude-desktop/config.json',
        configFormat: 'json',
        isInstalled: true,
        servers: [serverA, serverB],
        syncStatus: 'synced'
      };

      // Setup target config (empty)
      mockConfigs['cursor'] = {
        type: 'cursor',
        name: 'cursor',
        displayName: 'Cursor',
        configPath: '/mock/path/cursor/config.json',
        configFormat: 'json',
        isInstalled: true,
        servers: [],
        syncStatus: 'synced'
      };

      // Preview sync
      const preview = await syncResolver.previewSync('claude-desktop', 'cursor');

      expect(preview.additions).toHaveLength(2);
      expect(preview.additions.map(s => s.id)).toContain('server-a');
      expect(preview.additions.map(s => s.id)).toContain('server-b');
      expect(preview.hasConflicts).toBe(false);

      // Execute sync
      const result = await syncResolver.executeSync(
        'claude-desktop',
        'cursor',
        'overwrite'
      );

      expect(result.success).toBe(true);
      expect(result.serversAdded).toBe(2);

      // Verify target was updated
      const updatedTarget = mockConfigs['cursor'];
      expect(updatedTarget.servers).toHaveLength(2);
    });

    it('should handle conflicts during sync', async () => {
      // Setup source with modified server
      mockConfigs['claude-desktop'] = {
        type: 'claude-desktop',
        name: 'claude-desktop',
        displayName: 'Claude Desktop',
        configPath: '/mock/path/claude-desktop/config.json',
        configFormat: 'json',
        isInstalled: true,
        servers: [{ ...serverA, command: 'node', args: ['updated.js'] }],
        syncStatus: 'synced'
      };

      // Setup target with original server
      mockConfigs['cursor'] = {
        type: 'cursor',
        name: 'cursor',
        displayName: 'Cursor',
        configPath: '/mock/path/cursor/config.json',
        configFormat: 'json',
        isInstalled: true,
        servers: [serverA],
        syncStatus: 'synced'
      };

      // Preview should detect conflicts
      const preview = await syncResolver.previewSync('claude-desktop', 'cursor');

      expect(preview.hasConflicts).toBe(true);
      expect(preview.updates).toHaveLength(1);

      // Execute with overwrite strategy
      const result = await syncResolver.executeSync(
        'claude-desktop',
        'cursor',
        'overwrite'
      );

      expect(result.success).toBe(true);

      // Target should have source values
      const updatedTarget = mockConfigs['cursor'];
      expect(updatedTarget.servers[0].command).toBe('node');
    });

    it('should sync to multiple targets', async () => {
      // Setup source
      mockConfigs['claude-desktop'] = {
        type: 'claude-desktop',
        name: 'claude-desktop',
        displayName: 'Claude Desktop',
        configPath: '/mock/path/claude-desktop/config.json',
        configFormat: 'json',
        isInstalled: true,
        servers: [serverA],
        syncStatus: 'synced'
      };

      // Setup targets
      mockConfigs['cursor'] = {
        type: 'cursor',
        name: 'cursor',
        displayName: 'Cursor',
        configPath: '/mock/path/cursor/config.json',
        configFormat: 'json',
        isInstalled: true,
        servers: [],
        syncStatus: 'synced'
      };

      mockConfigs['windsurf'] = {
        type: 'windsurf',
        name: 'windsurf',
        displayName: 'Windsurf',
        configPath: '/mock/path/windsurf/config.json',
        configFormat: 'json',
        isInstalled: true,
        servers: [],
        syncStatus: 'synced'
      };

      // Sync to multiple
      const results = await syncResolver.executeSyncToMultiple(
        'claude-desktop',
        ['cursor', 'windsurf'],
        'overwrite'
      );

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('Server management flow', () => {
    it('should add, toggle, and remove servers', async () => {
      // Setup initial config
      mockConfigs['claude-desktop'] = {
        type: 'claude-desktop',
        name: 'claude-desktop',
        displayName: 'Claude Desktop',
        configPath: '/mock/path/claude-desktop/config.json',
        configFormat: 'json',
        isInstalled: true,
        servers: [],
        syncStatus: 'synced'
      };

      // Add server
      const addResult = await configService.addServer('claude-desktop', serverA);
      expect(addResult.success).toBe(true);

      let config = mockConfigs['claude-desktop'];
      expect(config.servers).toHaveLength(1);

      // Toggle server off
      const toggleResult = await configService.toggleServer(
        'claude-desktop',
        'server-a',
        false
      );
      expect(toggleResult.success).toBe(true);

      config = mockConfigs['claude-desktop'];
      expect(config.servers[0].enabled).toBe(false);

      // Remove server
      const removeResult = await configService.removeServer('claude-desktop', 'server-a');
      expect(removeResult.success).toBe(true);

      config = mockConfigs['claude-desktop'];
      expect(config.servers).toHaveLength(0);
    });

    it('should update server configuration', async () => {
      mockConfigs['claude-desktop'] = {
        type: 'claude-desktop',
        name: 'claude-desktop',
        displayName: 'Claude Desktop',
        configPath: '/mock/path/claude-desktop/config.json',
        configFormat: 'json',
        isInstalled: true,
        servers: [serverA],
        syncStatus: 'synced'
      };

      const updateResult = await configService.updateServer(
        'claude-desktop',
        'server-a',
        { command: 'python', args: ['server.py'] }
      );

      expect(updateResult.success).toBe(true);

      const config = mockConfigs['claude-desktop'];
      expect(config.servers[0].command).toBe('python');
      expect(config.servers[0].args).toEqual(['server.py']);
      expect(config.servers[0].id).toBe('server-a'); // ID preserved
    });
  });

  describe('Conflict resolution strategies', () => {
    beforeEach(() => {
      // Source has modified server A and server B
      mockConfigs['claude-desktop'] = {
        type: 'claude-desktop',
        name: 'claude-desktop',
        displayName: 'Claude Desktop',
        configPath: '/mock/path/claude-desktop/config.json',
        configFormat: 'json',
        isInstalled: true,
        servers: [
          { ...serverA, command: 'source-command' },
          serverB
        ],
        syncStatus: 'synced'
      };

      // Target has original server A and server C
      mockConfigs['cursor'] = {
        type: 'cursor',
        name: 'cursor',
        displayName: 'Cursor',
        configPath: '/mock/path/cursor/config.json',
        configFormat: 'json',
        isInstalled: true,
        servers: [
          serverA,
          { id: 'server-c', name: 'Server C', command: 'node', args: [], env: {}, enabled: true }
        ],
        syncStatus: 'synced'
      };
    });

    it('should apply overwrite strategy correctly', async () => {
      const result = await syncResolver.executeSync(
        'claude-desktop',
        'cursor',
        'overwrite'
      );

      expect(result.success).toBe(true);

      const config = mockConfigs['cursor'];
      expect(config.servers).toHaveLength(2);
      expect(config.servers.map((s: MCPServer) => s.id)).toEqual(['server-a', 'server-b']);
      // Server C should be gone (overwritten)
      expect(config.servers.find((s: MCPServer) => s.id === 'server-c')).toBeUndefined();
    });

    it('should apply keep-target strategy correctly', async () => {
      const result = await syncResolver.executeSync(
        'claude-desktop',
        'cursor',
        'keep-target'
      );

      expect(result.success).toBe(true);

      const config = mockConfigs['cursor'];
      expect(config.servers).toHaveLength(3);
      // Server A should be from target (original)
      const serverAResult = config.servers.find((s: MCPServer) => s.id === 'server-a');
      expect(serverAResult.command).toBe('npx'); // Original from target
      // Server B added from source
      expect(config.servers.find((s: MCPServer) => s.id === 'server-b')).toBeDefined();
      // Server C kept from target
      expect(config.servers.find((s: MCPServer) => s.id === 'server-c')).toBeDefined();
    });

    it('should apply merge strategy correctly', async () => {
      const result = await syncResolver.executeSync(
        'claude-desktop',
        'cursor',
        'merge'
      );

      expect(result.success).toBe(true);

      const config = mockConfigs['cursor'];
      expect(config.servers).toHaveLength(3);
      // Server A should be from source (wins conflicts)
      const serverAResult = config.servers.find((s: MCPServer) => s.id === 'server-a');
      expect(serverAResult.command).toBe('source-command');
      // Server B from source
      expect(config.servers.find((s: MCPServer) => s.id === 'server-b')).toBeDefined();
      // Server C kept from target
      expect(config.servers.find((s: MCPServer) => s.id === 'server-c')).toBeDefined();
    });
  });
});
