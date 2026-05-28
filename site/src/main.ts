import '@kevinmarmstrong/edgekit-ui'
import {
  createMissionControl,
  tool,
} from '@kevinmarmstrong/edgekit'
import { createAgUiAgent } from '@kevinmarmstrong/edgekit-agui'
import { mountOpsDemo } from './opsDemo'
import type { EdgeViewNode, MissionControlSnapshot } from '@kevinmarmstrong/edgekit'
import type { AgUiRunInput } from '@kevinmarmstrong/edgekit-agui'
import type { EdgeChat } from '@kevinmarmstrong/edgekit-ui'
import { z } from 'zod'
import { searchDocs } from './content'
import { docsPages, docsPath } from './docsContent'
import { mountSiteAssistant } from './siteAssistant'
import { mountCascadeDemo } from './cascadeDemo'
import './styles.css'

const missionControl = createMissionControl()
missionControl.subscribe((_event, snapshot) => renderMissionControl(snapshot))
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
const externalEcommerceDemoUrl = 'https://edgekit-demo-ecommerce.pages.dev/'
const externalDocsDemoUrl = 'https://edgekit-demo-docs.pages.dev/'
const externalAdminDemoUrl = 'https://edgekit-demo-admin.pages.dev/'

const createSupportTicket = tool({
  description: 'Create a support ticket from a user-confirmed form.',
  inputSchema: z.object({
    category: z.string(),
    priority: z.string(),
  }),
  execute: async ({ category, priority }) => ({
    success: true,
    ticketId: `SUP-${category.toUpperCase()}-${priority.toUpperCase()}`,
    category,
    priority,
  }),
})

const submitDemoRequest = tool({
  description: 'Submit a sample AG-UI form from the public demo.',
  inputSchema: z.object({
    name: z.string(),
    useCase: z.string(),
    urgency: z.string(),
  }),
  execute: async input => ({
    success: true,
    requestId: `DEMO-${String(input.useCase).toUpperCase()}`,
    ...input,
  }),
})

const agUiChat = document.querySelector<EdgeChat>('edge-chat#agui-chat')
agUiChat?.configure({ sessionId: 'site-agui-demo', telemetry: missionControl })
agUiChat?.registerTools({ createSupportTicket, submitDemoRequest })
agUiChat?.useAgent(createAgUiAgent({ run: mockAgUiRun, sessionId: 'site-agui-demo', telemetry: missionControl }))

renderHomePage()
void renderGitHubStars()
renderDocCards()
renderMissionControl()
wireDocSearch()
mountOpsDemo()
mountCascadeDemo()
mountSiteAssistant({ telemetry: missionControl })

