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
    title: 'Local-first agent sidecars',
    summary:
      'edgekit adds agent workflows to existing web apps without forcing every prompt, tool call, and UI step through a metered cloud agent.',
    sections: [
      {
        id: 'first-principles',
        title: 'First principles',
        body: [
          'Developers usually investigate edgekit because they already want an agent in a site or application and have run into a blocker: unpredictable token costs, sensitive context, slow orchestration, offline workflows, tool safety, or the need to reuse existing product APIs.',
          'edgekit starts from those constraints. Run browser-native models first, tune the cascade to the workflow, register existing app capabilities as typed tools, and let the host app remain the authority for data, permissions, state, and final execution.',
        ],
        bullets: [
          'Unbounded token spend: run local browser models first and reserve cloud models for explicit fallback routes.',
          'Sensitive app context: keep prompts, state summaries, memory, and tool results local unless the app chooses otherwise.',
          'Existing app logic: register current APIs and functions as typed tools instead of rebuilding workflow logic.',
          'Model fit: choose Chrome AI, WebLLM, local model ladders, supervisor routing, or cloud workers per use case.',
          'Agent latency: combine parallel-safe read tools, edge response caching, and streaming activity states.',
          'Offline workflows: pair local inference with Markdown memory, offline mutation journals, and CRDT-ready sync adapters.',
          'Trust and compliance: require approvals for risky tools and emit telemetry plus hash-chained audit trails.',
          'Dynamic tools: hydrate RBAC-filtered manifests, adapt MCP catalogs safely, and wrap tool execution with policy limits.',
          'Agent-readable docs: provide Markdown and llms exports so coding agents can implement against the project without scraping UI chrome.',
        ],
      },
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
    navLabel: 'Quick Start',
    title: 'Quick start',
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
    navLabel: 'Architecture',
    title: 'Core architecture',
    summary: 'Understand providers, fallback, tools, approvals, state, and the event stream.',
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
          'Set `needsApproval: true` on tools that change important state. edgekit emits an approval request, the UI renders approve/reject controls, and `respondToApproval()` resumes the agent turn with the approval decision plus the original approved tool call.',
          'Custom providers and deterministic test harnesses should continue from that approved tool call instead of reconstructing the mutation from user text. That keeps fields such as selected size, account id, plan, quantity, or reason intact across the approval boundary.',
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
    navLabel: 'API Reference',
    title: 'API reference',
    summary: 'Typed runtime exports for providers, agents, memory, telemetry, audit, offline sync, and tool policy.',
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
          '`createHandoffEnvelope(options)`: package intent, state, memory, and tool context for worker handoffs.',
          '`estimateTokens(value)`: lightweight token estimate for memory thresholds and handoff budgets.',
          '`createMemoryResponseCache()`: opt-in in-memory response cache for deterministic local reuse.',
          '`createIndexedDbResponseCache(options)`: browser IndexedDB response cache for persisted edge caching.',
          '`executeParallelTools(options)`: run explicitly read-only and parallel-safe tool batches concurrently.',
          '`createOfflineTool(options)`: wrap an app tool so approved offline-capable mutations queue instead of failing when the network is unavailable.',
          '`createMemoryMutationJournal(options)`: in-memory mutation journal for tests and short-lived sessions.',
          '`createLocalStorageMutationJournal(options)`: browser-local mutation journal for simple persisted offline queues.',
          '`syncMutationJournal(options)`: replay queued mutations through the original app tools and mark synced, failed, or conflict status.',
          '`createToolPolicyExecutor(options)`: enforce allowlists, timeouts, and payload limits around dynamic tool execution.',
          '`executeToolWithPolicy(options, policy)`: one-shot guarded execution for third-party or MCP-adapted tools.',
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
        body: [
          'When a tool needs approval, call `respondToApproval` with the approval id and decision. The resumed model message includes a `tool-approval-response` part with `approvalId`, `approved`, `reason`, and the original `toolCall` payload.',
          'Use that `toolCall` as the source of truth for approved mutations in scripted providers, AG-UI bridges, and test doubles.',
        ],
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
    navLabel: 'Enterprise',
    title: 'Enterprise controls',
    summary: 'Identity, RBAC, memory, audit, offline sync, tool policy, and observability primitives.',
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
        id: 'memory-compaction',
        title: 'Memory compaction',
        body: [
          'Markdown memory is transparent, but append-heavy history must be compressed before it overwhelms small local context windows. Configure compaction on the Markdown store or pass `memoryCompaction` to `createAgent()` so Edgekit can replace active raw records with a concise current-state snapshot.',
          'The default summarizer is deterministic and local. Production apps can provide `summarize(records, context)` to call a local summarizer, a cloud model route, or an app-owned summarization endpoint. Raw records are archived by default inside the store rather than silently discarded.',
          'Run redaction before writing sensitive memory, and avoid treating memory compaction as a compliance boundary. It is a context-budget and latency control.',
        ],
        code: {
          language: 'ts',
          text: `const memory = createMarkdownMemoryStore({
  documents: [{ id: 'session-log', content: sessionMarkdown }],
  compaction: {
    thresholdTokens: 1200,
    maxSnapshotTokens: 350,
    summarize: async records => summarizeWithAppModel(records),
  },
})

const agent = createAgent({
  systemPrompt,
  tools,
  memory,
  memoryCompaction: { thresholdTokens: 1200 },
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
          'Worker routes can receive `onHandoff(envelope)`. The envelope contains the user intent, recent messages, selected memory records, public identity, app state, tool names, and trace ids without secret identity claims.',
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
        id: 'handoffs',
        title: 'Cross-agent handoffs',
        body: [
          'Use the handoff envelope when a local supervisor routes work to a cloud worker, AG-UI backend, or other specialist agent. The cloud worker should not wake up cold; it should receive a strict, bounded package of context that mirrors what the local sidecar already knows.',
          'Edgekit intentionally packages selected memory records and the host-provided state snapshot, not a raw DOM dump. If a developer wants DOM-derived context, they should summarize it through `stateProvider` first.',
        ],
        code: {
          language: 'ts',
          text: `const modelRouter = createSupervisorRouter({
  fallback: [chromeAI()],
  workers: [
    {
      id: 'cloud-analysis',
      model: [cloudModel],
      patterns: [/synthesize|forecast/i],
      onHandoff: envelope => sendToWorkerTrace(envelope),
    },
  ],
})`,
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
        id: 'tool-repair',
        title: 'Tool repair loop',
        body: [
          'Browser-local models may produce malformed tool arguments. Edgekit now retries validation-shaped tool failures invisibly before showing the user an error. The repair message includes the validation failure and asks the model to retry the tool call with valid JSON.',
          'The default repair loop retries up to three validation-like failures. Configure `toolRepair` to reduce attempts, disable repair, or plug in your own `shouldRepair` and `instruction` functions for app-specific schemas.',
        ],
        code: {
          language: 'ts',
          text: `const agent = createAgent({
  systemPrompt,
  tools,
  toolRepair: {
    maxAttempts: 2,
    shouldRepair: error => String(error).includes('validation'),
  },
})`,
        },
      },
      {
        id: 'activity-events',
        title: 'Streaming activity states',
        body: [
          'Edgekit emits `activity` events for orchestration states such as cached responses, tool execution, memory compaction, approvals, and tool repair. These are not chain-of-thought; they are safe, user-facing progress markers.',
          'The default `<edge-chat>` component renders active states as transient rows so longer workflows feel alive without dumping internal reasoning into the transcript.',
        ],
        code: {
          language: 'ts',
          text: `for await (const event of agent.send(input)) {
  if (event.type === 'activity') {
    renderProgress(event.activity.label, event.activity.status)
  }
}`,
        },
      },
      {
        id: 'response-cache',
        title: 'Edge response cache',
        body: [
          'Use `responseCache` when repeated read-only questions can be answered without running model inference again. The default cache key includes normalized input, public identity, app state, selected memory, tools, and phase.',
          'Start with `createMemoryResponseCache()` for tests or short-lived sessions. Use `createIndexedDbResponseCache()` when a browser app wants persisted cache entries. Cache writes are skipped by default once a run uses tools, approvals, repairs, or errors.',
          'Do not cache mutation flows, approval outcomes, auth-sensitive outputs, or responses that depend on hidden server state unless your app provides an explicit cache policy and invalidation story.',
        ],
        code: {
          language: 'ts',
          text: `const agent = createAgent({
  systemPrompt,
  tools,
  responseCache: createIndexedDbResponseCache(),
  cachePolicy: {
    ttlMs: 5 * 60 * 1000,
  },
})`,
        },
      },
      {
        id: 'parallel-tools',
        title: 'Parallel-safe tools',
        body: [
          'Use `executeParallelTools()` for app-owned batches of independent tool calls. Edgekit only runs a batch concurrently when each tool manifest is marked `readOnly: true` and `parallelSafe: true`; mutations and unmarked tools stay sequential.',
          'This keeps latency wins focused on safe reads such as profile lookups, catalog searches, weather, documentation search, or permissions checks while avoiding accidental concurrent writes.',
          'The built-in AI SDK model loop remains the primary orchestrator. This helper is for custom harnesses, AG-UI backends, and host apps that receive an array of independent tool intents.',
        ],
        code: {
          language: 'ts',
          text: `const results = await executeParallelTools({
  calls: [
    { id: 'profile', toolName: 'getProfile', input: {} },
    { id: 'docs', toolName: 'searchDocs', input: { query } },
  ],
  tools,
  manifests: [
    { name: 'getProfile', tool: getProfile, readOnly: true, parallelSafe: true },
    { name: 'searchDocs', tool: searchDocs, readOnly: true, parallelSafe: true },
  ],
  context: { session },
})`,
        },
      },
      {
        id: 'offline-journal',
        title: 'Offline mutation journal',
        body: [
          'Local inference can still work without internet, but networked tools and cloud routes cannot. Edgekit handles that boundary with a mutation journal contract rather than forcing a CRDT engine into core.',
          'Wrap approved, idempotent tools with `createOfflineTool()`. When `online()` returns false, the wrapper records the mutation locally and returns a queued result. When connectivity returns, `syncMutationJournal()` replays queued mutations through the original tool execution context so the host app keeps identity, auth, validation, telemetry, and conflict handling.',
          'Use `createMemoryMutationJournal()` for tests and temporary sessions. Use `createLocalStorageMutationJournal()` for simple browser persistence. For collaborative documents or complex shared state, add Yjs or Automerge as an adapter that implements the same journal contract.',
        ],
        code: {
          language: 'ts',
          text: `const journal = createLocalStorageMutationJournal()
const addToCartOffline = createOfflineTool({
  name: 'addToCart',
  tool: addToCart,
  journal,
  online: () => navigator.onLine,
  idempotencyKey: input => \`cart:\${input.productId}:\${input.size}\`,
})

window.addEventListener('online', () => {
  syncMutationJournal({
    journal,
    tools: { addToCart },
    context: { session: currentSession },
    onActivity: activity => renderProgress(activity),
  })
})`,
        },
      },
      {
        id: 'guarded-tools',
        title: 'Guarded tool execution',
        body: [
          'Dynamic MCP catalogs and third-party client tools should not run with unlimited trust. Start with policy isolation: explicit allowlists, timeouts, input and output payload limits, abort signals, and backend/proxy boundaries for secret-bearing work.',
          '`createToolPolicyExecutor()` is intentionally lighter than a WASM runtime. It gives every host app a default safety boundary today, while leaving room for worker and WASM adapters later for pure compute tools.',
          'Use backend MCP proxies for filesystem, database, SaaS, or credentialed tools. Use browser-side policy execution for narrow client capabilities where the host app owns the risk.',
        ],
        code: {
          language: 'ts',
          text: `const executor = createToolPolicyExecutor({
  defaultPolicy: {
    timeoutMs: 3000,
    maxInputBytes: 16_000,
    maxOutputBytes: 64_000,
    allowedTools: ['searchDocs', 'summarizeSelection'],
  },
})

const output = await executor.execute({
  toolName: 'searchDocs',
  tool: searchDocs,
  input: { query },
  context: { session },
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
      {
        id: 'roadmap',
        title: 'Roadmap',
        body: [
          'The near-term roadmap is adoption and safety before heavier infrastructure: publish the packages, keep React first-class, add Vue and Svelte wrappers after the React API settles, and ship a browser worker adapter for guarded tools.',
          'The offline roadmap is adapter-driven. Core owns the mutation journal and sync contract; optional Yjs and Automerge packages can provide CRDT-backed journals for collaborative state without making every Edgekit app adopt a CRDT.',
          'The isolation roadmap is progressive. Start with policy execution and backend MCP proxies, then add worker isolation, then add a WASM adapter for pure compute tools where the browser sandbox meaningfully helps.',
        ],
      },
    ],
  },
  {
    slug: 'ecosystem',
    navLabel: 'Ecosystem',
    title: 'Ecosystem and integrations',
    summary: 'Framework wrappers, AG-UI backends, MCP tool catalogs, CRDT adapters, and future isolation adapters.',
    sections: [
      {
        id: 'frameworks',
        title: 'Framework wrappers',
        body: [
          'The base UI is a standards-based web component, so it can run in any frontend. The ecosystem packages make that universal primitive idiomatic inside popular frameworks.',
          '`@kevinmarmstrong/edgekit-react` is the first official wrapper. It exposes JSX and hooks while preserving the same core agent runtime and `<edge-chat>` renderer. Vue and Svelte wrappers are roadmap items once the React API shape settles.',
        ],
        code: {
          language: 'tsx',
          text: `import { EdgeChat, useEdgeAgent } from '@kevinmarmstrong/edgekit-react'

function Assistant({ agent }) {
  const edge = useEdgeAgent(agent)
  return <EdgeChat onReady={chat => chat.useAgent?.(agent)} />
}`,
        },
      },
      {
        id: 'ag-ui',
        title: 'AG-UI providers',
        body: [
          'Use AG-UI when a backend agent already owns the reasoning loop. Edgekit can render the event stream inside the application and keep the same EdgeView component contract for forms, cards, tables, and charts.',
          'Production AG-UI integrations need a hosted route or worker that can stream provider events, hold secrets, enforce rate limits, and call only the tools the app intentionally exposes.',
        ],
        bullets: [
          'Use `createAgUiAgent({ endpoint })` for HTTP/SSE endpoints.',
          'Use `createAgUiAgent({ run })` when adapting an event iterator from an existing agent client.',
          'Keep public demos explicit when they use scripted streams instead of a real provider backend.',
        ],
      },
      {
        id: 'mcp',
        title: 'MCP adapters',
        body: [
          'Edgekit adapts safe MCP catalogs with `loadMcpTools()` and `mcpToolsFromDefinitions()`. The browser should not connect directly to broad stdio servers, file systems, databases, or credential-bearing resources.',
          'The enterprise pattern is a backend MCP proxy that exposes a least-privilege catalog for the current user and tenant, then lets Edgekit treat those capabilities as normal app tools.',
        ],
      },
      {
        id: 'offline-adapters',
        title: 'Offline and CRDT adapters',
        body: [
          'Core owns the mutation journal contract: queue an approved idempotent mutation, replay it through the original app tool, and preserve conflict status when sync cannot be resolved automatically.',
          'Yjs and Automerge belong as optional adapters on top of that journal, not as mandatory core dependencies. Use CRDTs for collaborative state and shared documents; use the built-in journals for simpler queued app actions.',
        ],
      },
      {
        id: 'isolation-adapters',
        title: 'Worker and WASM isolation',
        body: [
          'Tool isolation is progressive. Start with `createToolPolicyExecutor()` for allowlists, timeouts, payload limits, and abort signals. Add a Worker adapter when client-side tools need to run off the main thread.',
          'WASM is a future adapter for pure compute tools. It is not a substitute for backend authorization around MCP, SaaS, database, or filesystem access.',
        ],
      },
    ],
  },
  {
    slug: 'ui',
    navLabel: 'Interface',
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
        id: 'react',
        title: 'React wrapper',
        body: [
          'Use `@kevinmarmstrong/edgekit-react` when a React app wants idiomatic hooks and JSX while preserving the same browser-native runtime and `<edge-chat>` renderer.',
          '`EdgeChat` wraps the web component. `useEdgeAgent()` and `createEdgeAgentController()` expose streaming text, approval state, events, and activity rows for custom React surfaces.',
        ],
        code: {
          language: 'tsx',
          text: `import { EdgeChat, useEdgeAgent } from '@kevinmarmstrong/edgekit-react'

function Assistant({ agent }) {
  const edge = useEdgeAgent(agent)

  return (
    <>
      <EdgeChat
        systemPrompt="You are a concise app assistant."
        onReady={chat => chat.useAgent?.(agent)}
      />
      {edge.state.activities.map(activity => (
        <p key={activity.id}>{activity.label}</p>
      ))}
    </>
  )
}`,
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
    navLabel: 'Docs Indexing',
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
          'Scripted providers should validate EdgeKit contracts rather than patch a fixture. In particular, approval-loop tests should assert that the exact approved tool input survives resume, not just that the demo happens to add a known product or update a known account.',
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
        id: 'research-loops',
        title: 'Research loops',
        body: [
          '`pnpm research:agents` is the end-to-end product research harness. It opens the docs site and demos in Chromium, sends real user prompts, scores answer quality, verifies approval boundaries, checks app state after mutations, probes AG-UI component rendering, confirms dogfooding, and captures transcripts plus screenshots.',
          'Run it locally before release work and against GitHub Pages after deploy. The goal is to tune EdgeKit contracts, reusable harnesses, prompts, and integration guidance. Do not use it as an excuse to add hardcoded patches that only satisfy one demo fixture.',
        ],
        code: {
          language: 'bash',
          text: 'pnpm research:agents\nEDGEKIT_RESEARCH_TARGET=live pnpm research:agents\nEDGEKIT_RESEARCH_HEADLESS=0 pnpm research:agents\nEDGEKIT_RESEARCH_STRICT=0 pnpm research:agents',
        },
      },
      {
        id: 'expansive-suite',
        title: 'Expansive outcome suite',
        body: [
          '`pnpm research:suite` is the broader tuning loop. It reads scenario packs from `evals/agent-suite/scenarios.json`, applies thresholds from `evals/agent-suite/rubric.json`, runs seeded prompt variants across browser demos, and executes architecture probes that cannot be safely exposed from GitHub Pages.',
          'The suite covers Chrome AI/WebLLM/provider fallback behavior, hybrid cloud-route selection, supervisor handoffs, response caching, tool repair, MCP adapters, tool policy boundaries, offline mutation journals, parallel-safe tools, PII redaction, loaded-page offline behavior, AG-UI rendering, admin approvals, and agent-readable docs. The rubric requires no required failures, no required skips, an average score of at least 0.98, and category confidence ratings above their thresholds. Strict real-provider runs can target a dedicated Chrome profile through `EDGEKIT_CHROME_USER_DATA_DIR` or a normal Chrome remote-debugging session through `EDGEKIT_CHROME_CDP_URL`.',
        ],
        code: {
          language: 'bash',
          text: 'pnpm research:env\npnpm research:suite\npnpm research:full\npnpm chrome:profile\npnpm test:routes\nEDGEKIT_SUITE_TARGET=live pnpm research:suite\nEDGEKIT_SUITE_PROMPT_LIMIT=2 pnpm research:suite\nEDGEKIT_SUITE_SEED=42 pnpm research:suite\nEDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:full\nEDGEKIT_CHROME_USER_DATA_DIR="$HOME/.edgekit/chrome-profile" EDGEKIT_SUITE_HEADLESS=0 EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:full\nEDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_SUITE_CLOUD_ROUTE_URL=http://127.0.0.1:4198/api/edgekit/cloud-route EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:full',
        },
      },
      {
        id: 'release-gates',
        title: 'Release gates',
        body: ['Run the full gates before publishing a public release.'],
        bullets: ['`pnpm test`', '`pnpm typecheck`', '`pnpm build`', '`pnpm test:e2e`', '`pnpm research:agents`', '`pnpm research:suite`'],
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
