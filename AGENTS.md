Audience: contributor

# Edgekit Agent Guide

**Read ARCHITECTURE.md first.** It contains the current North Star goal, first principles, and success criteria that all major work should be measured against.

This repo is designed to be worked on by coding agents. Keep changes aligned with the product model: Edgekit is an embeddable browser-native agent sidecar, not a hosted chatbot service.

## Architecture Rules

- Keep app state owned by the host app. Edgekit may call registered tools, but it should not duplicate business logic.
- Keep the default path local-first: Chrome AI, WebLLM, then explicit developer-provided fallback or no-model behavior.
- Keep integrations configurable. Prefer adapters, hooks, and event contracts over hardcoded demo-specific behavior.
- Keep risky mutations visible. Tools that change important state should use approval gates, telemetry, and audit events.
- Keep demos honest. Scripted demos must say they are scripted. Backend/provider demos must say what service they require.
- **Localize via Mission Profiles + Skills**:
  - Edgekit core = the unopinionated runtime harness: agents, model cascade, tools, approvals, context bridging, activity events, telemetry contracts, and basic EdgeView types.
  - `@kevinmarmstrong/edgekit-skills` = packaged, self-describing capability units (`createSkill`) and Mission Profiles (`createMissionProfile`).
  - Optional sibling packages own their own domains: Knowledge Access, governance/audit/redaction/offline journals, AG-UI, MCP, React, UI, and CLI.
  - Import from sibling packages directly for new work. Root compatibility exports are deprecated transition shims.
  
  This three-layer model (Primitives → Skills → Profiles) is how we package the architecture correctly so we can iterate extremely aggressively on the core and research side without constantly breaking every integration. See `site/src/main.ts` (the public catalog sidecar) for a working example of Skills composed into a Mission Profile.
- **Optimize Skills like measured artifacts, not prose blobs**:
  - Keep `description` (router-visible) aligned with `instructions` (activated body). They are different surfaces and must be tested end to end.
  - Use bounded patch operations for Skill/Profile optimization. Do not allow full rewrites in normal optimizer loops.
  - Accept candidate edits only on strict held-out improvement; reject ties.
  - Protect slow-state sections such as safety policy, host-app authority boundaries, and durable synthesis rules. Normal fast-edit loops must not overwrite them.
  - Report per-skill effect sizes. Aggregate score can hide large gains or regressions in a specific Skill.
  - See `docs/adopter/SKILL-OPTIMIZATION.md` and the SkillOpt paper linked there.

## Main Packages

- `packages/core`: model providers, model cascade/readiness, tool helpers, agent event stream, approval resume, identity/session/state bridging, activity events, telemetry contracts, and deprecated root compatibility shims.
- `packages/ui`: Lit `<edge-chat>` web component, approval prompts, EdgeView renderer, action forms, download/readiness UI, and UI telemetry for app-owned form actions.
- `packages/react`: React hook/controller primitives and an idiomatic `<EdgeChat />` wrapper around the web component.
- `packages/skills`: Skills and Mission Profiles.
- `packages/knowledge`: Knowledge Access tools/sources/Skills and Markdown memory.
- `packages/governance`: audit trails, policy execution, redaction, and offline mutation journals.
- `packages/agui`: AG-UI adapter backed by `@ag-ui/client`.
- `packages/mcp`: safe MCP catalog adapters.
- `packages/cli`: docs indexing utility.
- `examples/ecommerce`: standalone internal eval fixture.
- `site`: public GitHub Pages docs plus remaining internal demo previews; ecommerce/docs/admin public demos live in external repos.
- `tests/e2e`: Playwright coverage for docs, ecommerce, admin, AG-UI, and workflow paths.

## Public Agent Discovery

When another coding agent starts from the website instead of this repo, point it to:

1. `https://kevinmarmstrong.github.io/edgekit/llms.txt`
2. `https://kevinmarmstrong.github.io/edgekit/docs/adoption-kit.md`
3. `https://kevinmarmstrong.github.io/edgekit/llms-full.txt`
4. `https://github.com/kevinmarmstrong/edgekit/tree/main/docs/agent-skills`

Those public docs must be enough to find the v0.3.1 package shape and the implementation procedure without private maintainer context.

## Extension Points

