import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'

export default defineConfig({
  site: 'https://kevinmarmstrong.github.io',
  base: '/edgekit',
  integrations: [mdx()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
})
