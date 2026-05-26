# @kevinmarmstrong/edgekit

Core runtime for browser-native agent sidecars.

The recommended production pattern is **Primitives -> Skills -> Mission Profiles**:

```ts
const profile = createMissionProfile({
  id: 'support-workflow-v1',
  mission: 'support-workflow',
  version: '1.0.0',
  systemPrompt: 'Search support cases before answering. Ask for approval before ticket creation.',
  requiredTools: ['searchSupportCases', 'createSupportTicket'],
  defaults: { toolChoice: 'required', downloadPolicy: 'never' },
})

chat.applyMissionProfile(profile)
chat.registerTools({ searchSupportCases, createSupportTicket })
```

Use raw `createAgent()` when building custom renderers or advanced orchestration. For most app integrations, define Skills and a Mission Profile, register app-owned executable tools, validate the profile, then run outcome tests.

```ts
import { createAgent, modelOptional, tool } from '@kevinmarmstrong/edgekit'
import { z } from 'zod'

const agent = createAgent({
  systemPrompt: 'You are a helpful assistant.',
  tools: {
    searchProducts: tool({
      description: 'Search products',
      inputSchema: z.object({
        query: z.string(),
        maxPrice: modelOptional(z.number()),
      }),
      execute: async ({ query, maxPrice }) => {
        const params = new URLSearchParams({ q: query })
        if (maxPrice) params.set('max_price', String(maxPrice))
        return fetch(`/api/products?${params}`).then(res => res.json())
      },
    }),
  },
})

for await (const event of agent.send('find running shoes')) {
  if (event.type === 'text-delta') process.stdout.write(event.text)
}
```

Use `chromeAI()` and `webLLM()` for the default local model cascade, or pass any AI SDK language model in `model`.
Use `createCascadeReadinessController()` when the app needs to check browser/provider state before showing agent features. It returns a headless snapshot with provider status, missing capabilities, and a recommended action (`prompt`, `suggest`, `message`, `hide`, `fallback`, or `continue`) so your app can render its own wizard, banner, modal, or disabled state.
Use `modelOptional(schema)` for optional tool fields so browser models can omit a value or send `null` without causing a visible schema-retry loop.
Use `createAgUiAgent({ endpoint })` to connect an AG-UI compatible event stream, and `actionsToEdgeView()` when you want tool results to render as declarative cards/forms.
Use `createHybridModelRouter()` or `createSupervisorRouter()` when an app needs cloud fallback or lightweight supervisor/worker delegation without replacing the browser-native runtime.
Use `createHandoffEnvelope()` or supervisor `onHandoff` callbacks to pass bounded context to cloud workers without leaking secret claims.
Use `createMarkdownMemoryStore()` for inspectable `.md`-backed memory that can later be replaced by IndexedDB, OPFS, vectors, or a server store implementing the same `search()` contract. Configure compaction thresholds when Markdown logs become append-heavy.
Use `EdgeKnowledgeSource`, `createKnowledgeTool()`, and `createKnowledgeSkill()` when retrieval is a first-class app capability. Edgekit normalizes citations and freshness metadata while the app owns Markdown, vector, hybrid, graph, SQL, or backend knowledge infrastructure.
Use `createMemoryResponseCache()` or `createIndexedDbResponseCache()` for opt-in state-keyed caching of read-only responses.
Use `createOfflineTool()`, `createMemoryMutationJournal()`, `createLocalStorageMutationJournal()`, and `syncMutationJournal()` for offline-capable mutations that queue locally and sync through the original app tools later.
Use `createToolPolicyExecutor()` or `executeToolWithPolicy()` to put timeouts, payload limits, and allowlists around dynamically loaded or third-party tools before considering heavier worker or WASM isolation.
Use `createPiiRedactor()` or custom redactors to sanitize tool results before they are emitted to UI events, telemetry, and audit trails.
Use `toolRepair` to invisibly retry validation-shaped tool failures before surfacing an error.
Use `activity` events for safe progress UI, and `executeParallelTools()` for host-owned read-only tool batches that explicitly opt into parallel execution.
Use `mcpToolsFromDefinitions()`, `createMissionControl()`, and `createAuditTrail()` when an app needs MCP-backed tools, telemetry, or approval audit logging.
Use `identityProvider`, `sessionProvider`, `stateProvider`, `toolManifests`, and `withToolContext()` to bind tools to the host app identity, RBAC permissions, auth context, and current app state.
