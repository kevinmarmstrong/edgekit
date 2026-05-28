Audience: contributor

---
name: edgekit-outcome-tester
description: Use when evaluating whether an Edgekit sidecar actually works for realistic prompts, actions, approvals, citations, and app state.
---

# Edgekit Outcome Tester

Use this skill to test outcomes, not only runtime success.

## Read First

1. `docs/adopter/TESTING-OUTCOME-QUALITY.md`
2. `lab/process/ADOPTER-SIMULATION.md`
3. `evals/agent-suite/rubric.json`
4. `evals/agent-suite/scenarios.json`

## Workflow

1. List the mission's read-only tasks, risky tasks, generated UI states, and fallback modes.
2. Add or update scenario prompts before changing implementation.
3. Score final user-visible output, not hidden tool results.
4. Check app-owned state before approval, after approval, and after rejection.
5. Check citations and freshness for Knowledge Access.
6. Check telemetry/audit events for important actions.
7. Run local and, after deploy, live GitHub Pages suites when public surfaces changed.

## Required Categories

- `answerQuality`
- `synthesisFaithfulness`
- `safety`
- `workflowState`
- `generativeUi`
- `integration`
- `knowledgeGrounding` when retrieval is involved

## Failure Handling

If a scenario fails:

1. Identify whether the failure is core runtime, profile/skill text, app-owned tool implementation, test expectation, or environment.
2. Prefer reusable contract fixes over prompt-specific demo patches.
3. Only tune Skill/Profile text when transcripts show the runtime is doing the right thing but the model needs better localization.
4. Rerun the failing scenario and a held-out related scenario.
