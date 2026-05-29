import './styles.css'
import { docsPages, docsPath, getDocsPage } from './docsContent'
import { mountSiteAssistant } from './siteAssistant'

const navGroups = [
  {
    title: 'Start',
    slugs: ['overview', 'should-i-use-edgekit', 'getting-started', 'public-site-qa', '30-minute-sidecar', 'faq', 'glossary'],
  },
  {
    title: 'Concepts',
    slugs: ['concepts', 'mission-profiles', 'knowledge-access', 'outcome-quality'],
  },
  {
    title: 'Recipes',
    slugs: ['framework-recipes', 'recipes', 'adoption-kit'],
  },
  {
    title: 'Production',
    slugs: [
      'production',
      'proof-center',
      'runtime-guarantees',
      'production-recipes',
      'security-threat-model',
      'advanced',
      'enterprise-evaluation',
      'migration-upgrades',
    ],
  },
  {
    title: 'Reference',
    slugs: ['api', 'ui', 'cli', 'ecosystem'],
  },
]
const hiddenNavSlugs = new Set([
  'testing',
  'reproducibility',
  'distribution-readiness',
  'adopter-simulation',
  'skill-optimization',
  'deployment',
])

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
const root = document.querySelector<HTMLElement>('#docs-root')
const pageSlug = document.body.dataset.docPage ?? 'overview'
const activePage = getDocsPage(pageSlug)
const activeGroup = getNavGroup(activePage.slug)

document.body.classList.add('docs-page')

if (root) {
  document.title = `${activePage.title} · edgekit docs`
  root.innerHTML = `
    <header class="site-header">
      <a class="brand" href="${withBase('/')}" aria-label="edgekit home">
        <span class="brand-mark">ek</span>
        <span>edgekit</span>
      </a>
      <nav aria-label="Docs navigation">
        <a href="${withBase('/docs/')}">Docs</a>
        <a href="${withBase('/#demos')}">Demos</a>
        <a href="https://github.com/kevinmarmstrong/edgekit">GitHub</a>
      </nav>
    </header>

    <main class="docs-shell">
      <aside class="docs-sidebar" aria-label="Documentation pages">
        <div class="docs-sidebar-header">
          <a class="docs-back" href="${withBase('/')}">edgekit</a>
          <p>Documentation</p>
        </div>
        <label class="docs-search">
          <span>Search docs</span>
          <input type="search" placeholder="Filter pages..." autocomplete="off" data-docs-filter>
        </label>
        <nav class="docs-nav" data-docs-nav>
          ${renderDocsNav()}
        </nav>
        <div class="docs-sidebar-links">
          <a href="${withBase('/llms.txt')}">llms.txt</a>
          <a href="${withBase('/llms-full.txt')}">Adopter context</a>
        </div>
      </aside>

      <article class="docs-article">
        <header class="docs-hero">
          <nav class="docs-breadcrumbs" aria-label="Breadcrumb">
            <a href="${withBase('/')}">Home</a>
            <span>/</span>
            <a href="${withBase('/docs/')}">Docs</a>
            <span>/</span>
            <span>${activeGroup}</span>
          </nav>
          <h1>${activePage.title}</h1>
          <p>${activePage.summary}</p>
          <div class="docs-utility-links" aria-label="Documentation utilities">
            <a href="${withBase(markdownPath(activePage.slug))}">Raw Markdown</a>
            <a href="${withBase('/llms-full.txt')}">Adopter export</a>
          </div>
        </header>

        ${activePage.sections.map(renderSection).join('')}

        <footer class="docs-next">
          ${renderPreviousNext()}
        </footer>
      </article>

      <aside class="docs-right-rail" aria-label="On this page">
        <p>On this page</p>
        <nav class="docs-toc">
          ${activePage.sections
            .map(section => `<a href="#${section.id}">${section.title}</a>`)
            .join('')}
        </nav>
      </aside>
    </main>
  `

  wireDocsEnhancements(root)
}

