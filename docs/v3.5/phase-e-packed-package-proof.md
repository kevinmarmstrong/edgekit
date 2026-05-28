Audience: contributor

# Phase E Packed-Package Proof

Phase E proves the adopter path with packed package artifacts outside workspace aliases. It is the gate before retiring internal demos or rewriting the public site around a fast install story.

## Package Smoke

- `pnpm test:fresh-app` built the workspace packages, packed all nine publishable packages into `research-results/package-smoke/packs`, installed them into a scratch app outside the monorepo, then ran `npm run typecheck` and `npm run build`.
- The fresh-app fixture imports sibling packages directly instead of relying on deprecated root compatibility exports.
- The smoke harness now packs `@kevinmarmstrong/edgekit`, `edgekit-skills`, `edgekit-knowledge`, `edgekit-governance`, `edgekit-mcp`, `edgekit-agui`, `edgekit-ui`, `edgekit-react`, and `edgekit-cli`.

## Clean-Room Adoption

- `pnpm adoption:clean-room` packed the same nine package artifacts, installed them into a generated clean-room app, and ran typecheck, build, and outcome checks.
- Latest report: `research-results/adopter-simulations/latest.md`.
- Result: 4 scenarios, 9 checks, 0 failed checks, 0 required failures, average score 1.0.

## External Demo

- Repository: `https://github.com/kevinmarmstrong/edgekit-demo-ecommerce`.
- COOP/COEP live demo: `https://edgekit-demo-ecommerce.pages.dev/`.
- GitHub Pages fallback/no-model reference: `https://kevinmarmstrong.github.io/edgekit-demo-ecommerce/`.
- Deploy evidence: GitHub Actions run `26595536108` passed build and deploy after Pages was enabled for workflow builds.
- The demo vendors packed tarballs for every Edgekit package while the scoped packages are not yet published to npm. This keeps the repo cloneable and avoids workspace alias assumptions.
- Live smoke verified the deployed ecommerce flow in no-model mode: the page loaded, catalog facts rendered, the sidecar accepted a prompt, and the fallback answer surfaced the requested Pegasus product facts.

The Cloudflare Pages mirror serves `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. Browser smoke on the deployed mirror reported `window.crossOriginIsolated === true`, one mounted `edge-chat`, and five catalog cards.

## Clone Proof

- A cold clone from GitHub completed `npm install && npm run typecheck && npm run build` in 4 seconds on this machine.
- `npm run dev` started locally and served the demo on port 5179.

## Friction Patches

- Fresh-app imports moved from deprecated root compatibility exports to sibling package imports.
- Fresh-app and clean-room harnesses now pack all publishable sibling packages, not only the original core/ui/react/cli set.
- The external demo vendors all Edgekit tarballs until npm publication is available; using only core/ui tarballs failed because sibling package dependencies were unresolved from npm.

## Follow-Ups

- Switch external demos from vendored tarballs to npm registry dependencies after the Phase I package publish.
- Collect external-developer cold-clone timings before publishing a time-to-value number.
- Keep public proof language concrete: checks passed and required failures, not "average score 1.0."
