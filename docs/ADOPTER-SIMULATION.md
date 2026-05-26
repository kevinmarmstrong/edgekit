# Adopter Simulation

Use this protocol to prove Edgekit is understandable for both target users in `WORLD-CLASS-DEFINITION.md`.

The simulation must use only public docs, package APIs, starter artifacts, and
agent-readable docs exports. Private maintainer knowledge is a failure signal.

This is an adoption proof, not a maintainer demo. The evaluator should behave
like a new team member or external coding agent that knows TypeScript and web
apps but has not previously worked in this repository.

## Evidence Levels

| Level | What It Proves | Minimum Evidence |
| --- | --- | --- |
| `dry-run` | Docs are understandable enough to plan from | Written plan, file map, risk list |
| `starter-run` | The starter can become a real mission | Copied profile, replaced tool executes, validation output |
| `first-serious-run` | The sidecar works against a realistic surface | Outcome score `>= 0.95`, required failures `0`, transcript/screenshots |
| `production-shaped` | The team can ship responsibly | telemetry, audit, RBAC/state boundary, provider lane evidence |

World-class claims should cite at least `first-serious-run` evidence. A
`production-shaped` run is the preferred release-candidate proof.

## 30-Minute Agent-Assisted Path

Start from [30-Minute Production Sidecar](./30-MINUTE-PRODUCTION-SIDECAR.md) and the concrete support starter in `docs/templates/mission-profile-starter/`.

### Rules

- The coding agent may read `README.md`, `ARCHITECTURE.md`, `AGENTS.md`, public
  docs under `docs/`, `llms.txt`, `llms-full.txt`, package READMEs, and the
  starter template.
- The coding agent must not ask the maintainer for hidden context unless blocked.
  Every clarification request is a friction point.
- The coding agent must modify a realistic app surface or fixture, not only
  describe what it would do.
- The evaluator must record the first serious harness run before tuning. Do not
  hide that result behind later improvements.

### Required Sequence

| Minute | Expected Action | Proof |
| --- | --- | --- |
| 0-5 | Choose one narrow mission with one read tool and one risky action | Mission sentence |
| 5-10 | Copy the starter and rename Skills/Profile/tools for the app | File list |
| 10-18 | Replace sample `execute` bodies with app-owned APIs or fixture functions | Tool map |
| 18-23 | Mount `<edge-chat>`, apply the Mission Profile, register tools, add telemetry | Integration diff |
| 23-27 | Run `validateMissionProfile(profile, { registeredTools })` | Validation output |
| 27-30 | Run outcome scenarios and capture the first serious score | JSON/Markdown report |

Tune only Skill/Profile text, examples, or scenario expectations unless the run
finds a reusable Edgekit bug. A demo-specific hardcode is a failure.

### Required Records

- Start and finish time.
- Files copied, created, and edited.
- Public docs consulted.
- Every clarification or ambiguous step.
- Validation output from `validateMissionProfile(profile, { registeredTools })`.
- Outcome scenario scores and failed checks.
- Screenshots or transcripts for read answer, approval request, approval
  decision, rejection/no-mutation path, and telemetry/audit evidence.
- Provider lane used: local resilience, strict Chrome/Nano CDP, WebLLM host,
  cloud route, no-model fallback, or live Pages.

## 90-Minute Elite Programmer Path

1. Read `ARCHITECTURE.md`, `docs/RUNTIME-GUARANTEES.md`, and `docs/PRODUCTION-READINESS.md`.
2. Inspect core extension points for model routing, tool execution, approvals, telemetry, audit, redaction, identity, and state.
3. Build one profile-owned sidecar against real app tools.
4. Add telemetry, audit, state, identity, and RBAC-filtered tool manifests.
5. Add local outcome scenarios.
6. Run the full test battery and provider matrix.

## Scoring Rubric

| Category | Required Signal |
| --- | --- |
| Mission fit | One clear app-owned mission, not a generic assistant |
| Tool correctness | Read tools and mutation tools map to real app capabilities |
| Host authority | Auth, permissions, state, business logic, and persistence stay in the app |
| Approval safety | Risky mutations require visible approval and rejection preserves state |
| Answer quality | Final text includes the user-requested facts, not only raw tool chatter |
| Generative UI | CTA/form/action payloads are visible when useful and app-owned |
| Telemetry/audit | Run, tool, approval, and error events are observable |
| Provider honesty | The report states the provider lane and fallback behavior |
| Reproducibility | Another agent can rerun the same commands from the report |

## Passing Standard

The sidecar must reach average score `>= 0.95` on its first serious harness run
after reasonable setup and bounded tuning. Required failures must be `0`.

The evaluation must include final answer quality, generated UI, approval
boundaries, telemetry, app state, provider honesty, and host-app authority.

If the first serious run fails, keep it in the report. Then record the smallest
fix that improved the result and whether the fix was reusable Edgekit behavior,
Skill/Profile text, or app-specific integration.

## Report Format

````md
# Adopter Simulation Report

- Persona: agent-assisted developer | elite programmer
- Mission:
- Evidence level: dry-run | starter-run | first-serious-run | production-shaped
- Time to first working sidecar:
- Time to passing outcome score:
- Public docs consulted:
- Files changed:
- Provider lane:
- Validation errors:
- Validation warnings:
- Outcome score:
- Required failures:
- Required skips:
- Friction points:
- Fixes made:
- Reusable Edgekit issues found:
- Remaining risks:

## Commands

```bash
...
```

## First Serious Run

- Score:
- Required failures:
- Transcript path:
- Screenshot path:

## Final Run

- Score:
- Required failures:
- Transcript path:
- Screenshot path:
````
