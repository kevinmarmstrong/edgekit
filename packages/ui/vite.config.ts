import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        lite: 'src/lite.ts',
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: ['@kevinmarmstrong/edgekit', '@kevinmarmstrong/edgekit/lite', 'lit'],
    },
  },
})
