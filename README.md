# edgekit v3

Browser-native agent runtime for adding an AI sidecar to an existing web app. The agent runs in the visitor's browser through Chrome AI or WebLLM, uses Vercel AI SDK tool calling, and calls the app capabilities you register as tools.

## Status

Release candidate scaffold. The Phase 0 spike is validated, the core package and web component build, and the ecommerce demo has automated browser smoke coverage.

## Quick Start

```bash
pnpm install
pnpm build
pnpm test
pnpm test:e2e
pnpm dev:ecommerce
```

Open the ecommerce demo at `http://127.0.0.1:5173`.

## Embed

```ts
import '@kevinmarmstrong/edgekit-ui'
import { tool } from '@kevinmarmstrong/edgekit'
import { z } from 'zod'

const searchProducts = tool({
  description: 'Search the product catalog',
  inputSchema: z.object({
    query: z.string(),
    maxPrice: z.number().optional(),
  }),
  execute: async ({ query, maxPrice }) => {
    const params = new URLSearchParams({ q: query })
    if (maxPrice) params.set('max_price', String(maxPrice))
    return fetch(`/api/products?${params}`).then(res => res.json())
  },
})

const chat = document.querySelector('edge-chat')
chat?.registerTools({ searchProducts })
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
- `examples/ecommerce`: retrofit demo with product search and add-to-cart tools.
- `spike`: Phase 0 validation harness for Vercel AI SDK plus `@browser-ai` providers.

## Release Checks

- `pnpm test`: core unit coverage for model cascade and multi-turn message history.
- `pnpm typecheck`: strict TypeScript across core, UI, example, and spike.
- `pnpm build`: package and demo production builds.
- `pnpm test:e2e`: browser smoke for the ecommerce demo and graceful no-model fallback.

## Notes

The browser model ecosystem moves quickly. Keep provider-specific code behind `chromeAI()` and `webLLM()` wrappers. Do not hand-roll orchestration, model adapters, streaming, or message formatting; use Vercel AI SDK and `@browser-ai`.
