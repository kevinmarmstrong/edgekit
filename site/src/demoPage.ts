import './styles.css'

type DemoSlug = 'ecommerce' | 'operations' | 'docs' | 'ag-ui' | 'admin' | 'mission-control'

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
const root = document.querySelector<HTMLElement>('#demo-root')
const demoSlug = (document.body.dataset.demoPage ?? 'ecommerce') as DemoSlug

const demoMeta: Record<DemoSlug, { title: string; label: string; summary: string }> = {
  ecommerce: {
    title: 'Ecommerce retrofit demo',
    label: 'Live ecommerce',
    summary: 'Product search, selectable CTAs, and guarded cart mutation inside a storefront workflow.',
  },
  operations: {
    title: 'Field ops ERP demo',
    label: 'Field ops ERP',
    summary: 'Work-order triage, inventory reservation, and technician dispatch inside an operational ERP surface.',
  },
  docs: {
    title: 'Docs Q&A demo',
    label: 'Live docs Q&A',
    summary: 'Project knowledge exposed as a registered search tool, with a fallback docs search path.',
  },
  'ag-ui': {
    title: 'AG-UI event stream demo',
    label: 'AG-UI compatible',
    summary: 'Remote-style event rendering for generated forms, charts, tables, and cards.',
  },
  admin: {
    title: 'SaaS admin workflow demo',
    label: 'Live SaaS admin',
    summary: 'Account search, plan changes, and suspension tools with explicit approval gates.',
  },
  'mission-control': {
    title: 'Mission control demo',
    label: 'Telemetry primitive',
    summary: 'Local run, tool, approval, and model-availability telemetry from a deployed Edgekit sidecar.',
  },
}

if (root) {
  const meta = demoMeta[demoSlug]
  document.title = `${meta.title} · edgekit demos`
  root.innerHTML = `
    <header class="site-header">
      <a class="brand" href="${withBase('/')}" aria-label="edgekit home">
        <span class="brand-mark">ek</span>
        <span>edgekit</span>
      </a>
      <nav aria-label="Demo navigation">
        <a href="${withBase('/docs/')}">Docs</a>
        <a href="${withBase('/#demos')}">Demos</a>
        <a href="https://github.com/kevinmarmstrong/edgekit">GitHub</a>
      </nav>
    </header>

    <main class="demo-shell">
      <nav class="demo-nav" aria-label="Demo pages">
        ${renderDemoNav()}
      </nav>
      <section class="demo-hero">
        <p class="section-label">${meta.label}</p>
        <h1>${meta.title}</h1>
        <p>${meta.summary}</p>
      </section>
      ${renderDemo(demoSlug)}
    </main>

    <footer>
      <span>MIT licensed.</span>
      <a href="https://github.com/kevinmarmstrong/edgekit">GitHub</a>
      <a href="${withBase('/')}">Home</a>
    </footer>
  `
}

void import('./main')

function renderDemoNav() {
  return (Object.keys(demoMeta) as DemoSlug[])
    .map(slug => {
      const meta = demoMeta[slug]
      return `<a class="${slug === demoSlug ? 'current' : ''}" href="${withBase(`/demos/${slug}/`)}">${meta.label}</a>`
    })
    .join('')
}

function renderDemo(slug: DemoSlug) {
  if (slug === 'docs') return docsDemo()
  if (slug === 'ag-ui') return agUiDemo()
  if (slug === 'admin') return adminDemo()
  if (slug === 'operations') return operationsDemo()
  if (slug === 'mission-control') return missionDemo()
  return ecommerceDemo()
}

