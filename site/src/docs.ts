import './styles.css'
import { docsPages, docsPath, getDocsPage } from './docsContent'
import { mountSiteAssistant } from './siteAssistant'

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
const root = document.querySelector<HTMLElement>('#docs-root')
const pageSlug = document.body.dataset.docPage ?? 'overview'
const activePage = getDocsPage(pageSlug)

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
        <a class="docs-back" href="${withBase('/')}">Home</a>
        <nav>
          ${docsPages
            .map(
              page => `
                <a class="${page.slug === activePage.slug ? 'current' : ''}" href="${withBase(docsPath(page))}">
                  ${page.navLabel}
                </a>
              `,
            )
            .join('')}
        </nav>
      </aside>

      <article class="docs-article">
        <header class="docs-hero">
          <p class="section-label">edgekit docs</p>
          <h1>${activePage.title}</h1>
          <p>${activePage.summary}</p>
        </header>

        <nav class="docs-toc" aria-label="On this page">
          ${activePage.sections
            .map(section => `<a href="#${section.id}">${section.title}</a>`)
            .join('')}
        </nav>

        ${activePage.sections.map(renderSection).join('')}

        <footer class="docs-next">
          ${renderPreviousNext()}
        </footer>
      </article>
    </main>
  `
}

mountSiteAssistant()

function renderSection(section: (typeof activePage.sections)[number]) {
  return `
    <section class="docs-block" id="${section.id}">
      <h2>${section.title}</h2>
      ${section.body.map(paragraph => `<p>${paragraph}</p>`).join('')}
      ${section.diagram ? renderDiagram(section.diagram) : ''}
      ${
        section.bullets
          ? `<ul>${section.bullets.map(item => `<li>${formatInlineCode(item)}</li>`).join('')}</ul>`
          : ''
      }
      ${
        section.code
          ? `<pre><code data-language="${section.code.language}">${escapeHtml(section.code.text)}</code></pre>`
          : ''
      }
    </section>
  `
}

function renderDiagram(diagram: 'architecture' | 'runtime-loop') {
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
        <strong>Sidecar runtime and UX contract</strong>
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
  const index = docsPages.findIndex(page => page.slug === activePage.slug)
  const previous = docsPages[index - 1]
  const next = docsPages[index + 1]

  return `
    ${previous ? `<a href="${withBase(docsPath(previous))}">Previous: ${previous.navLabel}</a>` : '<span></span>'}
    ${next ? `<a href="${withBase(docsPath(next))}">Next: ${next.navLabel}</a>` : '<span></span>'}
  `
}

function withBase(path: string) {
  if (path === '/') return `${basePath}/`
  if (path.startsWith('/#')) return `${basePath}/${path.slice(1)}`
  return `${basePath}${path}`
}

function formatInlineCode(text: string) {
  return text.replace(/`([^`]+)`/g, '<code>$1</code>')
}

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
