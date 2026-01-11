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

describe('CodexAdapter', () => {
  let CodexAdapter: typeof import('../../../src/main/adapters/CodexAdapter').CodexAdapter;

  beforeEach(async () => {
    vol.reset();
    vi.resetModules();
    process.env.APPDATA = '/mock/appdata';
    process.env.USERPROFILE = '/mock/home';

    const module = await import('../../../src/main/adapters/CodexAdapter');
    CodexAdapter = module.CodexAdapter;
  });

  afterEach(() => {
    vol.reset();
    vi.restoreAllMocks();
  });

  it('should have correct ideType', () => {
    const adapter = new CodexAdapter();
    expect(adapter.ideType).toBe('codex');
  });

  it('should have correct displayName', () => {
    const adapter = new CodexAdapter();
    expect(adapter.displayName).toBe('Codex CLI');
  });

  it('should have toml configFormat', () => {
    const adapter = new CodexAdapter();
    expect(adapter.configFormat).toBe('toml');
  });

  it('should return correct config path', () => {
    const adapter = new CodexAdapter();
    const path = adapter.getConfigPath();
    expect(path).toContain('.codex');
    expect(path).toContain('config.toml');
  });

  it('should parse TOML config correctly', () => {
    const adapter = new CodexAdapter();
    const content = `
[mcpServers.filesystem]
command = "npx"
args = ["-y", "@anthropic/mcp-server-filesystem"]

[mcpServers.filesystem.env]
ALLOWED_PATHS = "/home/user/projects"
`;
    const config = adapter.parseConfig(content);
    expect(config.mcpServers!.filesystem.command).toBe('npx');
    expect(config.mcpServers!.filesystem.args).toEqual(['-y', '@anthropic/mcp-server-filesystem']);
    expect(config.mcpServers!.filesystem.env!.ALLOWED_PATHS).toBe('/home/user/projects');
  });

  it('should normalize TOML servers correctly', () => {
    const adapter = new CodexAdapter();
    const rawConfig = {
      mcpServers: {
        test: {
          command: 'node',
          args: ['index.js'],
          env: { KEY: 'value' }
        }
      }
    };
    const servers = adapter.normalizeServers(rawConfig);
    expect(servers).toHaveLength(1);
    expect(servers[0].id).toBe('test');
    expect(servers[0].command).toBe('node');
    expect(servers[0].env).toEqual({ KEY: 'value' });
  });

  it('should denormalize servers to TOML format', () => {
    const adapter = new CodexAdapter();
    const servers = [
      {
        id: 'test',
        name: 'test',
        command: 'node',
        args: ['app.js'],
        env: { API_KEY: 'secret' },
        enabled: true
      }
    ];
    const raw = adapter.denormalizeServers(servers);
    expect(raw.test.command).toBe('node');
    expect(raw.test.args).toEqual(['app.js']);
    expect(raw.test.env).toEqual({ API_KEY: 'secret' });
  });

  it('should format config to TOML', () => {
    const adapter = new CodexAdapter();
    const config = {
      mcpServers: {
        test: { command: 'node' }
      }
    };
    const result = adapter.formatConfig(config);
    expect(result).toContain('[mcpServers.test]');
    expect(result).toContain('command = "node"');
  });

  it('should handle disabled servers in TOML', () => {
    const adapter = new CodexAdapter();
    const rawConfig = {
      mcpServers: {
        disabled: { command: 'node', disabled: true }
      }
    };
    const servers = adapter.normalizeServers(rawConfig);
    expect(servers[0].enabled).toBe(false);
  });
});
