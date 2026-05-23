export type DocChunk = {
  title: string
  body: string
  tags: string[]
}

export const docChunks: DocChunk[] = [
  {
    title: 'North Star',
    tags: ['overview', 'runtime'],
    body:
      'edgekit is a browser-native agent runtime. It lets developers add an AI sidecar to any web app that runs in the visitor browser using Chrome AI or WebLLM. No backend, no API keys, and zero marginal cost per user by default.',
  },
  {
    title: 'Retrofit Pattern',
    tags: ['tools', 'api', 'retrofit'],
    body:
      'Developers register existing app endpoints as AI SDK tools. For example, an ecommerce app can expose searchProducts and addToCart without changing the product API or cart API.',
  },
  {
    title: 'Model Cascade',
    tags: ['chrome ai', 'webllm', 'fallback'],
    body:
      'The default cascade tries Chrome AI first, then WebLLM, then optional server models, then graceful search-only or no-model fallback. Downloads are controlled by downloadPolicy and callbacks.',
  },
  {
    title: 'Human Approval',
    tags: ['hitl', 'approval', 'safety'],
    body:
      'Tools can set needsApproval to true for irreversible actions like add to cart, submit order, or delete. The UI surfaces approval prompts instead of letting the model silently act.',
  },
  {
    title: 'Use Libraries',
    tags: ['architecture', 'ai sdk'],
    body:
      'edgekit intentionally uses Vercel AI SDK for orchestration, tool loops, streaming, and message formatting. It avoids custom graph engines, custom model adapters, and custom streaming code.',
  },
  {
    title: 'Packages',
    tags: ['repo', 'packages'],
    body:
      'The repo contains @kevinmarmstrong/edgekit for core runtime, @kevinmarmstrong/edgekit-ui for the Lit web component, a spike harness, ecommerce demo, and this GitHub Pages site.',
  },
  {
    title: 'Testing',
    tags: ['tests', 'playwright'],
    body:
      'The release checks include Vitest unit tests for cascade and conversation history, strict TypeScript, production builds, Playwright desktop and mobile E2E, and package dry runs.',
  },
]

export function searchDocs(query: string) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

  return docChunks
    .map(chunk => {
      const haystack = `${chunk.title} ${chunk.tags.join(' ')} ${chunk.body}`.toLowerCase()
      const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0)
      return { ...chunk, score }
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
}
