import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncPanel } from '../../../src/renderer/components/sync/SyncPanel';
import { SyncPreview } from '../../../src/renderer/components/sync/SyncPreview';
import { useConfigStore } from '../../../src/renderer/stores/useConfigStore';
import { useSyncStore } from '../../../src/renderer/stores/useSyncStore';
import { IDEConfig, SyncPreviewItem } from '../../../src/renderer/types/mcp';

// Mock stores
vi.mock('../../../src/renderer/stores/useConfigStore');
vi.mock('../../../src/renderer/stores/useSyncStore');

const mockConfigs: IDEConfig[] = [
  {
    type: 'claude-desktop',
    name: 'Claude Desktop',
    displayName: 'Claude Desktop',
    configPath: '/path',
    configFormat: 'json',
    isInstalled: true,
    servers: [],
    syncStatus: 'synced',
  },
  {
    type: 'cursor',
    name: 'Cursor',
    displayName: 'Cursor',
    configPath: '/path',
    configFormat: 'json',
    isInstalled: true,
    servers: [],
    syncStatus: 'synced',
  },
];

describe('Sync Components', () => {
  const mockSetSource = vi.fn();
  const mockToggleTarget = vi.fn();
  const mockPreviewSync = vi.fn();
  const mockExecuteSync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useConfigStore as any).mockReturnValue({
      configs: mockConfigs,
    });

    (useSyncStore as any).mockReturnValue({
      sourceIDE: null,
      targetIDEs: [],
      setSource: mockSetSource,
      toggleTarget: mockToggleTarget,
      previewSync: mockPreviewSync,
      executeSync: mockExecuteSync,
      syncStatus: 'idle',
      previewItems: [],
      error: null,
    });
  });

  describe('SyncPanel', () => {
    it('should render source and target selections', () => {
      render(<SyncPanel />);

      expect(screen.getByText('Source (From)')).toBeInTheDocument();
      expect(screen.getByText('Targets (To)')).toBeInTheDocument();
      expect(screen.getAllByText('Claude Desktop')).toHaveLength(2); // One in source, one in target
    });

    it('should select source', () => {
      render(<SyncPanel />);

      const sourceCard = screen.getByTestId('ide-card-claude-desktop');
      fireEvent.click(sourceCard);

      expect(mockSetSource).toHaveBeenCalledWith('claude-desktop');
    });

    it('should toggle target', () => {
      (useSyncStore as any).mockReturnValue({
        ...useSyncStore(),
        sourceIDE: 'claude-desktop', // Set source so targets are enabled
        targetIDEs: [],
        setSource: mockSetSource,
        toggleTarget: mockToggleTarget,
      });

      render(<SyncPanel />);

      const targetCard = screen.getByTestId('add-target-cursor'); // Cursor is the only available target
      fireEvent.click(targetCard);

      expect(mockToggleTarget).toHaveBeenCalledWith('cursor');
    });

    it('should show preview button when ready', () => {
        (useSyncStore as any).mockReturnValue({
            ...useSyncStore(),
            sourceIDE: 'claude-desktop',
            targetIDEs: ['cursor'],
            syncStatus: 'idle',
            previewItems: [],
        });

        render(<SyncPanel />);
        expect(screen.getByText('Preview Changes')).toBeInTheDocument();
        expect(screen.getByText('Preview Changes')).toBeEnabled();
    });

    it('should trigger preview', () => {
        (useSyncStore as any).mockReturnValue({
            ...useSyncStore(),
            sourceIDE: 'claude-desktop',
            targetIDEs: ['cursor'],
            syncStatus: 'idle',
            previewItems: [],
            previewSync: mockPreviewSync,
        });

        render(<SyncPanel />);
        fireEvent.click(screen.getByText('Preview Changes'));
        expect(mockPreviewSync).toHaveBeenCalled();
    });
  });

  describe('SyncPreview', () => {
    const mockItems: SyncPreviewItem[] = [
        {
            serverId: 'server-1',
            serverName: 'Server 1',
            action: 'add',
            hasConflict: false,
        },
        {
            serverId: 'server-2',
            serverName: 'Server 2',
            action: 'update',
            hasConflict: true,
        }
    ];

    it('should render preview items', () => {
        render(<SyncPreview items={mockItems} sourceIDE="claude-desktop" targetIDEs={['cursor']} />);

        expect(screen.getByText('Server 1')).toBeInTheDocument();
        expect(screen.getByText('add')).toBeInTheDocument();
        expect(screen.getByText('Server 2')).toBeInTheDocument();
        expect(screen.getByText('Conflict')).toBeInTheDocument();
    });
  });
});
