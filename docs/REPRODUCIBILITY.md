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

Run each architecture as its own evidence lane.

| Lane | What It Proves | Command |
| --- | --- | --- |
| Deterministic local | Integration contracts, demos, docs, harness scoring | `pnpm research:suite` |
| Chrome AI / Nano | Browser-native model path through a real Chrome profile | `EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:suite` |
| WebLLM host | WebLLM-capable host with cross-origin isolation headers | Run on a host with COOP/COEP headers and record model availability |
| Cloud route | Developer-owned model escalation endpoint | `EDGEKIT_SUITE_CLOUD_ROUTE_URL=http://127.0.0.1:4198/api/edgekit/cloud-route pnpm research:suite` |
| No-model fallback | Honest basic-mode behavior when local models are unavailable | `pnpm eval:models` and `pnpm research:suite` without strict provider flags |
| Live Pages | Public docs and demos under GitHub Pages constraints | `EDGEKIT_SUITE_TARGET=live pnpm research:suite` |

Launch a reusable Chrome profile when strict local-provider evidence matters:

```bash
pnpm chrome:profile
EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:suite
```

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
