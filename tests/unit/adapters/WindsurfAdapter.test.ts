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

describe('WindsurfAdapter', () => {
  let WindsurfAdapter: typeof import('../../../src/main/adapters/WindsurfAdapter').WindsurfAdapter;

  beforeEach(async () => {
    vol.reset();
    vi.resetModules();
    process.env.APPDATA = '/mock/appdata';
    process.env.USERPROFILE = '/mock/home';

    const module = await import('../../../src/main/adapters/WindsurfAdapter');
    WindsurfAdapter = module.WindsurfAdapter;
  });

  afterEach(() => {
    vol.reset();
    vi.restoreAllMocks();
  });

  it('should have correct ideType', () => {
    const adapter = new WindsurfAdapter();
    expect(adapter.ideType).toBe('windsurf');
  });

  it('should have correct displayName', () => {
    const adapter = new WindsurfAdapter();
    expect(adapter.displayName).toBe('Windsurf IDE');
  });

  it('should have json configFormat', () => {
    const adapter = new WindsurfAdapter();
    expect(adapter.configFormat).toBe('json');
  });

  it('should return correct config path', () => {
    const adapter = new WindsurfAdapter();
    const path = adapter.getConfigPath();
    expect(path).toContain('mcp_config.json');
  });

  it('should handle ${env:VAR} syntax in config', () => {
    const adapter = new WindsurfAdapter();
    const content = JSON.stringify({
      mcpServers: {
        test: {
          command: 'node',
          env: { TOKEN: '${env:MY_TOKEN}' }
        }
      }
    });
    const config = adapter.parseConfig(content);
    expect(config.mcpServers!.test.env!.TOKEN).toBe('${env:MY_TOKEN}');
  });
});
