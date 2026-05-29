Audience: adopter

# Agent Adoption Kit

The Adoption Kit is the low-friction path for developers and coding agents that need to add local-first tool-using Edgekit agents to a real app without drifting into a generic chatbot.

Start from the mission: Edgekit lets a browser-local model use app-owned tools
to operate an existing workflow. Q&A is one read-only tool workflow. Basic mode
is a fallback, not the product success path.

## If An Agent Starts On The Website

Use the public site discovery path before assuming repo-local context:

1. Read `https://kevinmarmstrong.github.io/edgekit/llms.txt` for the public map.
2. Read `https://kevinmarmstrong.github.io/edgekit/docs/adoption-kit.md` for this implementation sequence.
3. Read `https://kevinmarmstrong.github.io/edgekit/llms-full.txt` when broader adopter context is needed.
4. Use the GitHub `docs/agent-skills/*/SKILL.md` files only when you are ready to implement, test, optimize, or security-review.
5. Install from npm with `@kevinmarmstrong/edgekit@^0.3.2` plus only the sibling packages the workflow needs.

It has four layers:

1. **Guides** for humans: architecture, quick start, production recipes, and runtime guarantees.
2. **Agent skills** for coding agents: procedural `SKILL.md` files that tell an implementation agent what to inspect, create, test, and avoid.
3. **Recipes** for opinionated install paths: support workflow, Knowledge Access, worker handoff, Astro intake plus knowledge, and future framework/app patterns.
4. **Outcome harnesses** that prove final answers, app actions, approvals, citations, telemetry, and state changes.

## When To Use Each Layer

| Need | Use |
| --- | --- |
| Understand Edgekit | `ARCHITECTURE.md`, `docs/adopter/GETTING-STARTED-REAL-APPS.md`, `docs/adopter/RUNTIME-GUARANTEES.md` |
| Ask a coding agent to implement Edgekit | `docs/agent-skills/edgekit-implementer/SKILL.md` |
| Add grounded Q&A to a public site | `docs/agent-skills/edgekit-public-site-qa/SKILL.md`, `docs/adopter/PUBLIC-SITE-QA-CONTRACT.md` |
| Prove the implementation works | `docs/agent-skills/edgekit-outcome-tester/SKILL.md` |
| Verify governed workflow invariants | `packages/core/test/workflow-invariants-harness.ts`, exercised by `packages/core/test/workflow-invariants.test.ts` |
| Improve Skill/Profile text safely | `docs/agent-skills/edgekit-skill-optimizer/SKILL.md` |
| Review security and app authority | `docs/agent-skills/edgekit-security-review/SKILL.md` |
| Start from an opinionated app pattern | `docs/adopter/RECIPE-CATALOG.md` or `edgekit-init mission --recipe ...` |
| Escalate from a browser-local flow to an app-owned worker | `docs/adopter/WORKER-HANDOFF-RECIPE.md` |

## Coding Agent Contract

A coding agent should not start by editing random app files. It should:

1. Identify one narrow mission.
2. Inventory existing app capabilities, auth, state, UI surface, and app APIs a human user already operates.
3. Define the app-owned tool surface first: read state, search knowledge, inspect workflow context, fill forms, propose actions, call APIs, and perform approved mutations.
4. Create 2-5 Skills around those tools.
5. Create one Mission Profile.
6. Register executable app-owned tools.
7. Add approval gates for risky mutations.
8. Wire cascade/readiness so a known local-model browser does not silently stay in Basic mode.
9. Add Knowledge Access only when the mission needs source-owned retrieval.
10. Add outcome scenarios that fail if the agent answers without required tools.
11. Run the verification loop.
12. Tune Skills/Profile text only when test data proves a gap.

## Workflow Invariant Acceptance Harness

Maintainers can copy or adapt `packages/core/test/workflow-invariants-harness.ts`
when a recipe, demo, or adopter app needs to prove the common governed-workflow
bundle rather than a single scripted transcript. The harness accepts generic
fixtures and drives them through strict grounding, an app-owned read tool, an
approval-gated risky mutation, a host adapter/action boundary, Mission Control
telemetry, and audit trail assertions.

The core regression at `packages/core/test/workflow-invariants.test.ts` runs the
same harness against two different minimal fixtures. Keep new fixtures
app-agnostic: use generic tool names, evidence payloads, and state transitions;
do not promote demo-specific proper nouns, sample data, or business rules into
shared package tests.

Run the focused proof with:

```bash
pnpm vitest run packages/core/test/workflow-invariants.test.ts
```

## Recipe Philosophy

Recipes are opinionated install paths, not new runtimes. A recipe may know about Astro, React, a support workflow, or an intake pipeline, but it must preserve the same Edgekit boundaries:

- Edgekit owns sidecar runtime, model routing, event stream, approvals, UI primitives, telemetry contracts, and validation helpers.
- The host app owns state, auth, business logic, persistence, APIs, knowledge infrastructure, and final execution.
- Recipes are additive and inspectable. They scaffold files the developer can read and change.

## CLI

```bash
npm install -D @kevinmarmstrong/edgekit-cli
edgekit-init --list
edgekit-init mission --recipe support-workflow --out edgekit/support
edgekit-init mission --recipe knowledge-skill --out edgekit/policy
edgekit-init mission --recipe astro-intake-knowledge --out src/edgekit/intake
```

The generated files are starting points. Replace placeholder `execute` functions and retrieval endpoints with app-owned implementations before shipping.
