import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IDEList } from '../../../src/renderer/components/ide/IDEList';
import { IDECard } from '../../../src/renderer/components/ide/IDECard';
import { useConfigStore } from '../../../src/renderer/stores/useConfigStore';
import { useSyncStore } from '../../../src/renderer/stores/useSyncStore';
import { IDEConfig } from '../../../src/renderer/types/mcp';

// Mock the stores
vi.mock('../../../src/renderer/stores/useConfigStore');
vi.mock('../../../src/renderer/stores/useSyncStore');

const mockConfigs: IDEConfig[] = [
  {
    type: 'claude-desktop',
    name: 'Claude Desktop',
    displayName: 'Claude Desktop',
    configPath: '/path/to/config',
    configFormat: 'json',
    isInstalled: true,
    servers: [],
    syncStatus: 'synced',
  },
  {
    type: 'cursor',
    name: 'Cursor',
    displayName: 'Cursor',
    configPath: '',
    configFormat: 'json',
    isInstalled: false,
    servers: [],
    syncStatus: 'unknown',
  },
];

describe('IDE Components', () => {
  const mockSelectIDE = vi.fn();
  const mockSetSource = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useConfigStore as any).mockReturnValue({
      configs: mockConfigs,
      isLoading: false,
      selectIDE: mockSelectIDE,
    });

    (useSyncStore as any).mockReturnValue({
      setSource: mockSetSource,
    });
  });

  describe('IDECard', () => {
    it('should render IDE information correctly', () => {
      render(<IDECard config={mockConfigs[0]} />);

      expect(screen.getByText('Claude Desktop')).toBeInTheDocument();
      expect(screen.getByText('/path/to/config')).toBeInTheDocument();
      expect(screen.getByText('Installed')).toBeInTheDocument();
    });

    it('should render Not Detected status correctly', () => {
      render(<IDECard config={mockConfigs[1]} />);

      expect(screen.getByText('Cursor')).toBeInTheDocument();
      expect(screen.getByText('Not Detected')).toBeInTheDocument();
    });

    it('should call selectIDE when Manage button is clicked', () => {
      render(<IDECard config={mockConfigs[0]} />);

      fireEvent.click(screen.getByText('Manage'));
      expect(mockSelectIDE).toHaveBeenCalledWith('claude-desktop');
    });
  });

  describe('IDEList', () => {
    it('should render all IDE configs', () => {
      render(<IDEList />);

      expect(screen.getByText('Claude Desktop')).toBeInTheDocument();
      expect(screen.getByText('Cursor')).toBeInTheDocument();
    });

    it('should show loading state', () => {
        (useConfigStore as any).mockReturnValue({
            configs: [],
            isLoading: true,
        });

        render(<IDEList />);
        expect(screen.getByText('Loading configurations...')).toBeInTheDocument();
    });
  });
});
