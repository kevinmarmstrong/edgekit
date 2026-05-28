Audience: adopter

# Skill Optimization

Edgekit treats Skills and Mission Profiles as inspectable, versioned artifacts that can improve over time without changing the deployed runtime model. The runtime stays local-first and low-cost; optimization happens in development, CI, or research loops.

This direction is inspired by the paper [SkillOpt: Executive Strategy for Self-Evolving Agent Skills](https://arxiv.org/pdf/2605.23904), which treats markdown skill files as trainable external state for frozen agents. The practical lesson for Edgekit is simple: do not let an agent rewrite skills freely. Use small patches, held-out validation, protected slow-state sections, and strict accept/reject gates.

Related implementation evidence from the broader agent-skills ecosystem: [Agent-Skills-for-Context-Engineering v2.3.0](https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering/releases/tag/v2.3.0) reports measured router gains from description and corpus hardening, and reinforces that description routing and activated skill bodies must be tested end to end.

## What This Means For Edgekit

Edgekit Skills now have two distinct authoring surfaces:

- **Description**: the router-visible surface. Keep it short and precise. This is what an agent or router uses to decide whether the Skill should activate.
- **Instructions**: the activated body. This contains compact procedural guidance the agent sees after the Skill is selected.

They can quietly disagree, so outcome tests must cover both routing and execution. A great activated body does not help if the router never selects the Skill, and a broad description can cause a Skill to activate for the wrong work.

## Fast State And Slow State

Keep optimization state separated:

- **Fast state**: recent failures, scenario traces, prompt variants, rejected patches, and score deltas.
- **Slow state**: safety invariants, host-app authority boundaries, tone, protected tool policies, and durable synthesis rules.

Normal optimizer patches must not modify protected slow-state paths. For example, a patch should not change `policy.needsApproval` or `instructions.safety` just because it improves a short-term score.

## Acceptance Rules

Use these rules for any self-editing or agent-authored optimization loop:

- Held-out validation is the gate.
- Candidate score must strictly improve the baseline; ties are rejected.
- Patch size is bounded, usually 4-8 operations.
- Protected paths are blocked by default.
- Safety, approval, workflow state, and answer faithfulness must remain green.
- Accepted edits should be few and high-signal.
- Rejected edits should be stored as negative evidence.

## Core Helpers

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
      reason: 'Router missed size and color queries.',
    },
  ],
})

if (!candidate.accepted) {
  console.warn(candidate.issues)
}
```

`validateSkillOptimizationCandidate()` is intentionally structural. It does not decide whether a Skill is good; your harness does that. It rejects unsafe optimization mechanics before a candidate can be considered:

- empty patches
- oversized patches
- invalid scores
- tied or worse held-out scores
- edits to protected slow-state paths

## Per-Skill Effect Size

Do not rely only on aggregate score. Small aggregate movement can hide large per-skill gains or regressions.

```ts
const report = summarizeSkillOptimizationScores([
  { skillId: 'catalog-search-v1', baselineScore: 0.72, candidateScore: 0.95 },
  { skillId: 'admin-update-v1', baselineScore: 0.98, candidateScore: 0.99 },
])
```

Report per-skill deltas in optimizer output and release notes. This helps developers see whether a change improved the target Skill or simply averaged out across the suite.

## Live GitHub Pages Optimization Loop

Use GitHub Pages as the held-out public surface when tuning documentation-facing Skills:

```bash
EDGEKIT_SUITE_TARGET=live EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_SUITE_HEADLESS=0 EDGEKIT_SUITE_OUTPUT=research-results/skill-optimization/live-before.json pnpm research:suite

EDGEKIT_SKILL_RESULT=research-results/skill-optimization/live-before.json pnpm optimize:skills
```

After a bounded Skill/Profile edit, run the candidate suite locally and then against GitHub Pages after deploy:

```bash
EDGEKIT_SKILL_BASELINE=research-results/skill-optimization/live-before.json EDGEKIT_SKILL_RESULT=research-results/agent-suite.json pnpm optimize:skills

git push edgekit HEAD:main
gh run watch <run-id> --repo kevinmarmstrong/edgekit --exit-status

EDGEKIT_SUITE_TARGET=live EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_SUITE_HEADLESS=0 pnpm research:suite
EDGEKIT_SKILL_BASELINE=research-results/skill-optimization/live-before.json pnpm optimize:skills
```

The mapping in `evals/skill-optimization/skill-map.json` connects suite IDs to Skill IDs. The candidate gate in `evals/skill-optimization/candidates.json` describes the bounded patch, protected paths, and the before/after suite slices used for strict validation.

## Recommended Loop

1. Split prompts into train, selection, and held-back test sets.
2. Run the current Skill/Profile through `pnpm research:suite` or a mission-specific scenario pack.
3. Gather transcripts, tool calls, UI state, approval events, and rubric failures.
4. Ask an optimizer model for a bounded patch, not a full rewrite.
5. Run `validateSkillOptimizationCandidate()`.
6. Apply the patch only if validation passes.
7. Rerun the selection suite.
8. Accept only strict improvements with safety invariants green.
9. Run the held-back test set before release.
10. Store accepted and rejected patch history.

This gives Edgekit a way to adapt frozen browser-local models to a domain through trained context, while preserving inspectability and zero inference-time optimization cost.
