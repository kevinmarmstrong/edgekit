# Documentation index CLI

Build a portable docs index and expose it as an edgekit search tool.

## Index project docs

The CLI creates JSON that can be registered behind a normal tool.



```bash
pnpm --filter @kevinmarmstrong/edgekit-cli build
pnpm --filter @kevinmarmstrong/edgekit-cli index -- README.md DESIGN.md --out edgekit-docs-index.json
```

## Register a docs search tool

The public site uses this pattern for the project Q&A demo.



```ts
const searchDocsTool = tool({
  description: 'Search project documentation.',
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }) => ({ query, results: searchDocs(query) }),
})
```