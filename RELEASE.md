# edgekit public release checklist

## Current package names

The unscoped `edgekit` package name already exists on npm (`0.1.6` as of May 23, 2026), so this repo is configured to publish:

- `@kevinmarmstrong/edgekit`
- `@kevinmarmstrong/edgekit-ui`
- `@kevinmarmstrong/edgekit-cli`

Both scoped names returned 404 from npm registry lookup, which means they are not currently published or visible.

## Verified locally

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test:e2e`
- `npm pack --dry-run` in `packages/core`
- `npm pack --dry-run` in `packages/ui`
- `npm pack --dry-run` in `packages/cli`

## Before publishing

1. Confirm npm account access to the `@kevinmarmstrong` scope.
2. Confirm whether the public import should remain scoped or whether you own/want to acquire the unscoped `edgekit` name.
3. Test a browser with WebGPU or Chrome AI manually against `pnpm dev:ecommerce` so the real model path is verified, not only the no-model fallback.
4. Publish core first, then UI, then CLI:

```bash
cd packages/core
npm publish --access public

cd ../ui
npm publish --access public

cd ../cli
npm publish --access public
```

5. Create a GitHub release after the npm publish succeeds.

## Known release note

The ecommerce demo production build includes a large lazy WebLLM chunk. The publishable `@kevinmarmstrong/edgekit-ui` package stays small; the demo chunk is expected because it bundles the browser model provider for local use.
