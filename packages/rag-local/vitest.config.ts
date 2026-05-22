import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'rag-local',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
})
