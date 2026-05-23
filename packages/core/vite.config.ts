import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['ai', '@ai-sdk/provider', '@browser-ai/core', '@browser-ai/web-llm', 'zod'],
    },
  },
})
