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
    slug: 'overview',
    title: 'Problem to Solution Matrix',
    tags: ['value props', 'positioning', 'open source', 'developer'],
    body:
      'edgekit is positioned for developers who already want an agent in an app and need to solve concrete blockers: token cost, privacy, app integration, model routing, latency, offline operation, approvals, audit, RBAC, and safe dynamic tools. It is not a SaaS sales landing page with one value proposition.',
  },
  {
    slug: 'overview',
    title: 'Predictable Economics',
    tags: ['cost', 'token', 'local', 'browser', 'roi'],
    body:
      'The core economic value is avoiding unbounded token liability. Edgekit runs Chrome AI, WebLLM, or other browser-local models first so common agent work does not create variable cloud API spend. Cloud fallback is explicit and configurable.',
  },
  {
    slug: 'overview',
    title: 'Privacy and Data Boundary',
    tags: ['privacy', 'security', 'data sovereignty', 'local'],
    body:
      'Edgekit keeps prompts, app-state summaries, memory, and tool results local by default. Apps can add redaction middleware, host-owned tool execution, and explicit cloud routes when their security model allows it.',
  },
  {
    slug: 'overview',
    title: 'Agent UX Inside Existing Apps',
    tags: ['tools', 'workflow', 'existing app', 'api'],
    body:
      'Edgekit adds an agent sidecar to product workflows without moving business logic into a chatbot. Developers register existing app APIs and functions as typed tools while the host app keeps authority over identity, state, permissions, approvals, and execution.',
  },
  {
    slug: 'overview',
    title: 'Latency and Resilience',
    tags: ['latency', 'cache', 'parallel', 'offline'],
    body:
      'Edgekit addresses slow or brittle agent loops with parallel-safe read tools, edge response caching, streaming activity states, Markdown memory, offline mutation journals, and sync adapter contracts.',
  },
  {
    slug: 'overview',
    title: 'Enterprise Guardrails',
    tags: ['approval', 'audit', 'rbac', 'mcp', 'policy'],
    body:
      'Edgekit includes primitives for human-gated mutations, telemetry, hash-chained audit trails, identity-aware RBAC tool manifests, safe MCP catalog adapters, and guarded execution policies for dynamic tools.',
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
    title: 'Markdown Memory',
    tags: ['memory', 'markdown', 'rag', 'local'],
    body:
      'createMarkdownMemoryStore turns app-provided Markdown into searchable memory records. It is the simple default for persistent local memory and can be replaced by IndexedDB, OPFS, vector stores, or server-backed profile memory.',
  },
  {
    slug: 'advanced',
    title: 'Memory Compaction',
    tags: ['memory', 'compaction', 'snapshot', 'latency'],
    body:
      'Markdown stores can compact append-heavy logs into current-state snapshots once they pass a token threshold. Developers can keep the default deterministic summarizer or provide their own summarization endpoint.',
  },
  {
    slug: 'advanced',
    title: 'Supervisor Routing',
    tags: ['supervisor', 'routing', 'workers', 'multi-agent'],
    body:
      'createSupervisorRouter provides a lightweight supervisor/worker routing pattern. Route simple UI tasks to local models and delegate synthesis, planning, or analysis to developer-provided workers.',
  },
  {
    slug: 'advanced',
    title: 'Cross-Agent Handoffs',
    tags: ['handoff', 'worker', 'cloud', 'state'],
    body:
      'createHandoffEnvelope packages user intent, selected memory, app state, public identity, tool names, and trace ids so cloud workers and AG-UI backends do not wake up cold.',
  },
  {
    slug: 'advanced',
    title: 'Tool Repair Loop',
    tags: ['tools', 'validation', 'schema', 'retry'],
    body:
      'Edgekit can invisibly retry validation-shaped tool failures with a corrective model instruction, then surface a user-facing error only after the configured repair limit is exhausted.',
  },
  {
    slug: 'advanced',
    title: 'Streaming Activity States',
    tags: ['activity', 'progress', 'ui', 'streaming'],
    body:
      'Edgekit emits safe activity events for orchestration states such as cache hits, tool execution, approvals, memory compaction, and tool repair. The edge-chat component renders them as transient progress rows.',
  },
  {
    slug: 'advanced',
    title: 'Edge Response Cache',
    tags: ['cache', 'indexeddb', 'local', 'battery'],
    body:
      'Response caches can bypass model inference for repeated read-only questions when the normalized prompt, public identity, app state, memory, and tool set have not changed.',
  },
  {
    slug: 'advanced',
    title: 'Parallel-Safe Tools',
    tags: ['parallel', 'tools', 'latency', 'read-only'],
    body:
      'executeParallelTools runs app-owned batches concurrently only when each tool is marked readOnly and parallelSafe. Mutations and unmarked tools remain sequential.',
  },
  {
    slug: 'ui',
    title: 'React Wrapper',
    tags: ['react', 'hooks', 'framework'],
    body:
      '@kevinmarmstrong/edgekit-react provides EdgeChat, useEdgeAgent, useEdgeActivity, and createEdgeAgentController for React apps while preserving the universal edge-chat web component.',
  },
  {
    slug: 'advanced',
    title: 'Offline Mutation Journal',
    tags: ['offline', 'sync', 'journal', 'crdt'],
    body:
      'createOfflineTool queues approved idempotent mutations into a mutation journal when connectivity is unavailable. syncMutationJournal replays them through the original app tools and marks synced, failed, or conflict status.',
  },
  {
    slug: 'advanced',
    title: 'Guarded Tool Execution',
    tags: ['sandbox', 'mcp', 'policy', 'wasm'],
    body:
      'createToolPolicyExecutor and executeToolWithPolicy put allowlists, timeouts, payload limits, and abort signals around third-party or dynamically loaded tools before heavier worker or WASM adapters are needed.',
  },
  {
    slug: 'advanced',
    title: 'Roadmap',
    tags: ['roadmap', 'frameworks', 'crdt', 'wasm'],
    body:
      'The roadmap prioritizes package publication, React first-class adoption, Vue and Svelte wrappers, a worker-backed guarded tool adapter, optional Yjs/Automerge journals, and a later WASM adapter for pure compute tools.',
  },
  {
    slug: 'advanced',
    title: 'PII Redaction',
    tags: ['pii', 'phi', 'redaction', 'privacy', 'compliance'],
    body:
      'createPiiRedactor and custom redactors sanitize tool results before they flow through telemetry, audit trails, and UI events. Use them with strict backend authorization and prompt hygiene.',
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
  {
    slug: 'overview',
    title: 'Dogfood Site Assistant',
    tags: ['demo', 'dogfood', 'site assistant', 'docs'],
    body:
      'The public Pages site mounts an Edgekit assistant across the homepage, docs, and demo pages. It uses the same edge-chat component, Chrome AI cascade, deterministic fallback, docs search tool, and demo catalog tool that adopters can wire into their own apps.',
  },
  {
    slug: 'overview',
    title: 'Separate Demo Pages',
    tags: ['demo', 'ecommerce', 'admin', 'ag-ui', 'mission control'],
    body:
      'Each public demo has its own route: ecommerce retrofit, docs Q&A, AG-UI event stream, SaaS admin workflow, and mission control telemetry. The homepage now links to dedicated workflow pages instead of burying every agent surface on one long page.',
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
