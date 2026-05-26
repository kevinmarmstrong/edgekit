# Testing agent workflows

Use deterministic workflow tests for CI and real-model evals for provider quality.

## Deterministic workflow tests

The ecommerce and admin demos include scripted provider modes. They are not the user-facing model path. They exist so CI can prove tool calling, approval prompts, rejection, and state mutation without depending on local model availability.

Scripted providers should validate EdgeKit contracts rather than patch a fixture. In particular, approval-loop tests should assert that the exact approved tool input survives resume, not just that the demo happens to add a known product or update a known account.



```bash
pnpm test:workflows
pnpm test:e2e
```

## Real-model evals

`pnpm eval:models` launches a browser against the ecommerce demo and records model/provider behavior to `test-results/model-cascade-eval.json`. Model unavailability is reportable by default and becomes a failure when `EDGEKIT_REQUIRE_REAL_MODEL=1` is set.



```bash
pnpm eval:models
EDGEKIT_EVAL_HEADLESS=0 pnpm eval:models
EDGEKIT_REQUIRE_REAL_MODEL=1 pnpm eval:models
```

## Adoption-quality evals

`pnpm eval:adoption` opens the docs Q&A demo and the site-wide dogfood assistant, asks developer implementation and safety questions, and records the actual transcripts to `research-results/adoption-quality.*`.

This gate exists because a returned docs-search result is not the same thing as a useful answer. The rubric rejects stock snippet dumps and requires concrete integration steps, host-app authority, local-first value, approval boundaries, and unsafe-secret guidance.



```bash
pnpm eval:adoption
EDGEKIT_ADOPTION_TARGET=live pnpm eval:adoption
EDGEKIT_ADOPTION_HEADLESS=0 pnpm eval:adoption
EDGEKIT_ADOPTION_STRICT=0 pnpm eval:adoption
```

## Research loops

`pnpm research:agents` is the end-to-end product research harness. It opens the docs site and demos in Chromium, sends real user prompts, scores answer quality, verifies approval boundaries, checks app state after mutations, probes AG-UI component rendering, confirms dogfooding, and captures transcripts plus screenshots.

Run it locally before release work and against GitHub Pages after deploy. The goal is to tune EdgeKit contracts, reusable harnesses, prompts, and integration guidance. Do not use it as an excuse to add hardcoded patches that only satisfy one demo fixture.



```bash
pnpm research:agents
EDGEKIT_RESEARCH_TARGET=live pnpm research:agents
EDGEKIT_RESEARCH_HEADLESS=0 pnpm research:agents
EDGEKIT_RESEARCH_STRICT=0 pnpm research:agents
```

## Expansive outcome suite

`pnpm research:suite` is the broader tuning loop. It reads scenario packs from `evals/agent-suite/scenarios.json`, applies thresholds from `evals/agent-suite/rubric.json`, runs seeded prompt variants across browser demos, and executes architecture probes that cannot be safely exposed from GitHub Pages.

The suite covers Chrome AI/WebLLM/provider fallback behavior, hybrid cloud-route selection, supervisor handoffs, response caching, tool repair, MCP adapters, tool policy boundaries, offline mutation journals, parallel-safe tools, PII redaction, loaded-page offline behavior, AG-UI rendering, admin approvals, and agent-readable docs. The rubric requires no required failures, no required skips, an average score of at least 0.98, and category confidence ratings above their thresholds. Strict real-provider runs can target a dedicated Chrome profile through `EDGEKIT_CHROME_USER_DATA_DIR` or a normal Chrome remote-debugging session through `EDGEKIT_CHROME_CDP_URL`.



```bash
pnpm research:env
pnpm research:suite
pnpm research:full
pnpm chrome:profile
pnpm test:routes
EDGEKIT_SUITE_TARGET=live pnpm research:suite
EDGEKIT_SUITE_PROMPT_LIMIT=2 pnpm research:suite
EDGEKIT_SUITE_SEED=42 pnpm research:suite
EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:full
EDGEKIT_CHROME_USER_DATA_DIR="$HOME/.edgekit/chrome-profile" EDGEKIT_SUITE_HEADLESS=0 EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:full
EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_SUITE_CLOUD_ROUTE_URL=http://127.0.0.1:4198/api/edgekit/cloud-route EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:full
```

## Release gates

Run the full gates before publishing a public release.

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test:e2e`
- `pnpm eval:adoption`
- `pnpm research:agents`
- `pnpm research:suite`