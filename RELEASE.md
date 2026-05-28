Audience: maintainer

# edgekit v0.3.0 release checklist

## Package names

The publishable package set is:

- `@kevinmarmstrong/edgekit`
- `@kevinmarmstrong/edgekit-skills`
- `@kevinmarmstrong/edgekit-knowledge`
- `@kevinmarmstrong/edgekit-governance`
- `@kevinmarmstrong/edgekit-mcp`
- `@kevinmarmstrong/edgekit-agui`
- `@kevinmarmstrong/edgekit-ui`
- `@kevinmarmstrong/edgekit-react`
- `@kevinmarmstrong/edgekit-cli`

The unscoped `edgekit` package name already exists on npm, so v0.3.0 uses the scoped packages above.

## Verified locally

- `pnpm pack:packages`
- `npm install && npm run typecheck && npm run build` in `edgekit-demo-admin`
- `npm install && npm run typecheck && npm run build` in `edgekit-demo-docs`
- Cloudflare Pages deploy for ecommerce, admin, and docs demos

## Before npm publish

This machine is not authenticated to npm (`npm whoami` returns `E401`). After logging in with an account that can publish to `@kevinmarmstrong`, publish in dependency order:

```bash
npm login
cd packages/core && npm publish --access public
cd ../skills && npm publish --access public
cd ../knowledge && npm publish --access public
cd ../governance && npm publish --access public
cd ../mcp && npm publish --access public
cd ../agui && npm publish --access public
cd ../ui && npm publish --access public
cd ../react && npm publish --access public
cd ../cli && npm publish --access public
```

After npm publish succeeds:

1. Replace vendored tarball dependencies in the three external demo repos with `^0.3.0`.
2. Run each demo's `npm install`, `npm run typecheck`, and `npm run build`.
3. Commit and push the demo dependency switch.
4. Create GitHub release `v0.3.0` from the shipped repo tag.

## Live demos

- Ecommerce: https://edgekit-demo-ecommerce.pages.dev/
- Docs Q&A: https://edgekit-demo-docs.pages.dev/
- SaaS admin: https://edgekit-demo-admin.pages.dev/

All three are external repos and currently install Edgekit from v0.3.0 packed tarballs until npm publication is complete.
