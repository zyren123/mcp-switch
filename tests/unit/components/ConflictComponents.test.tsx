import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictResolver } from '../../../src/renderer/components/conflict/ConflictResolver';
import { ConflictItem } from '../../../src/renderer/components/conflict/ConflictItem';
import { useSyncStore } from '../../../src/renderer/stores/useSyncStore';
import { SyncConflict } from '../../../src/renderer/types/mcp';

// Mock stores
vi.mock('../../../src/renderer/stores/useSyncStore');

// Mock dialog since it uses portals and can be tricky in tests
vi.mock('../../../src/renderer/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => {
    if (!open) return null;
    return (
      <div data-testid="dialog">
         <button onClick={() => onOpenChange(false)} data-testid="close-dialog">Close</button>
         {children}
      </div>
    );
  },
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }: any) => <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
}));

const mockConflict: SyncConflict = {
  serverId: 'server-1',
  sourceValue: { command: 'node' },
  targetValue: { command: 'python' },
  field: 'command',
  conflictType: 'value_mismatch'
};

describe('Conflict Components', () => {
  const mockExecuteSync = vi.fn();
  const mockResetSync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useSyncStore as any).mockReturnValue({
      conflicts: [],
      executeSync: mockExecuteSync,
      resetSync: mockResetSync,
      syncStatus: 'idle'
    });
  });

  describe('ConflictItem', () => {
    it('should render conflict details', () => {
      const onResolve = vi.fn();
      render(<ConflictItem conflict={mockConflict} onResolve={onResolve} />);

      expect(screen.getByText('server-1')).toBeInTheDocument();
      expect(screen.getByText('command')).toBeInTheDocument();
      expect(screen.getByText(/node/)).toBeInTheDocument(); // Source
      expect(screen.getByText(/python/)).toBeInTheDocument(); // Target
    });

    it('should allow selection', () => {
      const onResolve = vi.fn();
      render(<ConflictItem conflict={mockConflict} onResolve={onResolve} />);

      const sourceOption = screen.getByTestId('strategy-keep-source');
      fireEvent.click(sourceOption);

      expect(onResolve).toHaveBeenCalledWith('keep-source');
    });
  });

  describe('ConflictResolver', () => {
    it('should not be visible when no conflicts', () => {
      render(<ConflictResolver />);
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('should be visible when there are conflicts', () => {
      (useSyncStore as any).mockReturnValue({
        conflicts: [mockConflict],
        syncStatus: 'syncing',
        executeSync: mockExecuteSync,
        resetSync: mockResetSync,
      });

      render(<ConflictResolver />);
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByText('Sync Conflicts Detected')).toBeInTheDocument();
    });
  });
});
