# Enterprise controls

Identity, RBAC, memory, audit, offline sync, tool policy, and observability primitives.

## Identity and session context

Use `sessionProvider`, `identityProvider`, and `stateProvider` to bridge the host app session into Edgekit. The model receives only a safe public identity summary and app-state summary; auth headers, cookies, and tokens stay in the tool execution context.

This lets registered tools and MCP proxies enforce the same user, tenant, and permission checks your backend already uses.



```ts
chat.configure({
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
})
```

## Dynamic RBAC tools

Use `toolManifests` when the available agent tools depend on the signed-in user. Edgekit filters the manifest each run, so a customer can see customer tools while an admin session can hydrate elevated account-management tools.



```ts
const agent = createAgent({
  systemPrompt,
  identityProvider: getCurrentIdentity,
  toolManifests: [
    { name: 'searchOrders', tool: searchOrders, permissions: ['orders:read'] },
    { name: 'suspendAccount', tool: suspendAccount, roles: ['admin'], permissions: ['accounts:suspend'] },
  ],
})
```

## State hydration

Use `stateProvider` to give the model a concise, host-owned view of the current page or workflow before the user asks anything. This reduces wasted tool calls and helps the sidecar act like it belongs inside the app.



```ts
chat.configure({
  stateProvider: () => ({
    route: location.pathname,
    view: 'Checkout',
    summary: 'Cart contains 2 items. User is choosing shipping.',
    data: { cartItems: 2, step: 'shipping' },
  }),
})
```

## Markdown memory stores

Use `createMarkdownMemoryStore()` when an app needs persistent local memory without committing to a vector database on day one. Markdown files are easy for developers, coding agents, support teams, and vibe coders to inspect, review, diff, and ship with an app.

The built-in store treats Markdown headings as memory records and searches them with a lightweight term scorer. It is intentionally replaceable: any object with `search(query, context)` and optional `write(record, context)` can back Edgekit memory, including IndexedDB, OPFS, a vector store, or a server profile service.

Store preferences, workflow notes, and non-sensitive support history. Do not store raw secrets, access tokens, payment data, or regulated medical content unless your app has an explicit compliance design for that memory.



```ts
const memory = createMarkdownMemoryStore({
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
})
```

## Memory compaction

Markdown memory is transparent, but append-heavy history must be compressed before it overwhelms small local context windows. Configure compaction on the Markdown store or pass `memoryCompaction` to `createAgent()` so Edgekit can replace active raw records with a concise current-state snapshot.

The default summarizer is deterministic and local. Production apps can provide `summarize(records, context)` to call a local summarizer, a cloud model route, or an app-owned summarization endpoint. Raw records are archived by default inside the store rather than silently discarded.

Run redaction before writing sensitive memory, and avoid treating memory compaction as a compliance boundary. It is a context-budget and latency control.



```ts
const memory = createMarkdownMemoryStore({
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
})
```

## Hybrid routing

Use `createHybridModelRouter()` when simple work should stay local but complex prompts should route to a developer-provided model. The cloud model can be any AI SDK-compatible model exposed by your app route or provider package.

The router receives the user input, message history, available tools, default local cascade, and whether the run is a fresh send or approval resume.



```ts
const modelRouter = createHybridModelRouter([
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
})
```

## Supervisor routing

`createSupervisorRouter()` is a simpler route-by-intent layer for apps that want a supervisor/worker pattern without a heavy multi-agent framework. Keep navigation, filtering, and simple extraction on the local model; route synthesis, long planning, or account analysis to a developer-provided worker model.

The router can match explicit intent strings, regular expressions, or a custom `when(context)` predicate. Because it returns a normal `EdgeModelRouter`, teams can replace it later with a richer classifier without changing the sidecar integration.

Worker routes can receive `onHandoff(envelope)`. The envelope contains the user intent, recent messages, selected memory records, public identity, app state, tool names, and trace ids without secret identity claims.



```ts
const modelRouter = createSupervisorRouter({
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

chat.configure({ modelRouter })
```

## Cross-agent handoffs

Use the handoff envelope when a local supervisor routes work to a cloud worker, AG-UI backend, or other specialist agent. The cloud worker should not wake up cold; it should receive a strict, bounded package of context that mirrors what the local sidecar already knows.

