import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/types'

const electronAPI = {
  // Configuration operations
  config: {
    loadAll: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_LOAD_ALL),
    loadOne: (ideType: string) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_LOAD_ONE, ideType),
    save: (ideType: string, config: any) => 
      ipcRenderer.invoke(IPC_CHANNELS.CONFIG_SAVE, ideType, config),
    refresh: (ideType: string) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_REFRESH, ideType)
  },

  // Server operations
  server: {
    toggle: (ideType: string, serverId: string, enabled: boolean) =>
      ipcRenderer.invoke(IPC_CHANNELS.SERVER_TOGGLE, ideType, serverId, enabled),
    add: (ideType: string, server: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.SERVER_ADD, ideType, server),
    remove: (ideType: string, serverId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SERVER_REMOVE, ideType, serverId),
    update: (ideType: string, serverId: string, updates: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.SERVER_UPDATE, ideType, serverId, updates)
  },

  // Sync operations
  sync: {
    preview: (sourceIDE: string, targetIDE: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_PREVIEW, sourceIDE, targetIDE),
    execute: (sourceIDE: string, targetIDEs: string[], strategy: string, resolutions?: any[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_EXECUTE, sourceIDE, targetIDEs, strategy, resolutions),
    resolveConflict: (sourceIDE: string, targetIDE: string, resolutions: any[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC_RESOLVE_CONFLICT, sourceIDE, targetIDE, resolutions)
  },

  // Backup operations
  backup: {
    create: (ideType: string) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_CREATE, ideType),
    restore: (ideType: string, backupId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.BACKUP_RESTORE, ideType, backupId),
    list: (ideType?: string) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_LIST, ideType)
  },

  // Import/Export operations
  importExport: {
    exportConfig: (ideType: string) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_EXPORT, ideType),
    importConfig: (ideType: string) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_IMPORT, ideType),
    exportBatch: (ideTypes: string[]) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_EXPORT_BATCH, ideTypes),
    importBatch: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_IMPORT_BATCH),
    exportAll: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_EXPORT_ALL)
  },

  // Event listeners
  onConfigChanged: (callback: (data: { event: string; ideType: string }) => void) => {
    const listener = (_: any, data: { event: string; ideType: string }) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.CONFIG_CHANGED, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.CONFIG_CHANGED, listener);
    };
  },

  onSyncStatusUpdate: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.SYNC_STATUS_UPDATE, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SYNC_STATUS_UPDATE, listener);
    };
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
