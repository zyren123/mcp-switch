import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron';
import * as path from 'path';

export class TrayGenerator {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  createTray(): void {
    const iconPath = path.join(__dirname, '../../resources/icon.png');
    const icon = nativeImage.createFromPath(iconPath);

    this.tray = new Tray(icon);
    this.tray.setToolTip('MCP Switch');
    this.tray.setIgnoreDoubleClickEvents(true);

    this.tray.on('click', () => {
      this.toggleWindow();
    });

    this.updateContextMenu();
  }

  private toggleWindow(): void {
    if (this.mainWindow.isVisible()) {
      this.mainWindow.hide();
    } else {
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  private updateContextMenu(): void {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show App',
        click: () => {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        }
      }
    ]);

    this.tray?.setContextMenu(contextMenu);
  }

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }
}
