import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@kevinmarmstrong\/edgekit$/, replacement: fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)) },
      { find: /^@kevinmarmstrong\/edgekit-agui$/, replacement: fileURLToPath(new URL('./packages/agui/src/index.ts', import.meta.url)) },
      { find: /^@kevinmarmstrong\/edgekit-governance$/, replacement: fileURLToPath(new URL('./packages/governance/src/index.ts', import.meta.url)) },
      { find: /^@kevinmarmstrong\/edgekit-knowledge$/, replacement: fileURLToPath(new URL('./packages/knowledge/src/index.ts', import.meta.url)) },
      { find: /^@kevinmarmstrong\/edgekit-mcp$/, replacement: fileURLToPath(new URL('./packages/mcp/src/index.ts', import.meta.url)) },
      { find: /^@kevinmarmstrong\/edgekit-skills$/, replacement: fileURLToPath(new URL('./packages/skills/src/index.ts', import.meta.url)) },
      { find: /^@kevinmarmstrong\/edgekit-ui$/, replacement: fileURLToPath(new URL('./packages/ui/src/index.ts', import.meta.url)) },
      { find: /^@kevinmarmstrong\/edgekit-react$/, replacement: fileURLToPath(new URL('./packages/react/src/index.ts', import.meta.url)) },
    ],
  },
  test: {
    environmentMatchGlobs: [
      ['packages/ui/**', 'jsdom'],
      ['packages/react/**', 'jsdom'],
      ['examples/**', 'jsdom'],
      ['site/**', 'jsdom'],
    ],
    environment: 'node',
    include: ['packages/**/*.test.ts', 'examples/**/*.test.ts', 'site/**/*.test.ts'],
  },
})
