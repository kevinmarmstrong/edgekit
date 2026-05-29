Audience: adopter

# Edgekit

**Add an AI agent to your existing web app without rewriting the app.**

Edgekit is an open-source browser-native agent runtime. It lets an agent call the APIs and functions your app already owns while state, auth, permissions, persistence, business logic, and final execution stay with the host app.

The useful path is retrofit: pick one workflow, expose a few governed tools, gate risky actions with approval, and measure whether the user-visible answer and UI preserve the facts returned by those tools.

## Quick Start

Install into an existing site or app:

```bash
npm install @kevinmarmstrong/edgekit @kevinmarmstrong/edgekit-ui @kevinmarmstrong/edgekit-skills @kevinmarmstrong/edgekit-knowledge zod
```

Try the packed-package demos when you want a complete reference app:

- [External ecommerce quickstart](https://github.com/kevinmarmstrong/edgekit-demo-ecommerce#quickstart)
- [COOP/COEP live demo](https://edgekit-demo-ecommerce.pages.dev/)
- [Docs site](https://kevinmarmstrong.github.io/edgekit/)

## Embed

```ts
import { createGroundedQaSkill } from '@kevinmarmstrong/edgekit-knowledge'
import { mountChat } from '@kevinmarmstrong/edgekit-ui/lite'

const siteQa = createGroundedQaSkill({
  id: 'site',
  name: 'Site Q&A',
  description: 'Answer questions from this public site.',
  toolName: 'searchSite',
  identity: {
    name: 'Site assistant',
    description: 'Built with Edgekit and grounded in this site content.',
    noEvidenceMessage: 'I do not know from this site.',
    modelDisclosure: 'technical',
  },
  source: { id: 'site', search: async query => searchLocalIndex(query) },
})

mountChat('#assistant', {
  missionProfile: siteQa.profile,
  tools: siteQa.tools,
  agentTitle: 'Ask me anything',
  agentSubtitle: 'Answers from this site',
  statusText: '',
  placeholder: 'Ask about this site',
  readyMessage: 'Hi. Ask me anything about this site.',
  onNoModel: async ({ input, callTool }) =>
    siteQa.answerFromResults(input, await callTool('searchSite', { query: input })),
})
```

Use the grounded Q&A path for public sites unless you are intentionally building a broader workflow assistant. It configures assistant identity, strict grounding, required evidence, and a no-model fallback over the same read-only source. Add Chrome AI, WebLLM, or a developer-owned cloud route when your app chooses to escalate.

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
- [Public site Q&A contract](./docs/adopter/PUBLIC-SITE-QA-CONTRACT.md)
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
