# Ecosystem and integrations

Framework wrappers, AG-UI backends, MCP tool catalogs, CRDT adapters, and future isolation adapters.

## Framework wrappers

The base UI is a standards-based web component, so it can run in any frontend. The ecosystem packages make that universal primitive idiomatic inside popular frameworks.

`@kevinmarmstrong/edgekit-react` is the first official wrapper. It exposes JSX and hooks while preserving the same core agent runtime and `<edge-chat>` renderer. Vue and Svelte wrappers are roadmap items once the React API shape settles.



```tsx
import { EdgeChat, useEdgeAgent } from '@kevinmarmstrong/edgekit-react'

function Assistant({ agent }) {
  const edge = useEdgeAgent(agent)
  return <EdgeChat onReady={chat => chat.useAgent?.(agent)} />
}
```

## AG-UI providers

Use AG-UI when a backend agent already owns the reasoning loop. Edgekit can render the event stream inside the application and keep the same EdgeView component contract for forms, cards, tables, and charts.

Production AG-UI integrations need a hosted route or worker that can stream provider events, hold secrets, enforce rate limits, and call only the tools the app intentionally exposes.

- Use `createAgUiAgent({ endpoint })` for HTTP/SSE endpoints.
- Use `createAgUiAgent({ run })` when adapting an event iterator from an existing agent client.
- Keep public demos explicit when they use scripted streams instead of a real provider backend.

## MCP adapters

Edgekit adapts safe MCP catalogs with `loadMcpTools()` and `mcpToolsFromDefinitions()`. The browser should not connect directly to broad stdio servers, file systems, databases, or credential-bearing resources.

The enterprise pattern is a backend MCP proxy that exposes a least-privilege catalog for the current user and tenant, then lets Edgekit treat those capabilities as normal app tools.

## Offline and CRDT adapters

Core owns the mutation journal contract: queue an approved idempotent mutation, replay it through the original app tool, and preserve conflict status when sync cannot be resolved automatically.

Yjs and Automerge belong as optional adapters on top of that journal, not as mandatory core dependencies. Use CRDTs for collaborative state and shared documents; use the built-in journals for simpler queued app actions.

## Worker and WASM isolation

Tool isolation is progressive. Start with `createToolPolicyExecutor()` for allowlists, timeouts, payload limits, and abort signals. Add a Worker adapter when client-side tools need to run off the main thread.

WASM is a future adapter for pure compute tools. It is not a substitute for backend authorization around MCP, SaaS, database, or filesystem access.