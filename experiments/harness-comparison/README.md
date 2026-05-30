# Harness comparison — baseline vs. tool-first (real Gemma)

Isolated experiment evaluating whether lightweight patterns from Pointer's SOTA OSWorld
agent improve edgekit's execution reliability in the **weak/local-model regime** (Gemini
Nano / WebLLM Gemma 2B). Same harness, same model, two variants:

- **Baseline** — plain `createAgent` (no primer, no gate, no two-strikes).
- **Tool-first** — feasibility gate → executor with the **tool-first system primer** +
  **two-strikes stop** (`createAgent({ toolFirst: true, stopWhen: twoStrikesStop() })`).

It runs labelled canary tasks against a real dispatch tool surface and a RAG surface, and
reports **decision-grade metrics**, not just step counts.

> This folder is self-contained and deletable. It imports the **published**
> `@kevinmarmstrong/edgekit` (`^0.3.2`) from npm and makes **zero changes to the core
> package** — it is meant to live in the demo repo, not the core repo.

## What was built (and where the primitives live)

**No core changes.** Every pattern is implemented locally in this experiment and works
against the published `createAgent` through its existing extension points:

- `src/primitives.ts` — `twoStrikesStop()` (a `stopWhen` condition) and
  `streamTextWithTwoStrikes()`, which wraps `createAgent`'s `streamText` option to inject
  the two-strikes stop into the real tool loop. Plus `TOOL_FIRST_SYSTEM_PRIMER`, which is
  simply appended to the `systemPrompt` string.
- `src/harnesses.ts` — the feasibility gate, the baseline vs tool-first runners, and metrics.

These primitives are kept **out of core on purpose**: they must prove themselves on a real
Gemma run before any change to `@kevinmarmstrong/edgekit` is proposed.

## Run it (browser — the only path that exercises a real model)

Requires Chrome with **WebGPU** (for WebLLM Gemma) and/or **Chrome AI / Gemini Nano** enabled.

```bash
cd experiments/harness-comparison   # (or wherever this folder lives in the demo repo)
pnpm install
pnpm dev                            # vite on http://localhost:4173
```

Open <http://localhost:4173>, pick a backend, click **Run comparison**.

- **Chrome AI / Gemini Nano** (Gemma-family, zero download) — needs Chrome 138+ with the
  on-device model. If `chrome://on-device-internals` shows the model, this is the fastest path.
- **WebLLM Gemma 2 2B** (`gemma-2-2b-it-q4f16_1-MLC`, ~1.4 GB) — downloads on first run;
  cached afterward. Works on any WebGPU browser.

The page shows, per task: baseline vs tool-first **steps**, **PASS/FAIL** (deterministic
grader), the **gate decision** and whether it was **correct**, tool-call trace, and timing.

### What to look at (the decision metrics)

1. **Step reduction** — total tool-calls, baseline → tool-first.
2. **Success delta** — tool-first must not regress PASS count vs baseline.
3. **Feasibility-gate accuracy + false rejections** — the gate's real risk is a *weak model
   wrongly rejecting a feasible task*. `false rejections` must be **0**. This is the metric
   the demo-repo "rejects after 1 probe" number does **not** capture.

### Decision criterion

Promote a gated primitive to core only if, on a real Gemma run:
**step reduction ≥ 15% AND false rejections == 0 AND success does not regress.**

## Context-pressure measurement (no browser needed)

```bash
node context-pressure.mjs
```

Measures transcript token growth vs the 2K–8K small-model budgets using core's exact
`estimateTokens` formula. Finding: compaction is **~0%** on compact transactional surfaces
(the dispatch board) and worth **~50–64%** only when tool *outputs* are large (RAG/docs).
Conclusion: compaction is a **payload-triggered, RAG-surface** feature — not a default-on win.

## Honest caveats

- The browser numbers must come from **your** run — they were **not** produced here (the
  build container has no GPU and no Chrome AI). Everything that can be verified headlessly
  (core primitives, wiring, typecheck, vite build, context-pressure) has been.
- 2B-class models are weak at multi-tool decomposition. Expect noisy PASS/FAIL; run each
  canary a few times. Report medians, and treat any single run as anecdote.
- The feasibility gate adds one model round-trip. On Nano that's cheap; on a fresh WebLLM
  load the first call also pays the download. Timing reflects that.

## Files

| File | Purpose |
|------|---------|
| `src/primitives.ts` | Local two-strikes stop + tool-first primer (no core changes) |
| `src/tools.ts` | Dispatch + RAG tool surfaces; labelled canaries with deterministic graders |
| `src/harnesses.ts` | `runBaseline` / `runToolFirst` (gate + primer + two-strikes); metrics |
| `src/main.ts` + `index.html` | Browser UI, capability detection, side-by-side render |
| `context-pressure.mjs` | Reproducible, non-circular compaction evidence (Node) |