mountSiteAssistant()

function renderDocsNav() {
  const pagesBySlug = new Map(docsPages.map(page => [page.slug, page]))
  const groupedSlugs = new Set(navGroups.flatMap(group => group.slugs))
  const groupedNav = navGroups
    .map(group => {
      const links = group.slugs
        .map(slug => pagesBySlug.get(slug))
        .filter(Boolean)
        .map(page => renderDocsNavLink(page!))
        .join('')

      if (!links) return ''
      return `
        <section class="docs-nav-group" data-docs-group>
          <h2>${group.title}</h2>
          <div>${links}</div>
        </section>
      `
    })
    .join('')

  const uncategorizedLinks = docsPages
    .filter(page => !groupedSlugs.has(page.slug) && !hiddenNavSlugs.has(page.slug))
    .map(renderDocsNavLink)
    .join('')

  if (!uncategorizedLinks) return groupedNav

  return `${groupedNav}
    <section class="docs-nav-group" data-docs-group>
      <h2>Reference</h2>
      <div>${uncategorizedLinks}</div>
    </section>
  `
}

function renderDocsNavLink(page: (typeof docsPages)[number]) {
  return `
    <a
      class="${page.slug === activePage.slug ? 'current' : ''}"
      href="${withBase(docsPath(page))}"
      aria-label="${escapeAttribute(page.navLabel)}"
      data-docs-link
      data-docs-search="${escapeAttribute(`${page.navLabel} ${page.title} ${page.summary}`)}"
    >
      <span>${page.navLabel}</span>
      <small aria-hidden="true">${page.summary}</small>
    </a>
  `
}

function renderSection(section: (typeof activePage.sections)[number]) {
  return `
    <section class="docs-block" id="${section.id}">
      <h2>${section.title}</h2>
      ${section.body.map(paragraph => `<p>${formatInlineCode(paragraph)}</p>`).join('')}
      ${section.diagram ? renderDiagram(section.diagram) : ''}
      ${
        section.bullets
          ? `<ul>${section.bullets.map(item => `<li>${formatInlineCode(item)}</li>`).join('')}</ul>`
          : ''
      }
      ${
        section.code
          ? `<div class="docs-code-block">
              <div class="docs-code-header">
                <span>${section.code.language}</span>
                <button type="button" data-copy-code>Copy</button>
              </div>
              <pre><code data-language="${section.code.language}">${escapeHtml(section.code.text)}</code></pre>
            </div>`
          : ''
      }
    </section>
  `
}

