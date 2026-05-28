Audience: maintainer

# Phase I Release Proof

Phase I prepares the v0.3.0 release, pushes external demos, and records the one remaining external blocker.

## Completed

- Bumped the root package and all nine publishable packages to `0.3.0`.
- Updated fresh-app and clean-room adoption scripts to derive tarball names from package manifests instead of hardcoding `0.1.0`.
- Packed all nine packages with `pnpm pack:packages`; tarballs were written to `research-results/package-smoke/packs/*-0.3.0.tgz`.
- Ran `npm publish --dry-run --access public --json` from each publishable package directory; all nine reported `@kevinmarmstrong/*@0.3.0` tarballs with the expected package names.
- Created, verified, committed, and pushed:
  - `https://github.com/kevinmarmstrong/edgekit-demo-admin`
  - `https://github.com/kevinmarmstrong/edgekit-demo-docs`
- Updated, verified, committed, pushed, and redeployed `https://github.com/kevinmarmstrong/edgekit-demo-ecommerce` to v0.3.0 tarballs.
- Deployed live Cloudflare Pages demos:
  - `https://edgekit-demo-admin.pages.dev/`
  - `https://edgekit-demo-docs.pages.dev/`
- Added `.github/ISSUE_TEMPLATE/adopter-friction.yml` for real adopter bounce reports.
- Updated `RELEASE.md` with the nine-package publish order and npm-auth blocker.

## Live Smoke

- Admin demo canonical URL returned `HTTP/2 200` and COOP/COEP headers:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp`
- Docs demo canonical URL returned `HTTP/2 200` and the same COOP/COEP headers.
- Both demos install from vendored v0.3.0 packed tarballs until npm publication is complete.

## Blocker

`npm whoami` returns `E401 Unauthorized` on this machine. The npm package publication step requires an authenticated npm session with permission to publish the `@kevinmarmstrong` scope.

Once authenticated, publish in the order listed in `RELEASE.md`, then switch the external demos from vendored tarballs to normal `^0.3.0` registry dependencies.
