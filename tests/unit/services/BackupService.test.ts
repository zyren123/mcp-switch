import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BackupService } from '../../../src/main/services/BackupService';
import { IDEType } from '../../../src/shared/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock fs module
vi.mock('fs', () => {
  const mockFs = {
    promises: {
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue('{"mcpServers": {}}'),
      readdir: vi.fn().mockResolvedValue([]),
      stat: vi.fn().mockResolvedValue({ size: 100 }),
      access: vi.fn().mockResolvedValue(undefined),
      unlink: vi.fn().mockResolvedValue(undefined)
    },
    constants: {
      F_OK: 0
    }
  };
  return mockFs;
});

// Mock os module
vi.mock('os', () => ({
  homedir: vi.fn(() => '/mock/home')
}));

describe('BackupService', () => {
  let backupService: BackupService;
  const mockFs = fs as any;

  beforeEach(() => {
    vi.clearAllMocks();
    backupService = new BackupService();
  });

  describe('createBackup', () => {
    it('should create a backup file with correct naming', async () => {
      const ideType: IDEType = 'claude-desktop';
      const content = '{"mcpServers": {"test": {}}}';

      const result = await backupService.createBackup(ideType, content);

      expect(result.ideType).toBe(ideType);
      expect(result.id).toMatch(/^claude-desktop_\d+\.backup$/);
      expect(result.size).toBe(Buffer.byteLength(content, 'utf-8'));
      expect(mockFs.promises.mkdir).toHaveBeenCalled();
      expect(mockFs.promises.writeFile).toHaveBeenCalled();
    });

    it('should create backup directory if not exists', async () => {
      await backupService.createBackup('claude-desktop', '{}');

      expect(mockFs.promises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('.mcp-switch'),
        { recursive: true }
      );
    });

    it('should sanitize IDE type in filename', async () => {
      const result = await backupService.createBackup('claude-desktop', '{}');

      // claude-desktop should be sanitized (hyphen is allowed)
      expect(result.id).toContain('claude-desktop');
    });
  });

  describe('restoreBackup', () => {
    it('should restore backup content', async () => {
      const backupId = 'claude-desktop_1234567890.backup';
      const mockContent = '{"mcpServers": {"restored": {}}}';
      mockFs.promises.readFile.mockResolvedValueOnce(mockContent);
      mockFs.promises.stat.mockResolvedValueOnce({ size: mockContent.length });

      const result = await backupService.restoreBackup(backupId);

      expect(result.content).toBe(mockContent);
      expect(result.info.id).toBe(backupId);
    });

    it('should throw if backup does not exist', async () => {
      mockFs.promises.access.mockRejectedValueOnce(new Error('ENOENT'));

      await expect(backupService.restoreBackup('nonexistent.backup')).rejects.toThrow();
    });
  });

  describe('listBackups', () => {
    it('should list all backups', async () => {
      mockFs.promises.readdir.mockResolvedValueOnce([
        'claude-desktop_1000.backup',
        'cursor_2000.backup',
        'claude-desktop_3000.backup'
      ]);

      const backups = await backupService.listBackups();

      expect(backups).toHaveLength(3);
    });

    it('should filter backups by IDE type', async () => {
      mockFs.promises.readdir.mockResolvedValueOnce([
        'claude-desktop_1000.backup',
        'cursor_2000.backup',
        'claude-desktop_3000.backup'
      ]);

      const backups = await backupService.listBackups('claude-desktop');

      expect(backups).toHaveLength(2);
      expect(backups.every(b => b.ideType === 'claude-desktop')).toBe(true);
    });

    it('should sort backups by timestamp (newest first)', async () => {
      mockFs.promises.readdir.mockResolvedValueOnce([
        'claude-desktop_1000.backup',
        'claude-desktop_3000.backup',
        'claude-desktop_2000.backup'
      ]);

      const backups = await backupService.listBackups('claude-desktop');

      expect(backups[0].timestamp).toBe(3000);
      expect(backups[1].timestamp).toBe(2000);
      expect(backups[2].timestamp).toBe(1000);
    });

    it('should return empty array if backup directory does not exist', async () => {
      const error = new Error('ENOENT') as any;
      error.code = 'ENOENT';
      mockFs.promises.readdir.mockRejectedValueOnce(error);

      const backups = await backupService.listBackups();

      expect(backups).toEqual([]);
    });

    it('should skip files that are not backup files', async () => {
      mockFs.promises.readdir.mockResolvedValueOnce([
        'claude-desktop_1000.backup',
        'some-other-file.txt',
        'readme.md'
      ]);

      const backups = await backupService.listBackups();

      expect(backups).toHaveLength(1);
    });

    it('should handle IDE types with hyphens correctly', async () => {
      mockFs.promises.readdir.mockResolvedValueOnce([
        'claude-desktop_1000.backup',
        'claude-code_2000.backup'
      ]);

      const backups = await backupService.listBackups('claude-desktop');

      expect(backups).toHaveLength(1);
      expect(backups[0].ideType).toBe('claude-desktop');
    });
  });

  describe('deleteBackup', () => {
    it('should delete a backup file', async () => {
      const backupId = 'claude-desktop_1000.backup';

      await backupService.deleteBackup(backupId);

      expect(mockFs.promises.unlink).toHaveBeenCalledWith(
        expect.stringContaining(backupId)
      );
    });
  });

  describe('deleteBackupsByType', () => {
    it('should delete all backups for an IDE type', async () => {
      mockFs.promises.readdir.mockResolvedValueOnce([
        'claude-desktop_1000.backup',
        'claude-desktop_2000.backup'
      ]);

      const deleted = await backupService.deleteBackupsByType('claude-desktop');

      expect(deleted).toBe(2);
      expect(mockFs.promises.unlink).toHaveBeenCalledTimes(2);
    });
  });

  describe('backupExists', () => {
    it('should return true if backup exists', async () => {
      const exists = await backupService.backupExists('claude-desktop_1000.backup');

      expect(exists).toBe(true);
    });

    it('should return false if backup does not exist', async () => {
      mockFs.promises.access.mockRejectedValueOnce(new Error('ENOENT'));

      const exists = await backupService.backupExists('nonexistent.backup');

      expect(exists).toBe(false);
    });
  });

  describe('getBackupSize', () => {
    it('should calculate total backup size', async () => {
      mockFs.promises.readdir.mockResolvedValueOnce([
        'claude-desktop_1000.backup',
        'claude-desktop_2000.backup'
      ]);
      mockFs.promises.stat
        .mockResolvedValueOnce({ size: 100 })
        .mockResolvedValueOnce({ size: 200 });

      const size = await backupService.getBackupSize('claude-desktop');

      expect(size).toBe(300);
    });
  });

  describe('getBackupStats', () => {
    it('should return backup statistics', async () => {
      mockFs.promises.readdir.mockResolvedValueOnce([
        'claude-desktop_1000.backup',
        'cursor_2000.backup',
        'claude-desktop_3000.backup'
      ]);

      const stats = await backupService.getBackupStats();

      expect(stats.totalBackups).toBe(3);
      expect(stats.backupsByType['claude-desktop']).toBe(2);
      expect(stats.backupsByType['cursor']).toBe(1);
    });
  });

  describe('setMaxBackups', () => {
    it('should set maximum number of backups', () => {
      backupService.setMaxBackups(5);

      expect(backupService.getMaxBackups()).toBe(5);
    });

    it('should ensure minimum of 1 backup', () => {
      backupService.setMaxBackups(0);

      expect(backupService.getMaxBackups()).toBe(1);
    });
  });

  describe('getBackupDirectory', () => {
    it('should return backup directory path', () => {
      const dir = backupService.getBackupDirectory();

      expect(dir).toContain('.mcp-switch');
      expect(dir).toContain('backup');
    });
  });
});
