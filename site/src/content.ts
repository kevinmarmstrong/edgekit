export type DocChunk = {
  slug: string
  title: string
  body: string
  tags: string[]
}

export const docChunks: DocChunk[] = [
  {
    slug: 'overview',
    title: 'North Star',
    tags: ['overview', 'runtime'],
    body:
      'edgekit is a browser-native agent runtime. It lets developers add an AI sidecar to any web app that runs in the visitor browser using Chrome AI or WebLLM. No backend, no API keys, and zero marginal cost per user by default.',
  },
  {
    slug: 'getting-started',
    title: 'Retrofit Pattern',
    tags: ['tools', 'api', 'retrofit'],
    body:
      'Developers register existing app endpoints as AI SDK tools. For example, an ecommerce app can expose searchProducts and addToCart without changing the product API or cart API.',
  },
  {
    slug: 'concepts',
    title: 'Model Cascade',
    tags: ['chrome ai', 'webllm', 'fallback'],
    body:
      'The default cascade tries Chrome AI first, then WebLLM, then optional server models, then graceful search-only or no-model fallback. Downloads are controlled by downloadPolicy and callbacks.',
  },
  {
    slug: 'concepts',
    title: 'Human Approval',
    tags: ['hitl', 'approval', 'safety'],
    body:
      'Tools can set needsApproval to true for irreversible actions like add to cart, submit order, or delete. The UI surfaces approval prompts instead of letting the model silently act.',
  },
  {
    slug: 'api',
    title: 'Use Libraries',
    tags: ['architecture', 'ai sdk'],
    body:
      'edgekit intentionally uses Vercel AI SDK for orchestration, tool loops, streaming, and message formatting. It avoids custom graph engines, custom model adapters, and custom streaming code.',
  },
  {
    slug: 'overview',
    title: 'Packages',
    tags: ['repo', 'packages'],
    body:
      'The repo contains @kevinmarmstrong/edgekit for core runtime, @kevinmarmstrong/edgekit-ui for the Lit web component, @kevinmarmstrong/edgekit-cli for docs indexing, a spike harness, ecommerce demo, and this GitHub Pages site.',
  },
  {
    slug: 'deployment',
    title: 'Deployment',
    tags: ['pages', 'webllm', 'headers'],
    body:
      'GitHub Pages hosts the public docs and Chrome AI/basic-mode demos. Full WebLLM production verification needs a host that can set COOP and COEP cross-origin isolation headers. The repo includes Cloudflare Pages headers and wrangler.jsonc for that path.',
  },
  {
    slug: 'testing',
    title: 'Testing',
    tags: ['tests', 'playwright'],
    body:
      'The release checks include Vitest unit tests for cascade and conversation history, strict TypeScript, production builds, Playwright desktop and mobile E2E, scripted ecommerce workflow tests, and package dry runs.',
  },
  {
    slug: 'testing',
    title: 'Workflow Harness',
    tags: ['ecommerce', 'workflow', 'approval', 'cart'],
    body:
      'The ecommerce demo has a deterministic agent mode for CI. It tests requests such as find me size nine white nike dunks and put in cart, verifies searchProducts tool calls, pauses for addToCart approval, and covers both approve and reject paths.',
  },
  {
    slug: 'concepts',
    title: 'Admin Workflow Demo',
    tags: ['saas', 'admin', 'approval', 'workflow'],
    body:
      'The public site includes a SaaS admin sidecar demo. It registers searchAccounts, updatePlan, and suspendAccount tools, then requires approval before account plan changes or suspensions.',
  },
  {
    slug: 'testing',
    title: 'Real Model Evals',
    tags: ['evals', 'chrome ai', 'webllm', 'quality'],
    body:
      'pnpm eval:models runs a real-browser model cascade harness and writes JSON to test-results/model-cascade-eval.json. It separates provider and prompt quality from deterministic CI workflow checks.',
  },
  {
    slug: 'advanced',
    title: 'Hybrid Routing',
    tags: ['routing', 'cloud', 'local', 'cascade'],
    body:
      'createHybridModelRouter lets simple work stay local while complex prompts route to a developer-provided model or app route. The runtime remains local-first and configurable.',
  },
  {
    slug: 'advanced',
    title: 'Identity Bridge',
    tags: ['identity', 'session', 'auth', 'jwt'],
    body:
      'sessionProvider, identityProvider, and stateProvider bridge the host app session into Edgekit. Public identity and app state can inform the model, while auth headers and credentials remain available only to tool execution.',
  },
  {
    slug: 'advanced',
    title: 'RBAC Tool Manifests',
    tags: ['rbac', 'roles', 'permissions', 'tools'],
    body:
      'toolManifests let a SaaS app expose different tools to customers, support users, and admins. Edgekit filters tools by roles and permissions on each run.',
  },
  {
    slug: 'advanced',
    title: 'State Hydration',
    tags: ['state', 'context', 'dom', 'workflow'],
    body:
      'stateProvider injects a concise route, view, and workflow summary so the model starts with page context instead of spending tokens asking tools where the user is.',
  },
  {
    slug: 'advanced',
    title: 'MCP Adapter',
    tags: ['mcp', 'tools', 'integration'],
    body:
      'mcpToolsFromDefinitions and loadMcpTools convert a safe MCP tool catalog into normal Edgekit tools. Use a backend or proxy to keep credentials and broad resource access out of the browser.',
  },
  {
    slug: 'advanced',
    title: 'Telemetry and Audit',
    tags: ['mission control', 'telemetry', 'audit', 'approval'],
    body:
      'createMissionControl aggregates run, tool, approval, error, and no-model events. createAuditTrail records approval and tool activity into a hash-chained log for compliance-oriented deployments.',
  },
  {
    slug: 'advanced',
    title: 'Coding Agent Handoff',
    tags: ['agents', 'implementation', 'handoff'],
    body:
      'AGENTS.md documents the architecture, commands, release checks, extension points, and guardrails so coding agents can implement against Edgekit without drifting from the intended product model.',
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