- Tools: register Vercel AI SDK tools with `registerTools()` on `<edge-chat>` or pass tools to `createAgent()`.
- User actions: use `registerActions()` to turn tool results into fillable EdgeView forms.
- Skills and Mission Profiles: import `createSkill`, `createMissionProfile`, `applyMissionProfile`, and validators from `@kevinmarmstrong/edgekit-skills`.
- AG-UI: import `createAgUiAgent({ endpoint })` or `createAgUiAgent({ run })` from `@kevinmarmstrong/edgekit-agui`.
- Knowledge Access and memory: import `createKnowledgeSkill`, `createKnowledgeTool`, and `createMarkdownMemoryStore` from `@kevinmarmstrong/edgekit-knowledge`.
- Redaction, policy, audit, and offline journals: import `createPiiRedactor`, `createToolPolicyExecutor`, `executeToolWithPolicy`, `createAuditTrail`, `createOfflineTool`, and mutation journals from `@kevinmarmstrong/edgekit-governance`.
- Tool repair: use `toolRepair` for schema/validation self-correction loops. Keep repair bounded and invisible until the retry limit is exhausted.
- Synthesis faithfulness (new 2026-05 priority): For public sidecar surfaces where the agent answers catalog/Q&A questions over tool results, the final user-visible text + generative UI (action cards) must explicitly surface the key facts the user asked for (prices, sizes, attributes). We added `synthesisFaithfulness` as a first-class harness category because local models are excellent at tool use + approvals but can still drop details in the last prose step. When working on public catalog or docs Q&A surfaces, treat "did the facts survive into what the user actually sees?" as a required quality gate, not just a nice-to-have.
- Activity states: emit/render `activity` events for safe orchestration progress. Do not expose hidden reasoning or chain-of-thought.
- Response cache: root compatibility exports remain deprecated. Prefer app-owned caches until a sibling cache package is promoted.
- Dynamic tool exposure: use `toolProvider({ input, session, phase })` to expose read tools broadly and hydrate mutation tools only when the user intent, role, and workflow state justify them.
- Parallel tools: root compatibility exports remain deprecated. Only batch app-owned tools whose manifests are both `readOnly` and `parallelSafe`.
- Offline tools: use `@kevinmarmstrong/edgekit-governance` offline helpers plus a mutation journal for approved, idempotent mutations that can queue while offline and sync later. Add Yjs/Automerge through adapters, not core assumptions.
- Tool policy: use `@kevinmarmstrong/edgekit-governance` policy helpers before running third-party or dynamic tools. Start with allowlists, timeouts, payload limits, and workers before adding WASM.
- MCP: import `loadMcpTools()` or `mcpToolsFromDefinitions()` from `@kevinmarmstrong/edgekit-mcp` against a safe backend/proxy catalog.
- Agent adoption kit: use `docs/agent-skills/*/SKILL.md` when another coding agent needs procedural help implementing, testing, optimizing, or security-reviewing Edgekit. Use `@kevinmarmstrong/edgekit-cli` recipes through `edgekit-init mission --recipe ...` for repeatable app/framework starts such as support workflows, Knowledge Access, and Astro intake plus knowledge.
- Telemetry: pass `telemetry` to `createAgent()`, `createAgUiAgent()`, or `chat.configure()`.
- Audit: import `createAuditTrail()` from `@kevinmarmstrong/edgekit-governance` and pass `auditTrail` to the agent/chat configuration; production compliance should provide a cryptographic hash/signing function and persist entries server-side.
- Identity: use `identityProvider`/`sessionProvider` to pass public user, tenant, roles, and permissions into Edgekit.
- RBAC: use `toolManifests` for role/permission-filtered dynamic tool exposure.
- State hydration: use `stateProvider` for concise current-page/workflow context. Do not place auth tokens or secret claims in state summaries.

## Verification Commands

Run these before claiming release readiness:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm test:e2e
pnpm eval:models
pnpm eval:adoption
pnpm research:agents
pnpm research:env
pnpm research:suite
pnpm research:full
```

`pnpm eval:models` may report local model unavailable on machines without Chrome AI/WebLLM support. That is acceptable unless `EDGEKIT_REQUIRE_REAL_MODEL=1` is set.

`pnpm eval:adoption` is the developer-answer-quality loop. It opens the docs Q&A and site assistant, asks implementation and safety questions, rejects stock docs-search snippets, records transcripts, and requires answers to explain the integration path, host-app authority, local-first value, and security boundaries.

`pnpm research:agents` is the product-readiness loop. It runs realistic prompts across the docs, ecommerce, AG-UI, admin, mission-control, and agent-readable docs surfaces; records transcripts and screenshots; and scores answer quality, workflow state, safety, observability, and integration transparency.

`pnpm research:env` writes machine/browser preflight evidence to `research-results/research-env.*`. `pnpm research:suite` is the expansive outcome loop. It loads `evals/agent-suite/scenarios.json` and `evals/agent-suite/rubric.json`, runs seeded prompt variants, provider fallback probes, loaded-page offline checks, and core architecture probes for routing, handoff, cache, repair, MCP, policy, offline sync, parallel tools, redaction, and no-model fallback. `pnpm research:full` runs build, env preflight, the expansive suite, and the adoption-quality eval in one pass. Prefer adding scenario variants and rubric checks over narrow demo-specific patches.

## Public Release Loop

The public repo is `kevinmarmstrong/edgekit`. GitHub Pages deploys from `main`.

```bash
git push edgekit HEAD:main
gh run list --repo kevinmarmstrong/edgekit --branch main --limit 3
gh run watch <run-id> --repo kevinmarmstrong/edgekit --exit-status
```

After deploy, smoke `https://kevinmarmstrong.github.io/edgekit/` in a browser or Playwright. Verify visible docs, no stray `Admin` nav entry, AG-UI transparency, and one interactive workflow.

## What Not To Do

- Do not make GitHub Pages depend on live provider secrets or a backend.
- Do not connect browsers directly to broad MCP stdio servers, local filesystems, databases, or secret-bearing resources.
- Do not put JWTs, cookies, API keys, or secret claims into `systemPrompt` or `stateProvider` summaries. Keep auth in tool execution context.
- Do not store secrets, raw payment data, or regulated records in Markdown memory. Store only safe preferences, workflow notes, and summaries unless the host app has a compliance design.
- Do not pass raw DOM dumps to worker agents by default. Summarize app state through `stateProvider` and include selected memory through the handoff envelope.
- Do not treat regex redaction as the only privacy control. Keep backend authorization, least-privilege tools, and prompt minimization in place.
- Do not create unbounded self-repair loops. Tool repair must have a small retry limit and surface failures once exhausted.
- Do not label mutating tools as parallel-safe or cacheable just to improve latency.
- Do not queue non-idempotent offline mutations without a host-owned conflict policy and user-visible recovery path.
- Do not treat browser-loaded MCP or WASM tools as trusted just because they run in a separate execution format. Keep sensitive capabilities behind backend/proxy authorization.
- Do not present activity states as model reasoning. They are product progress states.
- Do not hide tool/action failures behind generic assistant text.
- Do not add a hardcoded fix only for one demo when the problem belongs in core configuration or reusable component patterns.
- Do not flatten the docs into marketing copy. Technical builders need exact APIs, commands, and boundaries.
