import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { vol } from 'memfs';

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

describe('ClaudeDesktopAdapter', () => {
  let ClaudeDesktopAdapter: typeof import('../../../src/main/adapters/ClaudeDesktopAdapter').ClaudeDesktopAdapter;

  beforeEach(async () => {
    vol.reset();
    vi.resetModules();
    process.env.APPDATA = '/mock/appdata';
    process.env.USERPROFILE = '/mock/home';

    const module = await import('../../../src/main/adapters/ClaudeDesktopAdapter');
    ClaudeDesktopAdapter = module.ClaudeDesktopAdapter;
  });

  afterEach(() => {
    vol.reset();
    vi.restoreAllMocks();
  });

  it('should have correct ideType', () => {
    const adapter = new ClaudeDesktopAdapter();
    expect(adapter.ideType).toBe('claude-desktop');
  });

  it('should have correct displayName', () => {
    const adapter = new ClaudeDesktopAdapter();
    expect(adapter.displayName).toBe('Claude Desktop');
  });

  it('should have json configFormat', () => {
    const adapter = new ClaudeDesktopAdapter();
    expect(adapter.configFormat).toBe('json');
  });

  it('should return correct config path', () => {
    const adapter = new ClaudeDesktopAdapter();
    const path = adapter.getConfigPath();
    expect(path).toContain('claude_desktop_config.json');
  });

  it('should parse config correctly', () => {
    const adapter = new ClaudeDesktopAdapter();
    const content = JSON.stringify({
      mcpServers: {
        filesystem: {
          command: 'npx',
          args: ['-y', '@anthropic/mcp-server-filesystem'],
          env: { ALLOWED_PATHS: '/home/user' }
        }
      }
    });
    const config = adapter.parseConfig(content);
    expect(config.mcpServers!.filesystem.command).toBe('npx');
  });

  it('should normalize servers correctly', () => {
    const adapter = new ClaudeDesktopAdapter();
    const rawConfig = {
      mcpServers: {
        test: { command: 'node', args: ['--flag'], disabled: false }
      }
    };
    const servers = adapter.normalizeServers(rawConfig);
    expect(servers).toHaveLength(1);
    expect(servers[0].id).toBe('test');
    expect(servers[0].enabled).toBe(true);
  });

  it('should detect if Claude Desktop is installed', async () => {
    const adapter = new ClaudeDesktopAdapter();
    const configPath = normalizePath(adapter.getConfigPath());
    const configDir = configPath.substring(0, configPath.lastIndexOf('/'));

    // Not installed initially
    expect(await adapter.checkInstalled()).toBe(false);

    // Create directory
    vol.mkdirSync(configDir, { recursive: true });
    expect(await adapter.checkInstalled()).toBe(true);
  });

  it('should read config file correctly', async () => {
    const adapter = new ClaudeDesktopAdapter();
    const configPath = normalizePath(adapter.getConfigPath());
    const configDir = configPath.substring(0, configPath.lastIndexOf('/'));

    vol.mkdirSync(configDir, { recursive: true });
    vol.writeFileSync(configPath, JSON.stringify({
      mcpServers: {
        server1: { command: 'node', args: ['app.js'] }
      }
    }));

    const config = await adapter.readConfig();
    expect(config.type).toBe('claude-desktop');
    expect(config.servers).toHaveLength(1);
    expect(config.servers[0].command).toBe('node');
  });

  it('should write config preserving structure', async () => {
    const adapter = new ClaudeDesktopAdapter();
    const configPath = normalizePath(adapter.getConfigPath());
    const configDir = configPath.substring(0, configPath.lastIndexOf('/'));

    vol.mkdirSync(configDir, { recursive: true });
    vol.writeFileSync(configPath, JSON.stringify({
      otherField: 'keep',
      mcpServers: {}
    }));

    await adapter.writeConfig({
      type: 'claude-desktop',
      name: 'claude-desktop',
      displayName: 'Claude Desktop',
      configPath,
      configFormat: 'json',
      isInstalled: true,
      servers: [{ id: 'new', name: 'new', command: 'new', args: [], enabled: true }],
      syncStatus: 'synced'
    });

    const content = vol.readFileSync(configPath, 'utf-8') as string;
    const parsed = JSON.parse(content);
    expect(parsed.otherField).toBe('keep');
    expect(parsed.mcpServers.new.command).toBe('new');
  });
});
