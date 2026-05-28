import { docsPages } from './docsContent'

export type DocChunk = {
  slug: string
  title: string
  body: string
  tags: string[]
}

const curatedDocChunks: DocChunk[] = [
  {
    slug: 'overview',
    title: 'North Star',
    tags: ['overview', 'runtime', 'agent-operable'],
    body:
      'Edgekit helps teams make web apps agent-operable. It lets agents use app-owned tools inside existing workflows while the host app keeps control of state, auth, permissions, business logic, approvals, and execution.',
  },
  {
    slug: 'overview',
    title: 'Outcome Hierarchy',
    tags: ['outcome', 'retrofit', 'agent-operated', 'first principles'],
    body:
      'Developers are not shopping for a sidecar as an end in itself. They need agents to do real work inside existing or new apps without rewriting the software, leaking sensitive context, creating unpredictable cloud-token costs, or bypassing the app authority model.',
  },
  {
    slug: 'overview',
    title: 'Agent Worker And Software Tool',
    tags: ['worker', 'tool', 'lifecycle', 'architecture'],
    body:
      'Edgekit separates the agent worker from the software tool. The app is the durable system of record with stable state, auth, APIs, permissions, business logic, and releases. The worker layer can change quickly as models, prompts, Skills, routing, providers, and UX patterns improve.',
  },
  {
    slug: 'overview',
    title: 'Local Worker Role',
    tags: ['local-first', 'chrome ai', 'webllm', 'cloud escalation', 'edge'],
    body:
      'Local-first in Edgekit is a role distinction, not ideology. Browser-local models are useful for bounded user-delegated app work such as reading context, searching records, comparing fields, filling forms, and stepping through workflows. Heavy or risky thinking can route to developer-owned cloud workers by explicit app choice.',
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
      'Edgekit adds agentic workflows to product surfaces without moving business logic into a chatbot. Developers register existing app APIs and functions as typed tools while the host app keeps authority over identity, state, permissions, approvals, and execution.',
  },
  {
    slug: 'overview',
    title: 'Agentic Workflows Not Just RAG',
    tags: ['agentic', 'workflow', 'tools', 'actions', 'rag'],
    body:
      'Edgekit can use search and RAG tools, but the solution stack is for agentic app workflows: registered tools, state hydration, generated CTAs and forms, approval-gated mutations, telemetry, audit, and app-owned execution.',
  },
  {
    slug: 'mission-profiles',
    title: 'Skills and Mission Profiles',
    tags: ['skills', 'mission profile', 'authoring', 'agentic'],
    body:
      'The recommended production path is Primitives to Skills to Mission Profiles. Skills describe reusable capabilities, examples, approval posture, required facts, and UI hints. Mission Profiles assemble those Skills for one localized agent mission. Executable tools remain app-owned and are registered with registerTools. Use validateMissionProfile(profile, { registeredTools }) to catch missing required tools and unsafe profile shape before runtime.',
  },
  {
    slug: 'skill-optimization',
    title: 'Skill Optimization',
    tags: ['skills', 'optimization', 'skillopt', 'validation', 'router'],
    body:
      'Edgekit treats Skills and Mission Profiles as inspectable trainable context artifacts. Skill optimization happens at dev time with bounded patches, held-out validation, strict improvement gates, protected slow-state paths, and per-skill effect-size reporting. This follows lessons from SkillOpt: Executive Strategy for Self-Evolving Agent Skills.',
  },
  {
    slug: 'production',
    title: 'Production Readiness',
    tags: ['production', 'security', 'telemetry', 'approval', 'routing'],
    body:
      'Production Edgekit deployments should keep local-first defaults, explicit cloud escalation routes, app-owned tool authorization, Mission Profile validation, approval gates for risky mutations, telemetry for runs and tool calls, audit trails for approvals, and secrets out of prompts, memory, and state summaries.',
  },
  {
    slug: 'outcome-quality',
    title: 'Outcome Quality Testing',
    tags: ['testing', 'rubric', 'quality', 'harness'],
    body:
      'Edgekit quality tests must measure outcomes, not just whether a call returned. Required categories include answerQuality, synthesisFaithfulness, safety, workflowState, generativeUi, observability, and integrationTransparency.',
  },
  {
    slug: 'adopter-simulation',
    title: 'Adopter Simulation',
    tags: ['onboarding', 'vibe coder', 'elite programmer', 'starter kit'],
    body:
      'Edgekit adopter simulation has two paths: a 30-minute agent-assisted path to choose a mission, copy the starter, replace tool executes, mount edge-chat, validate the Mission Profile, and record the first serious outcome run; and a 90-minute elite programmer path to inspect architecture, wire providers, add telemetry and audit, and run the full battery. Evidence levels are dry-run, starter-run, first-serious-run, and production-shaped.',
  },
  {
    slug: 'adoption-kit',
    title: 'Agent Adoption Kit',
    tags: ['onboarding', 'agent skills', 'recipes', 'cli', 'implementation'],
    body:
      'The Edgekit Adoption Kit combines human guides, coding-agent SKILL.md files, recipe scaffolds, and outcome harnesses. It includes edgekit-implementer, edgekit-outcome-tester, edgekit-skill-optimizer, and edgekit-security-review so coding agents follow the intended Skills and Mission Profiles implementation path.',
  },
  {
    slug: 'recipes',
    title: 'Recipe Catalog',
    tags: ['recipes', 'astro', 'framework', 'intake', 'knowledge'],
    body:
      'Edgekit recipes are opinionated install paths for repeatable app patterns without cluttering core docs. Available recipes include support-workflow, knowledge-skill, and astro-intake-knowledge. Recipes create small inspectable files, app-owned tool placeholders, approval policy, Knowledge Access when needed, and outcome scenarios.',
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
    title: 'Cascade Readiness Wizard',
    tags: ['cascade', 'readiness', 'wizard', 'download policy', 'fallback', 'chrome ai', 'webllm'],
    body:
      'createCascadeReadinessController checks provider state before or during a run and returns a headless snapshot with provider status, missing capabilities, whether fallback is available, and a recommended action: continue, prompt, suggest, message, fallback, hide, or retry. The optional edge-cascade-wizard web component is demo UI; production apps can replace it with their own setup wizard, banner, modal, settings surface, or feature gate.',
  },
  {
    slug: 'concepts',
    title: 'Cascade Permission Lab',
    tags: ['cascade', 'permissions', 'rbac', 'fallback', 'download policy', 'demo'],
    body:
      'The cascade and permission lab is a resettable public demo for browser model states, Nano download consent, WebLLM isolated-host readiness, developer cloud routes, user opt-out, RBAC-narrowed tools, approval UI, EdgeView installation, Mission Profile validation, fallback, and hidden feature policies.',
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
      'The public site includes a SaaS admin agent workflow demo. It registers searchAccounts, updatePlan, and suspendAccount tools, then requires approval before account plan changes or suspensions.',
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
    slug: 'knowledge-access',
    title: 'Knowledge Access Skills',
    tags: ['knowledge', 'retrieval', 'rag', 'citations', 'graph'],
    body:
      'Edgekit treats retrieval as a first-class Skill category, not a built-in RAG framework. EdgeKnowledgeSource, createKnowledgeTool, and createKnowledgeSkill let apps wrap Markdown, vector, hybrid, SQL, graph, LlamaIndex, LangChain, Qdrant, Neo4j GraphRAG, or private knowledge APIs while preserving citations, freshness, RBAC, telemetry, and synthesis faithfulness.',
  },
  {
    slug: 'knowledge-access',
    title: 'Retrieval Recipes',
    tags: ['knowledge', 'llamaindex', 'langchain', 'qdrant', 'neo4j'],
    body:
      'Recommended retrieval paths are simple Markdown or JSON, browser semantic retrieval with local embeddings, production vector or hybrid search with mature frameworks, graph retrieval for relationship-heavy domains, and agentic multi-tool retrieval. The host app owns indexing, permission filtering, reranking, and freshness.',
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
    title: 'Site Assistant',
    tags: ['demo', 'site-assistant', 'site assistant', 'docs'],
    body:
      'The public Pages site mounts an Edgekit assistant across the homepage, docs, and demo pages. It uses the same edge-chat component, Chrome AI cascade, deterministic fallback, docs search tool, and demo catalog tool that adopters can wire into their own apps.',
  },
  {
    slug: 'overview',
    title: 'Separate Demo Pages',
    tags: ['demo', 'ecommerce', 'admin', 'ag-ui', 'mission control', 'cascade'],
    body:
      'Each public demo has its own route: ecommerce retrofit, field ops ERP, docs Q&A, AG-UI event stream, SaaS admin workflow, mission control telemetry, and the cascade and permission lab. The homepage links to dedicated workflow pages instead of burying every agent surface on one long page.',
  },
  {
    slug: 'runtime-guarantees',
    title: 'Runtime Guarantees',
    tags: ['guarantees', 'runtime', 'authoring contract', 'validation', 'safety'],
    body:
      'Runtime guarantees separate enforced behavior from authoring contracts. requiredTools, safe profile application, registered executable tools, needsApproval, telemetry, audit primitives, and validation have runtime behavior. synthesis, mission-level policy, uiAffordances, and optimization metadata are authoring and harness contracts today.',
  },
  {
    slug: '30-minute-sidecar',
    title: '30-Minute Agent Workflow',
    tags: ['starter', '30 minute', 'onboarding', 'mission profile', 'support workflow'],
    body:
      'The fastest adoption path is to copy the concrete support workflow starter, replace tool execute bodies with app APIs, mount edge-chat, apply the Mission Profile, register tools, validate with validateMissionProfile, and run harness-scenarios.json outcome checks.',
  },
  {
    slug: 'distribution-readiness',
    title: 'Distribution Readiness',
    tags: ['packages', 'publish', 'fresh app', 'npm pack', 'release'],
    body:
      'Distribution readiness proves Edgekit works outside the monorepo. Use package smoke checks, packed tarballs, a fresh app fixture, package READMEs, versioning policy, GitHub Pages rebuilds, and post-publish smoke before public release claims.',
  },
  {
    slug: 'production-recipes',
    title: 'Production Recipes',
    tags: ['production', 'telemetry', 'audit', 'rbac', 'state', 'cloud', 'ownership', 'recipes'],
    body:
      'Production recipes cover telemetry, audit persistence, RBAC and session bridging, state hydration, ownership boundaries, recipe shape, and local-vs-cloud escalation. The host app owns identity, authorization, business state, retrieval infrastructure, persistence, and provider secrets. Edgekit owns the agent runtime, approval UX, tool-call protocol, telemetry and audit event contracts, and validation helpers.',
  },
  {
    slug: 'reproducibility',
    title: 'Reproducibility Guide',
    tags: ['reproducibility', 'provider matrix', 'chrome ai', 'nano', 'webllm', 'cloud route', 'github pages'],
    body:
      'Reproducibility separates deterministic integration checks from strict provider evidence. Run local gates, Chrome AI through CDP, WebLLM on a cross-origin-isolated host, explicit cloud routes, no-model fallback, and live GitHub Pages suites as separate evidence lanes. Keep agent-suite.json, provider-matrix.md, screenshots, commit SHA, Chrome version, model availability, and strict flags.',
  },
  {
    slug: 'overview',
    title: 'Architecture Diagrams',
    tags: ['diagram', 'architecture', 'runtime loop', 'host app', 'edgekit owns'],
    body:
      'The architecture diagrams show that the host app owns state, auth, APIs, business logic, executable tools, and knowledge infrastructure. Edgekit owns the agent runtime, provider cascade, approval loop, EdgeView, telemetry, audit primitives, and outcome evidence. The runtime loop hydrates context, routes the model, calls tools, gates risky mutations, renders outcomes, and records evidence.',
  },
  {
    slug: 'security-threat-model',
    title: 'Security Threat Model',
    tags: ['security', 'threat model', 'jwt', 'secrets', 'authorization'],
    body:
      'The host app owns identity, authorization, database writes, payments, inventory, and regulated records. Edgekit owns the event stream, provider routing hooks, approval protocol, UI primitives, telemetry and audit contracts, and validation helpers.',
  },
  {
    slug: 'migration-upgrades',
    title: 'Migration and Upgrades',
    tags: ['migration', 'upgrade', 'profile', 'compatibility'],
    body:
      'Migration moves mission-specific prompts, required tools, synthesis rules, and safety intent into Mission Profiles while executable tools stay app-owned. Upgrade gates compare validation and outcome scores before accepting core changes.',
  },
]

const docsPageChunks: DocChunk[] = docsPages.map(page => ({
  slug: page.slug,
  title: page.title,
  tags: [page.slug, page.navLabel, ...page.sections.map(section => section.title)]
    .join(' ')
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter(Boolean),
  body: [
    page.summary,
    ...page.sections.flatMap(section => [
      section.title,
      ...section.body,
      ...(section.bullets ?? []),
    ]),
  ].join(' '),
}))

export const docChunks: DocChunk[] = [...docsPageChunks, ...curatedDocChunks]

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