function renderDiagram(
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
    return `
      <div class="architecture-diagram outcome-diagram" aria-label="Edgekit outcome hierarchy diagram">
        <article><span>Need</span><strong>Agents that do real work</strong><p>Search, compare, fill, guide, request, and move workflows forward inside existing software.</p></article>
        <article><span>Blockers</span><strong>Rewrite, data, cost, safety</strong><p>Teams need adoption without rebuilding apps, leaking context, creating runaway cloud spend, or bypassing approvals.</p></article>
        <article><span>Boundary</span><strong>Worker operates tool</strong><p>The app stays authoritative; the agent operates governed capabilities.</p></article>
        <article><span>Runtime</span><strong>Edgekit</strong><p>Local-first cascade, Skills, Profiles, approvals, UI, telemetry, audit, and outcome tests.</p></article>
      </div>
    `
  }
  if (diagram === 'transformation') {
    return `
      <div class="architecture-diagram transformation-diagram" aria-label="Self-service to agent-operated software diagram">
        <article><span>1</span><strong>Paper work</strong><p>People pushed forms, records, and approvals through manual processes.</p></article>
        <article><span>2</span><strong>Enterprise software</strong><p>Operators used systems to digitize records and enforce workflow.</p></article>
        <article><span>3</span><strong>Self-service</strong><p>Customers, employees, and vendors became the edge of data entry and support.</p></article>
        <article><span>4</span><strong>Agent-operated software</strong><p>Agent workers perform bounded software work for the user through governed tools.</p></article>
      </div>
    `
  }
  if (diagram === 'thesis-bridge') {
    return `
      <div class="architecture-diagram thesis-bridge-diagram" aria-label="Edgekit thesis bridge diagram">
        <article><span>Need</span><strong>Agents do useful work</strong><p>Inside real software, with real state, users, permissions, and workflows.</p></article>
        <article><span>Adopt</span><strong>Retrofit or build ready</strong><p>Start with one existing workflow, or design new apps with the agent boundary from day one.</p></article>
        <article><span>Separate</span><strong>Worker from tool</strong><p>The agent changes fast; the software remains authoritative and durable.</p></article>
        <article><span>Route</span><strong>Local first, cloud by choice</strong><p>Bounded app work runs at the edge; heavy reasoning escalates deliberately.</p></article>
        <article><span>Govern</span><strong>Tools, approvals, evidence</strong><p>Every action flows through app-owned permissions, telemetry, and audit.</p></article>
      </div>
    `
  }
  if (diagram === 'worker-tool') {
    return `
      <div class="architecture-diagram worker-tool-diagram" aria-label="Agent worker and software tool lifecycle diagram">
        <article><span>Agent worker</span><strong>Fast-changing layer</strong><p>Models, prompts, Skills, routing, provider mix, memory, and UX patterns improve continuously.</p></article>
        <article><span>Edgekit boundary</span><strong>Governed operation</strong><p>Tools, Profiles, approvals, policy, telemetry, audit, and fallback make the interaction explicit.</p></article>
        <article><span>Software tool</span><strong>Durable system</strong><p>State, auth, permissions, business logic, data access, persistence, compliance, and releases stay stable.</p></article>
      </div>
    `
  }
  if (diagram === 'local-cascade') {
    return `
      <div class="architecture-diagram local-cascade-diagram" aria-label="Local worker and cloud escalation diagram">
        <article><span>Routine work</span><strong>Local edge worker</strong><p>Read context, search app tools, prepare forms, compare fields, and step through user-like workflows.</p></article>
        <article><span>App boundary</span><strong>State + tools + permissions</strong><p>The host app decides what the worker can see, which tools exist, and what requires approval.</p></article>
        <article><span>Escalation</span><strong>Cloud only by choice</strong><p>Complex, risky, long-running, or policy-sensitive reasoning routes through developer-owned workers.</p></article>
      </div>
    `
  }
  if (diagram === 'runtime-loop') {
    return `
      <div class="architecture-diagram runtime-loop-diagram" aria-label="Edgekit runtime loop diagram">
        <article><span>1</span><strong>Hydrate context</strong><p>Identity summary, app state, selected memory, and mission profile.</p></article>
        <article><span>2</span><strong>Route model</strong><p>Chrome AI, WebLLM, cloud route, AG-UI backend, or fallback.</p></article>
        <article><span>3</span><strong>Call tools</strong><p>Read tools, Knowledge Access, MCP adapters, and app APIs.</p></article>
        <article><span>4</span><strong>Gate mutations</strong><p>Approval prompts, RBAC, audit trail, and backend authorization.</p></article>
        <article><span>5</span><strong>Render outcome</strong><p>Text, EdgeView cards/forms, activity states, telemetry, and evidence.</p></article>
      </div>
    `
  }
  return `
    <div class="architecture-diagram" aria-label="Edgekit architecture diagram">
      <article>
        <span>Host app owns</span>
        <strong>State, auth, APIs, business logic</strong>
        <p>Tools execute against the same backend, permissions, and records the app already trusts.</p>
      </article>
      <article>
        <span>Localization</span>
        <strong>Skills + Mission Profiles</strong>
        <p>Reviewable artifacts describe the mission, required tools, approvals, synthesis, UI hints, and tests.</p>
      </article>
      <article>
        <span>Edgekit owns</span>
        <strong>Agent runtime and UX contract</strong>
        <p>Provider cascade, tool loop, approvals, EdgeView, telemetry, audit primitives, and fallbacks.</p>
      </article>
      <article>
        <span>Providers</span>
        <strong>Local first, explicit escalation</strong>
        <p>Chrome AI, WebLLM, no-model fallback, AG-UI streams, or developer-owned cloud routes.</p>
      </article>
    </div>
  `
}

