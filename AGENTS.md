# Edgekit Agent Guide

This repo is designed to be worked on by coding agents. Keep changes aligned with the product model: Edgekit is an embeddable browser-native agent sidecar, not a hosted chatbot service.

## Architecture Rules

- Keep app state owned by the host app. Edgekit may call registered tools, but it should not duplicate business logic.
- Keep the default path local-first: Chrome AI, WebLLM, then explicit developer-provided fallback or no-model behavior.
- Keep integrations configurable. Prefer adapters, hooks, and event contracts over hardcoded demo-specific behavior.
- Keep risky mutations visible. Tools that change important state should use approval gates, telemetry, and audit events.
- Keep demos honest. Scripted demos must say they are scripted. Backend/provider demos must say what service they require.

## Main Packages

- `packages/core`: model providers, model routing, Markdown memory, redaction middleware, agent event stream, AG-UI adapter, MCP tool adapter, telemetry, mission-control aggregation, audit trail primitives.
- `packages/ui`: Lit `<edge-chat>` web component, approval prompts, EdgeView renderer, action forms, UI telemetry for app-owned form actions.
- `packages/cli`: docs indexing utility.
- `examples/ecommerce`: standalone retrofit workflow demo.
- `site`: public GitHub Pages docs and demos.
- `tests/e2e`: Playwright coverage for docs, ecommerce, admin, AG-UI, and workflow paths.

## Extension Points

- Tools: register Vercel AI SDK tools with `registerTools()`.
- User actions: use `registerActions()` to turn tool results into fillable EdgeView forms.
- AG-UI: use `createAgUiAgent({ endpoint })` or `createAgUiAgent({ run })`.
- Hybrid routing: use `createHybridModelRouter()` with local and developer-provided model routes.
- Supervisor routing: use `createSupervisorRouter()` for intent-pattern worker delegation while preserving the normal model-router contract.
- Handoffs: use `createHandoffEnvelope()` or supervisor `onHandoff` callbacks to pass bounded context to cloud workers and AG-UI backends.
- Memory: use `createMarkdownMemoryStore()` as the simple inspectable default. Replace it with another store by implementing `search(query, context)` and optional `write(record, context)`.
- Memory compaction: configure Markdown compaction thresholds for append-heavy histories; archive raw records by default and summarize into a current-state snapshot.
- Redaction: use `createPiiRedactor()` or custom `redactors` to sanitize sensitive tool results before UI, telemetry, or audit emission.
- Tool repair: use `toolRepair` for schema/validation self-correction loops. Keep repair bounded and invisible until the retry limit is exhausted.
- MCP: use `loadMcpTools()` or `mcpToolsFromDefinitions()` against a safe backend/proxy catalog.
- Telemetry: pass `telemetry` to `createAgent()`, `createAgUiAgent()`, or `chat.configure()`.
- Audit: pass `auditTrail: createAuditTrail(...)`; production compliance should provide a cryptographic hash/signing function and persist entries server-side.
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
```

`pnpm eval:models` may report local model unavailable on machines without Chrome AI/WebLLM support. That is acceptable unless `EDGEKIT_REQUIRE_REAL_MODEL=1` is set.

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
- Do not hide tool/action failures behind generic assistant text.
- Do not add a hardcoded fix only for one demo when the problem belongs in core configuration or reusable component patterns.
- Do not flatten the docs into marketing copy. Technical builders need exact APIs, commands, and boundaries.
