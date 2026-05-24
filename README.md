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

```html
<edge-chat
  system-prompt="You are a helpful shopping assistant."
  placeholder="Find running shoes under $100"
></edge-chat>
```

## Packages

- `@kevinmarmstrong/edgekit`: core browser-agent runtime, model cascade, tool loop wrapper, provider helpers.
- `@kevinmarmstrong/edgekit-ui`: Lit web component, `<edge-chat>`, and `mountChat()`.
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