Edgekit intentionally packages selected memory records and the host-provided state snapshot, not a raw DOM dump. If a developer wants DOM-derived context, they should summarize it through `stateProvider` first.



```ts
const modelRouter = createSupervisorRouter({
  fallback: [chromeAI()],
  workers: [
    {
      id: 'cloud-analysis',
      model: [cloudModel],
      patterns: [/synthesize|forecast/i],
      onHandoff: envelope => sendToWorkerTrace(envelope),
    },
  ],
})
```

## MCP tool catalogs

Edgekit should not connect a browser directly to arbitrary MCP stdio servers with broad filesystem, database, or credential access. The scalable pattern is a safe MCP proxy or app backend that exposes only the approved tool catalog.

`mcpToolsFromDefinitions()` converts that catalog into normal Edgekit tools, so existing MCP resources can power the sidecar without hand-writing every wrapper.



```ts
const tools = await loadMcpTools({
  listTools: () => fetch('/api/mcp/tools').then(res => res.json()),
  callTool: (name, input) =>
    fetch('/api/mcp/call', {
      method: 'POST',
      body: JSON.stringify({ name, input }),
    }).then(res => res.json()),
})

chat.registerTools(tools)
```

## PII/PHI redaction

Use redactors to sanitize values before tool results are emitted back through the agent event stream, telemetry, or audit trail. `createPiiRedactor()` masks common emails, phone numbers, SSNs, and card-like numbers, and accepts custom regular expressions for app-specific identifiers.

This is a middleware hook, not a legal guarantee. Regulated deployments should add domain redactors, avoid placing sensitive fields in model prompts, and keep backend permission checks as the final authority.



```ts
const redactor = createPiiRedactor({
  customPatterns: [
    { name: 'patient-id', pattern: /PAT-[0-9]{6}/g },
  ],
})

const agent = createAgent({
  systemPrompt,
  tools,
  redactors: redactor,
})
```

## Tool repair loop

Browser-local models may produce malformed tool arguments. Edgekit now retries validation-shaped tool failures invisibly before showing the user an error. The repair message includes the validation failure and asks the model to retry the tool call with valid JSON.

The default repair loop retries up to three validation-like failures. Configure `toolRepair` to reduce attempts, disable repair, or plug in your own `shouldRepair` and `instruction` functions for app-specific schemas.



```ts
const agent = createAgent({
  systemPrompt,
  tools,
  toolRepair: {
    maxAttempts: 2,
    shouldRepair: error => String(error).includes('validation'),
  },
})
```

## Streaming activity states

Edgekit emits `activity` events for orchestration states such as cached responses, tool execution, memory compaction, approvals, and tool repair. These are not chain-of-thought; they are safe, user-facing progress markers.

The default `<edge-chat>` component renders active states as transient rows so longer workflows feel alive without dumping internal reasoning into the transcript.



```ts
for await (const event of agent.send(input)) {
  if (event.type === 'activity') {
    renderProgress(event.activity.label, event.activity.status)
  }
}
```

## Edge response cache

Use `responseCache` when repeated read-only questions can be answered without running model inference again. The default cache key includes normalized input, public identity, app state, selected memory, tools, and phase.

Start with `createMemoryResponseCache()` for tests or short-lived sessions. Use `createIndexedDbResponseCache()` when a browser app wants persisted cache entries. Cache writes are skipped by default once a run uses tools, approvals, repairs, or errors.

Do not cache mutation flows, approval outcomes, auth-sensitive outputs, or responses that depend on hidden server state unless your app provides an explicit cache policy and invalidation story.



```ts
const agent = createAgent({
  systemPrompt,
  tools,
  responseCache: createIndexedDbResponseCache(),
  cachePolicy: {
    ttlMs: 5 * 60 * 1000,
  },
})
```

## Parallel-safe tools

Use `executeParallelTools()` for app-owned batches of independent tool calls. Edgekit only runs a batch concurrently when each tool manifest is marked `readOnly: true` and `parallelSafe: true`; mutations and unmarked tools stay sequential.

