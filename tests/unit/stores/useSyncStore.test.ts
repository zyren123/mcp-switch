import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSyncStore } from '../../../src/renderer/stores/useSyncStore';

// Mock electron API
const mockElectronAPI = {
  sync: {
    preview: vi.fn(),
    execute: vi.fn(),
  },
};

(global.window as any).electronAPI = mockElectronAPI;

describe('useSyncStore', () => {
  beforeEach(() => {
    useSyncStore.setState({
      sourceIDE: null,
      targetIDEs: [],
      conflicts: [],
      previewItems: [],
      syncStatus: 'idle',
      error: null,
    });
    vi.clearAllMocks();
  });

  it('should set source IDE', () => {
    useSyncStore.getState().setSource('claude-desktop');
    expect(useSyncStore.getState().sourceIDE).toBe('claude-desktop');
  });

  it('should remove source from targets if selected', () => {
    useSyncStore.setState({ targetIDEs: ['claude-desktop', 'cursor'] });
    useSyncStore.getState().setSource('claude-desktop');

    expect(useSyncStore.getState().sourceIDE).toBe('claude-desktop');
    expect(useSyncStore.getState().targetIDEs).toEqual(['cursor']);
  });

  it('should toggle target IDE', () => {
    useSyncStore.getState().toggleTarget('cursor');
    expect(useSyncStore.getState().targetIDEs).toEqual(['cursor']);

    useSyncStore.getState().toggleTarget('cursor');
    expect(useSyncStore.getState().targetIDEs).toEqual([]);
  });

  it('should not allow source to be toggled as target', () => {
    useSyncStore.setState({ sourceIDE: 'cursor' });
    useSyncStore.getState().toggleTarget('cursor');
    expect(useSyncStore.getState().targetIDEs).toEqual([]);
  });

  it('should reset sync state', () => {
    useSyncStore.setState({
      syncStatus: 'completed',
      conflicts: [{} as any],
      previewItems: [{} as any],
      error: 'some error',
    });

    useSyncStore.getState().resetSync();

    const state = useSyncStore.getState();
    expect(state.syncStatus).toBe('idle');
    expect(state.conflicts).toEqual([]);
    expect(state.previewItems).toEqual([]);
    expect(state.error).toBe(null);
  });
});
