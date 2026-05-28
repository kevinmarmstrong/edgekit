# Cloudflare Architecture Proof

This proof exists because GitHub Pages can host the public Edgekit docs and static demos, but it cannot represent every production architecture Edgekit supports.

`examples/cloudflare-sidecar` is a Cloudflare Workers example that adds the missing host capabilities:

- COOP/COEP headers for WebLLM-capable browser execution.
- Worker-backed `/api/edgekit/knowledge/search` retrieval.
- Worker-backed `/api/edgekit/intake` approval-gated mutation route.
- Worker-backed `/api/edgekit/cloud-route` explicit cloud fallback route.
- Static asset serving from the same Worker host.

## Run Locally

```bash
pnpm --dir examples/cloudflare-sidecar install
pnpm --dir examples/cloudflare-sidecar build
pnpm --dir examples/cloudflare-sidecar wrangler:dry-run
pnpm --dir examples/cloudflare-sidecar dev
```

## Deploy

```bash
pnpm --dir examples/cloudflare-sidecar build
pnpm --dir examples/cloudflare-sidecar deploy
```

Current verified proof host:

```text
https://edgekit-cloudflare-sidecar.kevinmichaelarmstrong.workers.dev
```

The example does not require provider secrets. Without `EDGEKIT_CLOUD_ROUTE_URL`, `/api/edgekit/cloud-route` returns a deterministic stub that proves the route shape. With `EDGEKIT_CLOUD_ROUTE_URL`, `EDGEKIT_CLOUD_ROUTE_CLIENT_TOKEN`, and optional `EDGEKIT_CLOUD_ROUTE_TOKEN`, the Worker can forward to a developer-owned model route.

## Headers

The Worker adds:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Resource-Policy: same-origin`

These headers are what GitHub Pages cannot reliably provide for every demo lane. They are important for WebLLM hosts that need cross-origin isolation.

Latest live header smoke on `2026-05-27` verified:

```text
cross-origin-embedder-policy: require-corp
cross-origin-opener-policy: same-origin
cross-origin-resource-policy: same-origin
```

A Playwright smoke also verified `crossOriginIsolated === true` and confirmed
that the public page mounted `<edge-chat>`.

## Cloud Route

The cloud route is intentionally developer-owned. Edgekit should not ship a hidden hosted model backend. A production Worker can enforce tenant policy, redact context, record telemetry, and then forward only approved requests to a model provider.

The example route supports:

- `GET /api/edgekit/cloud-route` for provider-matrix reachability checks.
- `POST /api/edgekit/cloud-route` for deterministic fallback or developer-owned forwarding.

Forwarding is deliberately locked behind `EDGEKIT_CLOUD_ROUTE_CLIENT_TOKEN`.
When an upstream `EDGEKIT_CLOUD_ROUTE_URL` is configured, unauthenticated public
POST requests receive `401` and forwarding remains disabled until the Worker has
a client-facing bearer token policy. The GET readiness response returns a
misconfigured `501` state when an upstream URL is present without that client
token, so provider-matrix checks cannot silently pass a broken forwarding lane.
The example also caps forwarded payloads at
64KB, requires JSON, and forwards only parsed JSON objects. Production teams
should replace the demo token check with their tenant/session authorization,
rate limits, redaction, telemetry, and abuse controls.

## Intake

The browser sidecar renders the form and approval boundary. The Worker route owns validation and persistence. This preserves the Edgekit rule that the host app owns state, business logic, authorization, and mutation execution.

## What This Proves

This proof covers architecture shape and Cloudflare host capabilities. It does not replace:

- strict Chrome/Nano CDP provider proof,
- WebLLM model download/runtime proof on a specific browser,
- hosted model quality proof against a real `EDGEKIT_CLOUD_ROUTE_URL`,
- app-specific authorization and persistence review.

Current release-candidate provider-matrix evidence:

```bash
EDGEKIT_SUITE_PROVIDER_MODES=cloud-route \
EDGEKIT_SUITE_CLOUD_ROUTE_URL=https://edgekit-cloudflare-sidecar.kevinmichaelarmstrong.workers.dev/api/edgekit/cloud-route \
EDGEKIT_REQUIRE_REAL_PROVIDERS=1 \
EDGEKIT_PROVIDER_MATRIX_OUTPUT=research-results/provider-matrix-cloudflare.json \
pnpm research:suite
```

Latest result: average score `1.0`, required failures `0`, required skips `0`.
