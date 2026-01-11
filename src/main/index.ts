import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initializeIPC, cleanupIPC } from './ipc'
import { ConfigWatcher } from './services/ConfigWatcher'

let mainWindow: BrowserWindow | null = null
let configWatcher: ConfigWatcher | null = null

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

app.whenReady().then(() => {
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
  if (configWatcher) {
    cleanupIPC(configWatcher)
    configWatcher = null
  }
})

export { mainWindow }
