const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/main-BW7Y_rem.js","assets/siteAssistant-C_A8xDGt.js","assets/styles-wSZMTwMX.js","assets/styles-CQI8Q9X1.css"])))=>i.map(i=>d[i]);
import{t as e}from"./styles-wSZMTwMX.js";var t=`/edgekit/`.replace(/\/$/,``),n=document.querySelector(`#demo-root`),r=document.body.dataset.demoPage??`ecommerce`,i={ecommerce:{title:`Ecommerce retrofit demo`,label:`Live ecommerce`,summary:`Product search, selectable CTAs, and guarded cart mutation inside a storefront workflow.`},docs:{title:`Docs Q&A demo`,label:`Live docs Q&A`,summary:`Project knowledge exposed as a registered search tool, with a fallback docs search path.`},"ag-ui":{title:`AG-UI event stream demo`,label:`AG-UI compatible`,summary:`Remote-style event rendering for generated forms, charts, tables, and cards.`},admin:{title:`SaaS admin workflow demo`,label:`Live SaaS admin`,summary:`Account search, plan changes, and suspension tools with explicit approval gates.`},"mission-control":{title:`Mission control demo`,label:`Telemetry primitive`,summary:`Local run, tool, approval, and model-availability telemetry from a deployed Edgekit sidecar.`}};if(n){let e=i[r];document.title=`${e.title} · edgekit demos`,n.innerHTML=`
    <header class="site-header">
      <a class="brand" href="${p(`/`)}" aria-label="edgekit home">
        <span class="brand-mark">ek</span>
        <span>edgekit</span>
      </a>
      <nav aria-label="Demo navigation">
        <a href="${p(`/docs/`)}">Docs</a>
        <a href="${p(`/#demos`)}">Demos</a>
        <a href="https://github.com/kevinmarmstrong/edgekit">GitHub</a>
      </nav>
    </header>

    <main class="demo-shell">
      <nav class="demo-nav" aria-label="Demo pages">
        ${a()}
      </nav>
      <section class="demo-hero">
        <p class="section-label">${e.label}</p>
        <h1>${e.title}</h1>
        <p>${e.summary}</p>
      </section>
      ${o(r)}
    </main>

    <footer>
      <span>MIT licensed.</span>
      <a href="https://github.com/kevinmarmstrong/edgekit">GitHub</a>
      <a href="${p(`/`)}">Home</a>
    </footer>
  `}e(()=>import(`./main-BW7Y_rem.js`).then(e=>e.t),__vite__mapDeps([0,1,2,3]));function a(){return Object.keys(i).map(e=>{let t=i[e];return`<a class="${e===r?`current`:``}" href="${p(`/demos/${e}/`)}">${t.label}</a>`}).join(``)}function o(e){return e===`docs`?s():e===`ag-ui`?l():e===`admin`?u():e===`mission-control`?d():c()}function s(){return`
    <section class="split-section" id="qa">
      <div>
        <p class="section-label">Docs Q&A demo</p>
        <h2>Ask edgekit about its own design.</h2>
        <p>
          This demo registers a project documentation search tool with edgekit. Browsers with
          Chrome AI can answer using local model calls; unsupported browsers switch into basic
          docs mode and keep the docs searchable below.
        </p>
        ${f([`Replace the in-memory docs index with your own search or retrieval API.`,`Keep the docs search tool read-only and cacheable when possible.`,`Use outcome-quality tests to reject generic docs-search snippets.`])}
        <div class="quick-search">
          <label for="doc-search">Basic docs search</label>
          <div class="search-row">
            <input id="doc-search" placeholder="Try: model cascade or HITL" />
            <button id="doc-search-button">Search</button>
          </div>
          <div id="doc-results" class="doc-results" aria-live="polite"></div>
        </div>
      </div>
      <edge-chat
        id="docs-chat"
        system-prompt="You answer questions about the edgekit project. Always call searchDocs before answering. Cite the matching section titles in concise language."
        placeholder="Ask: how does the model cascade work?"
      ></edge-chat>
    </section>
  `}function c(){return`
    <section class="ecommerce-demo" id="ecommerce">
      <div class="section-heading">
        <p class="section-label">Live demo</p>
        <h2>Ecommerce retrofit demo.</h2>
        <p>
          The storefront exposes searchProducts and addToCart tools. edgekit handles the sidecar UI,
          local model cascade, approval gates, generated CTAs, and graceful fallback.
        </p>
        <p><strong>Architecture note:</strong> This sidecar is localized via an <code>EdgeMissionProfile</code> (defined in the consuming page). Edgekit provides the runtime; the app owns the mission-specific behavior.</p>
        ${f([`Replace the sample catalog with your app-owned product search API.`,`Keep checkout and cart mutations behind explicit approval.`,`Use telemetry to track searches, action-card clicks, approvals, and failures.`])}
      </div>
      <div class="commerce-layout">
        <section class="catalog" aria-label="Product catalog" id="catalog"></section>
        <aside class="commerce-agent">
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
  `}function l(){return`
    <section class="split-section" id="agui">
      <div>
        <p class="section-label">AG-UI ecosystem demo</p>
        <h2>Use Edgekit with an AG-UI event stream.</h2>
        <p>
          This public Pages demo uses a scripted AG-UI-compatible event source so it can run without
          a backend. Production apps replace the script with an AG-UI endpoint while keeping the same
          EdgeView renderer for charts, tables, cards, and forms.
        </p>
        ${f([`Serve AG-UI events from a backend route that owns provider secrets and rate limits.`,`Map provider events into EdgeView or A2UI-compatible payloads.`,`Keep submitted forms wired to app-owned tools rather than provider-owned side effects.`])}
      </div>
      <edge-chat
        id="agui-chat"
        system-prompt="You render AG-UI compatible streams."
        placeholder="Ask: what UI components are available?"
      ></edge-chat>
    </section>
  `}function u(){return`
    <section class="admin-demo" id="admin">
      <div class="section-heading">
        <p class="section-label">Live demo</p>
        <h2>SaaS admin workflow demo.</h2>
        <p>
          The admin console exposes account search, plan updates, and suspension tools. edgekit keeps
          high-impact account changes behind explicit approval.
        </p>
        ${f([`Bind tool manifests to the signed-in user and tenant.`,`Keep account mutations behind approval, audit, and backend authorization.`,`Never place tokens or secret claims in state summaries or prompts.`])}
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
  `}function d(){return`
    <section class="mission-section" id="mission-control">
      <div class="section-heading">
        <p class="section-label">Mission control primitive</p>
        <h2>Observe edge agents without centralizing the runtime.</h2>
        <p>
          This dashboard is powered by local telemetry hooks from the site-wide dogfood assistant.
          In production, send the same events to your analytics, logging, or compliance backend.
        </p>
        ${f([`Forward telemetry to your observability stack with tenant and session identifiers.`,`Track tool calls, approvals, rejections, model availability, and errors.`,`Keep mission-control visibility separate from user-facing agent behavior.`])}
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
  `}function f(e){return`
    <aside class="production-notes" aria-label="Production notes">
      <h3>Production notes</h3>
      <ul>${e.map(e=>`<li>${e}</li>`).join(``)}</ul>
    </aside>
  `}function p(e){return e===`/`?`${t}/`:e.startsWith(`/#`)?`${t}/${e.slice(1)}`:`${t}${e}`}