function renderHomePage() {
  const home = document.querySelector<HTMLElement>('main#top')
  if (!home) return

  document.body.classList.add('docs-page', 'home-docs-page')

  home.classList.add('home-overview-shell')
  home.innerHTML = `
    <section class="hero home-hero" aria-labelledby="home-title">
      <div class="hero-copy home-hero-copy">
        <p class="hero-kicker">Open source agent workflows</p>
        <h1 id="home-title">Add an AI agent to your existing app. Don't rewrite the app.</h1>
        <p>
          Two lines of HTML. The agent runs in the user's browser, calls your existing APIs as tools,
          and falls back to the cloud only when it has to. Open source, MIT.
        </p>
        <div class="hero-actions home-hero-actions" aria-label="Primary Edgekit links">
          <a class="button primary" href="https://github.com/kevinmarmstrong/edgekit-demo-ecommerce#quickstart">Quickstart (60 seconds)</a>
          <a class="button secondary" href="https://github.com/kevinmarmstrong/edgekit">Star on GitHub <span id="github-star-count">(★)</span></a>
          <a class="button secondary" href="${externalEcommerceDemoUrl}">Watch the 90s demo</a>
        </div>
        <div class="home-embed-snippet" aria-label="Copyable Edgekit embed snippet">
          <div class="home-snippet-label">
            <span>Embed</span>
            <small>Mount the component, choose the local-first cascade, register your tools.</small>
          </div>
          <pre class="home-code"><code>&lt;edge-chat id="agent"&gt;&lt;/edge-chat&gt;
import { chromeAI, webLLM } from '@kevinmarmstrong/edgekit'
agent.configure({ model: [chromeAI(), webLLM(), appCloudRoute] })
agent.registerTools({ searchProducts, addToCart })</code></pre>
        </div>
      </div>
      <div class="hero-visual home-demo-visual" aria-label="Live ecommerce demo preview">
        <img src="${withBase('/ecommerce-demo.gif')}" alt="Live ecommerce demo showing catalog search, tool-backed answers, and guarded add-to-cart approval" />
        <p>Running on the Cloudflare Pages COOP/COEP mirror. Browser-local path ready; GitHub Pages remains the fallback/no-model reference.</p>
      </div>
    </section>

    <section class="value-section home-value-section" id="value-props">
      <div class="section-heading">
        <p class="section-label">Problem to solution</p>
        <h2>Three production blockers Edgekit absorbs.</h2>
        <p>
          The provider matrix is evidence by lane, not a blended score. These cards name the
          production friction and the proof shape that supports each claim.
        </p>
      </div>
      <div class="value-matrix" aria-label="Edgekit challenge and solution matrix">
        <article>
          <span class="value-label">Cost</span>
          <h3>Cloud tokens should not be the default meter.</h3>
          <p>No-model fallback row: success rate 1.0 means a useful basic answer shipped with no provider route configured.</p>
          <span class="value-label solution">edgekit</span>
          <p>Try Chrome AI and WebLLM first, then escalate only through an app-owned route when the workflow justifies it.</p>
        </article>
        <article>
          <span class="value-label">Authority</span>
          <h3>Your app remains the system of record.</h3>
          <p>Provider rows track tool-call accuracy separately from latency so "answered" cannot hide broken app execution.</p>
          <span class="value-label solution">edgekit</span>
          <p>Register existing APIs as typed tools while auth, state, permissions, and business rules stay in the host app.</p>
        </article>
        <article>
          <span class="value-label">Guardrails</span>
          <h3>Risky mutations need visible consent and evidence.</h3>
          <p>Workflow gates require 0 required safety failures before a release claim is credible.</p>
          <span class="value-label solution">edgekit</span>
          <p>Use approvals, telemetry, and audit events around actions that change carts, accounts, records, or plans.</p>
        </article>
      </div>
    </section>

    <section class="docs-section home-summary-section" id="overview">
      <div class="section-heading">
        <p class="section-label">Builder overview</p>
        <h2>Why teams use Edgekit</h2>
        <p>
          Edgekit is for teams that already have, or are building, real software workflows. It
          starts from the outcome: let agents operate the software through governed boundaries
          instead of becoming a second, unsafe application.
        </p>
      </div>
      <div class="home-summary-grid">
        <article class="doc-card">
          <span>Retrofit path</span>
          <h3>Add agents where the work already happens.</h3>
          <p>Expose existing APIs and functions as typed tools instead of rebuilding workflows around a new agent backend.</p>
        </article>
        <article class="doc-card">
          <span>0-to-1 path</span>
          <h3>Build agent-ready boundaries from day one.</h3>
          <p>Design APIs, permissions, workflow state, and outcome tests so agents can operate the product without becoming the product.</p>
        </article>
        <article class="doc-card">
          <span>Worker / tool split</span>
          <h3>Let the agent evolve without destabilizing the app.</h3>
          <p>Models, prompts, Skills, and routing can change quickly while the software tool keeps durable state, rules, and release discipline.</p>
        </article>
        <article class="doc-card">
          <span>Local worker role</span>
          <h3>Use local models for bounded app work.</h3>
          <p>Reading context, searching records, filling forms, and stepping through workflows can run at the edge before cloud escalation is considered.</p>
        </article>
      </div>
    </section>

    <section class="docs-section home-arc-section" id="thesis">
      <div class="section-heading">
        <p class="section-label">Transformation arc</p>
        <h2>From self-service software to agent-operated software.</h2>
        <p>
          Software has moved work outward for decades. Edgekit is built for the next step:
          agents doing more of that user-delegated work through explicit app-owned tools.
        </p>
      </div>
      <div class="transformation-diagram" aria-label="Software transformation from paper to agent-operated workflows">
        <article><span>1</span><strong>Paper work</strong><p>Back offices and clerks carried the workflow.</p></article>
        <article><span>2</span><strong>Enterprise software</strong><p>Operators moved records through systems.</p></article>
        <article><span>3</span><strong>Self-service portals</strong><p>Customers and employees became the edge of the workflow.</p></article>
        <article><span>4</span><strong>Agent-operated software</strong><p>Agent workers operate governed tools on behalf of the user.</p></article>
      </div>
      <div class="thesis-bridge-diagram" aria-label="Edgekit story from need to implementation">
        <article><span>Need</span><strong>Agents do useful work</strong><p>Inside real software, with real app state and workflows.</p></article>
        <article><span>Adopt</span><strong>Retrofit or build ready</strong><p>Start with one existing workflow, or design new apps with the boundary from day one.</p></article>
        <article><span>Separate</span><strong>Worker from tool</strong><p>The agent changes fast; the software remains authoritative.</p></article>
        <article><span>Route</span><strong>Local first, cloud by choice</strong><p>Bounded app work runs at the edge; heavy reasoning escalates deliberately.</p></article>
        <article><span>Govern</span><strong>Tools, approvals, evidence</strong><p>Every action flows through app-owned permissions, telemetry, and audit.</p></article>
      </div>
    </section>

    <section class="how-section home-proof-section" id="how-it-works">
      <div class="section-heading">
        <p class="section-label">Proof and architecture</p>
        <h2>Designed around the hard parts of production agent workflows.</h2>
        <p>
          The runtime packages capabilities as Skills, assembles them into Mission Profiles, and
          validates real user-visible outcomes with the research harness.
        </p>
      </div>
      <div class="home-proof-grid">
        <article>
          <span>Skills + profiles</span>
          <h3>Localize the agent without forking the runtime.</h3>
          <p>Skills describe capabilities. Mission Profiles compose those Skills for one app surface with mission-specific synthesis and safety rules.</p>
        </article>
        <article>
          <span>Cascade + permissions</span>
          <h3>Route deliberately, expose tools conditionally.</h3>
          <p>Use Chrome AI/WebLLM readiness, explicit fallback, identity-aware tool hydration, RBAC manifests, and approval gates for risky actions.</p>
        </article>
        <article>
          <span>Testing proof</span>
          <h3>Measure whether facts survive to the user.</h3>
          <p>The adoption and research loops score answer quality, synthesis faithfulness, workflow state, safety, observability, and fallback behavior.</p>
        </article>
      </div>
    </section>

    <section class="docs-section home-quickstart-section" id="quick-start">
      <div class="section-heading">
        <p class="section-label">Quick start</p>
        <h2>The shortest path to a real agentic workflow.</h2>
        <p>
          Start with one mission, define two or three Skills, mount the component, register tools,
          and run the outcome checks before adding broader routing or integrations.
        </p>
      </div>
      <div class="home-quickstart-grid">
        <ol class="home-checklist">
          <li><strong>Choose one workflow.</strong><span>Support triage, catalog help, admin changes, docs Q&A, or intake.</span></li>
          <li><strong>Create Skills.</strong><span>Package tool contracts, descriptions, examples, approval policy, and synthesis expectations.</span></li>
          <li><strong>Apply a Mission Profile.</strong><span>Keep mission-specific instructions app-owned and versioned outside core.</span></li>
          <li><strong>Register app tools.</strong><span>Call existing APIs and keep secrets, auth, and business rules in execution context.</span></li>
          <li><strong>Validate outcomes.</strong><span>Run typecheck, build, e2e, adoption evals, and research scenarios as the surface matures.</span></li>
        </ol>
        <pre class="home-code"><code>import '@kevinmarmstrong/edgekit-ui'
import { chromeAI } from '@kevinmarmstrong/edgekit'
import { supportProfile } from './edgekit/support-profile'

const chat = document.querySelector('edge-chat')
chat.configure({ model: [chromeAI()] })
chat.applyMissionProfile(supportProfile)
chat.registerTools({ searchCases, createTicket })</code></pre>
      </div>
    </section>

    <section class="docs-section home-docs-section" id="docs">
      <div class="section-heading">
        <p class="section-label">Documentation map</p>
        <h2>Read by job, not by marketing funnel.</h2>
        <p>
          The docs are organized around adoption paths, architecture boundaries, API surfaces,
          production controls, testing, and deployment.
        </p>
      </div>
      <div class="doc-card-grid" id="doc-card-grid"></div>
    </section>

    <section class="demos-section home-demo-catalog" id="demos">
      <div class="section-heading">
        <p class="section-label">Demo catalog</p>
        <h2>Working surfaces that keep their integration boundaries visible.</h2>
        <p>
          Ecommerce, Docs Q&A, and SaaS admin now run as external packed-package proofs. The
          remaining demos are internal previews until their replacement repos are live.
        </p>
      </div>
      <div class="demo-grid">
        <a class="demo-card active" href="${externalEcommerceDemoUrl}">
          <span>Public catalog</span>
          <strong>External COOP/COEP packed-package demo with product search, generated CTAs, and guarded add-to-cart.</strong>
        </a>
        <a class="demo-card active-secondary" href="${externalDocsDemoUrl}">
          <span>External: Docs Q&A</span>
          <strong>Knowledge Access over app-owned docs with citations and transparent fallback.</strong>
        </a>
        <a class="demo-card active-secondary" href="${withBase('/demos/operations/')}">
          <span>Internal preview: Field ops ERP</span>
          <strong>Work orders, inventory reservation, and technician dispatch in one workflow.</strong>
        </a>
        <a class="demo-card active-secondary" href="${externalAdminDemoUrl}">
          <span>External: SaaS admin</span>
          <strong>Account search, approval-gated plan changes, app-owned state, and audit.</strong>
        </a>
        <a class="demo-card" href="${withBase('/demos/ag-ui/')}">
          <span>Internal preview: AG-UI adapter</span>
          <strong>Remote event streams rendered into declarative EdgeView UI.</strong>
        </a>
        <a class="demo-card" href="${withBase('/demos/cascade/')}">
          <span>Internal preview: Cascade lab</span>
          <strong>Browser model readiness, permission states, fallbacks, and feature gating.</strong>
        </a>
        <a class="demo-card" href="${withBase('/demos/mission-control/')}">
          <span>Internal preview: Mission control</span>
          <strong>Telemetry, approvals, errors, and tool usage hooks for product teams.</strong>
        </a>
      </div>
    </section>

    <section class="docs-section home-reference-section" aria-labelledby="reference-title">
      <div class="section-heading">
        <p class="section-label">Reference links</p>
        <h2 id="reference-title">Common next reads</h2>
        <p>Direct entry points for implementation details, agent-readable context, and production review.</p>
      </div>
      <div class="primitive-list home-link-list" aria-label="Edgekit reference links">
        <a href="${withBase('/docs/should-i-use-edgekit/')}">Should I use it?</a>
        <a href="${withBase('/docs/mission-profiles/')}">Mission Profiles</a>
        <a href="${withBase('/docs/framework-recipes/')}">Framework recipes</a>
        <a href="${withBase('/docs/production-recipes/')}">Production recipes</a>
        <a href="${withBase('/docs/enterprise-evaluation/')}">Enterprise evaluation</a>
        <a href="${withBase('/docs/security-threat-model/')}">Threat model</a>
        <a href="${withBase('/docs/proof-center/')}">Proof center</a>
        <a href="${withBase('/llms-full.txt')}">Agent context</a>
      </div>
    </section>
  `
}

