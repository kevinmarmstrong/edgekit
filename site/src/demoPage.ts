import './styles.css'

type DemoSlug = 'ecommerce' | 'operations' | 'docs' | 'ag-ui' | 'admin' | 'mission-control' | 'cascade'

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
const externalEcommerceDemoUrl = 'https://edgekit-demo-ecommerce.pages.dev/'
const fallbackEcommerceDemoUrl = 'https://kevinmarmstrong.github.io/edgekit-demo-ecommerce/'
const externalDocsDemoUrl = 'https://edgekit-demo-docs.pages.dev/'
const externalAdminDemoUrl = 'https://edgekit-demo-admin.pages.dev/'
const root = document.querySelector<HTMLElement>('#demo-root')
const demoSlug = (document.body.dataset.demoPage ?? 'ecommerce') as DemoSlug

const demoMeta: Record<DemoSlug, { title: string; label: string; summary: string }> = {
  ecommerce: {
    title: 'Ecommerce retrofit demo moved',
    label: 'External ecommerce',
    summary: 'The packed-package storefront demo now lives in its own repository and deployment.',
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
    summary: 'Local run, tool, approval, and model-availability telemetry from a deployed Edgekit agent workflow.',
  },
  cascade: {
    title: 'Cascade and permission lab',
    label: 'Cascade lab',
    summary: 'A resettable self-service readiness lab for browser models, download consent, permissions, validation, fallback, and feature gating.',
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
        ${proofGrid([
          ['Host surface', hostSurfaceCopy(demoSlug)],
          ['Edgekit proves', proofCopy(demoSlug)],
          ['Honest mode', honestModeCopy(demoSlug)],
        ])}
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
  if (slug === 'cascade') return cascadeDemo()
  return ecommerceDemo()
}

function cascadeDemo() {
  return `
    <section class="cascade-lab" id="cascade-lab">
      <div class="cascade-intro">
        <div>
          <p class="section-label">Capability and permission workflow</p>
          <h2>Run every public-browser state before users hit it.</h2>
          <p>
            This lab exercises the same readiness contract a host app can put behind any UI:
            Chrome AI, WebLLM, cloud-route escalation, user download preferences, opt-out,
            RBAC-filtered tools, approval requirements, Mission Profile validation, fallback,
            hidden features, and resettable recovery paths.
          </p>
          ${proofGrid([
            ['Provider ladder', 'Chrome AI first, then app-selected WebLLM, then an explicit developer cloud route or no-model fallback.'],
            ['Permission state', 'Download consent, enterprise blocks, hidden features, and user opt-out are visible runtime states.'],
            ['Profile gate', 'The lab validates required tools and capabilities before enabling the agent surface.'],
          ])}
        </div>
        ${productionNotes([
          'Use the controller snapshot to drive your own modal, banner, settings page, disabled CTA, or silent feature gate.',
          'Keep auth and permissions in the host app; Edgekit only narrows the visible tool surface and reports missing capabilities.',
          'Treat model downloads as explicit user or enterprise policy decisions, never a surprise side effect.',
          'Edgekit does not force a bundled default model. This page checks Chrome AI first, then an app-selected WebLLM model when the host/browser can support it.',
        ])}
      </div>
      <section class="cascade-live-flow" aria-label="Real visitor setup flow">
        <div class="cascade-live-copy">
          <p class="section-label">Real visitor setup flow</p>
          <h2>What a user would actually see.</h2>
          <p>
            This flow checks the current browser without starting a surprise download. The user can
            enable Chrome AI, choose the app-configured WebLLM path when available, continue in
            transparent basic mode, or hide the agent entry point.
          </p>
          <div class="cascade-live-steps" aria-label="Visitor flow steps">
            <article data-live-step="check">
              <span>1</span>
              <strong>Check browser</strong>
              <p>Detect local model, isolated-host, tool, and UI readiness.</p>
            </article>
            <article data-live-step="choose">
              <span>2</span>
              <strong>Choose path</strong>
              <p>Ask before downloads. Offer basic mode when local AI is unavailable.</p>
            </article>
            <article data-live-step="launch">
              <span>3</span>
              <strong>Launch safely</strong>
              <p>Show, degrade, or hide the agent UI based on the snapshot.</p>
            </article>
          </div>
        </div>
        <div class="cascade-user-card" id="cascade-live-card">
          <div class="cascade-user-card-top">
            <div>
              <span id="cascade-live-kicker">Current browser</span>
              <strong id="cascade-live-title">Set up the edgekit assistant</strong>
            </div>
            <span class="status-chip" id="cascade-live-mode">not checked</span>
          </div>
          <p id="cascade-live-message">
            Check this browser to see whether the full local assistant can run, whether a model
            download needs consent, or whether this app should offer basic mode.
          </p>
          <div class="cascade-user-actions">
            <button id="cascade-live-check" type="button">Check this browser</button>
            <button id="cascade-live-enable-chrome" class="secondary" type="button" hidden>Enable Chrome AI</button>
            <button id="cascade-live-enable-webllm" class="secondary" type="button" hidden>Use app WebLLM model</button>
            <button id="cascade-live-basic" class="secondary" type="button" hidden>Continue basic mode</button>
            <button id="cascade-live-hide" class="secondary" type="button" hidden>Hide assistant</button>
            <button id="cascade-live-reset" class="secondary" type="button">Reset flow</button>
          </div>
          <div class="cascade-live-output">
            <section>
              <div class="cart-title">App decision</div>
              <strong id="cascade-live-decision">Waiting for check</strong>
              <p id="cascade-live-decision-copy">The app has not enabled, degraded, or hidden the assistant yet.</p>
            </section>
            <section>
              <div class="cart-title">Provider evidence</div>
              <ul id="cascade-live-providers"></ul>
            </section>
            <section>
              <div class="cart-title">User preference</div>
              <p id="cascade-live-preference">No preference recorded.</p>
            </section>
          </div>
        </div>
      </section>
      <div class="cascade-grid">
        <section class="cascade-control-panel" aria-label="Cascade controls">
          <div class="cascade-toolbar">
            <button id="cascade-run" type="button">Run readiness</button>
            <button id="cascade-reset" class="secondary" type="button">Reset</button>
          </div>
          <label>
            Browser and model state
            <select id="cascade-browser">
              <option value="chrome-ready">Chrome AI ready</option>
              <option value="nano-downloadable">Nano downloadable</option>
              <option value="webllm-ready">WebLLM isolated host</option>
              <option value="cloud-only">Cloud route only</option>
              <option value="enterprise-blocked">Enterprise policy blocked</option>
              <option value="unsupported">Unsupported browser</option>
            </select>
          </label>
          <label>
            User model preference
            <select id="cascade-download-policy">
              <option value="prompt">Prompt before model download</option>
              <option value="never">Opt out of model downloads</option>
              <option value="auto">Managed app auto-download</option>
            </select>
          </label>
          <label>
            Signed-in role
            <select id="cascade-role">
              <option value="visitor">Visitor</option>
              <option value="customer">Customer</option>
              <option value="support">Support agent</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label>
            Workflow intent
            <select id="cascade-workflow">
              <option value="docs">Docs Q&A</option>
              <option value="shopping">Shopping action</option>
              <option value="support">Support case</option>
              <option value="admin">Admin mutation</option>
              <option value="private-data">Private data lookup</option>
            </select>
          </label>
          <label>
            Visibility policy
            <select id="cascade-visibility">
              <option value="show-basic-when-local-unavailable">Show basic mode when local unavailable</option>
              <option value="hide-until-ready">Hide until full local agent is ready</option>
              <option value="show-always">Always show agent surface</option>
            </select>
          </label>
          <div class="cascade-switches" aria-label="Integration switches">
            <label><input id="cascade-fallback" type="checkbox" checked /> Basic fallback available</label>
            <label><input id="cascade-edgeview" type="checkbox" checked /> EdgeView/action UI installed</label>
            <label><input id="cascade-approvals" type="checkbox" checked /> Approval UI installed</label>
          </div>
          <div class="cascade-toolbar">
            <button id="cascade-accept-download" class="secondary" type="button">Accept download prompt</button>
            <button id="cascade-use-fallback" class="secondary" type="button">Use fallback</button>
            <button id="cascade-hide" class="secondary" type="button">Hide agent</button>
          </div>
        </section>

        <section class="cascade-runtime" aria-label="Readiness runtime">
          <edge-cascade-wizard id="cascade-lab-wizard"></edge-cascade-wizard>
          <div class="cascade-summary-grid">
            <article>
              <span>Recommended app action</span>
              <strong id="cascade-action">Not checked</strong>
              <p id="cascade-message">Run readiness to see what the host app should do.</p>
            </article>
            <article>
              <span>Feature visibility</span>
              <strong id="cascade-feature-state">Unknown</strong>
              <p id="cascade-feature-message">The host app can show, hide, or degrade the agent UI.</p>
            </article>
            <article>
              <span>Validation</span>
              <strong id="cascade-validation">Waiting</strong>
              <p id="cascade-validation-message">Mission Profile and registered tool checks run on every scenario.</p>
            </article>
          </div>
          <div class="cascade-lists">
            <section>
              <div class="cart-title">Provider ladder</div>
              <ul id="cascade-providers"></ul>
            </section>
            <section>
              <div class="cart-title">Required capabilities</div>
              <ul id="cascade-capabilities"></ul>
            </section>
            <section>
              <div class="cart-title">Visible tools</div>
              <ul id="cascade-tools"></ul>
            </section>
            <section>
              <div class="cart-title">User-facing copy</div>
              <ul id="cascade-copy"></ul>
            </section>
          </div>
        </section>
      </div>
      <section class="cascade-evidence" aria-label="Cascade evidence">
        <div>
          <div class="cart-title">Timeline</div>
          <ol id="cascade-events"></ol>
        </div>
        <div>
          <div class="cart-title">Snapshot JSON</div>
          <pre id="cascade-json">{}</pre>
        </div>
      </section>
    </section>
  `
}

function docsDemo() {
  return `
    <section class="ecommerce-demo external-demo-bridge" id="qa">
      <div class="section-heading">
        <p class="section-label">Phase F demo retirement</p>
        <h2>The Docs Q&A demo now runs outside the monorepo.</h2>
        <p>
          The Knowledge Access workflow has a verified external replacement built from packed
          Edgekit package tarballs. This site keeps the pointer, but no longer hosts the duplicate
          docs agent runtime.
        </p>
        ${proofGrid([
          ['External repo', 'The demo installs Edgekit from package tarballs rather than workspace aliases.'],
          ['Knowledge Access', 'A tiny app-owned corpus is exposed as a cited retrieval tool through the knowledge sibling.'],
          ['Honest mode', 'No-model fallback says it is basic retrieval, not model-backed agent execution.'],
        ])}
        ${productionNotes([
          'Use the external repo when testing the adopter install path.',
          'Replace the in-memory corpus with your own search or retrieval API.',
          'Switch the demo from vendored tarballs to npm dependencies after package publication.',
        ])}
      </div>
      <div class="demo-proof-grid">
        <a class="button primary" href="${externalDocsDemoUrl}">Open Cloudflare demo</a>
        <a class="button secondary" href="https://github.com/kevinmarmstrong/edgekit-demo-docs">View repo</a>
      </div>
    </section>
  `
}

function ecommerceDemo() {
  return `
    <section class="ecommerce-demo external-demo-bridge" id="ecommerce">
      <div class="section-heading">
        <p class="section-label">Phase F demo retirement</p>
        <h2>The ecommerce demo now runs outside the monorepo.</h2>
        <p>
          The public catalog workflow has a verified external replacement built from packed
          Edgekit package tarballs. This site keeps the pointer, but no longer hosts the duplicate
          ecommerce agent runtime.
        </p>
        ${proofGrid([
          ['External repo', 'The demo installs Edgekit from package tarballs rather than workspace aliases.'],
          ['Host-owned state', 'Catalog search and guarded add-to-cart behavior live with the consuming storefront app.'],
          ['Honest mode', 'Cloudflare Pages is the COOP/COEP local-model proof; GitHub Pages remains the fallback/no-model reference.'],
        ])}
        ${productionNotes([
          'Use the external repo when testing the adopter install path.',
          'Use the Cloudflare Pages mirror when checking WebLLM/local-model readiness.',
          'Switch the demo from vendored tarballs to npm dependencies after the Phase I package publish.',
        ])}
      </div>
      <div class="demo-proof-grid">
        <article>
          <span>Repository</span>
          <p><a href="https://github.com/kevinmarmstrong/edgekit-demo-ecommerce">github.com/kevinmarmstrong/edgekit-demo-ecommerce</a></p>
        </article>
        <article>
          <span>COOP/COEP live URL</span>
          <p><a href="${externalEcommerceDemoUrl}">edgekit-demo-ecommerce.pages.dev</a></p>
        </article>
        <article>
          <span>Fallback URL</span>
          <p><a href="${fallbackEcommerceDemoUrl}">kevinmarmstrong.github.io/edgekit-demo-ecommerce</a></p>
        </article>
        <article>
          <span>Replacement status</span>
          <p>Verified live with packed-package install, clean-room smoke, and cold-clone proof.</p>
        </article>
      </div>
      <div class="hero-actions">
        <a class="button primary" href="${externalEcommerceDemoUrl}">Open external ecommerce demo</a>
        <a class="button secondary" href="https://github.com/kevinmarmstrong/edgekit-demo-ecommerce">View demo repo</a>
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
          the agent proposes guarded actions.
        </p>
        ${proofGrid([
          ['ERP workflow', 'Work orders, parts, technicians, SLA state, and audit records remain in the host app.'],
          ['RBAC tools', 'The selected role narrows the tool manifest before the model can call anything.'],
          ['Offline posture', 'The demo names which approved idempotent actions would queue in a host-owned journal.'],
        ])}
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
              <p>Knowledge reads are role-filtered and cited before the agent recommends safety-sensitive work.</p>
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
              <p>RBAC should be enforced again by the ERP API. The agent UI only narrows visible tools.</p>
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
        ${proofGrid([
          ['Event protocol', 'The surface renders remote-style AG-UI events rather than pretending the static site has a live backend.'],
          ['Generative UI', 'Charts, tables, cards, and forms land in the same EdgeView renderer used by hosted agents.'],
          ['Secret boundary', 'A real endpoint would live behind the app backend with provider secrets and rate limits there.'],
        ])}
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
    <section class="admin-demo external-demo-bridge" id="admin">
      <div class="section-heading">
        <p class="section-label">Phase F demo retirement</p>
        <h2>The SaaS admin workflow now runs outside the monorepo.</h2>
        <p>
          The approval-gated account workflow has a verified external replacement built from packed
          Edgekit package tarballs. This site keeps the pointer, but no longer hosts the duplicate
          admin agent runtime.
        </p>
        ${proofGrid([
          ['External repo', 'The demo installs Edgekit from package tarballs rather than workspace aliases.'],
          ['Approval gate', 'Plan changes require visible approval before the host app tool executes.'],
          ['Audit trail', 'Approved mutations write app-owned audit entries with stable hashes.'],
        ])}
        ${productionNotes([
          'Use the external repo when testing the adopter install path.',
          'Bind tool manifests to the signed-in user and tenant in production.',
          'Switch the demo from vendored tarballs to npm dependencies after package publication.',
        ])}
      </div>
      <div class="demo-proof-grid">
        <a class="button primary" href="${externalAdminDemoUrl}">Open Cloudflare demo</a>
        <a class="button secondary" href="https://github.com/kevinmarmstrong/edgekit-demo-admin">View repo</a>
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
          This dashboard is powered by local telemetry hooks from the site-wide site assistant.
          In production, send the same events to your analytics, logging, or compliance backend.
        </p>
        ${proofGrid([
          ['Local runtime', 'Agents still run in each host surface; mission control only receives telemetry events.'],
          ['Operational signals', 'Runs, tool calls, approvals, model availability, and errors are visible without centralizing state.'],
          ['Compliance boundary', 'Production apps add tenant/session identifiers and persistence in their own backend.'],
        ])}
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

function proofGrid(items: Array<[string, string]>) {
  return `
    <div class="demo-proof-grid" aria-label="What this demo proves">
      ${items.map(([label, copy]) => `<article><span>${label}</span><p>${copy}</p></article>`).join('')}
    </div>
  `
}

function hostSurfaceCopy(slug: DemoSlug) {
  if (slug === 'ecommerce') return 'A verified external storefront demo with catalog cards, cart state, and guarded add-to-cart actions.'
  if (slug === 'operations') return 'A field-service ERP dispatch console with work orders, parts, technicians, and SLA state.'
  if (slug === 'docs') return 'A project knowledge surface where Q&A augments, rather than replaces, the documentation.'
  if (slug === 'ag-ui') return 'An AG-UI-compatible integration point for remote event streams and generated UI.'
  if (slug === 'admin') return 'A SaaS account administration console with role scope and high-impact customer mutations.'
  if (slug === 'mission-control') return 'An observability dashboard for distributed Edgekit agent workflows.'
  return 'A readiness lab for model cascade, permissions, validation, fallback, and feature gating.'
}

function proofCopy(slug: DemoSlug) {
  if (slug === 'ecommerce') return 'Packed-package install, no workspace aliases, external deployment, and host-owned cart state.'
  if (slug === 'operations') return 'RBAC-filtered tools, approvals, audit events, repair knowledge, and offline-aware mutations.'
  if (slug === 'docs') return 'Read-only retrieval, answer faithfulness, local-first Q&A, and basic docs fallback.'
  if (slug === 'ag-ui') return 'AG-UI event rendering through EdgeView while provider secrets stay behind a backend.'
  if (slug === 'admin') return 'Account search, plan changes, suspension approval, RBAC, and workflow telemetry.'
  if (slug === 'mission-control') return 'Telemetry aggregation for runs, tools, approvals, errors, and local-model availability.'
  return 'Cascade readiness across local models, cloud routes, permissions, validation, and degraded modes.'
}

function honestModeCopy(slug: DemoSlug) {
  if (slug === 'ecommerce') return 'This page is a link-out. The Cloudflare Pages demo is the COOP/COEP local-model proof; GitHub Pages remains the fallback/no-model reference.'
  if (slug === 'ag-ui') return 'Scripted public event stream; production requires an AG-UI backend endpoint.'
  if (slug === 'operations') return 'Provider mode uses Chrome AI when available; scripted mode is opt-in with ?opsAgentMode=scripted.'
  if (slug === 'admin') return 'This page is a link-out. The Cloudflare Pages demo is the external approval and audit proof.'
  if (slug === 'cascade') return 'No surprise model downloads; every local-model setup path requires consent or policy.'
  if (slug === 'mission-control') return 'Reads local demo telemetry only; production persistence is app-owned.'
  return 'Runs local-first when possible and falls back transparently when no local model is available.'
}

function withBase(path: string) {
  if (path === '/') return `${basePath}/`
  if (path.startsWith('/#')) return `${basePath}/${path.slice(1)}`
  return `${basePath}${path}`
}
