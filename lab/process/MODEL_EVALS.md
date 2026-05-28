# Model Evaluation Loop

edgekit has two testing lanes:

- Deterministic workflow tests prove app integration, tool calls, approval handling, and UI state without relying on a local model being available.
- Real-model evals exercise Chrome AI and WebLLM behavior in a browser so prompt and cascade quality can be tuned separately.

## Run The Eval Harness

```bash
pnpm eval:models
```

The default run evaluates `chrome` and `cascade` modes with `downloadPolicy=never`. It writes a JSON report to `test-results/model-cascade-eval.json`.

Useful variants:

```bash
pnpm chrome:profile
EDGEKIT_EVAL_MODES=chrome,cascade,webllm EDGEKIT_EVAL_DOWNLOAD_POLICY=auto pnpm eval:models
EDGEKIT_EVAL_HEADLESS=0 pnpm eval:models
EDGEKIT_REQUIRE_REAL_MODEL=1 pnpm eval:models
EDGEKIT_CHROME_USER_DATA_DIR="$HOME/.edgekit/chrome-profile" EDGEKIT_EVAL_HEADLESS=0 EDGEKIT_REQUIRE_REAL_MODEL=1 pnpm eval:models
EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_REQUIRE_REAL_MODEL=1 pnpm eval:models
```

`EDGEKIT_REQUIRE_REAL_MODEL=1` turns model unavailability into a failure. Leave it off for normal local development, because Chrome AI and WebLLM availability depends on browser version, flags, hardware, profile state, model download, and cross-origin isolation. For strict local-provider testing, use a dedicated Chrome profile such as `~/.edgekit/chrome-profile` instead of a daily browser profile. The most faithful local path is to launch that profile as normal Chrome with a remote debugging port and connect the harness with `EDGEKIT_CHROME_CDP_URL`.

## Current Scenarios

- White Nike Dunks search narrows to `Nike Dunk Low`.
- Running shoes under `$100` in size `10` return a matching running product.
- Guarded cart request asks before changing cart state.
- Real-model transcripts fail if they contain tool-schema recovery chatter such as previous tool-call errors, parameter trouble, or `null` rejection language.

When tuning prompts or provider wrappers, compare the JSON reports across modes. The deterministic `pnpm test:workflows` suite should remain green while the real-model scores improve.
