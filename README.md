# edgekit

Browser-native agent runtime for adding an AI sidecar to an existing web app. The agent runs in the visitor's browser through Chrome AI or WebLLM, uses Vercel AI SDK tool calling, and calls the app capabilities you register as tools.

## Status

Release candidate scaffold. The Phase 0 spike is validated, the core package, docs index CLI, and web component build, and the ecommerce/docs demos have automated browser smoke coverage.

## Quick Start

```bash
pnpm install
pnpm build
pnpm test
pnpm test:e2e
pnpm eval:models
pnpm dev:ecommerce
```

Open the ecommerce demo at `http://127.0.0.1:5173`.
Open the public docs and demo site at `https://kevinmarmstrong.github.io/edgekit/`.
Open the full documentation at `https://kevinmarmstrong.github.io/edgekit/docs/`.

## Embed

```ts
import '@kevinmarmstrong/edgekit-ui'
import { modelOptional, tool } from '@kevinmarmstrong/edgekit'
import { z } from 'zod'

const searchProducts = tool({
  description: 'Search the product catalog',
  inputSchema: z.object({
    query: z.string(),
    maxPrice: modelOptional(z.number()),
  }),
  execute: async ({ query, maxPrice }) => {
    const params = new URLSearchParams({ q: query })
    if (maxPrice) params.set('max_price', String(maxPrice))
    return fetch(`/api/products?${params}`).then(res => res.json())
  },
})

const chat = document.querySelector('edge-chat')
chat?.registerTools({ searchProducts })
chat?.registerActions(({ toolName, output }) => {
  if (toolName !== 'searchProducts' || !Array.isArray(output.results)) return []
  return output.results.map(product => ({
    id: `add-${product.id}`,
    label: `Add ${product.name} to cart`,
    toolName: 'addToCart',
    input: { productId: product.id, quantity: 1 },
    fields: [{ name: 'size', label: 'Size', type: 'select', options: product.sizes.map(size => ({ label: size, value: size })) }],
  }))
})
```

AG-UI-compatible backends can drive the same component:

```ts
import { createAgUiAgent } from '@kevinmarmstrong/edgekit'

const agent = createAgUiAgent({ endpoint: '/api/ag-ui/support-agent' })
document.querySelector('edge-chat')?.useAgent(agent)
```

Use the native path when the web app can register local tools directly. Use the AG-UI path when an existing backend agent, CopilotKit/LangGraph/CrewAI bridge, or AG-UI HTTP stream should own the run while Edgekit renders the in-app experience.

The public GitHub Pages AG-UI demo uses a scripted mock stream so it can run without a backend. It is meant to prove the renderer and provider boundary; production apps should point `createAgUiAgent()` at a real endpoint or event iterator.

Backend-served generative UI needs a hosted route or worker that can stream AG-UI events, hold provider secrets, enforce rate limits, and call only the app tools you intentionally expose.

```html
<edge-chat
  system-prompt="You are a helpful shopping assistant."
  placeholder="Find running shoes under $100"
></edge-chat>
```

## Scalable Integration Primitives

edgekit stays small by exposing contracts instead of shipping a required cloud service:

- Hybrid routing: `createHybridModelRouter()` keeps simple work local and routes complex work to a developer-provided model.
- MCP catalogs: `mcpToolsFromDefinitions()` and `loadMcpTools()` adapt safe MCP tool catalogs into normal Edgekit tools.
- Telemetry: pass `telemetry` to `createAgent()`, `createAgUiAgent()`, or `<edge-chat>.configure()` to observe runs, tools, approvals, views, errors, and no-model fallbacks.
- Mission control: `createMissionControl()` provides an in-memory dashboard aggregator; production apps can send the same events to OpenTelemetry, Datadog, PostHog, Supabase, or their own warehouse.
- Audit trails: `createAuditTrail()` records tool calls, approval requests, approval decisions, UI actions, and errors in a hash chain. Bring your own signing or cryptographic hash for strict compliance environments.
- Identity and RBAC: `sessionProvider`, `identityProvider`, `stateProvider`, `toolManifests`, `filterToolManifestsForSession()`, and `withToolContext()` bridge app identity and state into Edgekit without putting auth secrets in the model prompt.
- Coding-agent handoff: `AGENTS.md` documents the architecture, commands, and guardrails for implementation agents.

```ts
chat.configure({
  identityProvider: () => ({
    id: currentUser.id,
    tenantId: currentTenant.id,
    roles: currentUser.roles,
    permissions: currentUser.permissions,
  }),
  stateProvider: () => ({
    route: location.pathname,
    view: 'Checkout',
    summary: 'Cart contains 2 items. User is choosing shipping.',
  }),
})
```

## Packages

- `@kevinmarmstrong/edgekit`: core browser-agent runtime, model cascade, tool loop wrapper, provider helpers.
- `@kevinmarmstrong/edgekit-ui`: Lit web component, `<edge-chat>`, EdgeView rendering, and `mountChat()`.
- `@kevinmarmstrong/edgekit-cli`: docs indexing CLI for Q&A/RAG tools.
- `examples/ecommerce`: retrofit demo with product search and add-to-cart tools.
- `site/docs`: full GitHub Pages documentation for concepts, APIs, UI, CLI, testing, and deployment.
- `spike`: Phase 0 validation harness for Vercel AI SDK plus `@browser-ai` providers.

## Docs Index CLI

```bash
pnpm --filter @kevinmarmstrong/edgekit-cli build
pnpm --filter @kevinmarmstrong/edgekit-cli index -- README.md DESIGN.md --out edgekit-docs-index.json
```

The generated JSON is portable: register it behind a normal Edgekit tool and let the agent search it like any other app capability.

## Workflow Testing

The ecommerce demo includes a deterministic test model at `/?agentMode=scripted`. It is not a user-facing model path; it exists so CI can prove the embedded agent contract end to end:

- natural-language request parsing, including "find me size nine white nike dunks and put in cart"
- `searchProducts` tool calls against the app catalog
- approval prompts before guarded `addToCart` mutations
- approve and reject paths that update, or preserve, cart state

Use `pnpm test:workflows` while tuning app workflows. Use real Chrome AI/WebLLM sessions separately for model quality, prompt tuning, and provider behavior.

## Release Checks

- `pnpm test`: unit coverage for model cascade, approval resume, and docs indexing.
- `pnpm typecheck`: strict TypeScript across core, UI, CLI, example, site, and spike.
- `pnpm build`: package and demo production builds.
- `pnpm test:e2e`: browser smoke for the ecommerce demo, scripted agent workflows, and graceful no-model fallback.
- `pnpm test:workflows`: focused Playwright coverage for the ecommerce workflow suite.
- `pnpm eval:models`: real-browser model cascade evals for Chrome AI/WebLLM prompt quality. See `MODEL_EVALS.md`.

## Notes

The browser model ecosystem moves quickly. Keep provider-specific code behind `chromeAI()` and `webLLM()` wrappers. Do not hand-roll orchestration, model adapters, streaming, or message formatting; use Vercel AI SDK and `@browser-ai`.

GitHub Pages is a good public docs/basic-mode host, but it does not provide the cross-origin isolation headers needed for the best WebLLM path. Use Cloudflare Pages, Vercel, or another host with COOP/COEP headers when you want the downloadable WebLLM fallback to run in production.