function docsDemo() {
  return `
    <section class="split-section" id="qa">
      <div>
        <p class="section-label">Docs Q&A demo</p>
        <h2>Ask edgekit about its own design.</h2>
        <p>
          This demo registers a project documentation search tool with edgekit. Browsers with
          Chrome AI can answer using local model calls; unsupported browsers switch into basic
          docs mode and keep the docs searchable below.
        </p>
        ${productionNotes([
          'Replace the in-memory docs index with your own search or retrieval API.',
          'Keep the docs search tool read-only and cacheable when possible.',
          'Use outcome-quality tests to reject generic docs-search snippets.',
        ])}
        <div class="quick-search">
          <label for="doc-search">Basic docs search</label>
          <div class="search-row">
            <input id="doc-search" placeholder="Try: model cascade or HITL" />
            <button id="doc-search-button">Search</button>
          </div>
          <div id="doc-results" class="doc-results" aria-live="polite"></div>
        </div>
      </div>
      <edge-cascade-wizard id="docs-cascade"></edge-cascade-wizard>
      <edge-chat
        id="docs-chat"
        system-prompt="You answer questions about the edgekit project. Always call searchDocs before answering. Cite the matching section titles in concise language."
        placeholder="Ask: how does the model cascade work?"
      ></edge-chat>
    </section>
  `
}

function ecommerceDemo() {
  return `
    <section class="ecommerce-demo" id="ecommerce">
      <div class="section-heading">
        <p class="section-label">Live demo</p>
        <h2>Ecommerce retrofit demo.</h2>
        <p>
          The storefront exposes searchProducts and addToCart tools. edgekit handles the sidecar UI,
          local model cascade, approval gates, generated CTAs, and graceful fallback.
        </p>
        <p><strong>Architecture note:</strong> This sidecar is localized via an <code>EdgeMissionProfile</code> (defined in the consuming page). Edgekit provides the runtime; the app owns the mission-specific behavior.</p>
        ${productionNotes([
          'Replace the sample catalog with your app-owned product search API.',
          'Keep checkout and cart mutations behind explicit approval.',
          'Use telemetry to track searches, action-card clicks, approvals, and failures.',
        ])}
      </div>
      <div class="commerce-layout">
        <section class="catalog" aria-label="Product catalog" id="catalog"></section>
        <aside class="commerce-agent">
          <edge-cascade-wizard id="commerce-cascade"></edge-cascade-wizard>
          <edge-chat
            id="commerce-chat"
            placeholder="Try: find running shoes under $100 in size 10"
          ></edge-chat>
          <section class="cart" aria-live="polite">
            <div class="cart-title">Cart</div>
            <div id="cart-state">No items yet</div>
          </section>
        </aside>
      </div>
    </section>
  `
}

