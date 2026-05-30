import { defineConfig } from 'vite'

// Self-contained: imports the published @kevinmarmstrong/edgekit, no local-core alias.
// This folder is meant to live in the demo repo, independent of the core package source.
export default defineConfig({
  server: { port: 4173 },
})