function renderPreviousNext() {
  const orderedPages = getOrderedDocsPages()
  const index = orderedPages.findIndex(page => page.slug === activePage.slug)
  const previous = orderedPages[index - 1]
  const next = orderedPages[index + 1]

  return `
    ${previous ? `<a href="${withBase(docsPath(previous))}">Previous: ${previous.navLabel}</a>` : '<span></span>'}
    ${next ? `<a href="${withBase(docsPath(next))}">Next: ${next.navLabel}</a>` : '<span></span>'}
  `
}

function getNavGroup(slug: string) {
  return navGroups.find(group => group.slugs.includes(slug))?.title ?? 'Reference'
}

function getOrderedDocsPages() {
  const pagesBySlug = new Map(docsPages.map(page => [page.slug, page]))
  const groupedSlugs = new Set(navGroups.flatMap(group => group.slugs))
  const groupedPages = navGroups
    .flatMap(group => group.slugs.map(slug => pagesBySlug.get(slug)))
    .filter(Boolean) as typeof docsPages
  const uncategorizedPages = docsPages.filter(page => !groupedSlugs.has(page.slug) && !hiddenNavSlugs.has(page.slug))
  return [...groupedPages, ...uncategorizedPages]
}

function markdownPath(slug: string) {
  return slug === 'overview' ? '/docs.md' : `/docs/${slug}.md`
}

function wireDocsEnhancements(container: HTMLElement) {
  const filter = container.querySelector<HTMLInputElement>('[data-docs-filter]')
  const links = Array.from(container.querySelectorAll<HTMLAnchorElement>('[data-docs-link]'))
  const groups = Array.from(container.querySelectorAll<HTMLElement>('[data-docs-group]'))

  filter?.addEventListener('input', () => {
    const query = filter.value.trim().toLowerCase()
    links.forEach(link => {
      const haystack = link.dataset.docsSearch?.toLowerCase() ?? link.textContent?.toLowerCase() ?? ''
      link.hidden = query.length > 0 && !haystack.includes(query)
    })
    groups.forEach(group => {
      const groupLinks = Array.from(group.querySelectorAll<HTMLAnchorElement>('[data-docs-link]'))
      group.hidden = groupLinks.every(link => link.hidden)
    })
  })

  container.querySelectorAll<HTMLButtonElement>('[data-copy-code]').forEach(button => {
    button.addEventListener('click', async () => {
      const block = button.closest('.docs-code-block')
      const code = block?.querySelector('code')?.textContent ?? ''
      if (!code) return

      try {
        await navigator.clipboard.writeText(code)
        button.textContent = 'Copied'
        window.setTimeout(() => {
          button.textContent = 'Copy'
        }, 1400)
      } catch {
        button.textContent = 'Unavailable'
        window.setTimeout(() => {
          button.textContent = 'Copy'
        }, 1400)
      }
    })
  })
}

function withBase(path: string) {
  if (path === '/') return `${basePath}/`
  if (path.startsWith('/#')) return `${basePath}/${path.slice(1)}`
  return `${basePath}${path}`
}

function formatInlineCode(text: string) {
  return escapeHtml(text).replace(/`([^`]+)`/g, '<code>$1</code>')
}

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeAttribute(text: string) {
  return escapeHtml(text).replaceAll('"', '&quot;')
}
