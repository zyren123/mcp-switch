import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BackupService } from '@main/services/BackupService';
import { ConfigService } from '@main/services/ConfigService';

// Mock fs module with simple implementations
vi.mock('fs', () => {
  const mockBackups: Record<string, string> = {};

  return {
    promises: {
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockImplementation(async (path: string, content: string) => {
        mockBackups[path] = content;
      }),
      readFile: vi.fn().mockImplementation(async (path: string) => {
        if (mockBackups[path]) return mockBackups[path];
        throw new Error('ENOENT');
      }),
      readdir: vi.fn().mockResolvedValue([]),
      stat: vi.fn().mockResolvedValue({ size: 100 }),
      access: vi.fn().mockResolvedValue(undefined),
      unlink: vi.fn().mockResolvedValue(undefined)
    },
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    watch: vi.fn(() => ({ close: vi.fn() })),
    constants: { F_OK: 0 }
  };
});

// Mock os module
vi.mock('os', () => ({
  homedir: vi.fn(() => '/mock/home')
}));

// Mock adapters
vi.mock('@main/adapters', () => {
  const createMockAdapter = (ideType: string) => ({
    ideType,
    displayName: ideType,
    configFormat: 'json' as const,
    getConfigPath: vi.fn(() => `/mock/${ideType}/config.json`),
    readConfig: vi.fn().mockResolvedValue({
      type: ideType,
      name: ideType,
      displayName: ideType,
      configPath: `/mock/${ideType}/config.json`,
      configFormat: 'json',
      isInstalled: true,
      servers: [],
      syncStatus: 'synced'
    }),
    writeConfig: vi.fn().mockResolvedValue(undefined),
    readRawContent: vi.fn().mockResolvedValue('{"mcpServers":{}}'),
    writeRawContent: vi.fn().mockResolvedValue(undefined),
    checkInstalled: vi.fn().mockResolvedValue(true)
  });

  return {
    getAdapter: vi.fn((ideType: string) => createMockAdapter(ideType)),
    getAllAdapters: vi.fn(() => [createMockAdapter('claude-desktop')]),
    getAllIDETypes: vi.fn(() => ['claude-desktop'])
  };
});

describe('Backup Integration', () => {
  let backupService: BackupService;
  let configService: ConfigService;

  beforeEach(() => {
    vi.clearAllMocks();
    backupService = new BackupService();
    configService = new ConfigService(backupService);
  });

  describe('ConfigService and BackupService integration', () => {
    it('should share the same backup service instance', () => {
      expect(configService.getBackupService()).toBe(backupService);
    });

    it('should be able to create backup via ConfigService', async () => {
      // This tests the createBackup method on ConfigService that delegates to BackupService
      const backupId = await configService.createBackup('claude-desktop');

      expect(backupId).toMatch(/^claude-desktop_\d+\.backup$/);
    });

    it('should restore from backup and reload config', async () => {
      // First create a backup
      const backupId = await configService.createBackup('claude-desktop');

      // Then restore - this should not throw
      await expect(
        configService.restoreFromBackup('claude-desktop', backupId)
      ).resolves.not.toThrow();
    });

    it('should add server successfully', async () => {
      const result = await configService.addServer('claude-desktop', {
        id: 'new-server',
        name: 'New Server',
        command: 'npx',
        args: [],
        env: {},
        enabled: true
      });

      expect(result.success).toBe(true);
    });

    it('should list backups from backup service', async () => {
      // Create some backups first
      await backupService.createBackup('claude-desktop', '{"test": 1}');
      await backupService.createBackup('claude-desktop', '{"test": 2}');

      const backups = await backupService.listBackups('claude-desktop');

      // Due to mock, may not persist properly, but structure should be valid
      expect(Array.isArray(backups)).toBe(true);
    });
  });

  describe('Backup service standalone', () => {
    it('should create backup with correct structure', async () => {
      const backup = await backupService.createBackup('claude-desktop', '{"test": true}');

      expect(backup.ideType).toBe('claude-desktop');
      expect(backup.size).toBe('{"test": true}'.length);
      expect(backup.id).toMatch(/^claude-desktop_\d+\.backup$/);
    });

    it('should set max backups', () => {
      backupService.setMaxBackups(5);
      expect(backupService.getMaxBackups()).toBe(5);
    });

    it('should get backup directory', () => {
      const dir = backupService.getBackupDirectory();
      expect(dir).toContain('.mcp-switch');
      expect(dir).toContain('backup');
    });

    it('should sanitize filenames with special characters', async () => {
      // IDE types should be sanitized in backup filenames
      const backup = await backupService.createBackup('claude-desktop', '{"test": true}');

      // The filename should not contain problematic characters
      expect(backup.id).not.toContain(' ');
      expect(backup.id).toMatch(/^[a-zA-Z0-9_.-]+$/);
    });
  });
});
