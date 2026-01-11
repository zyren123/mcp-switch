import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { IDEType, BackupInfo } from '../../shared/types';

/**
 * Backup service for creating, listing, and restoring configuration backups
 */
export class BackupService {
  private backupDir: string;
  private maxBackups: number = 10;

  constructor() {
    this.backupDir = path.join(os.homedir(), '.mcp-switch', 'backup');
  }

  /**
   * Create a backup for an IDE configuration
   */
  async createBackup(ideType: IDEType, content: string): Promise<BackupInfo> {
    // Ensure backup directory exists
    await fs.promises.mkdir(this.backupDir, { recursive: true });

    const timestamp = Date.now();
    const filename = `${this.sanitizeFilename(ideType)}_${timestamp}.backup`;
    const filepath = path.join(this.backupDir, filename);

    await fs.promises.writeFile(filepath, content, 'utf-8');

    const info: BackupInfo = {
      id: filename,
      ideType,
      timestamp,
      path: filepath,
      size: Buffer.byteLength(content, 'utf-8')
    };

    // Cleanup old backups
    await this.cleanupOldBackups(ideType);

    return info;
  }

  /**
   * Restore a backup by ID
   */
  async restoreBackup(backupId: string): Promise<{ content: string; info: BackupInfo }> {
    const filepath = path.join(this.backupDir, backupId);

    // Verify backup exists
    await fs.promises.access(filepath, fs.constants.F_OK);

    const content = await fs.promises.readFile(filepath, 'utf-8');
    const info = await this.getBackupInfo(backupId);

    return { content, info };
  }

  /**
   * List all backups, optionally filtered by IDE type
   */
  async listBackups(ideType?: IDEType): Promise<BackupInfo[]> {
    try {
      const files = await fs.promises.readdir(this.backupDir);
      const backups: BackupInfo[] = [];

      for (const filename of files) {
        if (!filename.endsWith('.backup')) continue;

        // Parse filename safely - handle ideTypes with underscores
        const parseResult = this.parseBackupFilename(filename);
        if (!parseResult) continue;

        const { type, timestamp } = parseResult;

        // Filter by IDE type if specified
        if (ideType && type !== ideType) continue;

        const filepath = path.join(this.backupDir, filename);

        try {
          const stats = await fs.promises.stat(filepath);

          backups.push({
            id: filename,
            ideType: type as IDEType,
            timestamp,
            path: filepath,
            size: stats.size
          });
        } catch {
          // Skip files that can't be stat'd
        }
      }

      // Sort by timestamp, newest first
      return backups.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get backup info by ID
   */
  async getBackupInfo(backupId: string): Promise<BackupInfo> {
    const filepath = path.join(this.backupDir, backupId);

    await fs.promises.access(filepath, fs.constants.F_OK);

    const parseResult = this.parseBackupFilename(backupId);
    if (!parseResult) {
      throw new Error(`Invalid backup filename: ${backupId}`);
    }

    const { type, timestamp } = parseResult;
    const stats = await fs.promises.stat(filepath);

    return {
      id: backupId,
      ideType: type as IDEType,
      timestamp,
      path: filepath,
      size: stats.size
    };
  }

  /**
   * Delete a backup by ID
   */
  async deleteBackup(backupId: string): Promise<void> {
    const filepath = path.join(this.backupDir, backupId);
    await fs.promises.unlink(filepath);
  }

  /**
   * Delete all backups for an IDE type
   */
  async deleteBackupsByType(ideType: IDEType): Promise<number> {
    const backups = await this.listBackups(ideType);
    let deleted = 0;

    for (const backup of backups) {
      try {
        await this.deleteBackup(backup.id);
        deleted++;
      } catch {
        // Skip failed deletions
      }
    }

    return deleted;
  }

  /**
   * Get the backup directory path
   */
  getBackupDirectory(): string {
    return this.backupDir;
  }

  /**
   * Set the maximum number of backups to keep
   */
  setMaxBackups(max: number): void {
    this.maxBackups = Math.max(1, max);
  }

  /**
   * Get the maximum number of backups to keep
   */
  getMaxBackups(): number {
    return this.maxBackups;
  }

  /**
   * Clean up old backups, keeping only the most recent ones
   */
  private async cleanupOldBackups(ideType: IDEType): Promise<void> {
    const backups = await this.listBackups(ideType);

    // Keep only the most recent backups (skip the first maxBackups)
    const toDelete = backups.slice(this.maxBackups);

    for (const backup of toDelete) {
      try {
        await fs.promises.unlink(backup.path);
      } catch (error) {
        // Log but don't fail
        console.error(`Failed to delete old backup: ${backup.path}`, error);
      }
    }
  }

  /**
   * Parse a backup filename to extract IDE type and timestamp
   * Format: ideType_timestamp.backup
   */
  private parseBackupFilename(filename: string): { type: string; timestamp: number } | null {
    // Remove .backup extension
    const withoutExt = filename.slice(0, -'.backup'.length);

    // Find the last underscore to separate ideType from timestamp
    // This handles ideTypes with underscores (like claude-desktop)
    const lastUnderscoreIndex = withoutExt.lastIndexOf('_');

    if (lastUnderscoreIndex === -1) {
      return null;
    }

    const type = withoutExt.slice(0, lastUnderscoreIndex);
    const timestampStr = withoutExt.slice(lastUnderscoreIndex + 1);
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(timestamp)) {
      return null;
    }

    return { type, timestamp };
  }

  /**
   * Sanitize a filename to remove invalid characters
   */
  private sanitizeFilename(filename: string): string {
    // Replace characters that are not allowed in filenames
    return filename.replace(/[^a-zA-Z0-9-_]/g, '_');
  }

  /**
   * Check if a backup exists
   */
  async backupExists(backupId: string): Promise<boolean> {
    const filepath = path.join(this.backupDir, backupId);
    try {
      await fs.promises.access(filepath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the total size of all backups for an IDE type
   */
  async getBackupSize(ideType?: IDEType): Promise<number> {
    const backups = await this.listBackups(ideType);
    return backups.reduce((total, backup) => total + backup.size, 0);
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    backupsByType: Record<string, number>;
  }> {
    const backups = await this.listBackups();
    const backupsByType: Record<string, number> = {};

    for (const backup of backups) {
      backupsByType[backup.ideType] = (backupsByType[backup.ideType] || 0) + 1;
    }

    return {
      totalBackups: backups.length,
      totalSize: backups.reduce((total, b) => total + b.size, 0),
      backupsByType
    };
  }
}
