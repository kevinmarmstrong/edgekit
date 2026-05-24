export type DocsPage = {
  slug: string
  title: string
  summary: string
  navLabel: string
  sections: DocsSection[]
}

export type DocsSection = {
  id: string
  title: string
  body: string[]
  bullets?: string[]
  code?: {
    language: string
    text: string
  }
}

export const docsPages: DocsPage[] = [
  {
    slug: 'overview',
    navLabel: 'Overview',
    title: 'What edgekit is',
    summary:
      'edgekit is a browser-native agent runtime for embedding an AI sidecar into an existing web app.',
    sections: [
      {
        id: 'purpose',
        title: 'Purpose',
        body: [
          'edgekit is not a chatbot wrapper. It is a small runtime and UI layer for adding an agent to an app that already has real capabilities: product search, cart changes, account updates, documentation search, support triage, or other app-specific workflows.',
          'The developer registers existing functions as tools. The model can ask to call those tools, and edgekit streams the result into a sidecar UI while preserving approval gates for higher-impact actions.',
        ],
      },
      {
        id: 'repo-map',
        title: 'Repository map',
        body: ['The open source repo is organized as a small monorepo.'],
        bullets: [
          '`packages/core`: model cascade, provider helpers, agent event stream, approval resume.',
          '`packages/ui`: Lit web component, approval prompts, download prompts, chat shell.',
          '`packages/cli`: documentation indexing utility for project Q&A tools.',
          '`examples/ecommerce`: standalone app retrofit demo.',
          '`site`: GitHub Pages docs, Q&A, ecommerce demo, and SaaS admin demo.',
          '`tests/e2e`: Playwright coverage for embedded agent workflows.',
        ],
      },
      {
        id: 'mental-model',
        title: 'Mental model',
        body: [
          'Think of edgekit as an app sidecar. Your app keeps ownership of state, authorization, API boundaries, and UI context. edgekit owns the agent conversation, provider selection, tool-call events, approval prompts, and graceful fallback when local AI is unavailable.',
        ],
      },
    ],
  },
  {
    slug: 'getting-started',
    navLabel: 'Getting Started',
    title: 'Install and embed edgekit',
    summary: 'Add the core package and web component, register tools, and mount the sidecar.',
    sections: [
      {
        id: 'install',
        title: 'Install',
        body: ['The packages are workspace-local today and ready for package publication when release metadata is finalized.'],
        code: {
          language: 'bash',
          text: 'pnpm install\npnpm build\npnpm test\npnpm test:e2e',
        },
      },
      {
        id: 'embed',
        title: 'Embed the web component',
        body: ['Import the UI package once, place `<edge-chat>` where the sidecar belongs, then register app tools from JavaScript.'],
        code: {
          language: 'html',
          text: `<edge-chat
  system-prompt="You are a concise shopping assistant."
  placeholder="Find running shoes under $100"
></edge-chat>`,
        },
      },
      {
        id: 'register-tools',
        title: 'Register a tool',
        body: ['Tools use the Vercel AI SDK `tool()` helper, so schemas and execution stay familiar.'],
        code: {
          language: 'ts',
          text: `import '@kevinmarmstrong/edgekit-ui'
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

document.querySelector('edge-chat')?.registerTools({ searchProducts })`,
        },
      },
    ],
  },
  {
    slug: 'concepts',
    navLabel: 'Concepts',
    title: 'Core concepts',
    summary: 'Understand providers, fallback, tools, approvals, and the event stream.',
    sections: [
      {
        id: 'model-cascade',
        title: 'Model cascade',
        body: [
          'The default strategy tries local browser providers first. Chrome AI can be used when the browser exposes it. WebLLM can be used on hosts with the right cross-origin isolation headers. If no model is available, apps can provide a deterministic fallback through `onNoModel`.',
        ],
        bullets: [
          '`downloadPolicy: "never"` avoids model downloads and is useful for public demos.',
          '`downloadPolicy: "prompt"` lets the UI ask before a model download.',
          '`downloadPolicy: "auto"` is useful for explicit eval sessions or controlled environments.',
        ],
      },
      {
        id: 'tools',
        title: 'Tools are app capabilities',
        body: [
          'Tools should wrap real app capabilities rather than duplicate business logic. Search, retrieve, update, create, cancel, suspend, add-to-cart, and submit-order actions can all be represented as tools.',
          'For optional tool fields, use `modelOptional(schema)`. Browser models may send `null` for an unspecified slot, and the tool should normalize that the same way it handles absence.',
        ],
      },
      {
        id: 'approval',
        title: 'Human approval',
        body: [
          'Set `needsApproval: true` on tools that change important state. edgekit emits an approval request, the UI renders approve/reject controls, and `respondToApproval()` resumes the agent turn with the approval decision.',
        ],
      },
      {
        id: 'events',
        title: 'Agent events',
        body: ['The core agent streams status, text, tool calls, tool results, approval requests, no-model fallbacks, errors, and done events.'],
        code: {
          language: 'ts',
          text: `for await (const event of agent.send('upgrade Northwind to Enterprise')) {
  if (event.type === 'tool-call') console.log(event.toolName, event.input)
  if (event.type === 'approval-request') showApproval(event)
}`,
        },
      },
    ],
  },
  {
    slug: 'api',
    navLabel: 'Core API',
    title: 'Core runtime API',
    summary: 'The core package exposes provider helpers, agent creation, and Vercel AI SDK tool helpers.',
    sections: [
      {
        id: 'exports',
        title: 'Exports',
        body: ['The core package is intentionally small.'],
        bullets: [
          '`createAgent(options)`: create an event-streaming agent.',
          '`chromeAI()`: provider helper for browser Chrome AI.',
          '`webLLM(options)`: provider helper for WebLLM.',
          '`createModelProvider(options)`: define a custom provider.',
          '`tool`: re-export of the AI SDK tool helper.',
          '`modelOptional(schema)`: optional schema helper that treats model-supplied `null` the same as an omitted field.',
          '`LanguageModelV3`: model type export for custom providers.',
        ],
      },
      {
        id: 'create-agent',
        title: 'createAgent',
        body: ['Use `createAgent` directly when building a custom UI or when you need complete control over event rendering.'],
        code: {
          language: 'ts',
          text: `import { createAgent, chromeAI } from '@kevinmarmstrong/edgekit'

const agent = createAgent({
  systemPrompt: 'You are a precise app assistant.',
  model: [chromeAI()],
  tools: { searchProducts, addToCart },
  downloadPolicy: 'never',
  onNoModel: ({ input }) => 'Basic mode answer for: ' + input,
})`,
        },
      },
      {
        id: 'approval-resume',
        title: 'Approval resume',
        body: ['When a tool needs approval, call `respondToApproval` with the approval id and decision.'],
        code: {
          language: 'ts',
          text: `for await (const event of agent.respondToApproval(approvalId, true)) {
  renderAgentEvent(event)
}`,
        },
      },
    ],
  },
  {
    slug: 'ui',
    navLabel: 'UI Component',
    title: 'The edge-chat component',
    summary: 'Use the Lit web component for the default sidecar UI, prompts, and approval controls.',
    sections: [
      {
        id: 'component',
        title: 'Component usage',
        body: ['`<edge-chat>` is a web component. It can live inside any framework or vanilla app surface.'],
        code: {
          language: 'ts',
          text: `import '@kevinmarmstrong/edgekit-ui'

const chat = document.querySelector('edge-chat')
chat?.configure({
  model: [chromeAI()],
  downloadPolicy: 'never',
  onNoModel: ({ input }) => fallbackSearch(input),
})
chat?.registerTools({ searchProducts, addToCart })`,
        },
      },
      {
        id: 'actions',
        title: 'User actions',
        body: [
          'Use `registerActions()` to turn tool results into fillable CTAs. This keeps users out of unnecessary chat-confirmation turns: the agent can search, then the UI can render a size selector, plan picker, support-category menu, booking date field, or other app-specific form before running a registered tool.',
          'Tool-call trace messages are hidden by default. Add the `show-tool-events` attribute when you want visible debugging markers.',
        ],
        code: {
          language: 'ts',
          text: `chat?.registerActions(({ toolName, output }) => {
  if (toolName !== 'searchProducts' || !Array.isArray(output.results)) return []

  return output.results.map(product => ({
    id: \`add-\${product.id}\`,
    label: \`Add \${product.name} to cart\`,
    toolName: 'addToCart',
    description: 'Choose required details before running the app action.',
    input: { productId: product.id, quantity: 1 },
    fields: [
      {
        name: 'size',
        label: 'Size',
        type: 'select',
        required: true,
        options: product.sizes.map(size => ({ label: size, value: size })),
      },
    ],
  }))
})`,
        },
      },
      {
        id: 'states',
        title: 'Built-in states',
        body: ['The component renders the states expected in an embedded agent workflow.'],
        bullets: [
          'Provider status: checking, downloading, ready, unavailable, error.',
          'Download prompt for local model setup when policy allows prompting.',
          'Approval prompt for guarded tools.',
          'Optional tool-call markers when `show-tool-events` is enabled.',
          'Action cards with select, text, and number fields from `registerActions()`.',
          'No-model fallback messages for browsers without local model support.',
        ],
      },
    ],
  },
  {
    slug: 'cli',
    navLabel: 'Docs CLI',
    title: 'Documentation index CLI',
    summary: 'Build a portable docs index and expose it as an edgekit search tool.',
    sections: [
      {
        id: 'index-command',
        title: 'Index project docs',
        body: ['The CLI creates JSON that can be registered behind a normal tool.'],
        code: {
          language: 'bash',
          text: 'pnpm --filter @kevinmarmstrong/edgekit-cli build\npnpm --filter @kevinmarmstrong/edgekit-cli index -- README.md DESIGN.md --out edgekit-docs-index.json',
        },
      },
      {
        id: 'register-docs-tool',
        title: 'Register a docs search tool',
        body: ['The public site uses this pattern for the project Q&A demo.'],
        code: {
          language: 'ts',
          text: `const searchDocsTool = tool({
  description: 'Search project documentation.',
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }) => ({ query, results: searchDocs(query) }),
})`,
        },
      },
    ],
  },
  {
    slug: 'testing',
    navLabel: 'Testing',
    title: 'Testing agent workflows',
    summary: 'Use deterministic workflow tests for CI and real-model evals for provider quality.',
    sections: [
      {
        id: 'workflow-tests',
        title: 'Deterministic workflow tests',
        body: [
          'The ecommerce and admin demos include scripted provider modes. They are not the user-facing model path. They exist so CI can prove tool calling, approval prompts, rejection, and state mutation without depending on local model availability.',
        ],
        code: {
          language: 'bash',
          text: 'pnpm test:workflows\npnpm test:e2e',
        },
      },
      {
        id: 'model-evals',
        title: 'Real-model evals',
        body: [
          '`pnpm eval:models` launches a browser against the ecommerce demo and records model/provider behavior to `test-results/model-cascade-eval.json`. Model unavailability is reportable by default and becomes a failure when `EDGEKIT_REQUIRE_REAL_MODEL=1` is set.',
        ],
        code: {
          language: 'bash',
          text: 'pnpm eval:models\nEDGEKIT_EVAL_HEADLESS=0 pnpm eval:models\nEDGEKIT_REQUIRE_REAL_MODEL=1 pnpm eval:models',
        },
      },
      {
        id: 'release-gates',
        title: 'Release gates',
        body: ['Run the full gates before publishing a public release.'],
        bullets: ['`pnpm test`', '`pnpm typecheck`', '`pnpm build`', '`pnpm test:e2e`'],
      },
    ],
  },
  {
    slug: 'deployment',
    navLabel: 'Deployment',
    title: 'Deployment and hosting',
    summary: 'GitHub Pages hosts the public docs. Cloudflare Pages or Vercel can provide WebLLM headers.',
    sections: [
      {
        id: 'github-pages',
        title: 'GitHub Pages',
        body: [
          'The canonical public site is deployed from `site/dist` by `.github/workflows/pages.yml`. GitHub Pages is good for the docs, Chrome AI demos, and basic fallback demos.',
        ],
      },
      {
        id: 'webllm-hosting',
        title: 'WebLLM hosting headers',
        body: [
          'WebLLM works best when the host can set cross-origin isolation headers. The repo includes local Vite headers plus a Cloudflare Pages `_headers` file.',
        ],
        code: {
          language: 'http',
          text: `Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: cross-origin`,
        },
      },
      {
        id: 'cloudflare-pages',
        title: 'Cloudflare Pages',
        body: ['The repo includes `site/wrangler.jsonc` and a convenience deploy script for a WebLLM-capable Pages host.'],
        code: {
          language: 'bash',
          text: 'pnpm deploy:cloudflare',
        },
      },
    ],
  },
]

export function getDocsPage(slug: string) {
  return docsPages.find(page => page.slug === slug) ?? docsPages[0]
}

export function docsPath(page: DocsPage) {
  return page.slug === 'overview' ? '/docs/' : `/docs/${page.slug}/`
}