This keeps latency wins focused on safe reads such as profile lookups, catalog searches, weather, documentation search, or permissions checks while avoiding accidental concurrent writes.

The built-in AI SDK model loop remains the primary orchestrator. This helper is for custom harnesses, AG-UI backends, and host apps that receive an array of independent tool intents.



```ts
const results = await executeParallelTools({
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
})
```

## Offline mutation journal

Local inference can still work without internet, but networked tools and cloud routes cannot. Edgekit handles that boundary with a mutation journal contract rather than forcing a CRDT engine into core.

Wrap approved, idempotent tools with `createOfflineTool()`. When `online()` returns false, the wrapper records the mutation locally and returns a queued result. When connectivity returns, `syncMutationJournal()` replays queued mutations through the original tool execution context so the host app keeps identity, auth, validation, telemetry, and conflict handling.

Use `createMemoryMutationJournal()` for tests and temporary sessions. Use `createLocalStorageMutationJournal()` for simple browser persistence. For collaborative documents or complex shared state, add Yjs or Automerge as an adapter that implements the same journal contract.



```ts
const journal = createLocalStorageMutationJournal()
const addToCartOffline = createOfflineTool({
  name: 'addToCart',
  tool: addToCart,
  journal,
  online: () => navigator.onLine,
  idempotencyKey: input => `cart:${input.productId}:${input.size}`,
})

window.addEventListener('online', () => {
  syncMutationJournal({
    journal,
    tools: { addToCart },
    context: { session: currentSession },
    onActivity: activity => renderProgress(activity),
  })
})
```

## Guarded tool execution

Dynamic MCP catalogs and third-party client tools should not run with unlimited trust. Start with policy isolation: explicit allowlists, timeouts, input and output payload limits, abort signals, and backend/proxy boundaries for secret-bearing work.

`createToolPolicyExecutor()` is intentionally lighter than a WASM runtime. It gives every host app a default safety boundary today, while leaving room for worker and WASM adapters later for pure compute tools.

Use backend MCP proxies for filesystem, database, SaaS, or credentialed tools. Use browser-side policy execution for narrow client capabilities where the host app owns the risk.



```ts
const executor = createToolPolicyExecutor({
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
})
```

## Telemetry and mission control

Pass `telemetry` to `createAgent()`, `createAgUiAgent()`, or `<edge-chat>.configure()` to observe runs, model availability, tool calls, approvals, views, errors, and UI actions.

`createMissionControl()` is an in-memory aggregator for demos and dashboards. Production teams can send the same event contract to OpenTelemetry, Datadog, PostHog, Supabase, or their own warehouse.



```ts
const missionControl = createMissionControl()
missionControl.subscribe((_event, snapshot) => renderDashboard(snapshot))

chat.configure({
  telemetry: missionControl,
  sessionId: currentUser.id,
})
```

## Approval audit trails

`createAuditTrail()` records tool calls, tool results, approval requests, approval decisions, UI actions, and errors into a hash chain. The default hash is portable and deterministic; compliance deployments should provide their own cryptographic hash or signing function and persist entries server-side.



```ts
const auditTrail = createAuditTrail({
  sessionId: currentUser.id,
  hash: payload => signOrHash(payload),
})

const agent = createAgent({
  systemPrompt,
  tools,
  auditTrail,
})
```

## Coding-agent handoff

The repository includes `AGENTS.md` for implementation agents. It names the architecture, extension points, commands, and release rules so future coding agents can make changes without drifting from the product model.

For smart but non-specialist builders: start with `<edge-chat>`, register a few app tools, add `registerActions()` for buttons/forms, then add telemetry or AG-UI only when the app needs them.

## Roadmap

The near-term roadmap is adoption and safety before heavier infrastructure: publish the packages, keep React first-class, add Vue and Svelte wrappers after the React API settles, and ship a browser worker adapter for guarded tools.

The offline roadmap is adapter-driven. Core owns the mutation journal and sync contract; optional Yjs and Automerge packages can provide CRDT-backed journals for collaborative state without making every Edgekit app adopt a CRDT.

The isolation roadmap is progressive. Start with policy execution and backend MCP proxies, then add worker isolation, then add a WASM adapter for pure compute tools where the browser sandbox meaningfully helps.