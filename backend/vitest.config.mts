import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
})
