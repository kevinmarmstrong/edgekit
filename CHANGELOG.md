Audience: adopter

# Changelog

## Unreleased - Grounded Public Q&A

- Added `agentIdentity`, `grounding`, and `validateResponse` runtime options so public Q&A assistants can distinguish configured assistant identity from user/session identity and model/runtime disclosure.
- Added strict grounding behavior: required tool use by default, evidence tracking, buffered final answer emission, no-evidence replacement, and response validation before user-visible text is released.
- Enriched `onNoModel` with a scoped `callTool()` helper so public-site fallbacks can reuse the same read-only evidence path as model mode.
- Added `createGroundedQaSkill()` in `@kevinmarmstrong/edgekit-knowledge` for public-site/docs Q&A over host-owned evidence.
- Added `@kevinmarmstrong/edgekit/lite` and `@kevinmarmstrong/edgekit-ui/lite` subpaths for static public-site installs that do not want browser model provider imports by default.
- Added the Public Site Q&A contract, a coding-agent installer skill, and adoption scenarios for identity, grounding, and no-evidence regressions.

## v0.3.2 - First Website Install Followups

- Added first-class `<edge-chat>` labeling and theming hooks: `agent-title`, `agent-subtitle`, `status-text`, CSS custom properties, and `::part()` selectors for host-site styling.
- Expanded `mountChat()` so vanilla sites can apply a Mission Profile, register tools, configure fallback behavior, and set labels in one call.
- Made the default browser model providers lazy in the agent/readiness paths. A dedicated lightweight no-model entrypoint remains the follow-up for bundlers that inline dynamic imports.
- Updated the public quick start around npm install, `mountChat()`, and `downloadPolicy: "never"` fallback for existing websites.

## v0.3.1 - First Registry-Installable Release

- Republished the v0.3 package set with pnpm's publish path so workspace package links resolve to registry-safe `^0.3.1` ranges for npm consumers.
- Supersedes `0.3.0`, whose package tarballs were published with unresolved `workspace:^` dependency specs and should not be used for new installs.

## v0.3.0 - v3.5 Refactor In Progress

- Extracted optional runtime cohorts into sibling packages: `@kevinmarmstrong/edgekit-skills`, `@kevinmarmstrong/edgekit-knowledge`, `@kevinmarmstrong/edgekit-governance`, `@kevinmarmstrong/edgekit-mcp`, and `@kevinmarmstrong/edgekit-agui`.
- Split core into focused modules with a re-export-only root index.
- Deprecated root compatibility exports for moved sibling APIs. Prefer importing from the sibling packages directly.
- Phase D removed the legacy root AG-UI SSE implementation. BREAKING in v0.3.0: the deprecated root `createAgUiAgent` export now supports custom `run` handlers only; import from `@kevinmarmstrong/edgekit-agui` for the `@ag-ui/client` endpoint transport. The root compatibility export is scheduled for removal in v0.4.
- Phase D replaced the core hand-rolled tool-repair retry loop with AI SDK `experimental_repairToolCall` and ratcheted the core banned-pattern detector to zero.
- Phase E proved the packed-package adopter path: all nine publishable packages install from tarballs in a fresh app, the clean-room adoption harness passes with 0 required failures, and the external ecommerce demo is live at `https://edgekit-demo-ecommerce.pages.dev/` with GitHub Pages retained as a fallback/no-model reference.
- Phase F retired the site-owned ecommerce runtime in favor of the external packed-package demo and fixed approval continuations: approval responses now carry the original `toolCall` so approved mutations resolve and execute against the same originating call shape. Custom approval UIs should treat `toolCall` as the source of truth for the approved or rejected call.
- Phase G started the adopter-facing marketing reshape: the landing hero now leads with the existing-app promise, a copyable embed snippet, a live-demo GIF, and CTAs to the external quickstart, GitHub repo, and COOP/COEP ecommerce demo.
- Phase H added the quality-bar layer: randomized ecommerce/docs prompts, optional external LLM judging, six-row provider matrix defaults, v3.5 constraint CI, and an `UPGRADE.md` template with a v0.3 worked example.
- Deprecated DEFER exports are not part of the v0.3 public API contract and are scheduled for removal in v0.4 or the next planned breaking release.
