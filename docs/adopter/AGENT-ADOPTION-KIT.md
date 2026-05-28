Audience: adopter

# Agent Adoption Kit

The Adoption Kit is the low-friction path for developers and coding agents that need to add Edgekit to a real app without drifting into a generic chatbot.

It has four layers:

1. **Guides** for humans: architecture, quick start, production recipes, and runtime guarantees.
2. **Agent skills** for coding agents: procedural `SKILL.md` files that tell an implementation agent what to inspect, create, test, and avoid.
3. **Recipes** for opinionated install paths: support workflow, Knowledge Access, Astro intake plus knowledge, and future framework/app patterns.
4. **Outcome harnesses** that prove final answers, app actions, approvals, citations, telemetry, and state changes.

## When To Use Each Layer

| Need | Use |
| --- | --- |
| Understand Edgekit | `ARCHITECTURE.md`, `docs/adopter/GETTING-STARTED-REAL-APPS.md`, `docs/adopter/RUNTIME-GUARANTEES.md` |
| Ask a coding agent to implement Edgekit | `docs/agent-skills/edgekit-implementer/SKILL.md` |
| Prove the implementation works | `docs/agent-skills/edgekit-outcome-tester/SKILL.md` |
| Improve Skill/Profile text safely | `docs/agent-skills/edgekit-skill-optimizer/SKILL.md` |
| Review security and app authority | `docs/agent-skills/edgekit-security-review/SKILL.md` |
| Start from an opinionated app pattern | `docs/adopter/RECIPE-CATALOG.md` or `edgekit-init mission --recipe ...` |

## Coding Agent Contract

A coding agent should not start by editing random app files. It should:

1. Identify one narrow mission.
2. Inventory existing app capabilities, auth, state, and UI surface.
3. Create 2-5 Skills.
4. Create one Mission Profile.
5. Register app-owned tools.
6. Add approval gates for risky mutations.
7. Add Knowledge Access only when the mission needs source-owned retrieval.
8. Add outcome scenarios.
9. Run the verification loop.
10. Tune Skills/Profile text only when test data proves a gap.

## Recipe Philosophy

Recipes are opinionated install paths, not new runtimes. A recipe may know about Astro, React, a support workflow, or an intake pipeline, but it must preserve the same Edgekit boundaries:

- Edgekit owns sidecar runtime, model routing, event stream, approvals, UI primitives, telemetry contracts, and validation helpers.
- The host app owns state, auth, business logic, persistence, APIs, knowledge infrastructure, and final execution.
- Recipes are additive and inspectable. They scaffold files the developer can read and change.

## CLI

```bash
edgekit-init --list
edgekit-init mission --recipe support-workflow --out edgekit/support
edgekit-init mission --recipe knowledge-skill --out edgekit/policy
edgekit-init mission --recipe astro-intake-knowledge --out src/edgekit/intake
```

The generated files are starting points. Replace placeholder `execute` functions and retrieval endpoints with app-owned implementations before shipping.
