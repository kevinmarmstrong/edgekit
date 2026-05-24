import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { docsPages, docsPath } from './src/docsContent'

const crossOriginIsolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  base: '/edgekit/',
  plugins: [agentDocsPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'demo-ecommerce': resolve(__dirname, 'demos/ecommerce/index.html'),
        'demo-docs': resolve(__dirname, 'demos/docs/index.html'),
        'demo-ag-ui': resolve(__dirname, 'demos/ag-ui/index.html'),
        'demo-admin': resolve(__dirname, 'demos/admin/index.html'),
        'demo-mission-control': resolve(__dirname, 'demos/mission-control/index.html'),
        docs: resolve(__dirname, 'docs/index.html'),
        'docs-getting-started': resolve(__dirname, 'docs/getting-started/index.html'),
        'docs-concepts': resolve(__dirname, 'docs/concepts/index.html'),
        'docs-api': resolve(__dirname, 'docs/api/index.html'),
        'docs-advanced': resolve(__dirname, 'docs/advanced/index.html'),
        'docs-ecosystem': resolve(__dirname, 'docs/ecosystem/index.html'),
        'docs-ui': resolve(__dirname, 'docs/ui/index.html'),
        'docs-cli': resolve(__dirname, 'docs/cli/index.html'),
        'docs-testing': resolve(__dirname, 'docs/testing/index.html'),
        'docs-deployment': resolve(__dirname, 'docs/deployment/index.html'),
      },
    },
  },
  server: {
    port: 5174,
    headers: crossOriginIsolationHeaders,
  },
  preview: {
    headers: crossOriginIsolationHeaders,
  },
})

function agentDocsPlugin() {
  return {
    name: 'edgekit-agent-docs',
    generateBundle() {
      const markdownPages = docsPages.map(page => ({ page, markdown: pageToMarkdown(page) }))
      const links = markdownPages
        .map(({ page }) => `- [${page.title}](${docsPath(page)}): ${page.summary}`)
        .join('\n')
      const llms = `# edgekit

edgekit is a browser-native agent runtime with local-first, privacy-first defaults for adding AI workflows to existing web apps without making every interaction an unpredictable cloud-token cost. It uses browser-native models first, supports tuned model cascades and optional cloud fallback, and keeps app state, identity, tools, and approval boundaries under host control.

## Documentation

${links}

## Agent ingestion

- [Full documentation export](/llms-full.txt)
- [Overview Markdown](/docs.md)
- [Enterprise controls Markdown](/docs/advanced.md)
- [Ecosystem Markdown](/docs/ecosystem.md)

## Public demos

- [Ecommerce retrofit](/demos/ecommerce/)
- [Docs Q&A](/demos/docs/)
- [AG-UI event stream](/demos/ag-ui/)
- [SaaS admin workflow](/demos/admin/)
- [Mission control telemetry](/demos/mission-control/)

## Repository

- [GitHub](https://github.com/kevinmarmstrong/edgekit)
`
      const full = `# edgekit documentation export

${markdownPages.map(({ markdown }) => markdown).join('\n\n---\n\n')}
`
      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: llms })
      this.emitFile({ type: 'asset', fileName: 'llms-full.txt', source: full })
      for (const { page, markdown } of markdownPages) {
        const fileName = page.slug === 'overview' ? 'docs.md' : `docs/${page.slug}.md`
        this.emitFile({ type: 'asset', fileName, source: markdown })
        if (page.slug === 'overview') this.emitFile({ type: 'asset', fileName: 'docs/index.md', source: markdown })
      }
    },
  }
}

function pageToMarkdown(page: (typeof docsPages)[number]) {
  const sections = page.sections.map(section => {
    const body = section.body.join('\n\n')
    const bullets = section.bullets?.map(item => `- ${item}`).join('\n')
    const code = section.code ? `\n\n\`\`\`${section.code.language}\n${section.code.text}\n\`\`\`` : ''
    return [`## ${section.title}`, body, bullets, code].filter(Boolean).join('\n\n')
  })
  return [`# ${page.title}`, page.summary, ...sections].join('\n\n')
}