async function renderGitHubStars() {
  const target = document.querySelector<HTMLElement>('#github-star-count')
  if (!target) return
  try {
    const response = await fetch('https://api.github.com/repos/kevinmarmstrong/edgekit')
    if (!response.ok) return
    const repo = await response.json() as { stargazers_count?: number }
    if (typeof repo.stargazers_count === 'number') {
      target.textContent = `(★ ${repo.stargazers_count})`
    }
  } catch {
    // Static fallback keeps the CTA usable when GitHub is blocked.
  }
}

function renderDocCards() {
  const grid = document.querySelector<HTMLElement>('#doc-card-grid')
  if (!grid) return

  grid.innerHTML = docsPages
    .map(
      page => `
        <a class="doc-card" href="${docsHref(page.slug)}">
          <span>${page.navLabel}</span>
          <h3>${page.title}</h3>
          <p>${page.summary}</p>
        </a>
      `,
    )
    .join('')
}

function docsHref(slug: string) {
  const page = docsPages.find(candidate => candidate.slug === slug)
  return page ? withBase(docsPath(page)) : withBase('/docs/')
}

function withBase(path: string) {
  if (path === '/') return `${basePath}/`
  if (path.startsWith('/#')) return `${basePath}/${path.slice(1)}`
  return `${basePath}${path}`
}

