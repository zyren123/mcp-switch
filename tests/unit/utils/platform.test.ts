import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as os from 'os';

// Mock os.homedir before importing the module
vi.mock('os', async () => {
  const actual = await vi.importActual('os');
  return {
    ...actual,
    homedir: vi.fn(() => '/mock/home')
  };
});

describe('platform.ts', () => {
  let platform: typeof import('../../../src/main/utils/platform');
  const originalPlatform = process.platform;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    vi.resetModules();
    process.env.APPDATA = 'C:\\mock\\appdata';
    process.env.USERPROFILE = 'C:\\mock\\users\\test';
    platform = await import('../../../src/main/utils/platform');
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('getCurrentPlatform', () => {
    it('should return darwin for macOS', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      expect(platform.getCurrentPlatform()).toBe('darwin');
    });

    it('should return win32 for Windows', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      expect(platform.getCurrentPlatform()).toBe('win32');
    });

    it('should return linux for Linux', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      expect(platform.getCurrentPlatform()).toBe('linux');
    });

    it('should default to linux for unknown platforms', () => {
      Object.defineProperty(process, 'platform', { value: 'freebsd' });
      expect(platform.getCurrentPlatform()).toBe('linux');
    });
  });

  describe('getConfigPath', () => {
    it('should return correct path for Claude Desktop on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      vi.resetModules();
      const platformModule = await import('../../../src/main/utils/platform');
      const path = platformModule.getConfigPath('claude-desktop');
      expect(path).toContain('Claude');
      expect(path).toContain('claude_desktop_config.json');
    });

    it('should return correct path for Claude Code on macOS', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      vi.resetModules();
      const platformModule = await import('../../../src/main/utils/platform');
      const path = platformModule.getConfigPath('claude-code');
      expect(path).toContain('.claude.json');
    });

    it('should return correct path for Codex on Linux', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      vi.resetModules();
      const platformModule = await import('../../../src/main/utils/platform');
      const path = platformModule.getConfigPath('codex');
      expect(path).toContain('.codex');
      expect(path).toContain('config.toml');
    });

    it('should return empty string for unknown IDE type', () => {
      const path = platform.getConfigPath('unknown-ide');
      expect(path).toBe('');
    });

    it('should handle missing environment variables gracefully', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      delete process.env.APPDATA;
      vi.resetModules();
      const platformModule = await import('../../../src/main/utils/platform');
      // Should not throw
      const path = platformModule.getConfigPath('claude-desktop');
      expect(typeof path).toBe('string');
    });
  });

  describe('getClaudeCodeConfigPath', () => {
    it('should return same path as getConfigPath for claude-code', () => {
      const directPath = platform.getConfigPath('claude-code');
      const helperPath = platform.getClaudeCodeConfigPath();
      expect(helperPath).toBe(directPath);
    });
  });

  describe('getBackupDir', () => {
    it('should return path in home directory', () => {
      const backupDir = platform.getBackupDir();
      expect(backupDir).toContain('.mcp-switch');
      expect(backupDir).toContain('backup');
    });
  });

  describe('getSupportedIDETypes', () => {
    it('should return all 6 supported IDE types', () => {
      const types = platform.getSupportedIDETypes();
      expect(types).toHaveLength(6);
      expect(types).toContain('claude-desktop');
      expect(types).toContain('claude-code');
      expect(types).toContain('cursor');
      expect(types).toContain('windsurf');
      expect(types).toContain('codex');
      expect(types).toContain('opencode');
    });
  });

  describe('getIDEDisplayName', () => {
    it('should return display name for known IDE', () => {
      expect(platform.getIDEDisplayName('claude-desktop')).toBe('Claude Desktop');
      expect(platform.getIDEDisplayName('claude-code')).toBe('Claude Code CLI');
      expect(platform.getIDEDisplayName('cursor')).toBe('Cursor IDE');
    });

    it('should return IDE type as fallback for unknown IDE', () => {
      expect(platform.getIDEDisplayName('unknown')).toBe('unknown');
    });
  });

  describe('getConfigFormat', () => {
    it('should return toml for codex', () => {
      expect(platform.getConfigFormat('codex')).toBe('toml');
    });

    it('should return jsonc for opencode', () => {
      expect(platform.getConfigFormat('opencode')).toBe('jsonc');
    });

    it('should return json for other IDEs', () => {
      expect(platform.getConfigFormat('claude-desktop')).toBe('json');
      expect(platform.getConfigFormat('claude-code')).toBe('json');
      expect(platform.getConfigFormat('cursor')).toBe('json');
      expect(platform.getConfigFormat('windsurf')).toBe('json');
    });
  });
});