function operationsDemo() {
  return `
    <section class="ops-demo" id="operations">
      <div class="ops-brief">
        <div>
          <p class="section-label">Internal operations demo</p>
          <h2>Field-service ERP dispatch surface.</h2>
        </div>
        <p>
          A production-shaped internal app surface: work-order triage, inventory reservation,
          technician assignment, role scope, audit evidence, and sync posture stay visible while
          the sidecar proposes guarded actions.
        </p>
        <label class="role-picker">
          Role
          <select id="ops-role" aria-label="Field ops role">
            <option value="dispatcher">Dispatcher</option>
            <option value="viewer">Viewer</option>
            <option value="supervisor">Supervisor</option>
          </select>
        </label>
      </div>
      <div class="ops-layout">
        <section class="ops-board" aria-label="Field service work orders">
          <div class="ops-command-strip">
            <article><span>Critical SLA</span><strong>4h</strong><p>Riverside Clinic compressor outage</p></article>
            <article><span>Available HVAC techs</span><strong id="ops-available-techs">2</strong><p>East region dispatch pool</p></article>
            <article><span>Compressor stock</span><strong id="ops-cmp-stock">2</strong><p>CMP-44 modules available</p></article>
          </div>
          <div class="ops-live-state" aria-label="Current dispatch state">
            <section>
              <span>Workflow state</span>
              <strong id="ops-workflow-state">Triage ready</strong>
              <p id="ops-next-action">Next action: reserve CMP-44 after approval, then assign an East HVAC technician.</p>
            </section>
            <section>
              <span>Policy evidence</span>
              <strong id="ops-policy-evidence">CMP-44 safety checklist required</strong>
              <p>Knowledge reads are role-filtered and cited before the sidecar recommends safety-sensitive work.</p>
            </section>
            <section>
              <span>Resilience</span>
              <strong id="ops-resilience-state">Online execution</strong>
              <p id="ops-resilience-detail">Approved idempotent mutations execute now; offline mode would queue through the host app.</p>
            </section>
          </div>
          <div class="ops-command-center">
            <section class="ops-scope-panel">
              <span>Role scope</span>
              <strong id="ops-role-scope">Dispatcher can search work orders, reserve parts, and assign available technicians.</strong>
              <p>RBAC should be enforced again by the ERP API. The sidecar only narrows visible tools.</p>
              <ul id="ops-capability-list" class="ops-capability-list"></ul>
            </section>
            <section class="ops-risk-panel">
              <span>Guardrail posture</span>
              <strong id="ops-risk-state">Mutations require approval</strong>
              <p id="ops-sync-state">Online: ERP mutations execute immediately after approval.</p>
            </section>
          </div>
          <div class="ops-workflow" aria-label="Dispatch workflow">
            <article><span>1</span><strong>Triage</strong><p>Search work orders and cite policy when needed.</p></article>
            <article><span>2</span><strong>Reserve</strong><p>Hold required parts only after user approval.</p></article>
            <article><span>3</span><strong>Dispatch</strong><p>Assign a qualified technician with ETA evidence.</p></article>
            <article><span>4</span><strong>Audit</strong><p>Record approval, rejection, and mutation outcomes.</p></article>
          </div>
          <div id="ops-work-orders" class="ops-work-orders"></div>
          <div class="ops-lower-grid">
            <section class="mission-table">
              <div class="cart-title">Inventory</div>
              <table>
                <thead><tr><th>SKU</th><th>Part</th><th>Available</th><th>Reserved</th></tr></thead>
                <tbody id="ops-inventory"></tbody>
              </table>
            </section>
            <section>
              <div class="cart-title">Technicians</div>
              <div id="ops-technicians" class="tech-list"></div>
            </section>
          </div>
          <section class="ops-telemetry-panel" aria-label="Field ops telemetry">
            <div>
              <span>Tool manifest</span>
              <strong id="ops-telemetry-tools">dispatcher · 4 tools</strong>
              <p>Dynamic exposure mirrors the selected role.</p>
            </div>
            <div>
              <span>Approvals</span>
              <strong id="ops-telemetry-approvals">0 requested · 0 approved · 0 rejected</strong>
              <p>Risky tool calls stay visible before mutation.</p>
            </div>
            <div>
              <span>Audit events</span>
              <strong id="ops-telemetry-audit">0 recorded</strong>
              <p>Production apps forward these to the ERP audit trail.</p>
            </div>
          </section>
        </section>
        <aside class="ops-agent">
          <aside class="ops-scripted-note" aria-label="Demo mode">
            This public demo can run a scripted Field Ops agent with <code>?opsAgentMode=scripted</code>. Scripted mode is honest: it exercises the same tools, approvals, UI state, and audit surfaces without requiring a provider secret.
          </aside>
          ${productionNotes([
            'Bind role-specific tools to the signed-in dispatcher or supervisor.',
            'Replace the sample repair knowledge source with LlamaIndex, Qdrant, Neo4j GraphRAG, or your ERP knowledge API behind searchRepairKnowledge.',
            'Keep inventory, dispatch, and ETA mutations behind approval plus backend authorization.',
            'Forward telemetry and audit events to the ERP system of record in production.',
          ])}
          <edge-chat
            id="ops-chat"
            system-prompt="You are a field-service ERP assistant. Search work orders before recommending inventory reservation or technician assignment. Ask for approval before changing inventory or dispatch state."
            placeholder="Try: cite the safety rule for CMP-44"
            ready-message="Ready. Ask for field-service triage, inventory reservation, or dispatch help."
          ></edge-chat>
          <section class="activity-log" aria-live="polite">
            <div class="cart-title">Dispatch log</div>
            <ul id="ops-activity"></ul>
          </section>
          <section class="activity-log" aria-live="polite">
            <div class="cart-title">Audit evidence</div>
            <ul id="ops-audit"></ul>
          </section>
        </aside>
      </div>
    </section>
  `
}

