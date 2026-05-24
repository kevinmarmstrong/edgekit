export type DocsPage = {
  slug: string
  title: string
  summary: string
  navLabel: string
  sections: DocsSection[]
}

export type DocsSection = {
  id: string
  title: string
  body: string[]
  bullets?: string[]
  code?: {
    language: string
    text: string
  }
}

export const docsPages: DocsPage[] = [
  {
    slug: 'overview',
    navLabel: 'Overview',
    title: 'What edgekit is',
    summary:
      'edgekit is a browser-native agent runtime for embedding an AI sidecar into an existing web app.',
    sections: [
      {
        id: 'purpose',
        title: 'Purpose',
        body: [
          'edgekit is not a chatbot wrapper. It is a small runtime and UI layer for adding an agent to an app that already has real capabilities: product search, cart changes, account updates, documentation search, support triage, or other app-specific workflows.',
          'The developer registers existing functions as tools. The model can ask to call those tools, and edgekit streams the result into a sidecar UI while preserving approval gates for higher-impact actions.',
        ],
      },
      {
        id: 'repo-map',
        title: 'Repository map',
        body: ['The open source repo is organized as a small monorepo.'],
        bullets: [
          '`packages/core`: model cascade, provider helpers, agent event stream, approval resume.',
          '`packages/ui`: Lit web component, approval prompts, download prompts, chat shell.',
          '`packages/cli`: documentation indexing utility for project Q&A tools.',
          '`examples/ecommerce`: standalone app retrofit demo.',
          '`site`: GitHub Pages docs, Q&A, ecommerce demo, and SaaS admin demo.',
          '`tests/e2e`: Playwright coverage for embedded agent workflows.',
        ],
      },
      {
        id: 'mental-model',
        title: 'Mental model',
        body: [
          'Think of edgekit as an app sidecar. Your app keeps ownership of state, authorization, API boundaries, and UI context. edgekit owns the agent conversation, provider selection, tool-call events, approval prompts, and graceful fallback when local AI is unavailable.',
        ],
      },
    ],
  },
  {
    slug: 'getting-started',
    navLabel: 'Getting Started',
    title: 'Install and embed edgekit',
    summary: 'Add the core package and web component, register tools, and mount the sidecar.',
    sections: [
      {
        id: 'install',
        title: 'Install',
        body: ['The packages are workspace-local today and ready for package publication when release metadata is finalized.'],
        code: {
          language: 'bash',
          text: 'pnpm install\npnpm build\npnpm test\npnpm test:e2e',
        },
      },
      {
        id: 'embed',
        title: 'Embed the web component',
        body: ['Import the UI package once, place `<edge-chat>` where the sidecar belongs, then register app tools from JavaScript.'],
        code: {
          language: 'html',
          text: `<edge-chat
  system-prompt="You are a concise shopping assistant."
  placeholder="Find running shoes under $100"
></edge-chat>`,
        },
      },
      {
        id: 'register-tools',
        title: 'Register a tool',
        body: ['Tools use the Vercel AI SDK `tool()` helper, so schemas and execution stay familiar.'],
        code: {
          language: 'ts',
          text: `import '@kevinmarmstrong/edgekit-ui'
import { modelOptional, tool } from '@kevinmarmstrong/edgekit'
import { z } from 'zod'

const searchProducts = tool({
  description: 'Search the product catalog.',
  inputSchema: z.object({
    query: z.string(),
    maxPrice: modelOptional(z.number()),
  }),
  execute: async ({ query, maxPrice }) => {
    const params = new URLSearchParams({ q: query })
    if (maxPrice) params.set('max_price', String(maxPrice))
    return fetch('/api/products?' + params).then(res => res.json())
  },
})

document.querySelector('edge-chat')?.registerTools({ searchProducts })`,
        },
      },
    ],
  },
  {
    slug: 'concepts',
    navLabel: 'Concepts',
    title: 'Core concepts',
    summary: 'Understand providers, fallback, tools, approvals, and the event stream.',
    sections: [
      {
        id: 'model-cascade',
        title: 'Model cascade',
        body: [
          'The default strategy tries local browser providers first. Chrome AI can be used when the browser exposes it. WebLLM can be used on hosts with the right cross-origin isolation headers. If no model is available, apps can provide a deterministic fallback through `onNoModel`.',
        ],
        bullets: [
          '`downloadPolicy: "never"` avoids model downloads and is useful for public demos.',
          '`downloadPolicy: "prompt"` lets the UI ask before a model download.',
          '`downloadPolicy: "auto"` is useful for explicit eval sessions or controlled environments.',
        ],
      },
      {
        id: 'tools',
        title: 'Tools are app capabilities',
        body: [
          'Tools should wrap real app capabilities rather than duplicate business logic. Search, retrieve, update, create, cancel, suspend, add-to-cart, and submit-order actions can all be represented as tools.',
          'For optional tool fields, use `modelOptional(schema)`. Browser models may send `null` for an unspecified slot, and the tool should normalize that the same way it handles absence.',
        ],
      },
      {
        id: 'approval',
        title: 'Human approval',
        body: [
          'Set `needsApproval: true` on tools that change important state. edgekit emits an approval request, the UI renders approve/reject controls, and `respondToApproval()` resumes the agent turn with the approval decision.',
        ],
      },
      {
        id: 'events',
        title: 'Agent events',
        body: ['The core agent streams status, text, tool calls, tool results, declarative views, approval requests, no-model fallbacks, errors, and done events.'],
        code: {
          language: 'ts',
          text: `for await (const event of agent.send('upgrade Northwind to Enterprise')) {
  if (event.type === 'tool-call') console.log(event.toolName, event.input)
  if (event.type === 'view') renderEdgeView(event.view)
  if (event.type === 'approval-request') showApproval(event)
}`,
        },
      },
      {
        id: 'edgeview',
        title: 'EdgeView',
        body: [
          'EdgeView is the default declarative UI layer. `registerActions()` compiles into EdgeView cards and forms, and AG-UI custom events can carry EdgeView payloads. This gives developers a stable, framework-neutral way to render text, cards, forms, tables, and simple charts before adopting a broader A2UI renderer.',
        ],
      },
      {
        id: 'ag-ui',
        title: 'AG-UI compatibility',
        body: [
          'Use `createAgUiAgent()` when the agent comes from an AG-UI ecosystem backend instead of the browser-native model cascade. Edgekit accepts text events, tool-result events, and custom `edgekit.view` or A2UI-style view events.',
          'Without AG-UI, use `registerTools()` plus `registerActions()` to keep the agent fully browser-native and app-owned. With AG-UI, attach an external event stream with `useAgent()` and keep the same EdgeView renderer for rich UI.',
          'The public GitHub Pages AG-UI demo intentionally uses a scripted mock stream because Pages cannot run a provider backend. It is a renderer and protocol demo, not a general-purpose hosted agent.',
        ],
        bullets: [
          'Standard AG-UI HTTP/SSE endpoint: pass `createAgUiAgent({ endpoint })` and attach it with `chat.useAgent(agent)`.',
          '@ag-ui/client or HttpAgent-backed service: expose the same event stream endpoint, or adapt its event iterator through `createAgUiAgent({ run })`.',
          'CopilotKit, LangGraph, CrewAI, or other AG-UI bridges: keep their backend agent runtime, then let Edgekit render the user-facing event stream inside your app.',
          'Backend dependency: a hosted route or worker that can stream AG-UI events, hold provider secrets, enforce rate limits, and call only the app tools you expose.',
        ],
      },
    ],
  },
  {
    slug: 'api',
    navLabel: 'Core API',
    title: 'Core runtime API',
    summary: 'The core package exposes provider helpers, agent creation, and Vercel AI SDK tool helpers.',
    sections: [
      {
        id: 'exports',
        title: 'Exports',
        body: ['The core package is intentionally small.'],
        bullets: [
          '`createAgent(options)`: create an event-streaming agent.',
          '`chromeAI()`: provider helper for browser Chrome AI.',
          '`webLLM(options)`: provider helper for WebLLM.',
          '`createHybridModelRouter(routes)`: route simple work to local models and complex work to developer-provided models.',
          '`createSupervisorRouter(options)`: route by lightweight intent patterns before falling back to the default model cascade.',
          '`createMarkdownMemoryStore(options)`: hydrate relevant Markdown-backed memory into the run context.',
          '`createPiiRedactor(options)`: mask common PII patterns before tool results are emitted to telemetry, audit, and UI events.',
          '`createAgUiAgent(options)`: wrap an AG-UI compatible event stream as an Edgekit agent.',
          '`agUiEventToAgentEvents(event)`: translate AG-UI events into Edgekit events.',
          '`actionsToEdgeView(actions)`: compile action metadata into declarative EdgeView cards/forms.',
          '`resolveSessionContext(options)`: combine host session, identity, and app-state providers.',
          '`filterToolManifestsForSession(manifests, session)`: apply role and permission filters to dynamic tools.',
          '`withToolContext(tools, context)`: pass identity, auth, and state into tool execution without adding secrets to the prompt.',
          '`mcpToolsFromDefinitions(definitions, client)`: convert a safe MCP tool catalog into Edgekit tools.',
          '`loadMcpTools(client)`: load tools from an MCP client that exposes `listTools()` and `callTool()`.',
          '`createMissionControl()`: aggregate telemetry events for dashboards or analytics adapters.',
          '`createAuditTrail(options)`: create a hash-chained approval/tool audit log.',
          '`createModelProvider(options)`: define a custom provider.',
          '`tool`: re-export of the AI SDK tool helper.',
          '`modelOptional(schema)`: optional schema helper that treats model-supplied `null` the same as an omitted field.',
          '`LanguageModelV3`: model type export for custom providers.',
        ],
      },
      {
        id: 'create-agent',
        title: 'createAgent',
        body: ['Use `createAgent` directly when building a custom UI or when you need complete control over event rendering.'],
        code: {
          language: 'ts',
          text: `import { createAgent, chromeAI } from '@kevinmarmstrong/edgekit'

const agent = createAgent({
  systemPrompt: 'You are a precise app assistant.',
  model: [chromeAI()],
  tools: { searchProducts, addToCart },
  downloadPolicy: 'never',
  onNoModel: ({ input }) => 'Basic mode answer for: ' + input,
})`,
        },
      },
      {
        id: 'approval-resume',
        title: 'Approval resume',
        body: ['When a tool needs approval, call `respondToApproval` with the approval id and decision.'],
        code: {
          language: 'ts',
          text: `for await (const event of agent.respondToApproval(approvalId, true)) {
  renderAgentEvent(event)
}`,
        },
      },
    ],
  },
  {
    slug: 'advanced',
    navLabel: 'Advanced',
    title: 'Scalable integration primitives',
    summary: 'Hybrid routing, MCP adapters, telemetry, audit trails, and coding-agent handoff patterns.',
    sections: [
      {
        id: 'identity',
        title: 'Identity and session context',
        body: [
          'Use `sessionProvider`, `identityProvider`, and `stateProvider` to bridge the host app session into Edgekit. The model receives only a safe public identity summary and app-state summary; auth headers, cookies, and tokens stay in the tool execution context.',
          'This lets registered tools and MCP proxies enforce the same user, tenant, and permission checks your backend already uses.',
        ],
        code: {
          language: 'ts',
          text: `chat.configure({
  sessionProvider: () => ({
    identity: {
      id: currentUser.id,
      tenantId: currentTenant.id,
      roles: currentUser.roles,
      permissions: currentUser.permissions,
    },
    auth: {
      headers: { authorization: 'Bearer ' + appJwt },
      credentials: 'include',
    },
  }),
})`,
        },
      },
      {
        id: 'rbac',
        title: 'Dynamic RBAC tools',
        body: [
          'Use `toolManifests` when the available agent tools depend on the signed-in user. Edgekit filters the manifest each run, so a customer can see customer tools while an admin session can hydrate elevated account-management tools.',
        ],
        code: {
          language: 'ts',
          text: `const agent = createAgent({
  systemPrompt,
  identityProvider: getCurrentIdentity,
  toolManifests: [
    { name: 'searchOrders', tool: searchOrders, permissions: ['orders:read'] },
    { name: 'suspendAccount', tool: suspendAccount, roles: ['admin'], permissions: ['accounts:suspend'] },
  ],
})`,
        },
      },
      {
        id: 'state-hydration',
        title: 'State hydration',
        body: [
          'Use `stateProvider` to give the model a concise, host-owned view of the current page or workflow before the user asks anything. This reduces wasted tool calls and helps the sidecar act like it belongs inside the app.',
        ],
        code: {
          language: 'ts',
          text: `chat.configure({
  stateProvider: () => ({
    route: location.pathname,
    view: 'Checkout',
    summary: 'Cart contains 2 items. User is choosing shipping.',
    data: { cartItems: 2, step: 'shipping' },
  }),
})`,
        },
      },
      {
        id: 'markdown-memory',
        title: 'Markdown memory stores',
        body: [
          'Use `createMarkdownMemoryStore()` when an app needs persistent local memory without committing to a vector database on day one. Markdown files are easy for developers, coding agents, support teams, and vibe coders to inspect, review, diff, and ship with an app.',
          'The built-in store treats Markdown headings as memory records and searches them with a lightweight term scorer. It is intentionally replaceable: any object with `search(query, context)` and optional `write(record, context)` can back Edgekit memory, including IndexedDB, OPFS, a vector store, or a server profile service.',
          'Store preferences, workflow notes, and non-sensitive support history. Do not store raw secrets, access tokens, payment data, or regulated medical content unless your app has an explicit compliance design for that memory.',
        ],
        code: {
          language: 'ts',
          text: `const memory = createMarkdownMemoryStore({
  documents: [
    {
      id: 'local-preferences',
      source: 'profile-memory.md',
      content: await fetch('/memory/profile-memory.md').then(res => res.text()),
    },
  ],
})

const agent = createAgent({
  systemPrompt,
  tools,
  memory,
  memoryLimit: 3,
})`,
        },
      },
      {
        id: 'hybrid-routing',
        title: 'Hybrid routing',
        body: [
          'Use `createHybridModelRouter()` when simple work should stay local but complex prompts should route to a developer-provided model. The cloud model can be any AI SDK-compatible model exposed by your app route or provider package.',
          'The router receives the user input, message history, available tools, default local cascade, and whether the run is a fresh send or approval resume.',
        ],
        code: {
          language: 'ts',
          text: `const modelRouter = createHybridModelRouter([
  {
    id: 'cloud-complex',
    model: [cloudModel],
    when: ({ input }) => /plan|compare|synthesize|multi-step/i.test(input),
  },
], [chromeAI(), webLLM()])

const agent = createAgent({
  systemPrompt,
  tools,
  model: [chromeAI(), webLLM()],
  modelRouter,
})`,
        },
      },
      {
        id: 'supervisor-routing',
        title: 'Supervisor routing',
        body: [
          '`createSupervisorRouter()` is a simpler route-by-intent layer for apps that want a supervisor/worker pattern without a heavy multi-agent framework. Keep navigation, filtering, and simple extraction on the local model; route synthesis, long planning, or account analysis to a developer-provided worker model.',
          'The router can match explicit intent strings, regular expressions, or a custom `when(context)` predicate. Because it returns a normal `EdgeModelRouter`, teams can replace it later with a richer classifier without changing the sidecar integration.',
        ],
        code: {
          language: 'ts',
          text: `const modelRouter = createSupervisorRouter({
  fallback: [chromeAI(), webLLM()],
  workers: [
    {
      id: 'analysis-worker',
      model: [cloudAnalysisModel],
      intents: ['compare accounts', 'explain churn'],
      patterns: [/synthesize|multi-step|forecast/i],
    },
  ],
})

chat.configure({ modelRouter })`,
        },
      },
      {
        id: 'mcp',
        title: 'MCP tool catalogs',
        body: [
          'Edgekit should not connect a browser directly to arbitrary MCP stdio servers with broad filesystem, database, or credential access. The scalable pattern is a safe MCP proxy or app backend that exposes only the approved tool catalog.',
          '`mcpToolsFromDefinitions()` converts that catalog into normal Edgekit tools, so existing MCP resources can power the sidecar without hand-writing every wrapper.',
        ],
        code: {
          language: 'ts',
          text: `const tools = await loadMcpTools({
  listTools: () => fetch('/api/mcp/tools').then(res => res.json()),
  callTool: (name, input) =>
    fetch('/api/mcp/call', {
      method: 'POST',
      body: JSON.stringify({ name, input }),
    }).then(res => res.json()),
})

chat.registerTools(tools)`,
        },
      },
      {
        id: 'redaction',
        title: 'PII/PHI redaction',
        body: [
          'Use redactors to sanitize values before tool results are emitted back through the agent event stream, telemetry, or audit trail. `createPiiRedactor()` masks common emails, phone numbers, SSNs, and card-like numbers, and accepts custom regular expressions for app-specific identifiers.',
          'This is a middleware hook, not a legal guarantee. Regulated deployments should add domain redactors, avoid placing sensitive fields in model prompts, and keep backend permission checks as the final authority.',
        ],
        code: {
          language: 'ts',
          text: `const redactor = createPiiRedactor({
  customPatterns: [
    { name: 'patient-id', pattern: /PAT-[0-9]{6}/g },
  ],
})

const agent = createAgent({
  systemPrompt,
  tools,
  redactors: redactor,
})`,
        },
      },
      {
        id: 'telemetry',
        title: 'Telemetry and mission control',
        body: [
          'Pass `telemetry` to `createAgent()`, `createAgUiAgent()`, or `<edge-chat>.configure()` to observe runs, model availability, tool calls, approvals, views, errors, and UI actions.',
          '`createMissionControl()` is an in-memory aggregator for demos and dashboards. Production teams can send the same event contract to OpenTelemetry, Datadog, PostHog, Supabase, or their own warehouse.',
        ],
        code: {
          language: 'ts',
          text: `const missionControl = createMissionControl()
missionControl.subscribe((_event, snapshot) => renderDashboard(snapshot))

chat.configure({
  telemetry: missionControl,
  sessionId: currentUser.id,
})`,
        },
      },
      {
        id: 'audit',
        title: 'Approval audit trails',
        body: [
          '`createAuditTrail()` records tool calls, tool results, approval requests, approval decisions, UI actions, and errors into a hash chain. The default hash is portable and deterministic; compliance deployments should provide their own cryptographic hash or signing function and persist entries server-side.',
        ],
        code: {
          language: 'ts',
          text: `const auditTrail = createAuditTrail({
  sessionId: currentUser.id,
  hash: payload => signOrHash(payload),
})

const agent = createAgent({
  systemPrompt,
  tools,
  auditTrail,
})`,
        },
      },
      {
        id: 'agent-handoff',
        title: 'Coding-agent handoff',
        body: [
          'The repository includes `AGENTS.md` for implementation agents. It names the architecture, extension points, commands, and release rules so future coding agents can make changes without drifting from the product model.',
          'For smart but non-specialist builders: start with `<edge-chat>`, register a few app tools, add `registerActions()` for buttons/forms, then add telemetry or AG-UI only when the app needs them.',
        ],
      },
    ],
  },
  {
    slug: 'ui',
    navLabel: 'UI Component',
    title: 'The edge-chat component',
    summary: 'Use the Lit web component for the default sidecar UI, prompts, and approval controls.',
    sections: [
      {
        id: 'component',
        title: 'Component usage',
        body: ['`<edge-chat>` is a web component. It can live inside any framework or vanilla app surface.'],
        code: {
          language: 'ts',
          text: `import '@kevinmarmstrong/edgekit-ui'

const chat = document.querySelector('edge-chat')
chat?.configure({
  model: [chromeAI()],
  downloadPolicy: 'never',
  onNoModel: ({ input }) => fallbackSearch(input),
})
chat?.registerTools({ searchProducts, addToCart })`,
        },
      },
      {
        id: 'ag-ui-agent',
        title: 'AG-UI agent',
        body: ['Use `useAgent()` when the sidecar should be powered by an AG-UI-compatible backend instead of the built-in browser model cascade.'],
        code: {
          language: 'ts',
          text: `import { createAgUiAgent } from '@kevinmarmstrong/edgekit'

const agent = createAgUiAgent({
  endpoint: '/api/ag-ui/support-agent',
})

const chat = document.querySelector('edge-chat')
chat?.useAgent(agent)`,
        },
      },
      {
        id: 'actions',
        title: 'User actions',
        body: [
          'Use `registerActions()` to turn tool results into fillable CTAs. This keeps users out of unnecessary chat-confirmation turns: the agent can search, then the UI can render a size selector, plan picker, support-category menu, booking date field, or other app-specific form before running a registered tool.',
          'Tool-call trace messages are hidden by default. Add the `show-tool-events` attribute when you want visible debugging markers.',
        ],
        code: {
          language: 'ts',
          text: `chat?.registerActions(({ toolName, output }) => {
  if (toolName !== 'searchProducts' || !Array.isArray(output.results)) return []

  return output.results.map(product => ({
    id: \`add-\${product.id}\`,
    label: \`Add \${product.name} to cart\`,
    toolName: 'addToCart',
    description: 'Choose required details before running the app action.',
    input: { productId: product.id, quantity: 1 },
    fields: [
      {
        name: 'size',
        label: 'Size',
        type: 'select',
        required: true,
        options: product.sizes.map(size => ({ label: size, value: size })),
      },
    ],
  }))
})`,
        },
      },
      {
        id: 'states',
        title: 'Built-in states',
        body: ['The component renders the states expected in an embedded agent workflow.'],
        bullets: [
          'Provider status: checking, downloading, ready, unavailable, error.',
          'Download prompt for local model setup when policy allows prompting.',
          'Approval prompt for guarded tools.',
          'Optional tool-call markers when `show-tool-events` is enabled.',
          'Action cards with select, text, and number fields from `registerActions()`.',
          'No-model fallback messages for browsers without local model support.',
        ],
      },
    ],
  },
  {
    slug: 'cli',
    navLabel: 'Docs CLI',
    title: 'Documentation index CLI',
    summary: 'Build a portable docs index and expose it as an edgekit search tool.',
    sections: [
      {
        id: 'index-command',
        title: 'Index project docs',
        body: ['The CLI creates JSON that can be registered behind a normal tool.'],
        code: {
          language: 'bash',
          text: 'pnpm --filter @kevinmarmstrong/edgekit-cli build\npnpm --filter @kevinmarmstrong/edgekit-cli index -- README.md DESIGN.md --out edgekit-docs-index.json',
        },
      },
      {
        id: 'register-docs-tool',
        title: 'Register a docs search tool',
        body: ['The public site uses this pattern for the project Q&A demo.'],
        code: {
          language: 'ts',
          text: `const searchDocsTool = tool({
  description: 'Search project documentation.',
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }) => ({ query, results: searchDocs(query) }),
})`,
        },
      },
    ],
  },
  {
    slug: 'testing',
    navLabel: 'Testing',
    title: 'Testing agent workflows',
    summary: 'Use deterministic workflow tests for CI and real-model evals for provider quality.',
    sections: [
      {
        id: 'workflow-tests',
        title: 'Deterministic workflow tests',
        body: [
          'The ecommerce and admin demos include scripted provider modes. They are not the user-facing model path. They exist so CI can prove tool calling, approval prompts, rejection, and state mutation without depending on local model availability.',
        ],
        code: {
          language: 'bash',
          text: 'pnpm test:workflows\npnpm test:e2e',
        },
      },
      {
        id: 'model-evals',
        title: 'Real-model evals',
        body: [
          '`pnpm eval:models` launches a browser against the ecommerce demo and records model/provider behavior to `test-results/model-cascade-eval.json`. Model unavailability is reportable by default and becomes a failure when `EDGEKIT_REQUIRE_REAL_MODEL=1` is set.',
        ],
        code: {
          language: 'bash',
          text: 'pnpm eval:models\nEDGEKIT_EVAL_HEADLESS=0 pnpm eval:models\nEDGEKIT_REQUIRE_REAL_MODEL=1 pnpm eval:models',
        },
      },
      {
        id: 'release-gates',
        title: 'Release gates',
        body: ['Run the full gates before publishing a public release.'],
        bullets: ['`pnpm test`', '`pnpm typecheck`', '`pnpm build`', '`pnpm test:e2e`'],
      },
    ],
  },
  {
    slug: 'deployment',
    navLabel: 'Deployment',
    title: 'Deployment and hosting',
    summary: 'GitHub Pages hosts the public docs. Cloudflare Pages or Vercel can provide WebLLM headers.',
    sections: [
      {
        id: 'github-pages',
        title: 'GitHub Pages',
        body: [
          'The canonical public site is deployed from `site/dist` by `.github/workflows/pages.yml`. GitHub Pages is good for the docs, Chrome AI demos, and basic fallback demos.',
        ],
      },
      {
        id: 'webllm-hosting',
        title: 'WebLLM hosting headers',
        body: [
          'WebLLM works best when the host can set cross-origin isolation headers. The repo includes local Vite headers plus a Cloudflare Pages `_headers` file.',
        ],
        code: {
          language: 'http',
          text: `Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: cross-origin`,
        },
      },
      {
        id: 'cloudflare-pages',
        title: 'Cloudflare Pages',
        body: ['The repo includes `site/wrangler.jsonc` and a convenience deploy script for a WebLLM-capable Pages host.'],
        code: {
          language: 'bash',
          text: 'pnpm deploy:cloudflare',
        },
      },
    ],
  },
]

export function getDocsPage(slug: string) {
  return docsPages.find(page => page.slug === slug) ?? docsPages[0]
}

export function docsPath(page: DocsPage) {
  return page.slug === 'overview' ? '/docs/' : `/docs/${page.slug}/`
}
