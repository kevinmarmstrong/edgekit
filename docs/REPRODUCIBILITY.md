# Reproducibility Guide

The goal is to make Edgekit evidence repeatable outside the maintainer machine.
A passing report should say which provider path was exercised, which host was
tested, which scenarios were skipped, and whether skips were required or
environmental.

Treat model availability as an environment fact, not a product claim. Chrome
AI, WebLLM, cloud routes, and no-model fallback should each have explicit proof
or an explicit skip reason.

## Baseline Local Gates

These checks prove the repo and public surfaces are executable. They do not, by
themselves, prove local model quality.

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm test:e2e
pnpm eval:adoption
pnpm research:suite
```

## Provider Matrix

Run each architecture as its own evidence lane. Do not merge these claims:

- **Local resilience**: local preview, deterministic/scripted paths, graceful
  provider degradation, and architecture probes.
- **Strict local provider**: real browser provider proof, normally a downloaded
  Chrome AI/Nano model through CDP and WebLLM prerequisites on a COOP/COEP host.
- **Live static host**: GitHub Pages docs/demos under public hosting
  constraints. Provider execution rows are skipped there by design; live proof
  comes from the browser scenarios.
- **Cloud route**: developer-owned escalation endpoint. A local stub proves
  routing shape; an external URL proves hosted-provider reachability.

| Lane | What It Proves | Command |
| --- | --- | --- |
| Deterministic local | Integration contracts, demos, docs, harness scoring, scripted workflow control | `pnpm research:suite` |
| Chrome AI / Nano CDP | Browser-native model path through a real Chrome profile with downloaded Nano available | `EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_SUITE_HEADLESS=0 EDGEKIT_REQUIRE_REAL_PROVIDERS=1 EDGEKIT_SUITE_PROVIDER_MODES=chrome pnpm research:suite` |
| Strict model cascade | Ecommerce prompt/tool/approval paths against Chrome and cascade modes | `EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_EVAL_HEADLESS=0 EDGEKIT_REQUIRE_REAL_MODEL=1 EDGEKIT_EVAL_DOWNLOAD_POLICY=never pnpm eval:models` |
| WebLLM host | WebLLM-capable host with WebGPU and `crossOriginIsolated=true` from COOP/COEP headers | `EDGEKIT_SUITE_PROVIDER_MODES=webllm EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:suite` |
| Cloud route | Developer-owned model escalation endpoint | `EDGEKIT_SUITE_CLOUD_ROUTE_URL=http://127.0.0.1:4198/api/edgekit/cloud-route EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:suite` |
| No-model fallback | Honest basic-mode behavior when local models are unavailable | `EDGEKIT_EVAL_DOWNLOAD_POLICY=never EDGEKIT_EVAL_MODES=none pnpm eval:models` |
| Live Pages | Public docs and demos under GitHub Pages constraints | `EDGEKIT_SUITE_TARGET=live pnpm research:suite` |

Launch a reusable Chrome profile when strict local-provider evidence matters:

```bash
pnpm chrome:profile
EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:suite
```

For a Chrome/Nano proof, prefer attaching to the user's running Chrome with
CDP. A fresh isolated Playwright profile can report Nano unavailable even when
the user's profile has the downloaded model.

For WebLLM proof, the relevant host must send:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

The suite environment probe records `crossOriginIsolated` so the report can
distinguish a real WebLLM-capable host from a graceful fallback.

## Targeted Resilience Lanes

Use `EDGEKIT_SUITE_ONLY` when you only need a focused proof run:

```bash
# Hostile mutation prompt must still require approval and preserve state on reject.
EDGEKIT_SUITE_ONLY=standalone-hostile-cart pnpm research:suite

# Offline/loaded-page fallback must answer from bundled state.
EDGEKIT_SUITE_ONLY=offline-loaded-assistant pnpm research:suite

# MCP-ish adapter path is an architecture probe in the full suite.
pnpm research:suite
```

Long workflow proof currently lives in the full suite through the Field Ops ERP
multi-step approval/rejection scenarios (`field-ops-reserve-inventory`,
`field-ops-dispatch-rejection`, and `field-ops-supervisor-eta`). Flaky provider
and invalid tool-output behavior are covered by the tool-repair, cache,
offline-journal, and no-model architecture probes in the same run.

## Evidence To Keep

- `research-results/agent-suite.json`: machine-readable scores, skips, category
  thresholds, provider notes, and required-failure status.
- `research-results/agent-suite.md`: human-readable scenario summary.
- `research-results/provider-matrix.md`: provider-by-host pass, fail, and skip
  reasons.
- `research-results/suite-screenshots/*`: browser screenshots for the tested
  product surfaces.
- Commit SHA, live URL, Chrome version, model availability result, strict flag,
  and whether the run used local, live, or cloud-route targets.

## Interpretation Rules

- A green deterministic run means the integration contract works.
- A green strict provider run means the current machine and browser can exercise
  the local-model path.
- A green live Pages run means the public docs and demos still satisfy outcome
  checks under public-host constraints.
- Required failures or required skips block release claims.
- Non-required skips must be documented as environmental, host, or provider
  limitations.

Do not collapse these into one claim. A production-ready report should say
exactly which architecture was tested and which architecture still needs
evidence.
