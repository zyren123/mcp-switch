import { defineConfig, mergeConfig } from 'vitest/config'
import baseConfig from './vitest.config'

export default mergeConfig(baseConfig, defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000
  }
}))
