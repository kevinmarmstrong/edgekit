# edgekit

Core runtime for browser-native agent sidecars.

```ts
import { createAgent, tool } from '@kevinmarmstrong/edgekit'
import { z } from 'zod'

const agent = createAgent({
  systemPrompt: 'You are a helpful assistant.',
  tools: {
    searchProducts: tool({
      description: 'Search products',
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) => fetch(`/api/products?q=${query}`).then(res => res.json()),
    }),
  },
})

for await (const event of agent.send('find running shoes')) {
  if (event.type === 'text-delta') process.stdout.write(event.text)
}
```

Use `chromeAI()` and `webLLM()` for the default local model cascade, or pass any AI SDK language model in `model`.
