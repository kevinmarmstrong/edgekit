Audience: contributor

# Phase F Demo Retirement

Phase F retires internal demos only after replacement external demos are live. This file tracks the staged retirements so the site does not lose working examples during the transition.

## Completed

- Activated `node scripts/check-demo-isolation.mjs` and wired it into `pnpm test`; package source cannot import from `site/**` or `examples/**`.
- Kept the permanent Phase D ratchet under `node scripts/check-core-banned-patterns.mjs`; `pnpm test` runs both constitutional checks, and `.github/workflows/pages.yml` runs `pnpm test` before typecheck, build, and Pages deploy.
- Retired the site-owned ecommerce runtime from `site/src/main.ts`.
- Replaced `/demos/ecommerce/` with an external-demo handoff page that links to `https://edgekit-demo-ecommerce.pages.dev/`.
- Updated the homepage demo card, site assistant demo listing, agent-readable demo links, research loops, and E2E expectations to treat ecommerce as external.
- Preserved `examples/ecommerce` as the standalone local workflow/eval fixture until the Phase I npm-published demo path replaces vendored tarballs.
- Created and pushed `edgekit-demo-docs` and deployed it to `https://edgekit-demo-docs.pages.dev/` with COOP/COEP headers.
- Created and pushed `edgekit-demo-admin` and deployed it to `https://edgekit-demo-admin.pages.dev/` with COOP/COEP headers.
- Replaced `/demos/docs/` and `/demos/admin/` with external-demo handoff pages and removed the duplicate docs/admin chat runtimes from the site bundle.
- Moved the Cloudflare sidecar proof from `examples/cloudflare-sidecar` to `lab/proofs/cloudflare-sidecar`.
- Regenerated the core export inventory after the approval-flow fix: `node scripts/v35-export-inventory.mjs` wrote 163 exports to `docs/v3.5/core-export-inventory.csv`.

## Browser Smoke

Local preview route: `http://127.0.0.1:4174/edgekit/demos/ecommerce/`.

Observed:

- Page title: `Ecommerce retrofit demo moved - edgekit demos`.
- Heading: `The ecommerce demo now runs outside the monorepo.`
- `#ecommerce edge-chat` count: 0.
- `#cart-state` count: 0.
- External demo href: `https://edgekit-demo-ecommerce.pages.dev/`.
- COOP/COEP mirror verified: `window.crossOriginIsolated === true` on the deployed Cloudflare Pages URL.

## Remaining

- Decide whether the site assistant demo surface, cascade lab, ops demo, and AG-UI mock need external replacements or should retire after v0.3.0.
- Finish with `/site/src/` containing marketing-only code and no demo runtime after those decisions land.
