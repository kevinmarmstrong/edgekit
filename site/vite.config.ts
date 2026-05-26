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
        'demo-operations': resolve(__dirname, 'demos/operations/index.html'),
        'demo-docs': resolve(__dirname, 'demos/docs/index.html'),
        'demo-ag-ui': resolve(__dirname, 'demos/ag-ui/index.html'),
        'demo-admin': resolve(__dirname, 'demos/admin/index.html'),
        'demo-mission-control': resolve(__dirname, 'demos/mission-control/index.html'),
        docs: resolve(__dirname, 'docs/index.html'),
        'docs-getting-started': resolve(__dirname, 'docs/getting-started/index.html'),
        'docs-30-minute-sidecar': resolve(__dirname, 'docs/30-minute-sidecar/index.html'),
        'docs-adoption-kit': resolve(__dirname, 'docs/adoption-kit/index.html'),
        'docs-recipes': resolve(__dirname, 'docs/recipes/index.html'),
        'docs-concepts': resolve(__dirname, 'docs/concepts/index.html'),
        'docs-knowledge-access': resolve(__dirname, 'docs/knowledge-access/index.html'),
        'docs-api': resolve(__dirname, 'docs/api/index.html'),
        'docs-advanced': resolve(__dirname, 'docs/advanced/index.html'),
        'docs-ecosystem': resolve(__dirname, 'docs/ecosystem/index.html'),
        'docs-ui': resolve(__dirname, 'docs/ui/index.html'),
        'docs-mission-profiles': resolve(__dirname, 'docs/mission-profiles/index.html'),
        'docs-skill-optimization': resolve(__dirname, 'docs/skill-optimization/index.html'),
        'docs-production': resolve(__dirname, 'docs/production/index.html'),
        'docs-reproducibility': resolve(__dirname, 'docs/reproducibility/index.html'),
        'docs-runtime-guarantees': resolve(__dirname, 'docs/runtime-guarantees/index.html'),
        'docs-distribution-readiness': resolve(__dirname, 'docs/distribution-readiness/index.html'),
        'docs-production-recipes': resolve(__dirname, 'docs/production-recipes/index.html'),
        'docs-security-threat-model': resolve(__dirname, 'docs/security-threat-model/index.html'),
        'docs-migration-upgrades': resolve(__dirname, 'docs/migration-upgrades/index.html'),
        'docs-outcome-quality': resolve(__dirname, 'docs/outcome-quality/index.html'),
        'docs-adopter-simulation': resolve(__dirname, 'docs/adopter-simulation/index.html'),
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

The project should be understood as open-source agent infrastructure, not a SaaS landing page. Developers usually arrive with a concrete blocker: unbounded token spend, sensitive app context, existing APIs that must remain authoritative, model-fit tradeoffs, slow orchestration, offline workflows, mutation approvals, auditability, RBAC-filtered tools, or safe MCP integration. The documentation maps those problems to Edgekit primitives.

## Documentation

${links}

## Agent ingestion

- [Full documentation export](/llms-full.txt)
- [Overview Markdown](/docs.md)
- [Adoption Kit Markdown](/docs/adoption-kit.md)
- [Recipe Catalog Markdown](/docs/recipes.md)
- [Enterprise controls Markdown](/docs/advanced.md)
- [Ecosystem Markdown](/docs/ecosystem.md)
- [Knowledge Access Markdown](/docs/knowledge-access.md)
- [Reproducibility Markdown](/docs/reproducibility.md)

## Public demos

- [Ecommerce retrofit](/demos/ecommerce/)
- [Field ops ERP](/demos/operations/)
- [Docs Q&A](/demos/docs/)
- [AG-UI event stream](/demos/ag-ui/)
- [SaaS admin workflow](/demos/admin/)
- [Mission control telemetry](/demos/mission-control/)

## Repository

- [GitHub](https://github.com/kevinmarmstrong/edgekit)
`
      const full = boundedFullExport(markdownPages)

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

function boundedFullExport(markdownPages: Array<{ markdown: string }>) {
  const maxChars = 49_000
  const header = '# edgekit documentation export\n\n'
  const note = '\n\n---\n\nExport truncated to keep llms-full.txt below the 50K-character agent-ingestion budget. Use the individual /docs/*.md endpoints for complete page-level context.\n'
  let full = header
  for (const { markdown } of markdownPages) {
    const addition = `${full === header ? '' : '\n\n---\n\n'}${markdown}`
    if ((full + addition).length + note.length > maxChars) {
      const remaining = maxChars - full.length - note.length
      if (remaining > 500) {
        full += `${full === header ? '' : '\n\n---\n\n'}${markdown.slice(0, remaining).replace(/\n[^\n]*$/, '')}`
      }
      full += note
      return full
    }
    full += addition
  }
  return full
}

function pageToMarkdown(page: (typeof docsPages)[number]) {
  const sections = page.sections.map(section => {
    const body = section.body.join('\n\n')
    const diagram = section.diagram ? `\n\n${diagramToMermaid(section.diagram)}` : ''
    const bullets = section.bullets?.map(item => `- ${item}`).join('\n')
    const code = section.code ? `\n\n\`\`\`${section.code.language}\n${section.code.text}\n\`\`\`` : ''
    return [`## ${section.title}`, body + diagram, bullets, code].filter(Boolean).join('\n\n')
  })
  return [`# ${page.title}`, page.summary, ...sections].join('\n\n')
}

function diagramToMermaid(diagram: 'architecture' | 'runtime-loop') {
  if (diagram === 'runtime-loop') {
    return `\`\`\`mermaid
flowchart LR
  A[Hydrate context] --> B[Route model]
  B --> C[Call app tools]
  C --> D{Risky mutation?}
  D -- yes --> E[Approval + audit]
  D -- no --> F[Render outcome]
  E --> F
  F --> G[Telemetry + evidence]
\`\`\``
  }

  return `\`\`\`mermaid
flowchart LR
  App[Host app owns state, auth, APIs, business logic] --> Skills[Skills + Mission Profiles]
  Skills --> Runtime[Edgekit sidecar runtime]
  Runtime --> Providers[Chrome AI, WebLLM, cloud route, AG-UI, fallback]
  Runtime --> Tools[App-owned tools and Knowledge Access]
  Tools --> App
\`\`\``
}
