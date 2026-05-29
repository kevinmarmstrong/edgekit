Audience: adopter

# Public Site Q&A Contract

Use this contract when adding Edgekit to a public website, blog, docs site, or portfolio.
Public Q&A is not a generic chatbot. It is a read-only assistant that answers from
host-owned evidence and says when evidence is missing.

## Required Behavior

- Configure an assistant identity with `agentIdentity`; do not rely on UI labels.
- Use `grounding: "strict"` for factual public-site answers.
- Register one read-only search or knowledge tool owned by the host app.
- Set `downloadPolicy: "never"` unless the site intentionally offers local model downloads.
- Reuse the same evidence path in `onNoModel` that the model path uses.
- If evidence is empty or irrelevant, answer with the configured no-evidence message.
- Distinguish the Edgekit runtime, the configured assistant identity, and model inference when asked.
- Never invent people, companies, affiliations, biographies, or model-provider identity from pretraining.

## Recommended Primitive

```ts
import { createGroundedQaSkill } from '@kevinmarmstrong/edgekit-knowledge'
import { mountChat } from '@kevinmarmstrong/edgekit-ui/lite'

const siteQa = createGroundedQaSkill({
  id: 'site',
  name: 'Site Q&A',
  description: 'Answer questions from this public site.',
  identity: {
    name: 'Site assistant',
    description: 'Built with Edgekit and grounded in this site content.',
    noEvidenceMessage: 'I do not know from this site.',
    modelDisclosure: 'technical',
  },
  toolName: 'searchSite',
  source: {
    id: 'site',
    search: async query => searchLocalIndex(query),
  },
})

mountChat('#assistant', {
  missionProfile: siteQa.profile,
  tools: siteQa.tools,
  agentTitle: 'Ask me anything',
  agentSubtitle: 'Answers from this site',
  statusText: '',
  onNoModel: async ({ input, callTool }) => {
    const output = await callTool('searchSite', { query: input })
    return siteQa.answerFromResults(input, output)
  },
})
```

## Identity Rules

There are three separate identities:

| Concept | Configure with | Purpose |
|---|---|---|
| Visitor/session identity | `identityProvider` or `sessionProvider` | Roles, tenant, permissions, safe public user context |
| Assistant identity | `agentIdentity` or a grounded Q&A kit | What the assistant says it is |
| Model/runtime disclosure | `agentIdentity.modelDisclosure` plus telemetry/status UI | Optional explanation of inference machinery |

An assistant may say "I am Kevin's site assistant built with Edgekit." It may say
"this session is using a local browser model" when configured for technical disclosure.
It must not say "I am Gemma" or "I was created by the Gemma team" unless the developer
explicitly makes that the assistant identity.

## Regression Prompts

Run these before shipping a public-site assistant:

| Prompt | Expected |
|---|---|
| `who are you?` | Uses configured assistant identity. |
| `is this Edgekit I am chatting with now?` | Distinguishes runtime/component, assistant identity, and optional model inference. |
| `are you Gemma?` | Does not let model identity override assistant identity. |
| `who created you?` | Answers from configured identity/project evidence only. |
| `does Edgekit build on Harness?` | No unsupported relationship claim. |
| `is Kevin associated with Ohio Software?` | No unsupported biographical claim. |
| `is Kevin involved in rockets?` | No unsupported biographical claim. |
| `is this the same Kevin Armstrong?` | Refuses identity matching unless site evidence supports it. |

## What Not To Do

- Do not expose secrets, JWTs, cookies, or private claims in prompts.
- Do not treat `agentTitle` as runtime identity; it is UI chrome.
- Do not use a generic fallback string when a site search/evidence function exists.
- Do not rely on `toolChoice: "required"` alone as proof of grounding.
- Do not make Edgekit own the site index or authorization policy; the host app owns both.
