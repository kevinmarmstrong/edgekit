import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { docsPages, docsPath } from './src/docsContent'

const siteBase = '/edgekit/'

const crossOriginIsolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  base: siteBase,
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
        'demo-cascade': resolve(__dirname, 'demos/cascade/index.html'),
        docs: resolve(__dirname, 'docs/index.html'),
        'docs-should-i-use-edgekit': resolve(__dirname, 'docs/should-i-use-edgekit/index.html'),
        'docs-getting-started': resolve(__dirname, 'docs/getting-started/index.html'),
        'docs-30-minute-sidecar': resolve(__dirname, 'docs/30-minute-sidecar/index.html'),
        'docs-framework-recipes': resolve(__dirname, 'docs/framework-recipes/index.html'),
        'docs-faq': resolve(__dirname, 'docs/faq/index.html'),
        'docs-glossary': resolve(__dirname, 'docs/glossary/index.html'),
        'docs-adoption-kit': resolve(__dirname, 'docs/adoption-kit/index.html'),
        'docs-recipes': resolve(__dirname, 'docs/recipes/index.html'),
        'docs-proof-center': resolve(__dirname, 'docs/proof-center/index.html'),
        'docs-enterprise-evaluation': resolve(__dirname, 'docs/enterprise-evaluation/index.html'),
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
      const maintainerSlugs = new Set([
        'proof-center',
        'testing',
        'reproducibility',
        'distribution-readiness',
        'adopter-simulation',
        'skill-optimization',
        'deployment',
      ])
      const adopterPages = markdownPages.filter(({ page }) => !maintainerSlugs.has(page.slug))
      const maintainerPages = markdownPages.filter(({ page }) => maintainerSlugs.has(page.slug))
      const adopterLinks = adopterPages
        .map(({ page }) => `- [${page.title}](${publicDocsPath(docsPath(page))}): ${page.summary}`)
        .join('\n')
      const maintainerLinks = maintainerPages
        .map(({ page }) => `- [${page.title}](${publicDocsPath(docsPath(page))}): ${page.summary}`)
        .join('\n')
      const llms = `# edgekit

Edgekit helps teams add agents to existing web apps without rewriting the software, taking control of app state, or turning every prompt into cloud spend.

Use Edgekit when an agent belongs inside a product workflow and must operate app-owned tools, preserve host-app authority, prefer Chrome AI or WebLLM for routine app work before explicit fallback routes, and expose visible approval, telemetry, audit, and generative UI contracts. Treat it as open-source agent infrastructure, not a hosted chatbot service.

## Adopter implementation context

${adopterLinks}

## Maintainer and release evidence

${maintainerLinks}

## Agent ingestion

- [Adopter implementation export](${publicDocsPath('/llms-full.txt')})
- [Maintainer/release export](${publicDocsPath('/llms-maintainers.txt')})
- [Overview Markdown](${publicDocsPath('/docs.md')})
- [Should I Use Edgekit? Markdown](${publicDocsPath('/docs/should-i-use-edgekit.md')})
- [Framework Recipes Markdown](${publicDocsPath('/docs/framework-recipes.md')})
- [FAQ Markdown](${publicDocsPath('/docs/faq.md')})
- [Glossary Markdown](${publicDocsPath('/docs/glossary.md')})
- [Adoption Kit Markdown](${publicDocsPath('/docs/adoption-kit.md')})
- [Recipe Catalog Markdown](${publicDocsPath('/docs/recipes.md')})
- [Enterprise controls Markdown](${publicDocsPath('/docs/advanced.md')})
- [Ecosystem Markdown](${publicDocsPath('/docs/ecosystem.md')})
- [Knowledge Access Markdown](${publicDocsPath('/docs/knowledge-access.md')})
- [Reproducibility Markdown](${publicDocsPath('/docs/reproducibility.md')})

## Public demos

- [Ecommerce retrofit](${publicDocsPath('/demos/ecommerce/')})
- [Field ops ERP](${publicDocsPath('/demos/operations/')})
- [Docs Q&A](${publicDocsPath('/demos/docs/')})
- [AG-UI event stream](${publicDocsPath('/demos/ag-ui/')})
- [SaaS admin workflow](${publicDocsPath('/demos/admin/')})
- [Mission control telemetry](${publicDocsPath('/demos/mission-control/')})
- [Cascade and permission lab](${publicDocsPath('/demos/cascade/')})

## Repository

- [GitHub](https://github.com/kevinmarmstrong/edgekit)
`
      const full = boundedFullExport(adopterPages, 'edgekit adopter implementation export')
      const maintainers = boundedFullExport(
        maintainerPages,
        'edgekit maintainer and release evidence export',
      )

      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: llms })
      this.emitFile({ type: 'asset', fileName: 'llms-full.txt', source: full })
      this.emitFile({ type: 'asset', fileName: 'llms-maintainers.txt', source: maintainers })
      for (const { page, markdown } of markdownPages) {
        const fileName = page.slug === 'overview' ? 'docs.md' : `docs/${page.slug}.md`
        this.emitFile({ type: 'asset', fileName, source: markdown })
        if (page.slug === 'overview') this.emitFile({ type: 'asset', fileName: 'docs/index.md', source: markdown })
      }
    },
  }
}

