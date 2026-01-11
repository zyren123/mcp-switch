import { Tray, Menu, app, BrowserWindow, nativeImage, MenuItemConstructorOptions } from 'electron';
import * as path from 'path';

export type TrayStatus = 'normal' | 'syncing' | 'error';

export interface TrayState {
  status: TrayStatus;
  ideCount: number;
  serverCount: number;
  lastSyncTime?: number;
}

export class TrayGenerator {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow;
  private state: TrayState = {
    status: 'normal',
    ideCount: 0,
    serverCount: 0
  };
  private isQuitting: boolean = false;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  /**
   * Create the system tray icon and menu
   */
  createTray(): void {
    const iconPath = this.getIconPath();
    const icon = nativeImage.createFromPath(iconPath);

    // Resize icon for different platforms
    const resizedIcon = this.resizeIconForPlatform(icon);

    this.tray = new Tray(resizedIcon);
    this.tray.setToolTip(this.getTooltipText());
    this.tray.setIgnoreDoubleClickEvents(true);

    this.tray.on('click', () => {
      this.toggleWindow();
    });

    this.updateContextMenu();
  }

  /**
   * Get icon path based on platform
   */
  private getIconPath(): string {
    const resourcesPath = path.join(__dirname, '../../resources');

    if (process.platform === 'win32') {
      return path.join(resourcesPath, 'icon.ico');
    } else if (process.platform === 'darwin') {
      return path.join(resourcesPath, 'icon.png');
    } else {
      return path.join(resourcesPath, 'icon.png');
    }
  }

  /**
   * Resize icon for platform requirements
   */
  private resizeIconForPlatform(icon: Electron.NativeImage): Electron.NativeImage {
    if (process.platform === 'darwin') {
      // macOS requires 16x16 or 22x22 for menu bar
      return icon.resize({ width: 16, height: 16 });
    } else if (process.platform === 'win32') {
      // Windows uses 16x16 or 32x32
      return icon.resize({ width: 16, height: 16 });
    }
    return icon.resize({ width: 22, height: 22 });
  }

  /**
   * Toggle window visibility
   */
  private toggleWindow(): void {
    if (this.mainWindow.isVisible()) {
      this.mainWindow.hide();
    } else {
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  /**
   * Get tooltip text based on current state
   */
  private getTooltipText(): string {
    const { status, ideCount, serverCount } = this.state;

    let statusText = 'MCP Switch';

    if (ideCount > 0) {
      statusText += ` - ${ideCount} IDE${ideCount > 1 ? 's' : ''}`;
    }

    if (serverCount > 0) {
      statusText += `, ${serverCount} server${serverCount > 1 ? 's' : ''}`;
    }

    if (status === 'syncing') {
      statusText += ' (Syncing...)';
    } else if (status === 'error') {
      statusText += ' (Error)';
    }

    return statusText;
  }

  /**
   * Update the context menu with current state
   */
  private updateContextMenu(): void {
    const { ideCount, serverCount, lastSyncTime } = this.state;

    const menuItems: MenuItemConstructorOptions[] = [
      {
        label: 'Show MCP Switch',
        click: () => {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      },
      { type: 'separator' },
      {
        label: `IDEs: ${ideCount}`,
        enabled: false
      },
      {
        label: `Servers: ${serverCount}`,
        enabled: false
      }
    ];

    // Add last sync time if available
    if (lastSyncTime) {
      const syncDate = new Date(lastSyncTime);
      const timeStr = syncDate.toLocaleTimeString();
      menuItems.push({
        label: `Last sync: ${timeStr}`,
        enabled: false
      });
    }

    menuItems.push(
      { type: 'separator' },
      {
        label: 'Quick Sync',
        submenu: [
          {
            label: 'Sync All',
            click: () => {
              this.mainWindow.show();
              this.mainWindow.webContents.send('tray:quick-sync');
            }
          }
        ]
      },
      { type: 'separator' },
      {
        label: 'Quit MCP Switch',
        click: () => {
          this.isQuitting = true;
          app.quit();
        }
      }
    );

    const contextMenu = Menu.buildFromTemplate(menuItems);
    this.tray?.setContextMenu(contextMenu);
  }

  /**
   * Update tray state and refresh UI
   */
  updateState(newState: Partial<TrayState>): void {
    this.state = { ...this.state, ...newState };

    // Update tooltip
    this.tray?.setToolTip(this.getTooltipText());

    // Update context menu
    this.updateContextMenu();
  }

  /**
   * Set sync status
   */
  setStatus(status: TrayStatus): void {
    this.updateState({ status });
  }

  /**
   * Set IDE and server counts
   */
  setCounts(ideCount: number, serverCount: number): void {
    this.updateState({ ideCount, serverCount });
  }

  /**
   * Set last sync time
   */
  setLastSyncTime(timestamp: number): void {
    this.updateState({ lastSyncTime: timestamp });
  }

  /**
   * Check if app is quitting (used for minimize to tray logic)
   */
  getIsQuitting(): boolean {
    return this.isQuitting;
  }

  /**
   * Set quitting state
   */
  setIsQuitting(quitting: boolean): void {
    this.isQuitting = quitting;
  }

  /**
   * Destroy the tray icon
   */
  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }
}
