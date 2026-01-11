import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useConfigStore } from '../../../src/renderer/stores/useConfigStore';
import { IDEConfig } from '../../../src/renderer/types/mcp';

// Mock electron API
const mockElectronAPI = {
  config: {
    loadAll: vi.fn(),
    refresh: vi.fn(),
  },
  server: {
    toggle: vi.fn(),
    update: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
  },
};

(global.window as any).electronAPI = mockElectronAPI;

describe('useConfigStore', () => {
  beforeEach(() => {
    useConfigStore.setState({
      configs: [],
      selectedIDE: null,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('should load configs successfully', async () => {
    const mockConfigs: IDEConfig[] = [
      {
        type: 'claude-desktop',
        name: 'Claude Desktop',
        displayName: 'Claude Desktop',
        configPath: '/path/to/config',
        configFormat: 'json',
        isInstalled: true,
        servers: [],
        syncStatus: 'synced',
      },
    ];

    mockElectronAPI.config.loadAll.mockResolvedValue({
      success: true,
      data: mockConfigs,
    });

    await useConfigStore.getState().loadConfigs();

    const state = useConfigStore.getState();
    expect(state.configs).toEqual(mockConfigs);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe(null);
    expect(state.selectedIDE).toBe('claude-desktop'); // Should select first one
  });

  it('should handle load configs failure', async () => {
    mockElectronAPI.config.loadAll.mockResolvedValue({
      success: false,
      error: 'Failed to load',
    });

    await useConfigStore.getState().loadConfigs();

    const state = useConfigStore.getState();
    expect(state.configs).toEqual([]);
    expect(state.error).toBe('Failed to load');
  });

  it('should select IDE', () => {
    useConfigStore.getState().selectIDE('cursor');
    expect(useConfigStore.getState().selectedIDE).toBe('cursor');
  });
});
