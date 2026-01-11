import { create } from 'zustand';
import { IDEType, IDEConfig } from '../types/mcp';

interface ConfigStore {
  configs: IDEConfig[];
  selectedIDE: IDEType | null;
  isLoading: boolean;
  error: string | null;

  loadConfigs: () => Promise<void>;
  selectIDE: (ideType: IDEType) => void;
  toggleServer: (ideType: IDEType, serverId: string, enabled: boolean) => Promise<void>;
  refreshConfig: (ideType: IDEType) => Promise<void>;
  updateServer: (ideType: IDEType, serverId: string, updates: any) => Promise<void>;
  addServer: (ideType: IDEType, server: any) => Promise<void>;
  removeServer: (ideType: IDEType, serverId: string) => Promise<void>;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  configs: [],
  selectedIDE: null,
  isLoading: false,
  error: null,

  loadConfigs: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.config.loadAll();
      if (result.success && result.data) {
        set({ configs: result.data as IDEConfig[], isLoading: false });

        // If no IDE is selected, select the first one
        const currentSelected = get().selectedIDE;
        if (!currentSelected && result.data.length > 0) {
            set({ selectedIDE: result.data[0].type });
        }
      } else {
        set({ error: result.error || 'Failed to load configurations', isLoading: false });
      }
    } catch (err: any) {
      set({ error: err.message || 'Unknown error occurred', isLoading: false });
    }
  },

  selectIDE: (ideType: IDEType) => {
    set({ selectedIDE: ideType });
  },

  toggleServer: async (ideType: IDEType, serverId: string, enabled: boolean) => {
    // Optimistic update
    set((state) => {
      const newConfigs = state.configs.map((config) => {
        if (config.type === ideType) {
          return {
            ...config,
            servers: config.servers.map((server) =>
              server.id === serverId ? { ...server, enabled } : server
            ),
          };
        }
        return config;
      });
      return { configs: newConfigs };
    });

    try {
      const result = await window.electronAPI.server.toggle(ideType, serverId, enabled);
      if (!result.success) {
        // Revert on failure
        await get().refreshConfig(ideType);
        console.error('Failed to toggle server:', result.error);
        // Could set a temporary error state or trigger a toast here if we had access to the toast store
      }
    } catch (err) {
      // Revert on failure
      await get().refreshConfig(ideType);
      console.error('Error toggling server:', err);
    }
  },

  refreshConfig: async (ideType: IDEType) => {
    try {
      const result = await window.electronAPI.config.refresh(ideType);
      if (result.success && result.config) {
        set((state) => ({
          configs: state.configs.map((c) =>
            c.type === ideType ? (result.config as IDEConfig) : c
          ),
        }));
      }
    } catch (err) {
      console.error('Error refreshing config:', err);
    }
  },

  updateServer: async (ideType: IDEType, serverId: string, updates: any) => {
      try {
          const result = await window.electronAPI.server.update(ideType, serverId, updates);
          if(result.success) {
              await get().refreshConfig(ideType);
          } else {
              set({ error: result.error });
          }
      } catch (e: any) {
          set({ error: e.message });
      }
  },

  addServer: async (ideType: IDEType, server: any) => {
      try {
          const result = await window.electronAPI.server.add(ideType, server);
           if(result.success) {
              await get().refreshConfig(ideType);
          } else {
              set({ error: result.error });
          }
      } catch(e: any) {
          set({ error: e.message });
      }
  },

  removeServer: async (ideType: IDEType, serverId: string) => {
      try {
          const result = await window.electronAPI.server.remove(ideType, serverId);
           if(result.success) {
              await get().refreshConfig(ideType);
          } else {
              set({ error: result.error });
          }
      } catch(e: any) {
           set({ error: e.message });
      }
  }
}));
