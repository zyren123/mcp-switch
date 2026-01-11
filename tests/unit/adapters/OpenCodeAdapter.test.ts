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

describe('OpenCodeAdapter', () => {
  let OpenCodeAdapter: typeof import('../../../src/main/adapters/OpenCodeAdapter').OpenCodeAdapter;

  beforeEach(async () => {
    vol.reset();
    vi.resetModules();
    process.env.APPDATA = '/mock/appdata';
    process.env.USERPROFILE = '/mock/home';

    const module = await import('../../../src/main/adapters/OpenCodeAdapter');
    OpenCodeAdapter = module.OpenCodeAdapter;
  });

  afterEach(() => {
    vol.reset();
    vi.restoreAllMocks();
  });

  it('should have correct ideType', () => {
    const adapter = new OpenCodeAdapter();
    expect(adapter.ideType).toBe('opencode');
  });

  it('should have correct displayName', () => {
    const adapter = new OpenCodeAdapter();
    expect(adapter.displayName).toBe('OpenCode');
  });

  it('should have jsonc configFormat', () => {
    const adapter = new OpenCodeAdapter();
    expect(adapter.configFormat).toBe('jsonc');
  });

  it('should return correct config path', () => {
    const adapter = new OpenCodeAdapter();
    const path = adapter.getConfigPath();
    expect(path).toContain('opencode');
    expect(path).toContain('opencode.json');
  });

  it('should parse JSONC with comments', () => {
    const adapter = new OpenCodeAdapter();
    const content = `{
      // This is a comment
      "mcpServers": {
        "test": {
          "command": "node"
        }
      }
    }`;
    const config = adapter.parseConfig(content);
    expect(config.mcpServers.test.command).toBe('node');
  });

  it('should parse JSONC with trailing commas', () => {
    const adapter = new OpenCodeAdapter();
    const content = `{
      "mcpServers": {
        "test": {
          "command": "node",
          "args": ["--flag",],
        },
      },
    }`;
    const config = adapter.parseConfig(content);
    expect(config.mcpServers.test.command).toBe('node');
    expect(config.mcpServers.test.args).toEqual(['--flag']);
  });

  it('should handle {env:VAR} syntax in config', () => {
    const adapter = new OpenCodeAdapter();
    const content = JSON.stringify({
      mcpServers: {
        test: {
          command: 'node',
          env: { SECRET: '{env:MY_SECRET}' }
        }
      }
    });
    const config = adapter.parseConfig(content);
    expect(config.mcpServers.test.env.SECRET).toBe('{env:MY_SECRET}');
  });
});
