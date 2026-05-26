# API reference

Typed runtime exports for providers, agents, memory, telemetry, audit, offline sync, and tool policy.

## Exports

The core package is intentionally small.

- `createAgent(options)`: create an event-streaming agent.
- `chromeAI()`: provider helper for browser Chrome AI.
- `webLLM(options)`: provider helper for WebLLM.
- `createHybridModelRouter(routes)`: route simple work to local models and complex work to developer-provided models.
- `createSupervisorRouter(options)`: route by lightweight intent patterns before falling back to the default model cascade.
- `createMarkdownMemoryStore(options)`: hydrate relevant Markdown-backed memory into the run context.
- `createHandoffEnvelope(options)`: package intent, state, memory, and tool context for worker handoffs.
- `estimateTokens(value)`: lightweight token estimate for memory thresholds and handoff budgets.
- `createMemoryResponseCache()`: opt-in in-memory response cache for deterministic local reuse.
- `createIndexedDbResponseCache(options)`: browser IndexedDB response cache for persisted edge caching.
- `executeParallelTools(options)`: run explicitly read-only and parallel-safe tool batches concurrently.
- `createOfflineTool(options)`: wrap an app tool so approved offline-capable mutations queue instead of failing when the network is unavailable.
- `createMemoryMutationJournal(options)`: in-memory mutation journal for tests and short-lived sessions.
- `createLocalStorageMutationJournal(options)`: browser-local mutation journal for simple persisted offline queues.
- `syncMutationJournal(options)`: replay queued mutations through the original app tools and mark synced, failed, or conflict status.
- `createToolPolicyExecutor(options)`: enforce allowlists, timeouts, and payload limits around dynamic tool execution.
- `executeToolWithPolicy(options, policy)`: one-shot guarded execution for third-party or MCP-adapted tools.
- `createPiiRedactor(options)`: mask common PII patterns before tool results are emitted to telemetry, audit, and UI events.
- `createAgUiAgent(options)`: wrap an AG-UI compatible event stream as an Edgekit agent.
- `agUiEventToAgentEvents(event)`: translate AG-UI events into Edgekit events.
- `actionsToEdgeView(actions)`: compile action metadata into declarative EdgeView cards/forms.
- `resolveSessionContext(options)`: combine host session, identity, and app-state providers.
- `filterToolManifestsForSession(manifests, session)`: apply role and permission filters to dynamic tools.
- `withToolContext(tools, context)`: pass identity, auth, and state into tool execution without adding secrets to the prompt.
- `mcpToolsFromDefinitions(definitions, client)`: convert a safe MCP tool catalog into Edgekit tools.
- `loadMcpTools(client)`: load tools from an MCP client that exposes `listTools()` and `callTool()`.
- `createMissionControl()`: aggregate telemetry events for dashboards or analytics adapters.
- `createAuditTrail(options)`: create a hash-chained approval/tool audit log.
- `createModelProvider(options)`: define a custom provider.
- `tool`: re-export of the AI SDK tool helper.
- `modelOptional(schema)`: optional schema helper that treats model-supplied `null` the same as an omitted field.
- `LanguageModelV3`: model type export for custom providers.

## createAgent

Use `createAgent` directly when building a custom UI or when you need complete control over event rendering.



```ts
import { createAgent, chromeAI } from '@kevinmarmstrong/edgekit'

const agent = createAgent({
  systemPrompt: 'You are a precise app assistant.',
  model: [chromeAI()],
  tools: { searchProducts, addToCart },
  downloadPolicy: 'never',
  toolChoice: 'auto',
  onNoModel: ({ input }) => 'Basic mode answer for: ' + input,
})
```

## Tool choice

Set `toolChoice: "required"` for docs search, site-map, catalog, or support assistants that must ground answers in registered app tools instead of answering from model memory.

For agentic workflows, pair required tools with `toolProvider` so read tools stay broadly available while mutation tools appear only when the prompt, session, role, and workflow state justify them. Keep the default `auto` behavior for open-ended assistants where a model may answer directly, and never use required tools as a substitute for backend authorization.



```ts
chat.configure({
  model: [chromeAI()],
  toolChoice: 'required',
  toolProvider: ({ input }) =>
    /\b(add|cart|purchase)\b/i.test(input)
      ? { searchProducts, addToCart }
      : { searchProducts },
})

chat.registerTools({ searchProducts, addToCart })
```

## Approval resume

When a tool needs approval, call `respondToApproval` with the approval id and decision. The resumed model message includes a `tool-approval-response` part with `approvalId`, `approved`, `reason`, and the original `toolCall` payload.

Use that `toolCall` as the source of truth for approved mutations in scripted providers, AG-UI bridges, and test doubles.



```ts
for await (const event of agent.respondToApproval(approvalId, true)) {
  renderAgentEvent(event)
}
```