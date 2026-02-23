import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/e2e/**/*.e2e.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    setupFiles: ['src/e2e/setup.ts'],
  }
})