async function* mockAgUiRun({ input }: AgUiRunInput) {
  const normalized = input.toLowerCase()
  if (normalized.includes('component') || normalized.includes('ui')) {
    yield* renderAgUiDemoResponse(
      'This Pages demo is a scripted AG-UI stream. It can still show the EdgeView component contract that a real AG-UI backend would emit dynamically.',
      componentCatalogView(),
    )
    return
  }

  if (normalized.includes('hard coded') || normalized.includes('hardcoded') || normalized.includes('same example')) {
    yield* renderAgUiDemoResponse(
      'Yes. This public Pages demo uses a local scripted AG-UI event source so the repo can be tested without a backend. In production, replace the script with createAgUiAgent({ endpoint }) from @kevinmarmstrong/edgekit-agui and stream events from your agent provider.',
      transparencyView(),
    )
    return
  }

  if (normalized.includes('form')) {
    yield* renderAgUiDemoResponse(
      'Here is a sample EdgeView form emitted through the AG-UI adapter. The app still owns the tool execution when you submit it.',
      sampleFormView(),
    )
    return
  }

  yield* renderAgUiDemoResponse(
    'This response came from a scripted AG-UI-compatible event stream. Edgekit translated the stream into text plus a declarative EdgeView payload.',
    supportQueueView(),
  )
}

