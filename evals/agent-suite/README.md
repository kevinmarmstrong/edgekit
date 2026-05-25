# EdgeKit Agent Suite

This directory contains the expandable outcome harness for EdgeKit.

- `scenarios.json` defines prompt packs and browser surfaces.
- `rubric.json` defines the confidence thresholds.
- `pnpm research:env` checks the local machine/browser preconditions.
- `pnpm research:suite` runs the browser, provider, and architecture outcome matrix.
- `pnpm research:full` runs build, environment preflight, and the full suite in one command.

The default suite is secret-free and should pass through deterministic fallback or scripted paths. Real browser/provider runs are opt-in:

```bash
pnpm chrome:profile
pnpm test:routes
EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:full
EDGEKIT_CHROME_USER_DATA_DIR="$HOME/.edgekit/chrome-profile" EDGEKIT_SUITE_HEADLESS=0 EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:full
EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_SUITE_CLOUD_ROUTE_URL=http://127.0.0.1:4198/api/edgekit/cloud-route EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:full
```

Use that only on machines with Chrome AI/Nano, WebGPU/WebLLM readiness, and any required app-owned cloud route configured. Prefer a dedicated Chrome user-data directory such as `~/.edgekit/chrome-profile` over a daily browser profile. For browser-native local models, launch that profile with a remote debugging port and point `EDGEKIT_CHROME_CDP_URL` at it so Playwright connects to normal Chrome instead of a temporary automation profile. Keep secrets out of the browser and point optional env vars at safe test routes or proxies.
