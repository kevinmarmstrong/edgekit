# edgekit

Core runtime for browser-native agent sidecars.

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
Use `modelOptional(schema)` for optional tool fields so browser models can omit a value or send `null` without causing a visible schema-retry loop.
Use `createAgUiAgent({ endpoint })` to connect an AG-UI compatible event stream, and `actionsToEdgeView()` when you want tool results to render as declarative cards/forms.
Use `createHybridModelRouter()` or `createSupervisorRouter()` when an app needs cloud fallback or lightweight supervisor/worker delegation without replacing the browser-native runtime.
Use `createMarkdownMemoryStore()` for inspectable `.md`-backed memory that can later be replaced by IndexedDB, OPFS, vectors, or a server store implementing the same `search()` contract.
Use `createPiiRedactor()` or custom redactors to sanitize tool results before they are emitted to UI events, telemetry, and audit trails.
Use `mcpToolsFromDefinitions()`, `createMissionControl()`, and `createAuditTrail()` when an app needs MCP-backed tools, telemetry, or approval audit logging.
Use `identityProvider`, `sessionProvider`, `stateProvider`, `toolManifests`, and `withToolContext()` to bind tools to the host app identity, RBAC permissions, auth context, and current app state.
