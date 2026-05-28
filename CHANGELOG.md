# Changelog

## v0.3.0 - v3.5 Refactor In Progress

- Extracted optional runtime cohorts into sibling packages: `@kevinmarmstrong/edgekit-skills`, `@kevinmarmstrong/edgekit-knowledge`, `@kevinmarmstrong/edgekit-governance`, `@kevinmarmstrong/edgekit-mcp`, and `@kevinmarmstrong/edgekit-agui`.
- Split core into focused modules with a re-export-only root index.
- Deprecated root compatibility exports for moved sibling APIs. Prefer importing from the sibling packages directly.
- Phase D removed the legacy root AG-UI SSE implementation. BREAKING in v0.3.0: the deprecated root `createAgUiAgent` export now supports custom `run` handlers only; import from `@kevinmarmstrong/edgekit-agui` for the `@ag-ui/client` endpoint transport. The root compatibility export is scheduled for removal in v0.4.
- Phase D replaced the core hand-rolled tool-repair retry loop with AI SDK `experimental_repairToolCall` and ratcheted the core banned-pattern detector to zero.
- Phase E proved the packed-package adopter path: all nine publishable packages install from tarballs in a fresh app, the clean-room adoption harness passes with 0 required failures, and the external ecommerce demo is live at `https://edgekit-demo-ecommerce.pages.dev/` with GitHub Pages retained as a fallback/no-model reference.
- Phase F retired the site-owned ecommerce runtime in favor of the external packed-package demo and fixed approval continuations: approval responses now carry the original `toolCall` so approved mutations resolve and execute against the same originating call shape. Custom approval UIs should treat `toolCall` as the source of truth for the approved or rejected call.
- Phase G started the adopter-facing marketing reshape: the landing hero now leads with the existing-app promise, a copyable embed snippet, a live-demo GIF, and CTAs to the external quickstart, GitHub repo, and COOP/COEP ecommerce demo.
- Deprecated DEFER exports are not part of the v0.3 public API contract and are scheduled for removal in v0.4 or the next planned breaking release.
