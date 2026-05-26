# Quick start

Add the core package and web component, register tools, and mount the sidecar.

## Install

The packages are workspace-local today and ready for package publication when release metadata is finalized.



```bash
pnpm install
pnpm build
pnpm test
pnpm test:e2e
```

## Embed the web component

Import the UI package once, place `<edge-chat>` where the sidecar belongs, then register app tools from JavaScript.



```html
<edge-chat
  system-prompt="You are a concise shopping assistant."
  placeholder="Find running shoes under $100"
></edge-chat>
```

## Register a tool

Tools use the Vercel AI SDK `tool()` helper, so schemas and execution stay familiar.



```ts
import '@kevinmarmstrong/edgekit-ui'
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

document.querySelector('edge-chat')?.registerTools({ searchProducts })
```