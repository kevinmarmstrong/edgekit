Audience: contributor

---
name: edgekit-implementer
description: Use when adding Edgekit to an app or site. Creates Skills, one Mission Profile, app-owned tools, approval gates, and sidecar mounting code.
---

# Edgekit Implementer

Use this skill to add a production-shaped Edgekit sidecar to an existing app.

## Read First

1. `ARCHITECTURE.md`
2. `AGENTS.md`
3. `docs/adopter/GETTING-STARTED-REAL-APPS.md`
4. `docs/adopter/RUNTIME-GUARANTEES.md`
5. `docs/adopter/AGENT-ADOPTION-KIT.md`

## Workflow

1. Identify one narrow mission.
2. Inspect the host app for existing APIs, state, auth, routes, UI surface, and tests.
3. Choose the closest recipe:
   - `support-workflow`
   - `knowledge-skill`
   - `astro-intake-knowledge`
4. Create 2-5 Skills with explicit descriptions, instructions, examples, approval policy, and synthesis requirements.
5. Create one Mission Profile.
6. Register app-owned tools with `registerTools()`.
7. Add `needsApproval: true` to risky executable tools.
8. Add `stateProvider`, `identityProvider`, telemetry, and audit hooks when the app has those concepts.
9. Mount `<edge-chat>` or the React wrapper.
10. Add outcome scenarios before tuning.

## Rules

- Do not move business logic into Edgekit.
- Do not put JWTs, cookies, API keys, database credentials, or private claims into prompts.
- Do not hardcode a fix for one demo prompt.
- Do not make mutating tools parallel-safe or cacheable.
- Do not use Knowledge Access as permission enforcement. Filter inside the source or backend.
- Do not call the implementation complete until outcome tests pass.

## Verification

Run the narrowest useful checks first, then the full gates:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm test:e2e
pnpm eval:adoption
pnpm research:agents
pnpm research:suite
```

Passing means the final visible answer, generated UI, approvals, telemetry, and app state match the mission.
