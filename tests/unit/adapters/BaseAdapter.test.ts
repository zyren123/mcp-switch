import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { vol } from 'memfs';
import { IDEType } from '../../../src/shared/types';

// Mock fs module
vi.mock('fs', async () => {
  const memfs = await import('memfs');
  return memfs.fs;
});

vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

// Mock os.homedir
vi.mock('os', async () => {
  const actual = await vi.importActual('os');
  return {
    ...actual,
    homedir: vi.fn(() => '/mock/home')
  };
});

// Helper to normalize paths for memfs (always use forward slashes)
const normalizePath = (p: string) => p.replace(/\\/g, '/');

describe('BaseAdapter', () => {
  let BaseAdapter: typeof import('../../../src/main/adapters/BaseAdapter').BaseAdapter;
  let TestAdapter: new () => InstanceType<typeof BaseAdapter>;

  beforeEach(async () => {
    vol.reset();
    vi.resetModules();

    // Setup mock environment
    process.env.APPDATA = '/mock/appdata';
    process.env.USERPROFILE = '/mock/home';

    const module = await import('../../../src/main/adapters/BaseAdapter');
    BaseAdapter = module.BaseAdapter;

    // Create a concrete implementation for testing after BaseAdapter is imported
    TestAdapter = class extends BaseAdapter {
      readonly ideType: IDEType = 'claude-desktop';
    };
  });

  afterEach(() => {
    vol.reset();
    vi.restoreAllMocks();
  });

  describe('displayName', () => {
    it('should return display name from platform utils', () => {
      const adapter = new TestAdapter();
      expect(adapter.displayName).toBe('Claude Desktop');
    });
  });

  describe('configFormat', () => {
    it('should return config format from platform utils', () => {
      const adapter = new TestAdapter();
      expect(adapter.configFormat).toBe('json');
    });
  });

  describe('getConfigPath', () => {
    it('should return config path from platform utils', () => {
      const adapter = new TestAdapter();
      const path = adapter.getConfigPath();
      expect(typeof path).toBe('string');
      expect(path.length).toBeGreaterThan(0);
    });
  });

  describe('parseConfig', () => {
    it('should parse JSON config', () => {
      const adapter = new TestAdapter();
      const content = '{"mcpServers": {"test": {"command": "node"}}}';
      const result = adapter.parseConfig(content);
      expect(result.mcpServers.test.command).toBe('node');
    });

    it('should throw on invalid JSON', () => {
      const adapter = new TestAdapter();
      expect(() => adapter.parseConfig('{invalid}')).toThrow();
    });
  });

  describe('formatConfig', () => {
    it('should format config to JSON', () => {
      const adapter = new TestAdapter();
      const config = { mcpServers: { test: { command: 'node' } } };
      const result = adapter.formatConfig(config);
      expect(JSON.parse(result)).toEqual(config);
    });
  });

  describe('normalizeServers', () => {
    it('should normalize servers from raw config', () => {
      const adapter = new TestAdapter();
      const rawConfig = {
        mcpServers: {
          'server-a': { command: 'npx', args: ['-y', 'server-a'] },
          'server-b': { command: 'node', disabled: true }
        }
      };
      const servers = adapter.normalizeServers(rawConfig);

      expect(servers).toHaveLength(2);
      expect(servers[0].id).toBe('server-a');
      expect(servers[0].command).toBe('npx');
      expect(servers[0].args).toEqual(['-y', 'server-a']);
      expect(servers[0].enabled).toBe(true);
      expect(servers[1].id).toBe('server-b');
      expect(servers[1].enabled).toBe(false);
    });

    it('should handle empty mcpServers', () => {
      const adapter = new TestAdapter();
      const servers = adapter.normalizeServers({});
      expect(servers).toHaveLength(0);
    });

    it('should handle env field', () => {
      const adapter = new TestAdapter();
      const rawConfig = {
        mcpServers: {
          test: { command: 'node', env: { KEY: 'value' } }
        }
      };
      const servers = adapter.normalizeServers(rawConfig);
      expect(servers[0].env).toEqual({ KEY: 'value' });
    });
  });

  describe('denormalizeServers', () => {
    it('should convert servers back to raw format', () => {
      const adapter = new TestAdapter();
      const servers = [
        { id: 'test', name: 'test', command: 'node', args: ['--flag'], enabled: true },
        { id: 'disabled', name: 'disabled', command: 'npm', args: [], enabled: false }
      ];
      const raw = adapter.denormalizeServers(servers);

      expect(raw.test.command).toBe('node');
      expect(raw.test.args).toEqual(['--flag']);
      expect(raw.test.disabled).toBeUndefined();
      expect(raw.disabled.disabled).toBe(true);
    });

    it('should omit empty args array', () => {
      const adapter = new TestAdapter();
      const servers = [{ id: 'test', name: 'test', command: 'node', args: [], enabled: true }];
      const raw = adapter.denormalizeServers(servers);
      expect(raw.test.args).toBeUndefined();
    });

    it('should omit empty env object', () => {
      const adapter = new TestAdapter();
      const servers = [{ id: 'test', name: 'test', command: 'node', args: [], env: {}, enabled: true }];
      const raw = adapter.denormalizeServers(servers);
      expect(raw.test.env).toBeUndefined();
    });
  });

  describe('checkInstalled', () => {
    it('should return true if config directory exists', async () => {
      const adapter = new TestAdapter();
      const configPath = normalizePath(adapter.getConfigPath());
      const configDir = configPath.substring(0, configPath.lastIndexOf('/'));

      vol.mkdirSync(configDir, { recursive: true });

      const result = await adapter.checkInstalled();
      expect(result).toBe(true);
    });

    it('should return false if config directory does not exist', async () => {
      const adapter = new TestAdapter();
      const result = await adapter.checkInstalled();
      expect(result).toBe(false);
    });
  });

  describe('configExists', () => {
    it('should return true if config file exists', async () => {
      const adapter = new TestAdapter();
      const configPath = normalizePath(adapter.getConfigPath());
      const configDir = configPath.substring(0, configPath.lastIndexOf('/'));

      vol.mkdirSync(configDir, { recursive: true });
      vol.writeFileSync(configPath, '{}');

      const result = await adapter.configExists();
      expect(result).toBe(true);
    });

    it('should return false if config file does not exist', async () => {
      const adapter = new TestAdapter();
      const result = await adapter.configExists();
      expect(result).toBe(false);
    });
  });

  describe('readConfig', () => {
    it('should read and parse config file', async () => {
      const adapter = new TestAdapter();
      const configPath = normalizePath(adapter.getConfigPath());
      const configDir = configPath.substring(0, configPath.lastIndexOf('/'));

      vol.mkdirSync(configDir, { recursive: true });
      vol.writeFileSync(configPath, JSON.stringify({
        mcpServers: {
          test: { command: 'node', args: ['index.js'] }
        }
      }));

      const config = await adapter.readConfig();

      expect(config.type).toBe('claude-desktop');
      expect(config.servers).toHaveLength(1);
      expect(config.servers[0].command).toBe('node');
    });

    it('should return empty config if file does not exist', async () => {
      const adapter = new TestAdapter();
      const configPath = normalizePath(adapter.getConfigPath());
      const configDir = configPath.substring(0, configPath.lastIndexOf('/'));

      vol.mkdirSync(configDir, { recursive: true });

      const config = await adapter.readConfig();

      expect(config.servers).toHaveLength(0);
      expect(config.syncStatus).toBe('unknown');
    });
  });

  describe('writeConfig', () => {
    it('should write config to file', async () => {
      const adapter = new TestAdapter();
      const configPath = normalizePath(adapter.getConfigPath());

      const config = {
        type: 'claude-desktop' as IDEType,
        name: 'claude-desktop',
        displayName: 'Claude Desktop',
        configPath,
        configFormat: 'json' as const,
        isInstalled: true,
        servers: [
          { id: 'test', name: 'test', command: 'node', args: ['index.js'], enabled: true }
        ],
        syncStatus: 'synced' as const
      };

      await adapter.writeConfig(config);

      const content = vol.readFileSync(configPath, 'utf-8') as string;
      const parsed = JSON.parse(content);
      expect(parsed.mcpServers.test.command).toBe('node');
    });

    it('should preserve non-MCP fields when updating', async () => {
      const adapter = new TestAdapter();
      const configPath = normalizePath(adapter.getConfigPath());
      const configDir = configPath.substring(0, configPath.lastIndexOf('/'));

      vol.mkdirSync(configDir, { recursive: true });
      vol.writeFileSync(configPath, JSON.stringify({
        otherField: 'preserved',
        mcpServers: { old: { command: 'old' } }
      }));

      const config = {
        type: 'claude-desktop' as IDEType,
        name: 'claude-desktop',
        displayName: 'Claude Desktop',
        configPath,
        configFormat: 'json' as const,
        isInstalled: true,
        servers: [
          { id: 'new', name: 'new', command: 'new', args: [], enabled: true }
        ],
        syncStatus: 'synced' as const
      };

      await adapter.writeConfig(config);

      const content = vol.readFileSync(configPath, 'utf-8') as string;
      const parsed = JSON.parse(content);
      expect(parsed.otherField).toBe('preserved');
      expect(parsed.mcpServers.new).toBeDefined();
    });
  });

  describe('readRawContent', () => {
    it('should read raw file content', async () => {
      const adapter = new TestAdapter();
      const configPath = normalizePath(adapter.getConfigPath());
      const configDir = configPath.substring(0, configPath.lastIndexOf('/'));

      vol.mkdirSync(configDir, { recursive: true });
      vol.writeFileSync(configPath, 'raw content');

      const content = await adapter.readRawContent();
      expect(content).toBe('raw content');
    });

    it('should return empty string if file does not exist', async () => {
      const adapter = new TestAdapter();
      const content = await adapter.readRawContent();
      expect(content).toBe('');
    });
  });

  describe('writeRawContent', () => {
    it('should write raw content to file', async () => {
      const adapter = new TestAdapter();
      const configPath = normalizePath(adapter.getConfigPath());

      await adapter.writeRawContent('raw content');

      const content = vol.readFileSync(configPath, 'utf-8');
      expect(content).toBe('raw content');
    });
  });
});
