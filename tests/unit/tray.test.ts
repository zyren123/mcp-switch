import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { TrayGenerator, TrayStatus, TrayState } from '@main/tray';
import { Tray, Menu, app, BrowserWindow, nativeImage } from 'electron';

// Mock electron
vi.mock('electron', () => ({
  Tray: vi.fn().mockImplementation(() => ({
    setToolTip: vi.fn(),
    setIgnoreDoubleClickEvents: vi.fn(),
    setContextMenu: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn()
  })),
  Menu: {
    buildFromTemplate: vi.fn().mockReturnValue({})
  },
  app: {
    quit: vi.fn()
  },
  nativeImage: {
    createFromPath: vi.fn().mockReturnValue({
      resize: vi.fn().mockReturnThis()
    })
  }
}));

describe('TrayGenerator', () => {
  let trayGenerator: TrayGenerator;
  let mockMainWindow: any;
  let mockTrayInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMainWindow = {
      isVisible: vi.fn().mockReturnValue(true),
      show: vi.fn(),
      hide: vi.fn(),
      focus: vi.fn(),
      webContents: {
        send: vi.fn()
      }
    };

    // Create mock tray instance
    mockTrayInstance = {
      setToolTip: vi.fn(),
      setIgnoreDoubleClickEvents: vi.fn(),
      setContextMenu: vi.fn(),
      on: vi.fn(),
      destroy: vi.fn()
    };

    (Tray as unknown as Mock).mockImplementation(() => mockTrayInstance);

    trayGenerator = new TrayGenerator(mockMainWindow as unknown as BrowserWindow);
  });

  describe('createTray', () => {
    it('should create a tray icon', () => {
      trayGenerator.createTray();

      expect(Tray).toHaveBeenCalled();
      expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith('MCP Switch');
      expect(mockTrayInstance.setIgnoreDoubleClickEvents).toHaveBeenCalledWith(true);
    });

    it('should set up click handler', () => {
      trayGenerator.createTray();

      expect(mockTrayInstance.on).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should create context menu', () => {
      trayGenerator.createTray();

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
      expect(mockTrayInstance.setContextMenu).toHaveBeenCalled();
    });

    it('should load platform-specific icon', () => {
      trayGenerator.createTray();

      expect(nativeImage.createFromPath).toHaveBeenCalled();
    });
  });

  describe('updateState', () => {
    beforeEach(() => {
      trayGenerator.createTray();
    });

    it('should update tooltip with IDE count', () => {
      trayGenerator.updateState({ ideCount: 3, serverCount: 0 });

      expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith(
        expect.stringContaining('3 IDEs')
      );
    });

    it('should update tooltip with server count', () => {
      trayGenerator.updateState({ ideCount: 0, serverCount: 5 });

      expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith(
        expect.stringContaining('5 servers')
      );
    });

    it('should update tooltip with both counts', () => {
      trayGenerator.updateState({ ideCount: 2, serverCount: 10 });

      const lastCall = mockTrayInstance.setToolTip.mock.calls.pop()[0];
      expect(lastCall).toContain('2 IDEs');
      expect(lastCall).toContain('10 servers');
    });

    it('should show syncing status in tooltip', () => {
      trayGenerator.updateState({ status: 'syncing' });

      expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith(
        expect.stringContaining('Syncing...')
      );
    });

    it('should show error status in tooltip', () => {
      trayGenerator.updateState({ status: 'error' });

      expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith(
        expect.stringContaining('Error')
      );
    });

    it('should update context menu when state changes', () => {
      const menuCallsBefore = (Menu.buildFromTemplate as Mock).mock.calls.length;

      trayGenerator.updateState({ ideCount: 5 });

      expect((Menu.buildFromTemplate as Mock).mock.calls.length).toBeGreaterThan(menuCallsBefore);
    });
  });

  describe('setStatus', () => {
    beforeEach(() => {
      trayGenerator.createTray();
    });

    it('should set status to normal', () => {
      trayGenerator.setStatus('normal');

      const lastTooltip = mockTrayInstance.setToolTip.mock.calls.pop()[0];
      expect(lastTooltip).not.toContain('Syncing');
      expect(lastTooltip).not.toContain('Error');
    });

    it('should set status to syncing', () => {
      trayGenerator.setStatus('syncing');

      expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith(
        expect.stringContaining('Syncing...')
      );
    });

    it('should set status to error', () => {
      trayGenerator.setStatus('error');

      expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith(
        expect.stringContaining('Error')
      );
    });
  });

  describe('setCounts', () => {
    beforeEach(() => {
      trayGenerator.createTray();
    });

    it('should set IDE and server counts', () => {
      trayGenerator.setCounts(4, 12);

      const lastTooltip = mockTrayInstance.setToolTip.mock.calls.pop()[0];
      expect(lastTooltip).toContain('4 IDEs');
      expect(lastTooltip).toContain('12 servers');
    });

    it('should handle singular count correctly', () => {
      trayGenerator.setCounts(1, 1);

      const lastTooltip = mockTrayInstance.setToolTip.mock.calls.pop()[0];
      expect(lastTooltip).toContain('1 IDE');
      expect(lastTooltip).toContain('1 server');
      expect(lastTooltip).not.toContain('1 IDEs');
      expect(lastTooltip).not.toContain('1 servers');
    });
  });

  describe('setLastSyncTime', () => {
    beforeEach(() => {
      trayGenerator.createTray();
    });

    it('should update last sync time in context menu', () => {
      const timestamp = Date.now();
      trayGenerator.setLastSyncTime(timestamp);

      // Menu should be rebuilt with last sync time
      expect(Menu.buildFromTemplate).toHaveBeenCalled();
    });
  });

  describe('isQuitting', () => {
    it('should default to false', () => {
      expect(trayGenerator.getIsQuitting()).toBe(false);
    });

    it('should return true after setIsQuitting(true)', () => {
      trayGenerator.setIsQuitting(true);
      expect(trayGenerator.getIsQuitting()).toBe(true);
    });

    it('should return false after setIsQuitting(false)', () => {
      trayGenerator.setIsQuitting(true);
      trayGenerator.setIsQuitting(false);
      expect(trayGenerator.getIsQuitting()).toBe(false);
    });
  });

  describe('destroy', () => {
    it('should destroy tray instance', () => {
      trayGenerator.createTray();
      trayGenerator.destroy();

      expect(mockTrayInstance.destroy).toHaveBeenCalled();
    });

    it('should handle destroy when tray not created', () => {
      // Should not throw
      expect(() => trayGenerator.destroy()).not.toThrow();
    });
  });

  describe('window toggle behavior', () => {
    beforeEach(() => {
      trayGenerator.createTray();
    });

    it('should toggle window visibility on click', () => {
      // Get the click handler that was registered
      const clickHandler = mockTrayInstance.on.mock.calls.find(
        (call: any[]) => call[0] === 'click'
      )?.[1];

      expect(clickHandler).toBeDefined();

      // Window is visible, so click should hide it
      mockMainWindow.isVisible.mockReturnValue(true);
      clickHandler();
      expect(mockMainWindow.hide).toHaveBeenCalled();
    });

    it('should show window when hidden', () => {
      const clickHandler = mockTrayInstance.on.mock.calls.find(
        (call: any[]) => call[0] === 'click'
      )?.[1];

      // Window is hidden, so click should show it
      mockMainWindow.isVisible.mockReturnValue(false);
      clickHandler();
      expect(mockMainWindow.show).toHaveBeenCalled();
      expect(mockMainWindow.focus).toHaveBeenCalled();
    });
  });
});
