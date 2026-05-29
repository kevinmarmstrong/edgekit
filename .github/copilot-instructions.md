Audience: contributor

# edgekit coding instructions

Read `AGENTS.md` before changing this repo. Edgekit is a browser-native agent sidecar with configurable adapters, not a hosted chatbot platform.

For public-site discovery, start at `https://kevinmarmstrong.github.io/edgekit/llms.txt`, then `/docs/adoption-kit.md`, then `/llms-full.txt`. Use `docs/agent-skills/*/SKILL.md` for implementation procedure.

Prefer reusable primitives in `packages/core`, framework-neutral rendering in `packages/ui`, and direct sibling-package imports for v0.3.1 domains: `edgekit-skills`, `edgekit-knowledge`, `edgekit-governance`, `edgekit-agui`, `edgekit-mcp`, `edgekit-react`, and `edgekit-cli`. Run `pnpm test`, `pnpm typecheck`, `pnpm build`, and relevant Playwright tests before proposing release changes.