function publicDocsPath(path: string) {
  return `${siteBase.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

function boundedFullExport(markdownPages: Array<{ markdown: string }>, title: string) {
  const maxChars = 49_000
  const header = `# ${title}\n\n`
  const note = '\n\n---\n\nExport truncated to keep this file below the 50K-character agent-ingestion budget. Use the individual /docs/*.md endpoints for complete page-level context.\n'
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

function diagramToMermaid(
  diagram:
    | 'outcome-hierarchy'
    | 'transformation'
    | 'thesis-bridge'
    | 'worker-tool'
    | 'local-cascade'
    | 'architecture'
    | 'runtime-loop',
) {
  if (diagram === 'outcome-hierarchy') {
    return `\`\`\`mermaid
flowchart LR
  Need[Agents that do real work inside apps] --> Blockers[Rewrite risk, data exposure, token cost, unsafe mutations]
  Blockers --> Boundary[Separate agent worker from software tool]
  Boundary --> Runtime[Edgekit runtime: local cascade, governed tools, approvals, telemetry, audit]
\`\`\``
  }
  if (diagram === 'transformation') {
    return `\`\`\`mermaid
flowchart LR
  Paper[Paper work] --> Enterprise[Enterprise software]
  Enterprise --> SelfService[Self-service portals]
  SelfService --> Agents[Agent-operated software]
\`\`\``
  }
  if (diagram === 'thesis-bridge') {
    return `\`\`\`mermaid
flowchart LR
  Need[Agents do useful work inside apps] --> Adopt[Retrofit existing workflows or build agent-ready apps]
  Adopt --> Separate[Separate agent worker from software tool]
  Separate --> Route[Local edge worker first, cloud escalation by choice]
  Route --> Govern[Governed tools, approvals, telemetry, audit]
\`\`\``
  }
  if (diagram === 'worker-tool') {
    return `\`\`\`mermaid
flowchart LR
  Worker[Agent worker: models, prompts, Skills, routing] --> Boundary[Edgekit boundary: governed tools, approvals, telemetry, audit]
  Boundary --> Tool[Software tool: state, auth, permissions, business logic]
  Tool --> Boundary
\`\`\``
  }
  if (diagram === 'local-cascade') {
    return `\`\`\`mermaid
flowchart LR
  Routine[Routine app work] --> Local[Local edge worker: Chrome AI or WebLLM]
  Complex[Heavy or risky reasoning] --> Cloud[Developer-owned cloud worker]
  Local --> AppBoundary[App boundary: state summaries, allowed tools, approvals]
  Cloud --> AppBoundary
\`\`\``
  }
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
