# Skill optimization

Use bounded, validation-gated Skill edits to improve agent outcomes without changing runtime model weights.

## Research basis

Edgekit treats Skills and Mission Profiles as inspectable artifacts that can improve without changing runtime model weights.

This direction is inspired by SkillOpt: Executive Strategy for Self-Evolving Agent Skills.

- Paper: https://arxiv.org/pdf/2605.23904
- Related ecosystem release: https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering/releases/tag/v2.3.0

## Description and body are separate surfaces

The Skill `description` is router-visible. The `instructions` body is activated after selection.

Outcome tests must catch disagreement between these two surfaces.



```ts
const searchSkill = createSkill({
  id: 'catalog-search-v1',
  name: 'Catalog Search',
  description: 'Answer catalog availability, exact price, size, color, and stock questions.',
  instructions: 'Always restate price, sizes, color, and stock signals from tool results.',
  protectedSections: ['policy', 'instructions.safety'],
  requiredTools: ['searchProducts'],
})
```

## Fast state and slow state

Fast state includes recent failures, traces, prompt variants, rejected patches, and score deltas.

Slow state includes safety invariants, host-app authority boundaries, tone, tool policies, and durable synthesis rules.

## Acceptance gate

Held-out validation is the gate. Candidate edits must strictly improve the score; ties are rejected.

Patch size should be bounded, usually 4-8 operations.



```ts
const candidate = validateSkillOptimizationCandidate({
  skillId: 'catalog-search-v1',
  baselineScore: 0.94,
  candidateScore: 0.97,
  protectedPaths: ['policy', 'instructions.safety'],
  patch: [
    {
      op: 'replace',
      path: 'description',
      value: 'Answer product availability, exact price, size, color, and stock questions.',
    },
  ],
})
```

## Per-skill effect size

Do not rely only on aggregate score. Report per-skill baseline, candidate score, and improvement.



```ts
const report = summarizeSkillOptimizationScores([
  { skillId: 'catalog-search-v1', baselineScore: 0.72, candidateScore: 0.95 },
  { skillId: 'admin-update-v1', baselineScore: 0.98, candidateScore: 0.99 },
])
```

## Live GitHub Pages loop

Use the deployed GitHub Pages site as a held-out public surface when tuning documentation-facing Skills.

The optimizer report maps suite IDs to Skills, calculates per-skill scores from live transcripts, and validates bounded candidates against protected paths.



```bash
EDGEKIT_SUITE_TARGET=live EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_SUITE_HEADLESS=0 EDGEKIT_SUITE_OUTPUT=research-results/skill-optimization/live-before.json pnpm research:suite
EDGEKIT_SKILL_RESULT=research-results/skill-optimization/live-before.json pnpm optimize:skills

EDGEKIT_SKILL_BASELINE=research-results/skill-optimization/live-before.json EDGEKIT_SKILL_RESULT=research-results/agent-suite.json pnpm optimize:skills
```

## Recommended loop

Run optimization as a development or CI loop, not as inference-time behavior.

- Split prompts into train, selection, and held-back test sets.
- Collect transcripts, tool calls, UI state, approval events, and rubric failures.
- Ask an optimizer model for a bounded patch, not a full rewrite.
- Validate the candidate with `validateSkillOptimizationCandidate()`.
- Accept only strict improvements with safety, workflow state, and answer faithfulness green.
- Store accepted and rejected patch history.