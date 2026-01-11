import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  // Placeholder for Phase 1 - will be expanded in later phases
  ping: () => ipcRenderer.invoke('ping')
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
