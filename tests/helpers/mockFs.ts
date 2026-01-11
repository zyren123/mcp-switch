import { vol } from 'memfs';
import { vi } from 'vitest';

/**
 * Create a virtual file system for testing
 */
export const createMockFs = (files: Record<string, string>) => {
  vol.reset();
  vol.fromJSON(files, '/');
};

/**
 * Reset the mock file system
 */
export const resetMockFs = () => {
  vol.reset();
};

/**
 * Get the current state of the mock file system
 */
export const getMockFsState = () => {
  return vol.toJSON();
};

/**
 * Setup fs mocks for a test
 * Call this in beforeEach
 */
export const setupFsMocks = () => {
  vi.mock('fs', async () => {
    const memfs = await import('memfs');
    return memfs.fs;
  });

  vi.mock('fs/promises', async () => {
    const memfs = await import('memfs');
    return memfs.fs.promises;
  });
};

/**
 * Cleanup fs mocks after a test
 * Call this in afterEach
 */
export const cleanupFsMocks = () => {
  vol.reset();
  vi.restoreAllMocks();
};
