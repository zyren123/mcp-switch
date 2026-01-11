import { ElectronAPI } from './index'

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export interface ConfigAPI {
  loadAll: () => Promise<{ success: boolean; data?: any[]; error?: string }>
  loadOne: (ideType: string) => Promise<{ success: boolean; data?: any; error?: string }>
  save: (ideType: string, config: any) => Promise<{ success: boolean; error?: string }>
  refresh: (ideType: string) => Promise<{ success: boolean; config?: any; error?: string }>
}

export interface ServerAPI {
  toggle: (ideType: string, serverId: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>
  add: (ideType: string, server: any) => Promise<{ success: boolean; error?: string }>
  remove: (ideType: string, serverId: string) => Promise<{ success: boolean; error?: string }>
  update: (ideType: string, serverId: string, updates: any) => Promise<{ success: boolean; error?: string }>
}

export interface SyncAPI {
  preview: (sourceIDE: string, targetIDE: string) => Promise<{ success: boolean; data?: any; error?: string }>
  execute: (sourceIDE: string, targetIDEs: string[], strategy: string, resolutions?: any[]) => Promise<{ success: boolean; data?: any; error?: string }>
  resolveConflict: (sourceIDE: string, targetIDE: string, resolutions: any[]) => Promise<{ success: boolean; data?: any; error?: string }>
}

export interface BackupAPI {
  create: (ideType: string) => Promise<{ success: boolean; data?: { backupId: string }; error?: string }>
  restore: (ideType: string, backupId: string) => Promise<{ success: boolean; error?: string }>
  list: (ideType?: string) => Promise<{ success: boolean; data?: any[]; error?: string }>
}
