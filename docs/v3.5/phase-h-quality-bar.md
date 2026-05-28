Audience: contributor

# Phase H Quality Bar

Phase H keeps `pnpm research:suite` as deterministic regression coverage and adds separate outcome-quality layers so public claims do not rest on one aggregate score.

## What Changed

- Added `pnpm research:quality` for randomized ecommerce and docs prompts.
- Added `evals/quality-bar/randomized-prompts.json` as the prompt pack for the new quality layer.
- Added optional external LLM judging through `EDGEKIT_LLM_JUDGE_COMMAND`; the default run is an honest deterministic rubric judge and records when the model judge is skipped.
- Updated provider-matrix defaults to the six Phase H rows: `chrome-ready`, `chrome-downloading`, `webllm-auto`, `webllm-declined`, `server`, and `no-model`.
- Updated `research-results/provider-matrix.md` rendering to show latency, success rate, and tool-call accuracy columns.
- Added `scripts/check-v35-constraints.mjs` and wired it into `pnpm test`.
- Added the `docs/adopter/UPGRADE.md` template with a worked v0.2.x to v0.3.x example.
- Added cross-package dependency ADRs for React -> UI, React -> Skills, UI -> Governance, and UI -> Skills; missing ADRs now fail the v3.5 constraint check.

## Constraint Scope

The audience-header check intentionally scans Markdown surfaces only: root `*.md`, `docs/**/*.md`, `docs/**/SKILL.md`, and `.github/**/*.md`. It does not scan Mermaid diagrams, CSV inventories, JSON fixtures, or TypeScript templates because those are generated or code artifacts rather than reader-facing docs.

LOC budgets remain warning-only in v0.3. `packages/core/src` stays over the 1,800-line backstop until the deprecated `compat/` bridge can be deleted in v0.4. Phase I can reduce `packages/ui/src`, but it should not pretend core reaches budget before the v0.4 compatibility removal.

## Provider Matrix Commands

```bash
EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_SUITE_HEADLESS=0 EDGEKIT_REQUIRE_REAL_PROVIDERS=1 EDGEKIT_SUITE_PROVIDER_MODES=chrome-ready pnpm research:suite
EDGEKIT_SUITE_PROVIDER_MODES=chrome-downloading pnpm research:suite
EDGEKIT_SUITE_PROVIDER_MODES=webllm-auto EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:suite
EDGEKIT_SUITE_PROVIDER_MODES=webllm-declined pnpm research:suite
EDGEKIT_SUITE_PROVIDER_MODES=server EDGEKIT_SUITE_CLOUD_ROUTE_URL=https://edgekit-cloudflare-sidecar.kevinmichaelarmstrong.workers.dev/api/edgekit/cloud-route EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:suite
EDGEKIT_SUITE_PROVIDER_MODES=no-model pnpm research:suite
```

## Current Honesty Boundary

`pnpm research:quality` can run without provider secrets and without a model-backed judge. In that mode it records `judgeMode: deterministic-rubric` and `llmJudgeSkipped`. Release claims that need a model judge must set `EDGEKIT_LLM_JUDGE_COMMAND` and `EDGEKIT_REQUIRE_LLM_JUDGE=1`.

The provider matrix exists as a table shape and executable harness. Rows that require Chrome AI, WebGPU, or a server route only become product evidence when run in the matching environment. A no-model row with success rate 1 means graceful fallback delivered; it does not mean full agent execution happened.

## Production Deploy Check

The Phase G/H production smoke must be cache-busted because GitHub Pages serves with CDN caching. Verification should include:

```bash
curl -H 'Cache-Control: no-cache' -sL "https://kevinmarmstrong.github.io/edgekit/?cacheBust=$(date +%s)" | rg "Add an AI agent|appCloudRoute"
curl -H 'Cache-Control: no-cache' -sI "https://kevinmarmstrong.github.io/edgekit/?cacheBust=$(date +%s)"
```

On May 28, 2026 the cache-busted fetch returned the new H1 and cascade snippet, with `last-modified: Thu, 28 May 2026 20:35:25 GMT`.

## Verification

Use this gate for Phase H changes:

```bash
pnpm test
pnpm typecheck
pnpm --filter @edgekit/site build
pnpm research:quality
node scripts/v35-export-inventory.mjs
git diff --check
```
