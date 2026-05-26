# edgekit

Browser-native agent runtime for adding an AI sidecar to an existing web app. The agent runs in the visitor's browser through Chrome AI or WebLLM, uses Vercel AI SDK tool calling, and calls the app capabilities you register as tools.

## Status

Release candidate scaffold. The Phase 0 spike is validated, the core package, docs index CLI, and web component build, and the ecommerce/docs demos have automated browser smoke coverage.

**Important**: For production use, we strongly recommend the **Skills + Mission Profiles** pattern over raw `configure()` + tools. See:
- [WORLD-CLASS-DEFINITION.md](./WORLD-CLASS-DEFINITION.md) — What "ready for real production use" means for both elite developers and agent-assisted teams.
- [docs/GETTING-STARTED-REAL-APPS.md](./docs/GETTING-STARTED-REAL-APPS.md) — The recommended path to shipping a high-quality, localized sidecar with excellent outcome quality.
- [docs/30-MINUTE-PRODUCTION-SIDECAR.md](./docs/30-MINUTE-PRODUCTION-SIDECAR.md) — The fastest guided path from starter profile to tested sidecar.
- [docs/AGENT-ADOPTION-KIT.md](./docs/AGENT-ADOPTION-KIT.md) — Coding-agent skills, recipe scaffolds, and outcome loops for low-friction implementation.
- [docs/RECIPE-CATALOG.md](./docs/RECIPE-CATALOG.md) — Opinionated install paths such as support workflow, Knowledge Access, and Astro intake plus knowledge.
- [docs/REPRODUCIBILITY.md](./docs/REPRODUCIBILITY.md) — How to verify provider paths, fallback behavior, live Pages, cloud routes, and outcome evidence outside the maintainer machine.
- [docs/RUNTIME-GUARANTEES.md](./docs/RUNTIME-GUARANTEES.md) — What Edgekit enforces at runtime vs. what is an authoring/harness contract.
- [docs/DISTRIBUTION-READINESS.md](./docs/DISTRIBUTION-READINESS.md) — Package, fresh-app, and public release readiness.
- [docs/PRODUCTION-RECIPES.md](./docs/PRODUCTION-RECIPES.md) — Telemetry, audit, RBAC, state, and escalation recipes.
- [docs/SKILL-OPTIMIZATION.md](./docs/SKILL-OPTIMIZATION.md) — SkillOpt-inspired guidance for improving Skills through bounded patches, held-out validation, protected slow-state sections, and per-skill scoring.
- [ARCHITECTURE.md](./ARCHITECTURE.md) — The three-layer model (Primitives → Skills → Profiles) that enables safe, rapid evolution.
- [LOOP-STATUS.md](./LOOP-STATUS.md) — Live status of the current world-class iteration loop (what we're actively working on right now).

## Quick Start

```bash
pnpm install
pnpm build
pnpm test
pnpm test:e2e
pnpm eval:models
pnpm eval:adoption
pnpm research:agents
pnpm research:suite
pnpm research:full
pnpm dev:ecommerce
```

Open the ecommerce demo at `http://127.0.0.1:5173`.
Open the public docs and demo site at `https://kevinmarmstrong.github.io/edgekit/`.
Open the full documentation at `https://kevinmarmstrong.github.io/edgekit/docs/`.

## Architecture At A Glance

```mermaid
flowchart LR
  App["Host app owns\nstate, auth, APIs, business logic"] --> Skills["Skills + Mission Profiles\nmission, tools, approvals, synthesis"]
  Skills --> Runtime["Edgekit sidecar runtime\nprovider cascade, tool loop, UI, telemetry"]
  Runtime --> Providers["Chrome AI\nWebLLM\nCloud route\nAG-UI\nFallback"]
  Runtime --> Tools["App-owned tools\nKnowledge Access\nMCP adapters"]
  Tools --> App
```

```mermaid
flowchart LR
  Context["Hydrate context\nidentity summary, app state, memory"] --> Route["Route model\nlocal first, explicit escalation"]
  Route --> Calls["Call tools\nread tools, retrieval, app APIs"]
  Calls --> Risk{"Risky mutation?"}
  Risk -- yes --> Approval["Approval gate\nRBAC, audit, backend authorization"]
  Risk -- no --> Render["Render outcome\ntext, EdgeView, activity states"]
  Approval --> Render
  Render --> Evidence["Telemetry + evidence\noutcome suite, provider matrix"]
```

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

For docs search, site-map, catalog, or support assistants that must ground answers in app-owned tools, configure `toolChoice: 'required'`. For agentic workflows, pair that with `toolProvider` so read tools are always available while mutation tools hydrate only when the prompt, session, role, and workflow state justify them. Keep the default `auto` behavior for open-ended assistants.

AG-UI-compatible backends can drive the same component:

```ts
import { createAgUiAgent } from '@kevinmarmstrong/edgekit'

const agent = createAgUiAgent({ endpoint: '/api/ag-ui/support-agent' })
document.querySelector('edge-chat')?.useAgent(agent)
```

Use the native path when the web app can register local tools directly. Use the AG-UI path when an existing backend agent, CopilotKit/LangGraph/CrewAI bridge, or AG-UI HTTP stream should own the run while Edgekit renders the in-app experience.

The public GitHub Pages AG-UI demo uses a scripted mock stream so it can run without a backend. It is meant to prove the renderer and provider boundary; production apps should point `createAgUiAgent()` at a real endpoint or event iterator.

Backend-served generative UI needs a hosted route or worker that can stream AG-UI events, hold provider secrets, enforce rate limits, and call only the app tools you intentionally expose.

```html
<edge-chat
  system-prompt="You are a helpful shopping assistant."
  placeholder="Find running shoes under $100"
></edge-chat>
```

## Scalable Integration Primitives

edgekit stays small by exposing contracts instead of shipping a required cloud service:

- Hybrid routing: `createHybridModelRouter()` keeps simple work local and routes complex work to a developer-provided model.
- Supervisor routing: `createSupervisorRouter()` gives teams a lightweight supervisor/worker pattern for intent-based delegation without adopting a full multi-agent framework.
- Markdown memory: `createMarkdownMemoryStore()` hydrates relevant `.md` files into the agent context; replace it with IndexedDB, OPFS, vector, or server-backed stores by implementing the same `search()` contract.
- Knowledge Access Skills: `EdgeKnowledgeSource`, `createKnowledgeTool()`, and `createKnowledgeSkill()` wrap app-owned retrieval systems as cited, freshness-aware, read-only Skills. Use Markdown, LlamaIndex, LangChain, Qdrant, Neo4j GraphRAG, SQL, or private APIs behind the same contract.
- Memory compaction: Markdown stores can compact append-heavy logs into current-state snapshots when token thresholds are reached; production apps can provide their own summarizer.
- Cross-agent handoffs: `createHandoffEnvelope()` packages selected memory, app state, public identity, tool names, and trace ids for cloud workers or AG-UI backends.
- Tool repair: `toolRepair` retries validation-shaped tool failures invisibly before surfacing an error to the user.
- Streaming activity states: core emits `activity` events, and `<edge-chat>` renders safe orchestration progress without exposing hidden reasoning.
- Edge response caching: `createMemoryResponseCache()` and `createIndexedDbResponseCache()` let read-only repeat questions bypass inference when state has not changed.
- Parallel-safe tools: `executeParallelTools()` runs app-owned read-only batches concurrently only when manifests opt in with `readOnly` and `parallelSafe`.
- Dynamic tool exposure: `toolProvider({ input, session, phase })` can narrow the model-visible tool set per prompt while `<edge-chat>` still keeps the full registered tool set for user-clicked action forms.
- Offline mutation journal: `createOfflineTool()`, `createMemoryMutationJournal()`, `createLocalStorageMutationJournal()`, and `syncMutationJournal()` queue approved offline-capable mutations and sync them when connectivity returns.
- Guarded tool execution: `createToolPolicyExecutor()` and `executeToolWithPolicy()` enforce timeouts, payload limits, and allowlists around third-party or dynamically loaded tools.
- Redaction middleware: `createPiiRedactor()` and custom redactors sanitize tool results before they reach UI events, telemetry, and audit trails.
- MCP catalogs: `mcpToolsFromDefinitions()` and `loadMcpTools()` adapt safe MCP tool catalogs into normal Edgekit tools.
- Telemetry: pass `telemetry` to `createAgent()`, `createAgUiAgent()`, or `<edge-chat>.configure()` to observe runs, tools, approvals, views, errors, and no-model fallbacks.
- Mission control: `createMissionControl()` provides an in-memory dashboard aggregator; production apps can send the same events to OpenTelemetry, Datadog, PostHog, Supabase, or their own warehouse.
- Audit trails: `createAuditTrail()` records tool calls, approval requests, approval decisions, UI actions, and errors in a hash chain. Bring your own signing or cryptographic hash for strict compliance environments.
- Identity and RBAC: `sessionProvider`, `identityProvider`, `stateProvider`, `toolManifests`, `filterToolManifestsForSession()`, and `withToolContext()` bridge app identity and state into Edgekit without putting auth secrets in the model prompt.
- Coding-agent handoff: `AGENTS.md` documents the architecture, commands, and guardrails for implementation agents.
- Agent adoption kit: `docs/agent-skills/*/SKILL.md` gives coding agents procedural implementation, testing, optimization, and security-review workflows. `edgekit-init` scaffolds repeatable recipes such as `support-workflow`, `knowledge-skill`, and `astro-intake-knowledge`.

```ts
chat.configure({
  memory: createMarkdownMemoryStore({
    documents: [{ id: 'preferences', content: preferencesMarkdown }],
    compaction: { thresholdTokens: 1200 },
  }),
  memoryCompaction: { thresholdTokens: 1200 },
  toolRepair: { maxAttempts: 2 },
  responseCache: createIndexedDbResponseCache(),
  cachePolicy: { ttlMs: 5 * 60 * 1000 },
  redactors: createPiiRedactor(),
  identityProvider: () => ({
    id: currentUser.id,
    tenantId: currentTenant.id,
    roles: currentUser.roles,
    permissions: currentUser.permissions,
  }),
  stateProvider: () => ({
    route: location.pathname,
    view: 'Checkout',
    summary: 'Cart contains 2 items. User is choosing shipping.',
  }),
})
```

## Packages

- `@kevinmarmstrong/edgekit`: core browser-agent runtime, model cascade, tool loop wrapper, provider helpers.
- `@kevinmarmstrong/edgekit-ui`: Lit web component, `<edge-chat>`, EdgeView rendering, and `mountChat()`.
- `@kevinmarmstrong/edgekit-react`: React hook/controller primitives and an idiomatic `<EdgeChat />` wrapper around the web component.
- `@kevinmarmstrong/edgekit-cli`: docs indexing CLI for Q&A/RAG tools.
- `examples/ecommerce`: retrofit demo with product search and add-to-cart tools.
- `site/docs`: full GitHub Pages documentation for concepts, APIs, UI, CLI, testing, and deployment.
- `spike`: Phase 0 validation harness for Vercel AI SDK plus `@browser-ai` providers.

## Roadmap

- Near term: publish the core, UI, React, and CLI packages; add Vue and Svelte wrappers once the React API shape settles.
- Near term: add a browser worker adapter for guarded tools so untrusted client-side compute can run off the main thread with the same policy contract.
- Next: add optional `@edgekit/yjs` and `@edgekit/automerge` adapters on top of the mutation journal for apps that need CRDT-backed collaborative state.
- Later: add a WASM tool adapter for pure compute tools. Keep secret-bearing MCP and data access behind backend/proxy tools, not arbitrary browser-loaded WASM.

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

## Research Agent Loops

`pnpm research:agents` runs the higher-signal loop for product readiness. It opens the docs site and demos in Chromium, sends realistic user prompts, checks answer quality, verifies guarded mutations, probes AG-UI rendering, confirms dogfooding, and writes JSON plus Markdown evidence to `research-results/agent-research-loop.*`.

```bash
pnpm research:agents
EDGEKIT_RESEARCH_TARGET=live pnpm research:agents
EDGEKIT_RESEARCH_HEADLESS=0 pnpm research:agents
EDGEKIT_RESEARCH_STRICT=0 pnpm research:agents
```

Use this when tuning the real solution surface, not just the fixtures. Fix failures in EdgeKit contracts, harnesses, prompts, or reusable demo integration patterns before adding demo-specific patches.

## Skill Optimization

Edgekit Skills are inspectable context artifacts that can be improved without changing runtime model weights. Inspired by [SkillOpt: Executive Strategy for Self-Evolving Agent Skills](https://arxiv.org/pdf/2605.23904), Edgekit supports bounded, validation-gated Skill optimization contracts:

- keep router-visible `description` separate from activated `instructions`
- cap optimizer patches instead of allowing full rewrites
- reject ties and accept only strict held-out improvement
- protect slow-state paths such as safety policy and host-app authority boundaries
- report per-skill effect sizes instead of hiding movement in aggregate scores

See [docs/SKILL-OPTIMIZATION.md](./docs/SKILL-OPTIMIZATION.md).

`pnpm research:env` checks the local machine and browser preconditions. `pnpm research:suite` is the broader confidence loop. It reads `evals/agent-suite/scenarios.json` and `evals/agent-suite/rubric.json`, runs seeded prompt variants across browser demos, then runs architecture probes for hybrid routing, supervisor handoffs, response cache, tool repair, MCP adapters, guarded tool policy, offline journals, parallel-safe tools, PII redaction, provider fallback, and loaded-page offline behavior.

```bash
pnpm research:env
pnpm research:suite
pnpm research:full
pnpm chrome:profile
pnpm test:routes
EDGEKIT_SUITE_TARGET=live pnpm research:suite
EDGEKIT_SUITE_PROMPT_LIMIT=2 pnpm research:suite
EDGEKIT_SUITE_SEED=42 pnpm research:suite
EDGEKIT_SUITE_HEADLESS=0 pnpm research:suite
EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:full
EDGEKIT_CHROME_USER_DATA_DIR="$HOME/.edgekit/chrome-profile" EDGEKIT_SUITE_HEADLESS=0 EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:full
EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_SUITE_CLOUD_ROUTE_URL=http://127.0.0.1:4198/api/edgekit/cloud-route EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:full
```

Use `research:agents` as the fast public-surface check, `research:suite` as the expandable tuning loop, and `research:full` when you want build + environment preflight + outcome matrix in one pass. Add new prompt variants or scenario packs before adding narrow code fixes. The rubric currently requires no required failures, no required skips, an average score of at least `0.98`, and category confidence ratings at or above their thresholds.

`pnpm eval:adoption` is the answer-quality gate for developer adoption prompts. It opens the docs Q&A and dogfood assistant, sends implementation-oriented questions, rejects stock docs-search snippets, and writes JSON plus Markdown transcripts to `research-results/adoption-quality.*`. Use it when tuning whether EdgeKit actually explains how to add an agent to an app, not merely whether `searchDocs` returned.

For strict real-provider runs, use a dedicated Chrome profile instead of a daily browser profile. Create `~/.edgekit/chrome-profile`, launch Chrome with that user-data directory and a remote debugging port, enable Chrome AI/Nano flags, let the local model download, and then set `EDGEKIT_CHROME_CDP_URL` before running the strict loop.

## Release Checks

- `pnpm test`: unit coverage for model cascade, approval resume, and docs indexing.
- `pnpm typecheck`: strict TypeScript across core, UI, CLI, example, site, and spike.
- `pnpm build`: package and demo production builds.
- `pnpm test:e2e`: browser smoke for the ecommerce demo, scripted agent workflows, and graceful no-model fallback.
- `pnpm test:workflows`: focused Playwright coverage for the ecommerce workflow suite.
- `pnpm eval:models`: real-browser model cascade evals for Chrome AI/WebLLM prompt quality. See `MODEL_EVALS.md`.
- `pnpm eval:adoption`: adoption-quality browser eval for developer-facing answers, integration boundaries, safety guidance, and non-snippet synthesis.
- `pnpm research:agents`: research loop for answer quality, workflow state, safety, docs exports, and deployed demo behavior.
- `pnpm research:suite`: expansive outcome suite with rubric thresholds, prompt variants, architecture probes, and resilience checks.
- `pnpm research:full`: build, environment preflight, and expansive suite for the >95% category confidence and >98% average-score gate.

## Notes

The browser model ecosystem moves quickly. Keep provider-specific code behind `chromeAI()` and `webLLM()` wrappers. Do not hand-roll orchestration, model adapters, streaming, or message formatting; use Vercel AI SDK and `@browser-ai`.

GitHub Pages is a good public docs/basic-mode host, but it does not provide the cross-origin isolation headers needed for the best WebLLM path. Use Cloudflare Pages, Vercel, or another host with COOP/COEP headers when you want the downloadable WebLLM fallback to run in production.
