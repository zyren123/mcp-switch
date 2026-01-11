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

describe('CursorAdapter', () => {
  let CursorAdapter: typeof import('../../../src/main/adapters/CursorAdapter').CursorAdapter;

  beforeEach(async () => {
    vol.reset();
    vi.resetModules();
    process.env.APPDATA = '/mock/appdata';
    process.env.USERPROFILE = '/mock/home';

    const module = await import('../../../src/main/adapters/CursorAdapter');
    CursorAdapter = module.CursorAdapter;
  });

  afterEach(() => {
    vol.reset();
    vi.restoreAllMocks();
  });

  it('should have correct ideType', () => {
    const adapter = new CursorAdapter();
    expect(adapter.ideType).toBe('cursor');
  });

  it('should have correct displayName', () => {
    const adapter = new CursorAdapter();
    expect(adapter.displayName).toBe('Cursor IDE');
  });

  it('should have json configFormat', () => {
    const adapter = new CursorAdapter();
    expect(adapter.configFormat).toBe('json');
  });

  it('should return correct config path', () => {
    const adapter = new CursorAdapter();
    const path = adapter.getConfigPath();
    expect(path.toLowerCase()).toContain('cursor');
    expect(path).toContain('mcp.json');
  });
});