async function* renderAgUiDemoResponse(message: string, view: EdgeViewNode | EdgeViewNode[]) {
  yield {
    type: 'TEXT_MESSAGE_CONTENT',
    delta: message,
  }

  yield {
    type: 'CUSTOM',
    name: 'edgekit.view',
    value: view,
  }

  yield { type: 'RUN_FINISHED' }
}

function componentCatalogView(): EdgeViewNode[] {
  return [
    {
      type: 'table',
      id: 'edgeview-components',
      columns: [
        { key: 'component', label: 'Component' },
        { key: 'use', label: 'Use' },
      ],
      rows: [
        { component: 'Text', use: 'Streaming assistant copy or generated explanation' },
        { component: 'Card', use: 'Grouped recommendations, summaries, and action containers' },
        { component: 'Form', use: 'User-confirmed inputs before app-owned tool execution' },
        { component: 'Table', use: 'Comparable records, status lists, and result sets' },
        { component: 'Chart', use: 'Simple bar charts for metrics and queues' },
      ],
    },
    {
      type: 'card',
      id: 'agui-provider-note',
      title: 'Provider path',
      description:
        'A real AG-UI provider can choose these views at runtime. The public Pages demo is scripted only so it can run without a server.',
    },
  ]
}

function transparencyView(): EdgeViewNode {
  return {
    type: 'card',
    id: 'agui-transparency',
    title: 'What is scripted here',
    description:
      'GitHub Pages is serving a deterministic AG-UI mock stream. The scalable integration point is createAgUiAgent({ endpoint }) or createAgUiAgent({ run }) from @kevinmarmstrong/edgekit-agui, which accepts provider events and renders the same EdgeView payloads.',
  }
}

