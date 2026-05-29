Audience: adopter

# Edgekit

**Add an AI agent to your existing web app without rewriting the app.**

Edgekit is an open-source browser-native agent runtime. It lets an agent call the APIs and functions your app already owns while state, auth, permissions, persistence, business logic, and final execution stay with the host app.

The useful path is retrofit: pick one workflow, expose a few governed tools, gate risky actions with approval, and measure whether the user-visible answer and UI preserve the facts returned by those tools.

## Quick Start

Try the packed-package demo first:

- [External ecommerce quickstart](https://github.com/kevinmarmstrong/edgekit-demo-ecommerce#quickstart)
- [COOP/COEP live demo](https://edgekit-demo-ecommerce.pages.dev/)
- [Docs site](https://kevinmarmstrong.github.io/edgekit/)

Run this repo locally:

```bash
pnpm install
pnpm build
pnpm dev:ecommerce
```

Open `http://127.0.0.1:5173`.

## Embed

```html
<edge-chat id="agent"></edge-chat>
```

```ts
import '@kevinmarmstrong/edgekit-ui'
import { chromeAI, tool, webLLM } from '@kevinmarmstrong/edgekit'
import { z } from 'zod'

const searchProducts = tool({
  description: 'Search the product catalog',
  inputSchema: z.object({ query: z.string() }),
  execute: ({ query }) => fetch(`/api/products?q=${encodeURIComponent(query)}`).then(res => res.json()),
})

agent.configure({
  model: [chromeAI(), webLLM(), appCloudRoute],
  toolChoice: 'required',
})
agent.registerTools({ searchProducts, addToCart })
```

Use local providers first. Add a developer-owned cloud route only when your app chooses to escalate.

## Production Shape

- **Skills** describe app capabilities, examples, approval policy, synthesis expectations, and UI hints.
- **Mission Profiles** assemble Skills and defaults for one localized workflow.
- **Tools** stay executable, app-owned functions.
- **Approvals and audit** make risky mutations visible.
- **Telemetry** lets teams observe model choice, tools, approvals, views, and errors.
- **Cascade readiness** explains Chrome AI, WebLLM, server, and no-model states before the UI promises a full agent.

## Packages

- `@kevinmarmstrong/edgekit`: core agent runtime, model cascade, tools, context, telemetry.
- `@kevinmarmstrong/edgekit-ui`: Lit `<edge-chat>` component and EdgeView renderer.
- `@kevinmarmstrong/edgekit-react`: React controller and `<EdgeChat />` wrapper.
- `@kevinmarmstrong/edgekit-skills`: Skills and Mission Profiles.
- `@kevinmarmstrong/edgekit-knowledge`: Knowledge Access and Markdown memory.
- `@kevinmarmstrong/edgekit-governance`: audit, policy, redaction, offline mutation journals.
- `@kevinmarmstrong/edgekit-agui`: AG-UI client adapter.
- `@kevinmarmstrong/edgekit-mcp`: safe MCP catalog adapters.
- `@kevinmarmstrong/edgekit-cli`: docs indexing utility.

## Docs

- [Agent Adoption Kit](./docs/adopter/AGENT-ADOPTION-KIT.md)
- [30-minute workflow](./docs/adopter/30-MINUTE-PRODUCTION-SIDECAR.md)
- [Getting started for real apps](./docs/adopter/GETTING-STARTED-REAL-APPS.md)
- [Production recipes](./docs/adopter/PRODUCTION-RECIPES.md)
- [Runtime guarantees](./docs/adopter/RUNTIME-GUARANTEES.md)
- [Reproducibility](./lab/proofs/REPRODUCIBILITY.md)
- [Migration and upgrades](./docs/adopter/MIGRATION-AND-UPGRADES.md)
- [Upgrade template and v0.3 worked example](./docs/adopter/UPGRADE.md)
- [Architecture](./ARCHITECTURE.md)

## Agent-Readable Docs

If a coding agent starts from the public site instead of this repo, point it at:

- `https://kevinmarmstrong.github.io/edgekit/llms.txt`
- `https://kevinmarmstrong.github.io/edgekit/docs/adoption-kit.md`
- `https://kevinmarmstrong.github.io/edgekit/llms-full.txt`
- `https://github.com/kevinmarmstrong/edgekit/tree/main/docs/agent-skills`

## Release Checks

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm test:e2e
pnpm eval:adoption
pnpm research:suite
pnpm research:quality
```

`pnpm research:suite` is deterministic regression and outcome coverage. Provider claims need separate evidence lanes for Chrome AI ready/downloading, WebLLM auto/declined, developer-owned server route, and no-model fallback. Keep those results in `research-results/provider-matrix.md`.
