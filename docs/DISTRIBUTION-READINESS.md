# Distribution Readiness

Use this before publishing Edgekit packages.

## Package Smoke

Run the release packages through a fresh app, not only the monorepo workspace.

```bash
pnpm build
pnpm pack:packages
pnpm test:fresh-app
```

The fresh app must import `@kevinmarmstrong/edgekit`, `@kevinmarmstrong/edgekit-ui`, and `@kevinmarmstrong/edgekit-react` from packed tarballs, render `<edge-chat>`, apply a Mission Profile, register tools, and build.

## Publish Checklist

- Package READMEs lead with Skills + Mission Profiles.
- Internal package dependencies use publishable semver versions, not `workspace:*`.
- `files` include built `dist` and README content.
- Root README links runtime guarantees, starter path, production recipes, and release checks.
- GitHub Pages is rebuilt and smoke-tested after package verification.
- Provider evidence is labeled by lane: local resilience, strict Chrome/Nano CDP,
  WebLLM COOP/COEP, cloud route, no-model fallback, and live Pages.
- `research-results/provider-matrix.md` is regenerated from the same commit as
  the release candidate, or the release notes explain why provider proof is
  deferred to a specific host.

## Provider Release Evidence

Minimum package-readiness evidence:

```bash
pnpm test:fresh-app
pnpm research:suite
EDGEKIT_EVAL_DOWNLOAD_POLICY=never EDGEKIT_EVAL_MODES=none pnpm eval:models
EDGEKIT_SUITE_TARGET=live pnpm research:suite
```

Strict provider evidence, when claiming local-model readiness:

```bash
EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_SUITE_HEADLESS=0 EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:suite
EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_EVAL_HEADLESS=0 EDGEKIT_REQUIRE_REAL_MODEL=1 EDGEKIT_EVAL_DOWNLOAD_POLICY=never pnpm eval:models
```

Cloud readiness is only proven against the route named in
`EDGEKIT_SUITE_CLOUD_ROUTE_URL`. A local stub is acceptable for routing-shape
proof, but it is not hosted-provider proof.

## Compatibility Policy

- Core primitives follow semver.
- Mission Profiles should declare `meta.compatibility`.
- Skill/Profile metadata may gain new optional fields without breaking older profiles.
- Runtime behavior changes that affect approvals, tool execution, or provider routing require migration notes and harness proof.
