import { beforeAll, afterAll, vi } from 'vitest';

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => `/mock/path/${name}`),
    getName: vi.fn(() => 'MCP Switch'),
    getVersion: vi.fn(() => '1.0.0')
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn()
  }
}));

// Store original env
const originalEnv = { ...process.env };

// Setup test environment variables
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.HOME = '/mock/home';
  process.env.USERPROFILE = 'C:\\mock\\users\\test';
  process.env.APPDATA = 'C:\\mock\\appdata';
});

afterAll(() => {
  // Restore original env
  process.env = originalEnv;
  vi.restoreAllMocks();
});
