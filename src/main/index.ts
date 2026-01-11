import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initializeIPC, cleanupIPC } from './ipc'
import { ConfigWatcher } from './services/ConfigWatcher'
import { TrayGenerator } from './tray'
import { ConfigService } from './services/ConfigService'

let mainWindow: BrowserWindow | null = null
let configWatcher: ConfigWatcher | null = null
let trayGenerator: TrayGenerator | null = null
let configService: ConfigService | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'MCP Switch',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Minimize to tray instead of closing (unless quitting)
  mainWindow.on('close', (event) => {
    if (trayGenerator && !trayGenerator.getIsQuitting()) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/**
 * Update tray with current config state
 */
async function updateTrayState(): Promise<void> {
  if (!trayGenerator || !configService) return

  try {
    const configs = await configService.loadAllConfigs()
    const installedIDEs = configs.filter(c => c.isInstalled)
    const totalServers = installedIDEs.reduce((sum, c) => sum + c.servers.length, 0)

    trayGenerator.setCounts(installedIDEs.length, totalServers)
  } catch (error) {
    console.error('Failed to update tray state:', error)
  }
}

app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.mcp-switch.app')

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  // Initialize IPC handlers after window is created
  const getMainWindow = () => mainWindow
  const ipcResult = initializeIPC(getMainWindow)
  configWatcher = ipcResult.configWatcher
  configService = ipcResult.configService

  // Create system tray
  if (mainWindow) {
    trayGenerator = new TrayGenerator(mainWindow)
    trayGenerator.createTray()

    // Update tray state with current config info
    await updateTrayState()
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // Cleanup IPC handlers and watchers
  if (configWatcher) {
    cleanupIPC(configWatcher)
    configWatcher = null
  }

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle app quit
app.on('before-quit', () => {
  // Mark as quitting so close event doesn't prevent quit
  if (trayGenerator) {
    trayGenerator.setIsQuitting(true)
  }

  if (configWatcher) {
    cleanupIPC(configWatcher)
    configWatcher = null
  }

  // Destroy tray
  if (trayGenerator) {
    trayGenerator.destroy()
    trayGenerator = null
  }
})

export { mainWindow, trayGenerator, updateTrayState }
