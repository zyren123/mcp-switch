import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServerList } from '../../../src/renderer/components/server/ServerList';
import { ServerCard } from '../../../src/renderer/components/server/ServerCard';
import { useConfigStore } from '../../../src/renderer/stores/useConfigStore';
import { MCPServer } from '../../../src/renderer/types/mcp';

// Mock UI components
vi.mock('../../../src/renderer/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }: any) => <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
  DialogTrigger: ({ children, onClick }: any) => <div onClick={onClick} data-testid="dialog-trigger">{children}</div>,
}));

vi.mock('../../../src/renderer/stores/useConfigStore');
vi.mock('../../../src/renderer/components/ui/use-toast', () => ({
    toast: vi.fn(),
}));

const mockServers: MCPServer[] = [
  {
    id: 'server-1',
    name: 'Test Server 1',
    command: 'node',
    args: ['index.js'],
    env: { TEST: '1' },
    enabled: true,
  },
  {
    id: 'server-2',
    name: 'Test Server 2',
    command: 'python',
    args: ['script.py'],
    enabled: false,
  },
];

describe('Server Components', () => {
  const mockToggleServer = vi.fn();
  const mockRemoveServer = vi.fn();
  const mockAddServer = vi.fn();
  const mockUpdateServer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useConfigStore as any).mockReturnValue({
      toggleServer: mockToggleServer,
      removeServer: mockRemoveServer,
      addServer: mockAddServer,
      updateServer: mockUpdateServer,
    });
  });

  describe('ServerCard', () => {
    it('should render server details', () => {
      render(<ServerCard server={mockServers[0]} ideType="claude-desktop" />);

      expect(screen.getByText('Test Server 1')).toBeInTheDocument();
      expect(screen.getByText(/node/)).toBeInTheDocument();
      expect(screen.getByText('1 Env Vars')).toBeInTheDocument();
    });

    it('should show disabled badge', () => {
        render(<ServerCard server={mockServers[1]} ideType="claude-desktop" />);
        expect(screen.getByText('Disabled')).toBeInTheDocument();
    });

    it('should toggle server', () => {
      render(<ServerCard server={mockServers[0]} ideType="claude-desktop" />);

      const switchEl = screen.getByRole('switch');
      fireEvent.click(switchEl);

      expect(mockToggleServer).toHaveBeenCalledWith('claude-desktop', 'server-1', false);
    });
  });

  describe('ServerList', () => {
    it('should render list of servers', () => {
        render(<ServerList servers={mockServers} ideType="claude-desktop" />);

        expect(screen.getByText('Test Server 1')).toBeInTheDocument();
        expect(screen.getByText('Test Server 2')).toBeInTheDocument();
    });

    it('should render empty state', () => {
        render(<ServerList servers={[]} ideType="claude-desktop" />);

        expect(screen.getByText('No servers configured.')).toBeInTheDocument();
    });
  });
});
