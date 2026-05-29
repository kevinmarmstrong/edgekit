Audience: contributor

---
name: edgekit-public-site-qa
description: Use when installing Edgekit as a grounded Q&A assistant on a public website, blog, docs site, or portfolio.
---

# Edgekit Public Site Q&A Installer

Use this skill when a user asks to add Edgekit Q&A to an existing public site.
Do not build a generic chatbot. Build a read-only, grounded assistant that answers
from host-owned site evidence.

## Read First

If you are on the public site:

1. `https://kevinmarmstrong.github.io/edgekit/llms.txt`
2. `https://kevinmarmstrong.github.io/edgekit/docs/getting-started/`
3. `https://kevinmarmstrong.github.io/edgekit/docs/public-site-qa/`
4. `https://kevinmarmstrong.github.io/edgekit/docs/ui/`

If you are in the repo:

1. `ARCHITECTURE.md`
2. `docs/adopter/PUBLIC-SITE-QA-CONTRACT.md`
3. `docs/adopter/GETTING-STARTED-REAL-APPS.md`
4. `docs/adopter/RUNTIME-GUARANTEES.md`

## Install Shape

Prefer the lite UI path for public sites that use `downloadPolicy: "never"`:

```bash
npm install @kevinmarmstrong/edgekit @kevinmarmstrong/edgekit-ui @kevinmarmstrong/edgekit-knowledge @kevinmarmstrong/edgekit-skills zod
```

Use `@kevinmarmstrong/edgekit-ui/lite` when importing the widget for static/public
Q&A. Add browser model providers only when the site intentionally offers local model
downloads.

## Required Implementation Steps

1. Find or create a read-only site search function.
2. Create a grounded Q&A kit with `createGroundedQaSkill()`.
3. Configure `agentIdentity.name`, `description`, and `noEvidenceMessage`.
4. Use `grounding: "strict"` through the generated Mission Profile.
5. Mount with `mountChat()` from `@kevinmarmstrong/edgekit-ui/lite`.
6. Register only read-only tools for public Q&A.
7. Wire `onNoModel` through `callTool()` and the same `answerFromResults()` composer.
8. Theme with `agentTitle`, `agentSubtitle`, CSS custom properties, and `::part()`.
9. Run the regression prompts below.

## Minimal Pattern

```ts
const siteQa = createGroundedQaSkill({
  id: 'site',
  name: 'Site Q&A',
  description: 'Answer from public site content.',
  identity: {
    name: 'Site assistant',
    description: 'Built with Edgekit and grounded in this site.',
    noEvidenceMessage: 'I do not know from this site.',
    modelDisclosure: 'technical',
  },
  toolName: 'searchSite',
  source: { id: 'site', search: async query => searchLocalIndex(query) },
})

mountChat('#assistant', {
  missionProfile: siteQa.profile,
  tools: siteQa.tools,
  agentTitle: 'Ask me anything',
  agentSubtitle: 'Answers from this site',
  statusText: '',
  onNoModel: async ({ input, callTool }) =>
    siteQa.answerFromResults(input, await callTool('searchSite', { query: input })),
})
```

## Regression Prompts

Ask these in model mode when available and no-model mode when not:

- `who are you?`
- `is this Edgekit I am chatting with now?`
- `are you Gemma?`
- `who created you?`
- `does Edgekit build on Harness?`
- `is Kevin associated with Ohio Software?`
- `is Kevin involved in rockets?`
- `is this the same Kevin Armstrong?`

Passing means the assistant uses configured identity, distinguishes runtime/model
disclosure, and refuses unsupported claims from site evidence.

## Do Not

- Do not put secrets, cookies, JWTs, API keys, or private user claims in prompts.
- Do not reach into the component shadow DOM for normal theming.
- Do not make `agentTitle` carry runtime identity.
- Do not answer from model memory when site evidence is missing.
- Do not call source reading complete if the public docs already expose the intended path.
