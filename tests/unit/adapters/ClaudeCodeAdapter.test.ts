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

describe('ClaudeCodeAdapter', () => {
  let ClaudeCodeAdapter: typeof import('../../../src/main/adapters/ClaudeCodeAdapter').ClaudeCodeAdapter;

  beforeEach(async () => {
    vol.reset();
    vi.resetModules();
    process.env.APPDATA = '/mock/appdata';
    process.env.USERPROFILE = '/mock/home';

    const module = await import('../../../src/main/adapters/ClaudeCodeAdapter');
    ClaudeCodeAdapter = module.ClaudeCodeAdapter;
  });

  afterEach(() => {
    vol.reset();
    vi.restoreAllMocks();
  });

  it('should have correct ideType', () => {
    const adapter = new ClaudeCodeAdapter();
    expect(adapter.ideType).toBe('claude-code');
  });

  it('should have correct displayName', () => {
    const adapter = new ClaudeCodeAdapter();
    expect(adapter.displayName).toBe('Claude Code CLI');
  });

  it('should have json configFormat', () => {
    const adapter = new ClaudeCodeAdapter();
    expect(adapter.configFormat).toBe('json');
  });

  it('should return correct config path (.claude.json)', () => {
    const adapter = new ClaudeCodeAdapter();
    const path = adapter.getConfigPath();
    expect(path).toContain('.claude.json');
  });

  it('should handle ${VAR} environment variable syntax in config', () => {
    const adapter = new ClaudeCodeAdapter();
    const content = JSON.stringify({
      mcpServers: {
        github: {
          command: 'npx',
          args: ['-y', '@anthropic/mcp-server-github'],
          env: { GITHUB_TOKEN: '${GITHUB_TOKEN}' }
        }
      }
    });
    const config = adapter.parseConfig(content);
    // Should preserve env var syntax
    expect(config.mcpServers!.github.env!.GITHUB_TOKEN).toBe('${GITHUB_TOKEN}');
  });

  it('should handle ${VAR:-default} syntax in config', () => {
    const adapter = new ClaudeCodeAdapter();
    const content = JSON.stringify({
      mcpServers: {
        test: {
          command: 'node',
          env: { API_KEY: '${API_KEY:-default_key}' }
        }
      }
    });
    const config = adapter.parseConfig(content);
    expect(config.mcpServers!.test.env!.API_KEY).toBe('${API_KEY:-default_key}');
  });
});
