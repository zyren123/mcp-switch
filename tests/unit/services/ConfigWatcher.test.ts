import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigWatcher, FileChangeEvent } from '../../../src/main/services/ConfigWatcher';
import { IDEType } from '../../../src/shared/types';
import * as fs from 'fs';

// Mock fs module
vi.mock('fs', () => {
  const mockWatcher = {
    close: vi.fn()
  };
  
  return {
    watch: vi.fn(() => mockWatcher),
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    promises: {
      readFile: vi.fn().mockResolvedValue('{"mcpServers": {}}'),
      access: vi.fn().mockResolvedValue(undefined)
    },
    constants: {
      F_OK: 0
    }
  };
});

// Mock adapters module
vi.mock('../../../src/main/adapters', () => {
  return {
    getAdapter: vi.fn(() => ({
      ideType: 'claude-desktop',
      getConfigPath: vi.fn(() => '/mock/path/config.json')
    }))
  };
});

// Mock configParser
vi.mock('../../../src/main/utils/configParser', () => {
  return {
    configParsers: {
      'claude-desktop': vi.fn((content: string) => JSON.parse(content)),
      'claude-code': vi.fn((content: string) => JSON.parse(content)),
      'cursor': vi.fn((content: string) => JSON.parse(content)),
      'windsurf': vi.fn((content: string) => JSON.parse(content)),
      'codex': vi.fn((content: string) => JSON.parse(content)),
      'opencode': vi.fn((content: string) => JSON.parse(content))
    }
  };
});

describe('ConfigWatcher', () => {
  let configWatcher: ConfigWatcher;
  const mockFs = fs as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    configWatcher = new ConfigWatcher(100); // 100ms debounce
  });

  afterEach(() => {
    configWatcher.closeAll();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should set default debounce time', () => {
      const watcher = new ConfigWatcher();
      expect(watcher.getDebounceMs()).toBe(300);
    });

    it('should accept custom debounce time', () => {
      const watcher = new ConfigWatcher(500);
      expect(watcher.getDebounceMs()).toBe(500);
    });
  });

  describe('watchConfig', () => {
    it('should start watching a config file', () => {
      const callback = vi.fn();
      configWatcher.watchConfig('claude-desktop', callback);

      expect(mockFs.watch).toHaveBeenCalled();
      expect(configWatcher.isActive()).toBe(true);
    });

    it('should not duplicate watchers for same path', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      configWatcher.watchConfig('claude-desktop', callback1);
      configWatcher.watchConfig('claude-desktop', callback2);

      expect(mockFs.watch).toHaveBeenCalledTimes(1);
    });

    it('should create directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValueOnce(false);

      configWatcher.watchConfig('claude-desktop', vi.fn());

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      );
    });
  });

  describe('unwatchConfig', () => {
    it('should stop watching a config file', () => {
      const callback = vi.fn();
      configWatcher.watchConfig('claude-desktop', callback);

      const watchedPaths = configWatcher.getWatchedPaths();
      configWatcher.unwatchConfig(watchedPaths[0]);

      expect(configWatcher.getWatcherCount()).toBe(0);
    });
  });

  describe('unwatchIDE', () => {
    it('should stop watching an IDE config', () => {
      configWatcher.watchConfig('claude-desktop', vi.fn());

      configWatcher.unwatchIDE('claude-desktop');

      expect(configWatcher.getWatcherCount()).toBe(0);
    });
  });

  describe('closeAll', () => {
    it('should close all watchers', () => {
      configWatcher.watchConfig('claude-desktop', vi.fn());

      configWatcher.closeAll();

      expect(configWatcher.isActive()).toBe(false);
      expect(configWatcher.getWatcherCount()).toBe(0);
    });
  });

  describe('refreshConfig', () => {
    it('should refresh config from disk', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.readFile.mockResolvedValue('{"mcpServers": {"test": {}}}');

      const result = await configWatcher.refreshConfig('claude-desktop');

      expect(result.success).toBe(true);
      expect(result.serversCount).toBe(1);
    });

    it('should return error if config file not found', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await configWatcher.refreshConfig('claude-desktop');

      expect(result.success).toBe(false);
      expect(result.error).toBe('CONFIG_NOT_FOUND');
    });

    it('should return error if config is corrupted', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.readFile.mockResolvedValue('invalid json');

      const result = await configWatcher.refreshConfig('claude-desktop');

      expect(result.success).toBe(false);
      expect(result.error).toBe('REFRESH_FAILED');
    });
  });

  describe('checkConfigIntegrity', () => {
    it('should validate config structure for Claude Desktop', async () => {
      const result = await configWatcher.checkConfigIntegrity(
        'claude-desktop',
        '{"mcpServers": {}}'
      );

      expect(result.valid).toBe(true);
    });

    it('should return invalid for missing mcpServers', async () => {
      const result = await configWatcher.checkConfigIntegrity(
        'claude-desktop',
        '{}'
      );

      expect(result.valid).toBe(false);
      expect(result.message).toContain('mcpServers');
    });

    it('should return invalid for parse errors', async () => {
      const result = await configWatcher.checkConfigIntegrity(
        'claude-desktop',
        'not valid json'
      );

      expect(result.valid).toBe(false);
      expect(result.message).toContain('解析错误');
    });
  });

  describe('setDebounceMs', () => {
    it('should update debounce interval', () => {
      configWatcher.setDebounceMs(500);

      expect(configWatcher.getDebounceMs()).toBe(500);
    });

    it('should ensure minimum of 0', () => {
      configWatcher.setDebounceMs(-100);

      expect(configWatcher.getDebounceMs()).toBe(0);
    });
  });

  describe('getWatchedPaths', () => {
    it('should return list of watched paths', () => {
      configWatcher.watchConfig('claude-desktop', vi.fn());

      const paths = configWatcher.getWatchedPaths();

      expect(paths).toHaveLength(1);
      expect(paths[0]).toContain('config.json');
    });
  });

  describe('debouncing', () => {
    it('should debounce rapid file changes', () => {
      const callback = vi.fn();
      configWatcher.watchConfig('claude-desktop', callback);

      // Get the watcher callback
      const watchCall = mockFs.watch.mock.calls[0];
      const watchCallback = watchCall[2]; // Third argument is the callback

      // Simulate rapid file changes
      watchCallback('change', 'config.json');
      watchCallback('change', 'config.json');
      watchCallback('change', 'config.json');

      // Callback should not be called yet
      expect(callback).not.toHaveBeenCalled();

      // Advance time past debounce
      vi.advanceTimersByTime(150);

      // Now callback should be called once
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('change', 'claude-desktop');
    });

    it('should only trigger for target config file', () => {
      const callback = vi.fn();
      configWatcher.watchConfig('claude-desktop', callback);

      const watchCall = mockFs.watch.mock.calls[0];
      const watchCallback = watchCall[2];

      // Simulate change to different file
      watchCallback('change', 'other-file.json');

      vi.advanceTimersByTime(150);

      // Callback should not be called
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
