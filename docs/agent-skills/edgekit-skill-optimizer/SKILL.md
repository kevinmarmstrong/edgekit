Audience: contributor

---
name: edgekit-skill-optimizer
description: Use when improving Edgekit Skills or Mission Profiles from harness results through bounded, validation-gated edits.
---

# Edgekit Skill Optimizer

Use this skill after outcome data exists. Do not optimize from vibes.

## Read First

1. `docs/adopter/SKILL-OPTIMIZATION.md`
2. `evals/skill-optimization/skill-map.json`
3. `evals/skill-optimization/candidates.json`
4. The latest `research-results/agent-suite.json`

## Workflow

1. Map failing scenarios to Skill IDs and Profile IDs.
2. Separate router-visible `description` failures from activated `instructions` failures.
3. Propose a bounded patch of 4-8 operations.
4. Do not edit protected slow-state sections such as approval policy, host-app authority, safety, and source authorization.
5. Run held-out validation.
6. Accept only strict improvement. Reject ties.
7. Report per-skill effect size.

## Editable Fast State

- `description`
- `instructions`
- `activationExamples`
- `doNotActivateWhen`
- `synthesis`

## Protected Slow State

- `policy`
- `instructions.safety`
- `source.authorization`
- Host-app authority boundaries
- Approval requirements

## Verification

```bash
pnpm research:suite
EDGEKIT_SKILL_RESULT=research-results/agent-suite.json pnpm optimize:skills
```

For public changes, redeploy and rerun the live suite.