function agUiDemo() {
  return `
    <section class="split-section" id="agui">
      <div>
        <p class="section-label">AG-UI ecosystem demo</p>
        <h2>Use Edgekit with an AG-UI event stream.</h2>
        <p>
          This public Pages demo uses a scripted AG-UI-compatible event source so it can run without
          a backend. Production apps replace the script with an AG-UI endpoint while keeping the same
          EdgeView renderer for charts, tables, cards, and forms.
        </p>
        ${productionNotes([
          'Serve AG-UI events from a backend route that owns provider secrets and rate limits.',
          'Map provider events into EdgeView or A2UI-compatible payloads.',
          'Keep submitted forms wired to app-owned tools rather than provider-owned side effects.',
        ])}
      </div>
      <edge-chat
        id="agui-chat"
        system-prompt="You render AG-UI compatible streams."
        placeholder="Ask: what UI components are available?"
      ></edge-chat>
    </section>
  `
}

function adminDemo() {
  return `
    <section class="admin-demo" id="admin">
      <div class="section-heading">
        <p class="section-label">Live demo</p>
        <h2>SaaS admin workflow demo.</h2>
        <p>
          The admin console exposes account search, plan updates, and suspension tools. edgekit keeps
          high-impact account changes behind explicit approval.
        </p>
        ${productionNotes([
          'Bind tool manifests to the signed-in user and tenant.',
          'Keep account mutations behind approval, audit, and backend authorization.',
          'Never place tokens or secret claims in state summaries or prompts.',
        ])}
      </div>
      <div class="admin-layout">
        <section class="account-list" aria-label="Customer accounts" id="admin-accounts"></section>
        <aside class="admin-agent">
          <edge-chat
            id="admin-chat"
            system-prompt="You are a precise SaaS admin assistant. Always search accounts before recommending or changing account state. Ask for approval before changing plans or suspending accounts."
            placeholder="Try: upgrade Northwind to Enterprise"
          ></edge-chat>
          <section class="activity-log" aria-live="polite">
            <div class="cart-title">Workflow log</div>
            <ul id="admin-activity"></ul>
          </section>
        </aside>
      </div>
    </section>
  `
}

function missionDemo() {
  return `
    <section class="mission-section" id="mission-control">
      <div class="section-heading">
        <p class="section-label">Mission control primitive</p>
        <h2>Observe edge agents without centralizing the runtime.</h2>
        <p>
          This dashboard is powered by local telemetry hooks from the site-wide dogfood assistant.
          In production, send the same events to your analytics, logging, or compliance backend.
        </p>
        ${productionNotes([
          'Forward telemetry to your observability stack with tenant and session identifiers.',
          'Track tool calls, approvals, rejections, model availability, and errors.',
          'Keep mission-control visibility separate from user-facing agent behavior.',
        ])}
      </div>
      <div class="mission-grid">
        <article><span>Runs</span><strong id="mc-runs">0</strong></article>
        <article><span>Tool calls</span><strong id="mc-tools">0</strong></article>
        <article><span>Approved / requested</span><strong id="mc-approvals">0/0</strong></article>
        <article><span>Errors</span><strong id="mc-errors">0</strong></article>
        <article><span>No local model</span><strong id="mc-local">0</strong></article>
        <article><span>Last event</span><strong id="mc-last-event">Waiting for demo activity</strong></article>
      </div>
      <div class="mission-table">
        <table>
          <thead><tr><th>Tool</th><th>Calls</th></tr></thead>
          <tbody id="mc-tool-table"><tr><td colspan="2">Run the site assistant to see tool activity.</td></tr></tbody>
        </table>
      </div>
      <div class="context-grid">
        <article>
          <span>Identity bridge</span>
          <p>Pass public user, tenant, roles, and permissions into Edgekit while keeping tokens inside tool execution context.</p>
        </article>
        <article>
          <span>RBAC tools</span>
          <p>Hydrate customer, support, or admin tool manifests dynamically from the current session.</p>
        </article>
        <article>
          <span>State hydration</span>
          <p>Give the model a concise route and workflow summary before it spends tokens asking where the user is.</p>
        </article>
      </div>
    </section>
  `
}

function productionNotes(items: string[]) {
  return `
    <aside class="production-notes" aria-label="Production notes">
      <h3>Production notes</h3>
      <ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>
    </aside>
  `
}

function withBase(path: string) {
  if (path === '/') return `${basePath}/`
  if (path.startsWith('/#')) return `${basePath}/${path.slice(1)}`
  return `${basePath}${path}`
}