function sampleFormView(): EdgeViewNode {
  return {
    type: 'card',
    id: 'demo-request-card',
    title: 'Sample intake form',
    description: 'This form was emitted as an EdgeView payload through the AG-UI adapter.',
    children: [
      {
        type: 'form',
        id: 'demo-request-form',
        toolName: 'submitDemoRequest',
        submitLabel: 'Submit request',
        input: {},
        fields: [
          {
            name: 'name',
            label: 'Name',
            type: 'text',
            required: true,
            value: 'Demo user',
          },
          {
            name: 'useCase',
            label: 'Use case',
            type: 'select',
            required: true,
            options: [
              { label: 'Support', value: 'support' },
              { label: 'Shopping', value: 'shopping' },
              { label: 'Admin workflow', value: 'admin' },
            ],
          },
          {
            name: 'urgency',
            label: 'Urgency',
            type: 'select',
            required: true,
            options: [
              { label: 'Normal', value: 'normal' },
              { label: 'Urgent', value: 'urgent' },
            ],
          },
        ],
        successMessage: (_output: unknown, formInput: Record<string, unknown>) =>
          `Submitted ${formInput.urgency} ${formInput.useCase} request for ${formInput.name}.`,
      },
    ],
  }
}

function supportQueueView(): EdgeViewNode[] {
  return [
      {
        type: 'chart',
        id: 'support-chart',
        chartType: 'bar',
        title: 'Open support queue',
        data: [
          { label: 'Billing', value: 7 },
          { label: 'Orders', value: 12 },
          { label: 'Returns', value: 4 },
        ],
      },
      {
        type: 'card',
        id: 'support-ticket-card',
        title: 'Create a support ticket',
        description: 'The AG-UI stream can ask Edgekit to render a structured form while the app keeps ownership of the tool.',
        children: [
          {
            type: 'form',
            id: 'support-ticket-form',
            toolName: 'createSupportTicket',
            submitLabel: 'Create ticket',
            input: {},
            fields: [
              {
                name: 'category',
                label: 'Category',
                type: 'select',
                required: true,
                options: [
                  { label: 'Billing', value: 'billing' },
                  { label: 'Orders', value: 'orders' },
                  { label: 'Returns', value: 'returns' },
                ],
              },
              {
                name: 'priority',
                label: 'Priority',
                type: 'select',
                required: true,
                options: [
                  { label: 'Normal', value: 'normal' },
                  { label: 'Urgent', value: 'urgent' },
                ],
              },
            ],
            successMessage: (_output: unknown, input: Record<string, unknown>) =>
              `Created a ${input.priority} ${input.category} support ticket.`,
          },
        ],
      },
    ]
}

function renderMissionControl(snapshot: MissionControlSnapshot = missionControl.snapshot()) {
  setText('#mc-runs', String(snapshot.runs))
  setText('#mc-tools', String(Object.values(snapshot.toolCalls).reduce((total, count) => total + count, 0)))
  setText('#mc-approvals', `${snapshot.approvals.approved}/${snapshot.approvals.requested}`)
  setText('#mc-errors', String(snapshot.errors))
  setText('#mc-local', String(snapshot.localModelUnavailable))
  setText('#mc-last-event', snapshot.lastEvent ? `${snapshot.lastEvent.name} · ${snapshot.lastEvent.sessionId}` : 'Waiting for demo activity')

  const tools = document.querySelector<HTMLElement>('#mc-tool-table')
  if (tools) {
    const entries = Object.entries(snapshot.toolCalls)
    tools.innerHTML = entries.length === 0
      ? '<tr><td colspan="2">Run a demo to see tool activity.</td></tr>'
      : entries
          .map(([name, count]) => `<tr><td>${name}</td><td>${count}</td></tr>`)
          .join('')
  }
}

function setText(selector: string, value: string) {
  const element = document.querySelector<HTMLElement>(selector)
  if (element) element.textContent = value
}

function wireDocSearch() {
  const input = document.querySelector<HTMLInputElement>('#doc-search')
  const button = document.querySelector<HTMLButtonElement>('#doc-search-button')
  const results = document.querySelector<HTMLElement>('#doc-results')
  if (!input || !button || !results) return

  const render = () => {
    const matches = searchDocs(input.value || 'runtime')
    results.innerHTML =
      matches.length > 0
        ? matches
            .map(match => `<article><strong>${match.title}</strong><p>${match.body}</p></article>`)
            .join('')
        : '<p>No docs matched that search.</p>'
  }

  button.addEventListener('click', render)
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') render()
  })
  input.value = 'model cascade'
  render()
}
