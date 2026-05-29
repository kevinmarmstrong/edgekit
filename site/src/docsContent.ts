export type DocsPage = {
  slug: string
  title: string
  summary: string
  navLabel: string
  sections: DocsSection[]
}

export type DocsSection = {
  id: string
  title: string
  body: string[]
  bullets?: string[]
  diagram?:
    | 'outcome-hierarchy'
    | 'transformation'
    | 'thesis-bridge'
    | 'worker-tool'
    | 'local-cascade'
    | 'architecture'
    | 'runtime-loop'
  code?: {
    language: string
    text: string
  }
}

export const docsPages: DocsPage[] = [
  {
    slug: 'overview',
    navLabel: 'Overview',
    title: 'Agent-operable software',
    summary:
      'Edgekit helps teams add agents to existing web apps without rewriting the software, surrendering app authority, or turning every prompt into cloud spend.',
    sections: [
      {
        id: 'first-principles',
        title: 'Start with the hunger',
        body: [
          'Teams do not wake up needing a sidecar. They need agents to do real work inside software: search records, compare options, fill forms, guide users, request changes, and move workflows forward.',
          'The blockers are familiar: existing apps are hard to rewrite, broad app context is sensitive, cloud-agent costs can become unpredictable, and mutations need permissions, approvals, audit, and backend authorization. Edgekit starts from those outcomes before it introduces architecture.',
        ],
        diagram: 'outcome-hierarchy',
        bullets: [
          'Add agentic workflows to existing apps without a rewrite.',
          'Keep state, auth, permissions, business logic, and persistence in the host app.',
          'Run routine user-delegated work locally when browser models are available.',
          'Escalate heavy or risky reasoning only through explicit developer-owned routes.',
          'Gate important mutations with approvals, telemetry, audit, and backend policy.',
          'Package behavior as Skills and Mission Profiles so the agent layer can evolve without destabilizing the app.',
        ],
      },
      {
        id: 'transformation',
        title: 'The transformation',
        body: [
          'For decades, software moved work to the edge: customers, employees, vendors, and operators became the people entering data, searching portals, and moving work between systems. Agents can become the worker at that edge.',
          'That does not mean the model becomes the enterprise system. The app remains the system of record. The agent operates it through explicit, governed tools.',
        ],
        diagram: 'transformation',
      },
      {
        id: 'adoption-bridge',
        title: 'The adoption bridge',
        body: [
          'The practical path is not one-size-fits-all. Existing products use Edgekit to retrofit one workflow at a time. New products use the same boundary from day one so their APIs, permissions, and workflow surfaces are ready for agents to operate.',
          'Both paths lead to the same architecture: the app is the durable tool, the agent is the worker, and Edgekit is the governed runtime between them.',
        ],
        diagram: 'thesis-bridge',
      },
      {
        id: 'worker-tool',
        title: 'Separate the worker from the tool',
        body: [
          'The software tool and the agent worker have different lifecycles. The tool needs durable state, stable APIs, predictable releases, audit, compliance, and tests. The worker changes quickly as models, prompts, Skills, providers, routing, and UX patterns improve.',
          'Edgekit creates the boundary between those lifecycles. The agent can improve without forcing the app to be rewritten, and the app can remain authoritative without freezing the agent layer.',
        ],
        diagram: 'worker-tool',
      },
      {
        id: 'local-first',
        title: 'Local-first by role, not ideology',
        body: [
          'Not every AI task is deep reasoning. Much of the work looks like what a user already does in software: read enough context, search the right record, fill a form, ask for approval, and submit through the normal app path.',
          'Browser-local models are becoming good enough for a large share of that bounded worker role. Heavy analysis, high-risk synthesis, long planning, or regulated decisions can still route to a developer-owned cloud worker when the app chooses.',
        ],
        diagram: 'local-cascade',
      },
      {
        id: 'architecture-diagram',
        title: 'Implementation boundary',
        body: [
          'The implementation boundary follows the thesis. Edgekit owns the embeddable runtime and UX contracts. The host app owns data, auth, state, business logic, persistence, and all executable tools.',
        ],
        diagram: 'architecture',
      },
      {
        id: 'runtime-loop-diagram',
        title: 'Runtime loop',
        body: [
          'A turn is a bounded loop: hydrate safe app context, route to a provider, call app-owned tools, gate risky mutations, render results, and emit telemetry/audit evidence.',
        ],
        diagram: 'runtime-loop',
      },
      {
        id: 'repo-map',
        title: 'Repository map',
        body: ['The open source repo is organized as a small monorepo.'],
        bullets: [
          '`packages/core`: model cascade, provider helpers, agent event stream, approval resume.',
          '`packages/ui`: Lit web component, approval prompts, download prompts, EdgeView renderer, and chat shell.',
          '`packages/react`: React controller and EdgeChat wrapper.',
          '`packages/skills`: Skills and Mission Profiles.',
          '`packages/knowledge`: Knowledge Access tools and Markdown memory.',
          '`packages/governance`: audit trails, redaction, policy execution, and offline mutation journals.',
          '`packages/agui`: AG-UI endpoint/run adapter backed by @ag-ui/client.',
          '`packages/mcp`: safe MCP catalog adapters.',
          '`packages/cli`: documentation indexing utility and recipe scaffolding entrypoint.',
          '`examples/ecommerce`: standalone app retrofit demo.',
          '`site`: GitHub Pages docs plus remaining internal demo previews while ecommerce/docs/admin live in external repos.',
          '`tests/e2e`: Playwright coverage for embedded agent workflows.',
        ],
      },
      {
        id: 'mental-model',
        title: 'Mental model',
        body: [
          'Think of edgekit as the agent runtime that lets a worker operate your software tool. Your app keeps ownership of state, authorization, API boundaries, and UI context. Edgekit owns the conversation loop, provider selection, tool-call events, approval prompts, and graceful fallback when local AI is unavailable.',
        ],
      },
    ],
  },
  {
    slug: 'should-i-use-edgekit',
    navLabel: 'Use Edgekit?',
    title: 'Should I use Edgekit?',
    summary: 'A decision matrix for teams evaluating whether embeddable local-first agent workflows fit their product.',
    sections: [
      {
        id: 'best-fit',
        title: 'Best fit',
        body: [
          'Use Edgekit when the agent belongs inside an existing product surface and needs to call app-owned tools, show approval prompts, preserve host-app authority, and prefer browser-local models before explicit fallback routes.',
        ],
        bullets: [
          'You have real app capabilities to expose: search, retrieve, compare, fill, create, update, cancel, or escalate.',
          'Users benefit from context-aware help inside the current workflow instead of leaving for a separate chatbot.',
          'The app must keep ownership of auth, tenant policy, state, persistence, and mutation execution.',
          'Local-first privacy, latency, cost control, or offline behavior is a meaningful product requirement.',
          'Risky actions need visible approvals, telemetry, and audit evidence.',
        ],
      },
      {
        id: 'decision-matrix',
        title: 'Decision matrix',
        body: ['Use this table as the first architectural filter.'],
        bullets: [
          'Choose Edgekit: embedded agent workflow, app-owned tools, browser model cascade, Mission Profiles, approvals, telemetry, and framework-neutral UI.',
          'Choose a hosted chatbot: broad website Q&A, no app mutations, no need for local inference, and minimal product integration.',
          'Choose only AG-UI or a backend agent: an existing server agent already owns reasoning and Edgekit is only needed if you want the in-app renderer and EdgeView contract.',
          'Wait or prototype first: no clear mission, no app-owned tool surface, no outcome tests, or no owner for provider fallback policy.',
        ],
      },
      {
        id: 'red-flags',
        title: 'Red flags',
        body: [
          'Edgekit is the wrong abstraction if the agent would become the source of truth for business logic, secrets, or authorization. Keep those in the host app.',
        ],
        bullets: [
          'The plan requires putting API keys, JWTs, cookies, or privileged claims into prompts.',
          'The agent would execute broad filesystem, database, or MCP tools directly from the browser.',
          'The first use case is a generic assistant with no narrow mission or measurable success criteria.',
          'Mutations are non-idempotent but have no approval, conflict, rollback, or audit story.',
        ],
      },
      {
        id: 'first-proof',
        title: 'First proof',
        body: [
          'A good evaluation starts with one narrow Mission Profile, two or three Skills, one read-only tool, one approval-gated mutation, and scenarios that inspect the final visible answer plus resulting app state.',
        ],
      },
    ],
  },
  {
    slug: 'proof-center',
    navLabel: 'Proof Center',
    title: 'Proof Center',
    summary: 'Evidence an adopter should ask for before trusting an Edgekit agent workflow in a real app.',
    sections: [
      {
        id: 'proof-levels',
        title: 'Proof levels',
        body: [
          'Proof should name the architecture that was exercised. A deterministic CI run, a real local-model run, a cloud-route run, and a live public-site run answer different questions.',
        ],
        bullets: [
          'Contract proof: unit, type, build, route, and deterministic workflow tests pass.',
          'Outcome proof: scenarios verify final answer quality, generated UI, approvals, state, telemetry, and safety.',
          'Provider proof: Chrome AI, WebLLM, cloud route, and no-model fallback are each reported with pass, fail, or skip reasons.',
          'Adoption proof: a fresh app or recipe can integrate packages, validate a Mission Profile, and pass first-serious scenarios.',
          'Live proof: deployed docs and demos disclose provider mode and still satisfy the relevant outcome checks.',
        ],
      },
      {
        id: 'evidence-artifacts',
        title: 'Evidence artifacts',
        body: ['Keep proof inspectable and repeatable.'],
        bullets: [
          '`research-results/agent-suite.json` and `.md` for scored outcome runs.',
          '`research-results/adoption-quality.*` for docs Q&A and site assistant transcripts.',
          '`research-results/provider-matrix.md` for provider-lane pass, fail, and skip reasons.',
          '`research-results/adopter-simulations/latest.md` for clean-room adoption timing and friction.',
          'Screenshots, transcript snippets, commit SHA, target URL, browser version, provider mode, and strictness flags.',
        ],
      },
      {
        id: 'release-gates',
        title: 'Release gates',
        body: ['Before a public release, run the full gates when feasible and report any environmental skips honestly.'],
        code: {
          language: 'bash',
          text: 'pnpm test\npnpm typecheck\npnpm build\npnpm test:e2e\npnpm eval:adoption\npnpm research:agents\npnpm research:suite',
        },
      },
      {
        id: 'what-green-means',
        title: 'What green means',
        body: [
          'A green run proves only the lane it exercised. It does not prove every browser has a downloaded model, every enterprise policy allows local AI, or every host app has correct backend authorization.',
          'For production decisions, pair Edgekit proof with the consuming app security review, backend authorization tests, and tenant-specific compliance requirements.',
        ],
      },
    ],
  },
  {
    slug: 'enterprise-evaluation',
    navLabel: 'Enterprise Eval',
    title: 'Enterprise evaluation',
    summary: 'A practical checklist for security, compliance, platform, and product leaders evaluating Edgekit.',
    sections: [
      {
        id: 'questions',
        title: 'Evaluation questions',
        body: ['Enterprise evaluation should start with boundaries, not demos.'],
        bullets: [
          'What data enters prompts, memory, telemetry, audit logs, handoff envelopes, and tool outputs?',
          'Which tools are read-only, which mutate state, and which require approval?',
          'Where do provider secrets live, and when does work escalate from local models to developer-owned cloud routes?',
          'How are identity, tenant, roles, and permissions passed into tool execution without leaking secret claims?',
          'What proof exists for no-model fallback, offline queues, redaction, audit trails, and failure handling?',
        ],
      },
      {
        id: 'security-review',
        title: 'Security review',
        body: [
          'Edgekit should inherit the host app authorization model. The agent can request a tool call, but the executable tool and backend policy decide whether the current user may perform it.',
        ],
        bullets: [
          'Keep JWTs, cookies, API keys, and privileged claims out of prompts and state summaries.',
          'Use RBAC-filtered tool manifests and backend authorization for each executable tool.',
          'Use `needsApproval` plus audit entries for state, money, account, inventory, or regulated-data mutations.',
          'Redact sensitive tool results before UI, telemetry, audit, memory, or cloud handoffs.',
          'Expose MCP through a least-privilege backend or proxy catalog, not direct browser stdio access.',
        ],
      },
      {
        id: 'platform-fit',
        title: 'Platform fit',
        body: [
          'Browser-native agents depend on the user environment. An enterprise rollout should decide what happens when Chrome AI is unavailable, WebLLM headers are missing, downloads are blocked, or cloud fallback is disallowed.',
        ],
        bullets: [
          'Public sites usually use `downloadPolicy: "never"` plus transparent basic mode.',
          'Internal apps may use `downloadPolicy: "prompt"` when local model download consent is acceptable.',
          'Strict environments can hide the agent UI or route only through approved app-owned providers.',
          'Telemetry should record provider lane and fallback reason without storing sensitive prompt payloads.',
        ],
      },
      {
        id: 'pilot-plan',
        title: 'Pilot plan',
        body: [
          'Start with one workflow where the value is measurable and the risk can be bounded: support triage, knowledge access, catalog assistance, admin review, or intake qualification.',
        ],
        bullets: [
          'Define a Mission Profile and Skills before UI polish.',
          'Register only the app-owned tools needed for that mission.',
          'Add outcome scenarios for correct answers, approval, rejection, hostile prompts, no evidence, and no model.',
          'Review transcripts and audit events with security and product owners before expanding scope.',
        ],
      },
    ],
  },
  {
    slug: 'getting-started',
    navLabel: 'Quick Start',
    title: 'Quick start: build one agentic workflow',
    summary: 'Start with one outcome, expose app-owned tools, apply a Mission Profile, and prove the workflow works.',
    sections: [
      {
        id: 'mission-first',
        title: 'Start with the outcome',
        body: [
          'Do not start by writing a generic system prompt. Start by naming the work the user wants done: search a catalog, triage a case, create an intake request, update an account, or answer from a knowledge base.',
          'Then name one agent mission, the Skills it needs, the app-owned tools those Skills may call, and the facts the final visible answer must preserve.',
        ],
        bullets: [
          'Mission Profile: owns the localized instructions, defaults, required tools, and synthesis expectations.',
          'Skills: package discoverable capabilities such as catalog search, support ticket creation, or cited knowledge access.',
          'Tools: stay executable and authorized inside the host app.',
        ],
      },
      {
        id: 'install',
        title: 'Install for an existing site',
        body: [
          'For a public website, install the runtime packages directly from npm. Start with core, UI, Skills, and Knowledge so the first path is grounded public Q&A rather than a generic chatbot.',
          'Public visitors usually do not have a ready local model, so pair `downloadPolicy: "never"` with the lite UI import and an `onNoModel` fallback that calls the same read-only evidence tool as the model path.',
        ],
        code: {
          language: 'bash',
          text: 'npm install @kevinmarmstrong/edgekit @kevinmarmstrong/edgekit-ui @kevinmarmstrong/edgekit-skills @kevinmarmstrong/edgekit-knowledge zod',
        },
      },
      {
        id: 'embed',
        title: 'Embed the agent UI',
        body: [
          'Use `mountChat()` for the smallest vanilla JavaScript path. It creates `<edge-chat>`, applies the Mission Profile, registers tools, and configures fallback/model behavior in one call.',
          'The component exposes `agent-title`, `agent-subtitle`, `status-text`, CSS custom properties, and `::part()` hooks so the assistant can match the host site without shadow-DOM surgery.',
        ],
        code: {
          language: 'ts',
          text: `import { createGroundedQaSkill } from '@kevinmarmstrong/edgekit-knowledge'
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
  source: {
    id: 'site',
    search: async query => searchLocalIndex(query),
  },
})

mountChat('#assistant', {
  missionProfile: siteQa.profile,
  tools: siteQa.tools,
  placeholder: 'Ask about this site',
  readyMessage: 'Hi. Ask me anything about this site.',
  agentTitle: 'Ask me anything',
  agentSubtitle: 'Answers from this site',
  statusText: '',
  onNoModel: async ({ input, callTool }) =>
    siteQa.answerFromResults(input, await callTool('searchSite', { query: input })),
})`,
        },
      },
      {
        id: 'grounding',
        title: 'Why this is grounded',
        body: [
          '`createGroundedQaSkill()` creates a Mission Profile with `grounding: "strict"`, required tool use, a configured assistant identity, and a no-evidence answer. The model may help phrase answers, but the answer contract is evidence-first.',
          'The fallback path uses `callTool()` to call the same read-only evidence tool, so visitors without a local model get the same truth boundary instead of a separate keyword snippet path.',
        ],
        bullets: [
          'Assistant identity is configured with `agentIdentity`, not inferred from `agentTitle`.',
          'The assistant may disclose model/runtime mode only as inference machinery.',
          'If the site search cannot support a claim, the assistant must say so instead of using model memory.',
        ],
      },
      {
        id: 'profile',
        title: 'Create a Mission Profile',
        body: ['The profile is the artifact an adopter should review, version, and test. It declares the agent mission without taking ownership of executable app logic.'],
        code: {
          language: 'ts',
          text: `const catalogProfile = createMissionProfile({
  id: 'catalog-agent-v1',
  mission: 'catalog-help',
  version: '1.0.0',
  systemPrompt: 'You help shoppers answer catalog questions using registered app tools.',
  requiredTools: ['searchProducts'],
  defaults: { toolChoice: 'required', downloadPolicy: 'never' },
  synthesis: { requiredAttributes: ['product name', 'price', 'availability'] },
})`,
        },
      },
      {
        id: 'register-tools',
        title: 'Register a tool',
        body: ['Tools use the Vercel AI SDK `tool()` helper, so schemas and execution stay familiar. For vanilla sites, prefer `mountChat()` once the profile and tools are defined; for framework components, apply the profile and register the real host-app implementations when the element is ready.'],
        code: {
          language: 'ts',
          text: `import '@kevinmarmstrong/edgekit-ui'
import { modelOptional, tool } from '@kevinmarmstrong/edgekit'
import { z } from 'zod'

const searchProducts = tool({
  description: 'Search the product catalog.',
  inputSchema: z.object({
    query: z.string(),
    maxPrice: modelOptional(z.number()),
  }),
  execute: async ({ query, maxPrice }) => {
    const params = new URLSearchParams({ q: query })
    if (maxPrice) params.set('max_price', String(maxPrice))
    return fetch('/api/products?' + params).then(res => res.json())
  },
})

const chat = document.querySelector('edge-chat')
chat?.applyMissionProfile(catalogProfile)
chat?.registerTools({ searchProducts })`,
        },
      },
      {
        id: 'repo-demos',
        title: 'Run the repo demos',
        body: ['If you are working inside the Edgekit repo instead of installing it into an app, build packages and open the demos with the monorepo commands.'],
        code: {
          language: 'bash',
          text: 'pnpm install\npnpm build\npnpm dev:ecommerce',
        },
      },
      {
        id: 'knowledge-skill',
        title: 'Add knowledge as a Skill',
        body: [
          'When the agent needs docs, policy, manuals, graph relationships, account history, or another dynamic knowledge base, use a Knowledge Access Skill. Edgekit should not own the vector database, graph database, crawler, reranker, or document pipeline; the app or chosen retrieval library owns those.',
          'Wrap the source with `EdgeKnowledgeSource`, expose it through `createKnowledgeTool()` or `createKnowledgeSkill()`, compose it into the Mission Profile, and test that citations, freshness, and retrieved facts appear in the final visible answer.',
        ],
        code: {
          language: 'ts',
          text: `const knowledgeSkill = createKnowledgeSkill({
  id: 'support-policy',
  name: 'Support Policy Knowledge',
  description: 'Search support policy with citations and freshness labels.',
  source: policySource,
})`,
        },
      },
    ],
  },
  {
    slug: 'public-site-qa',
    navLabel: 'Public Site Q&A',
    title: 'Grounded public-site Q&A',
    summary: 'Install a read-only assistant that answers from site evidence, not model memory.',
    sections: [
      {
        id: 'contract',
        title: 'The contract',
        body: [
          'Public-site Q&A is not a generic chatbot. It is a read-only assistant with configured identity, strict grounding, a host-owned evidence tool, and a no-evidence answer when the site cannot support a claim.',
          'The model path and no-model fallback should use the same evidence source. `toolChoice: "required"` forces tool use, but strict grounding also constrains what the final answer may claim.',
        ],
        bullets: [
          'Configure assistant identity with `agentIdentity`, not only `agentTitle`.',
          'Use `grounding: "strict"` through the generated Mission Profile.',
          'Use a read-only site search or knowledge source as evidence.',
          'Return a fixed no-evidence answer instead of filling gaps from pretraining.',
        ],
      },
      {
        id: 'primitive',
        title: 'Use the grounded Q&A primitive',
        body: [
          '`createGroundedQaSkill()` packages the safe path: a Knowledge Skill, strict Mission Profile, configured identity, required evidence tool, and extractive fallback composer.',
          'For public sites with `downloadPolicy: "never"`, import the UI from `@kevinmarmstrong/edgekit-ui/lite` so the widget path does not imply browser-model downloads.',
        ],
        code: {
          language: 'ts',
          text: `const siteQa = createGroundedQaSkill({
  id: 'site',
  name: 'Site Q&A',
  description: 'Answer from this public site.',
  toolName: 'searchSite',
  identity: {
    name: 'Site assistant',
    description: 'Built with Edgekit and grounded in this site content.',
    noEvidenceMessage: 'I do not know from this site.',
    modelDisclosure: 'technical',
  },
  source: { id: 'site', search: async query => searchLocalIndex(query) },
})`,
        },
      },
      {
        id: 'identity',
        title: 'Identity and runtime disclosure',
        body: [
          'There are three separate identities: the visitor/session identity passed through `identityProvider`, the assistant identity configured with `agentIdentity`, and optional technical disclosure about the model/runtime.',
          'The assistant can say it is a site assistant built with Edgekit. It should not speak as Gemma, Chrome AI, or another provider unless the developer explicitly configured that persona.',
        ],
      },
      {
        id: 'regression-prompts',
        title: 'Regression prompts',
        body: [
          'Before shipping, ask the prompts that caught the real field failure. Passing means the assistant refuses unsupported claims and keeps identity stable in model and no-model modes.',
        ],
        bullets: [
          '`who are you?`',
          '`is this Edgekit I am chatting with now?`',
          '`are you Gemma?`',
          '`does Edgekit build on Harness?`',
          '`is Kevin associated with Ohio Software?`',
          '`is Kevin involved in rockets?`',
          '`is this the same Kevin Armstrong?`',
        ],
      },
    ],
  },
  {
    slug: '30-minute-sidecar',
    navLabel: '30-Minute Workflow',
    title: '30-minute agent workflow path',
    summary: 'A guided path from one narrow mission to a tested Skills-and-Profile agent workflow.',
    sections: [
      {
        id: 'mission',
        title: 'Pick one mission',
        body: [
          'Start with one narrow mission, not a generic assistant. Good first missions pair one read-only capability with one approval-gated mutation.',
        ],
      },
      {
        id: 'starter',
        title: 'Start from Skills and a Profile',
        body: [
          'Copy `docs/templates/mission-profile-starter/profile.ts`. It includes support case search, approval-gated ticket creation, two Skills, one Mission Profile, typed tools, and telemetry-ready wiring.',
          'Replace the executable `execute` functions with your app APIs. Keep the Skill descriptions, approval policy, and synthesis requirements explicit enough that another developer or coding agent can review them.',
        ],
      },
      {
        id: 'prove',
        title: 'Prove outcomes',
        body: [
          'Run the starter scenarios from `docs/templates/mission-profile-starter/harness-scenarios.json`. The workflow passes only when facts surface in the final answer, ticket creation requires approval, rejection preserves state, and no tool chatter leaks to the user.',
        ],
      },
    ],
  },
  {
    slug: 'framework-recipes',
    navLabel: 'Frameworks',
    title: 'Framework recipes',
    summary: 'First-pass integration recipes for Vite React, Next.js, Astro, Remix, Vue, and Svelte.',
    sections: [
      {
        id: 'shared-pattern',
        title: 'Shared pattern',
        body: [
          'Every framework recipe follows the same architecture: define Skills and a Mission Profile in app code, keep executable tools behind app-owned APIs or functions, mount `<edge-chat>` on the client, then apply the profile and register tools after the component is available.',
        ],
        bullets: [
          'Client boundary: the agent UI and browser model providers run in the browser.',
          'Server boundary: secrets, privileged retrieval, database writes, and provider keys stay in routes or server functions.',
          'Hydration boundary: pass only safe state summaries through `stateProvider`; never serialize tokens into prompts.',
          'Testing boundary: add at least one read scenario, one approval scenario, one rejection scenario, and one no-model/fallback scenario.',
        ],
      },
      {
        id: 'vite-react',
        title: 'Vite React',
        body: ['Use the React wrapper when you want JSX and hooks. It renders the underlying web component without requiring a custom JSX intrinsic declaration.'],
        code: {
          language: 'tsx',
          text: `import { EdgeChat } from '@kevinmarmstrong/edgekit-react'

export function EdgekitAgent() {
  return (
    <EdgeChat
      missionProfile={catalogProfile}
      placeholder="Ask about this workflow"
      onReady={chat => chat.registerTools?.({ searchProducts, addToCart })}
    />
  )
}`,
        },
      },
      {
        id: 'nextjs',
        title: 'Next.js',
        body: [
          'Create a client component with the React wrapper. Keep server-only secrets in Route Handlers or Server Actions, then expose narrow app-owned tools from the client to those routes.',
        ],
        code: {
          language: 'tsx',
          text: `'use client'

import { EdgeChat } from '@kevinmarmstrong/edgekit-react'

export function EdgekitClientAgent() {
  return (
    <EdgeChat
      missionProfile={supportProfile}
      placeholder="Search cases or draft a ticket"
      onReady={chat => chat.registerTools?.({ searchCases, createTicket })}
    />
  )
}`,
        },
      },
      {
        id: 'astro',
        title: 'Astro',
        body: [
          'Use a client-loaded component or a small script island. The existing recipe pairs an intake workflow with a Knowledge Access Skill and approval-gated submission.',
        ],
        code: {
          language: 'bash',
          text: 'edgekit-init mission --recipe astro-intake-knowledge --out src/edgekit/intake',
        },
      },
      {
        id: 'remix',
        title: 'Remix',
        body: [
          'Mount the agent UI in a client component and call Remix actions or resource routes from registered tools. Keep mutation authorization inside the action, not in the Mission Profile.',
        ],
        code: {
          language: 'ts',
          text: `const createTicket = tool({
  description: 'Create a support ticket after approval.',
  inputSchema: ticketSchema,
  needsApproval: true,
  execute: input =>
    fetch('/resources/edgekit/tickets', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then(res => res.json()),
})`,
        },
      },
      {
        id: 'vue',
        title: 'Vue',
        body: [
          'Until a dedicated Vue wrapper exists, use the web component directly and configure it in `onMounted`. The runtime contract is the same as React.',
        ],
        code: {
          language: 'vue',
          text: `<template>
  <edge-chat ref="chat" placeholder="Ask about this account" />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import '@kevinmarmstrong/edgekit-ui'

const chat = ref<any>()

onMounted(() => {
  chat.value?.applyMissionProfile(accountProfile)
  chat.value?.registerTools({ searchAccounts, requestPlanChange })
})
</script>`,
        },
      },
      {
        id: 'svelte',
        title: 'Svelte',
        body: [
          'Use the web component and configure it in `onMount`. Store any app state summary in a function passed to `stateProvider`, not as hidden DOM text.',
        ],
        code: {
          language: 'svelte',
          text: `<script lang="ts">
  import { onMount } from 'svelte'
  import '@kevinmarmstrong/edgekit-ui'

  let chat: any

  onMount(() => {
    chat.applyMissionProfile(orderProfile)
    chat.registerTools({ searchOrders, requestRefund })
  })
</script>

<edge-chat bind:this={chat} placeholder="Ask about this order" />`,
        },
      },
    ],
  },
  {
    slug: 'faq',
    navLabel: 'FAQ',
    title: 'FAQ',
    summary: 'Short answers for adopters comparing Edgekit with hosted agents, chat widgets, AG-UI, and framework-specific assistants.',
    sections: [
      {
        id: 'hosted-chatbot',
        title: 'Is Edgekit a hosted chatbot?',
        body: [
          'No. Edgekit is an embeddable browser-native agent runtime for app-owned workflows. The host app owns state, authorization, executable tools, provider fallback routes, and persistence.',
        ],
      },
      {
        id: 'local-first',
        title: 'Does it require Chrome AI?',
        body: [
          'No. Chrome AI is the preferred local-first path when available. Apps can also use WebLLM, explicit developer-provided cloud routes, AG-UI backends, or honest no-model fallback behavior.',
        ],
      },
      {
        id: 'secrets',
        title: 'Where do secrets go?',
        body: [
          'Secrets stay in the host app backend, server routes, or executable tool context. Do not put API keys, JWTs, cookies, privileged claims, or payment data into prompts, Mission Profiles, memory, or state summaries.',
        ],
      },
      {
        id: 'skills-vs-tools',
        title: 'What is the difference between Skills and tools?',
        body: [
          'A tool is executable app capability. A Skill is a self-describing capability package that names when the agent should use that tool, what facts matter, what approval posture applies, and how the final output should surface results.',
        ],
      },
      {
        id: 'profiles',
        title: 'Why Mission Profiles?',
        body: [
          'Mission Profiles localize one agent workflow. They keep mission instructions, Skills, required tools, defaults, and synthesis expectations reviewable and versionable while Edgekit core keeps moving.',
        ],
      },
      {
        id: 'frameworks',
        title: 'Which frameworks are supported?',
        body: [
          'The web component works anywhere custom elements work. React has an idiomatic package today. Vite React, Next.js, Astro, Remix, Vue, and Svelte can all mount the web component while keeping secrets and privileged work in their normal server boundaries.',
        ],
      },
      {
        id: 'offline',
        title: 'Can it work offline?',
        body: [
          'Local inference and local state summaries can still work offline when the browser model is available. Network tools cannot. Approved idempotent mutations can queue through the offline mutation journal and sync later through the host app tool.',
        ],
      },
      {
        id: 'mcp',
        title: 'Can Edgekit use MCP?',
        body: [
          'Yes, through safe catalogs and backend/proxy boundaries. Do not connect the browser directly to broad stdio servers, local filesystems, databases, or credential-bearing resources.',
        ],
      },
    ],
  },
  {
    slug: 'glossary',
    navLabel: 'Glossary',
    title: 'Glossary',
    summary: 'Common Edgekit terms and the product boundaries they imply.',
    sections: [
      {
        id: 'core-terms',
        title: 'Core terms',
        body: [],
        bullets: [
          'Sidecar: one possible UI shape for embedding the agent experience inside a host app workflow. It is an implementation pattern, not the product promise.',
          'Host app: the application that owns users, auth, state, business logic, persistence, and executable tools.',
          'Primitive: an Edgekit-owned runtime building block such as provider routing, event streams, approvals, telemetry, audit, rendering, memory, and policy execution.',
          'Skill: a packaged capability with description, instructions, examples, required tools, approval posture, synthesis expectations, and UI hints.',
          'Mission Profile: the app-owned assembly of Skills, defaults, mission instructions, required tools, and output expectations for one agent workflow.',
          'Tool: a typed executable capability registered by the host app, often using the Vercel AI SDK `tool()` helper.',
        ],
      },
      {
        id: 'runtime-terms',
        title: 'Runtime terms',
        body: [],
        bullets: [
          'Model cascade: ordered provider strategy that tries local browser models before configured fallback behavior.',
          'Chrome AI: browser-provided local model lane when supported by the user environment.',
          'WebLLM: browser-side model lane that usually requires cross-origin isolation headers and device capacity.',
          'No-model fallback: explicit basic behavior when no agent model is available; it must be disclosed honestly.',
          'Approval gate: user-visible confirmation required before a risky tool can mutate important state.',
          'EdgeView: declarative UI payloads for cards, forms, tables, and charts rendered by Edgekit UI.',
          'AG-UI: event-stream protocol path for backend agents that Edgekit can render inside the app.',
        ],
      },
      {
        id: 'quality-terms',
        title: 'Quality terms',
        body: [],
        bullets: [
          'Synthesis faithfulness: whether source-backed facts from tools survive into the final visible answer or generated UI.',
          'Outcome scenario: an end-to-end prompt plus assertions over answer quality, UI, approvals, state, telemetry, and safety.',
          'Protected section: slow-state Skill/Profile content such as safety policy or authority boundaries that optimizer loops must not overwrite.',
          'Provider lane: the specific route used for a run, such as Chrome AI, WebLLM, cloud route, AG-UI, scripted demo, or no-model fallback.',
        ],
      },
    ],
  },
  {
    slug: 'adoption-kit',
    navLabel: 'Adoption Kit',
    title: 'Agent Adoption Kit',
    summary: 'Guides, coding-agent skills, recipes, scaffolds, and outcome loops for fast high-confidence Edgekit implementation.',
    sections: [
      {
        id: 'purpose',
        title: 'Purpose',
        body: [
          'The Adoption Kit turns Edgekit from documented infrastructure into a repeatable implementation path. It gives humans the architecture, gives coding agents procedural skills, gives teams recipe scaffolds, and gives everyone outcome tests.',
          'The goal is not to hide Edgekit. The goal is to make the correct path obvious: one narrow mission, Skills, one Mission Profile, app-owned tools, approvals, Knowledge Access when needed, and a harness score before release.',
        ],
      },
      {
        id: 'site-first-agent-path',
        title: 'If an agent starts on the website',
        body: [
          'A coding agent does not need hidden maintainer context to start. The public website exposes a small discovery ladder for retrieval first, then procedure.',
          'Use the public docs to understand Edgekit, then use the GitHub SKILL.md files only when you are ready to change a host app or this repo.',
        ],
        bullets: [
          'Read `/edgekit/llms.txt` first for the map of public docs, demos, and agent-ingestion exports.',
          'Read `/edgekit/docs/adoption-kit.md` next for the implementation sequence and which SKILL.md file applies.',
          'Read `/edgekit/llms-full.txt` when you need broader adopter context without crawling the whole repo.',
          'Open `https://github.com/kevinmarmstrong/edgekit/tree/main/docs/agent-skills` for procedural implementation, outcome-testing, security-review, and Skill-optimization skills.',
          'Install from npm with `@kevinmarmstrong/edgekit@^0.3.2` and only add sibling packages the workflow needs.',
        ],
      },
      {
        id: 'layers',
        title: 'Layers',
        body: ['Use the smallest layer that solves the current adoption problem.'],
        bullets: [
          'Guides: architecture, production, runtime guarantees, security, and getting started.',
          'Agent skills: `edgekit-implementer`, `edgekit-outcome-tester`, `edgekit-skill-optimizer`, and `edgekit-security-review`.',
          'Recipes: support workflow, Knowledge Access, Astro intake plus knowledge, and future framework/app recipes.',
          'Harnesses: adoption evals, research agents, research suite, provider matrix, and live Pages verification.',
        ],
      },
      {
        id: 'agent-skills',
        title: 'Agent skills',
        body: [
          'Agent-readable docs help retrieval. Agent skills add procedure. The GitHub `docs/agent-skills/*/SKILL.md` files tell a coding agent exactly what to inspect, create, test, and avoid.',
        ],
        bullets: [
          '`edgekit-implementer`: build Skills, a Mission Profile, tools, approvals, telemetry, and mount code.',
          '`edgekit-outcome-tester`: add outcome scenarios and score final visible behavior.',
          '`edgekit-skill-optimizer`: tune Skill/Profile text through bounded, held-out improvements.',
          '`edgekit-security-review`: review auth, RBAC, secrets, approvals, audit, MCP, and Knowledge Access boundaries.',
        ],
      },
      {
        id: 'cli',
        title: 'CLI path',
        body: ['Use `edgekit-init` from `@kevinmarmstrong/edgekit-cli` when a team or coding agent needs files on disk immediately.'],
        code: {
          language: 'bash',
          text: `npm install -D @kevinmarmstrong/edgekit-cli
edgekit-init --list
edgekit-init mission --recipe support-workflow --out edgekit/support
edgekit-init mission --recipe knowledge-skill --out edgekit/policy
edgekit-init mission --recipe astro-intake-knowledge --out src/edgekit/intake`,
        },
      },
    ],
  },
  {
    slug: 'recipes',
    navLabel: 'Recipes',
    title: 'Recipe catalog',
    summary: 'Opinionated install paths for common app, framework, workflow, and knowledge patterns.',
    sections: [
      {
        id: 'model',
        title: 'Recipe model',
        body: [
          'Recipes are additive adoption paths. They can know about Astro, support workflows, intake pipelines, or Knowledge Access, but they do not create a separate runtime or weaken host-app authority.',
          'Each recipe should include a mission, Skills, one Mission Profile, app-owned tool placeholders, approval policy, mounting code, outcome scenarios, and replacement notes.',
        ],
      },
      {
        id: 'available',
        title: 'Available recipes',
        body: ['The first recipes cover the highest-value onboarding paths.'],
        bullets: [
          '`support-workflow`: support case search plus approval-gated ticket creation.',
          '`knowledge-skill`: cited retrieval over app-owned policy, docs, manuals, graph, vector, or private APIs.',
          '`astro-intake-knowledge`: Astro component, Knowledge Access Skill, and approval-gated intake submission.',
        ],
      },
      {
        id: 'astro',
        title: 'Astro intake and knowledge',
        body: [
          'The Astro recipe mounts `<edge-chat>` in a component, routes site/CMS/KB search through a Knowledge Access Skill, and submits intake only through an approval-gated app-owned tool.',
          'The app replaces `/api/edgekit/knowledge/search` and `/api/edgekit/intake` with its own retrieval, persistence, CRM, email, spam control, and authorization. Secrets stay out of prompts.',
        ],
        code: {
          language: 'bash',
          text: 'edgekit-init mission --recipe astro-intake-knowledge --out src/edgekit/intake',
        },
      },
      {
        id: 'quality-bar',
        title: 'Quality bar',
        body: ['Add a recipe only when it represents a reusable adoption path, not a demo patch.'],
        bullets: [
          'Generated files are small and inspectable.',
          'Risky mutations are approval-gated.',
          'Knowledge answers cite source and freshness when retrieval is present.',
          'Host-app ownership boundaries are explicit.',
          'Outcome scenarios can be copied and extended.',
        ],
      },
    ],
  },
  {
    slug: 'concepts',
    navLabel: 'Architecture',
    title: 'Core architecture',
    summary: 'Understand providers, fallback, tools, approvals, state, and the event stream.',
    sections: [
      {
        id: 'model-cascade',
        title: 'Model cascade',
        body: [
          'The default strategy tries local browser providers first. Chrome AI can be used when the browser exposes it. WebLLM can be used on hosts with the right cross-origin isolation headers. If no model is available, apps can provide a deterministic fallback through `onNoModel`.',
          'Public users arrive with different browsers, model-download states, enterprise policies, and network conditions. Use the cascade readiness controller to check capabilities before promising a full local agent experience.',
        ],
        bullets: [
          '`downloadPolicy: "never"` avoids model downloads and is useful for public demos.',
          '`downloadPolicy: "prompt"` lets the UI ask before a model download.',
          '`downloadPolicy: "auto"` is useful for explicit eval sessions or controlled environments.',
          '`createCascadeReadinessController()` returns a headless snapshot and recommended action so apps can prompt, suggest, message, hide, or fall back without using Edgekit’s demo UI.',
        ],
      },
      {
        id: 'capability-wizard',
        title: 'Capability wizard',
        body: [
          'The readiness helper is intentionally decoupled from presentation. The host app decides whether to show a banner, modal, settings panel, disabled CTA, or nothing at all. Edgekit only returns provider status, missing capabilities, and a recommended action.',
          'For public sites, prefer `downloadPolicy: "never"` plus a transparent fallback. For controlled internal apps, use `downloadPolicy: "prompt"` when the user should explicitly approve a local model download.',
        ],
        code: {
          language: 'ts',
          text: `const readiness = createCascadeReadinessController({
  providers: [chromeAI(), webLLM()],
  downloadPolicy: 'prompt',
  fallback: true,
  requiredCapabilities: ['tools', 'approvals', 'edgeview'],
  requiredTools: ['searchProducts', 'addToCart'],
  tools,
  visibilityPolicy: 'show-basic-when-local-unavailable',
})

const snapshot = await readiness.check()
if (snapshot.recommendedAction.type === 'hide') hideAgent()
if (snapshot.recommendedAction.type === 'prompt') showDownloadConsent(snapshot)

chat.configure({
  cascadeReadiness: readiness,
  onNoModel: ({ input, readiness }) =>
    \`\${readiness?.message}\\n\\n\${answerWithBasicTools(input)}\`,
})`,
        },
      },
      {
        id: 'tools',
        title: 'Tools are app capabilities',
        body: [
          'Tools should wrap real app capabilities rather than duplicate business logic. Search, retrieve, update, create, cancel, suspend, add-to-cart, and submit-order actions can all be represented as tools.',
          'For optional tool fields, use `modelOptional(schema)`. Browser models may send `null` for an unspecified slot, and the tool should normalize that the same way it handles absence.',
        ],
      },
      {
        id: 'approval',
        title: 'Human approval',
        body: [
          'Set `needsApproval: true` on tools that change important state. edgekit emits an approval request, the UI renders approve/reject controls, and `respondToApproval()` resumes the agent turn with the approval decision plus the original approved tool call.',
          'Custom providers and deterministic test harnesses should continue from that approved tool call instead of reconstructing the mutation from user text. That keeps fields such as selected size, account id, plan, quantity, or reason intact across the approval boundary.',
        ],
      },
      {
        id: 'events',
        title: 'Agent events',
        body: ['The core agent streams status, text, tool calls, tool results, declarative views, approval requests, no-model fallbacks, errors, and done events.'],
        code: {
          language: 'ts',
          text: `for await (const event of agent.send('upgrade Northwind to Enterprise')) {
  if (event.type === 'tool-call') console.log(event.toolName, event.input)
  if (event.type === 'view') renderEdgeView(event.view)
  if (event.type === 'approval-request') showApproval(event)
}`,
        },
      },
      {
        id: 'edgeview',
        title: 'EdgeView',
        body: [
          'EdgeView is the default declarative UI layer. `registerActions()` compiles into EdgeView cards and forms, and AG-UI custom events can carry EdgeView payloads. This gives developers a stable, framework-neutral way to render text, cards, forms, tables, and simple charts before adopting a broader A2UI renderer.',
        ],
      },
      {
        id: 'ag-ui',
        title: 'AG-UI compatibility',
        body: [
          'Use `createAgUiAgent()` from `@kevinmarmstrong/edgekit-agui` when the agent comes from an AG-UI ecosystem backend instead of the browser-native model cascade. Edgekit accepts text events, tool-result events, and custom `edgekit.view` or A2UI-style view events.',
          'Without AG-UI, use `registerTools()` plus `registerActions()` to keep the agent fully browser-native and app-owned. With AG-UI, attach an external event stream with `useAgent()` and keep the same EdgeView renderer for rich UI.',
          'The public GitHub Pages AG-UI demo intentionally uses a scripted mock stream because Pages cannot run a provider backend. It is a renderer and protocol demo, not a general-purpose hosted agent.',
        ],
        bullets: [
          'Standard AG-UI HTTP/SSE endpoint: import from `@kevinmarmstrong/edgekit-agui`, pass `createAgUiAgent({ endpoint })`, and attach it with `chat.useAgent(agent)`.',
          '@ag-ui/client or HttpAgent-backed service: expose the same event stream endpoint, or adapt its event iterator through `createAgUiAgent({ run })`.',
          'CopilotKit, LangGraph, CrewAI, or other AG-UI bridges: keep their backend agent runtime, then let Edgekit render the user-facing event stream inside your app.',
          'Backend dependency: a hosted route or worker that can stream AG-UI events, hold provider secrets, enforce rate limits, and call only the app tools you expose.',
        ],
      },
    ],
  },
  {
    slug: 'knowledge-access',
    navLabel: 'Knowledge',
    title: 'Knowledge Access Skills',
    summary: 'Treat retrieval, RAG, graph search, and knowledge APIs as app-owned Skills with citations and freshness metadata.',
    sections: [
      {
        id: 'principle',
        title: 'Principle',
        body: [
          'Edgekit does not own retrieval infrastructure. A vector database, graph database, reranker, embedding model, SQL query, or external search API belongs to the host app or an adapter the host app chooses.',
          'Edgekit owns the agent-facing contract around that retrieval: when the Skill activates, which tool is visible, what citations must be surfaced, how stale knowledge is labeled, what telemetry is emitted, and how outcome tests prove the final answer stayed faithful.',
        ],
        bullets: [
          'Memory is for user/session/workflow context.',
          'Knowledge Access Skills are for larger, changing, source-owned information.',
          'Retrieval tools should be read-only and parallel-safe unless the host app explicitly says otherwise.',
          'Permission filtering belongs inside the source or backend tool, not inside model instructions.',
        ],
      },
      {
        id: 'contract',
        title: 'Core contract',
        body: [
          '`EdgeKnowledgeSource` exposes `search(query, context)` plus optional `write`, `invalidate`, and `freshness` hooks. `createKnowledgeTool()` wraps the source as a normal Edgekit tool. `createKnowledgeSkill()` packages the router description, instructions, synthesis requirements, protected sections, and executable tool.',
        ],
        code: {
          language: 'ts',
          text: `const policySource = {
  id: 'support-policy-kb',
  label: 'Support policy',
  async search(query, context) {
    return searchPolicyIndex({
      query,
      userId: context.session.identity?.id,
      roles: context.session.identity?.roles,
      topK: context.topK ?? 4,
    })
  },
  freshness: () => ({ stale: false, updatedAt: policyIndexVersion }),
}

const policySkill = createKnowledgeSkill({
  id: 'support-policy',
  name: 'Support Policy Knowledge',
  description: 'Search support policies with citations and freshness labels.',
  source: policySource,
  requiredFacts: ['policy title', 'effective date', 'approval requirement'],
})`,
        },
      },
      {
        id: 'recommended-paths',
        title: 'Recommended paths',
        body: ['Choose the retrieval implementation by scale and domain. Keep the Edgekit-facing contract stable while you swap the underlying source.'],
        bullets: [
          'Simple local: Markdown, JSON, or the Edgekit docs index for small docs, preferences, playbooks, and demo data.',
          'Browser semantic: local embeddings plus IndexedDB or OPFS when data should stay on the device.',
          'Production vector/hybrid: LlamaIndex.TS, LangChain.js retrievers, Qdrant, pgvector, Pinecone, Weaviate, or similar behind an app-owned tool.',
          'Graph/GraphRAG: Neo4j GraphRAG, FalkorDB, or a domain graph API when relationships and multi-hop evidence matter.',
          'Agentic retrieval: expose multiple read tools and let the model choose, but keep each tool scoped, cited, and permission-filtered.',
        ],
      },
      {
        id: 'faithfulness',
        title: 'Faithfulness and citations',
        body: [
          'A retrieval call passing is not enough. The user-visible answer or generated UI must include the source-backed facts the user asked for, cite the source labels or URIs, and admit when no source supports the answer.',
          'Use `synthesisFaithfulness` and knowledge-grounding scenarios to test that source facts survive out of the tool result and into the actual agent output.',
        ],
      },
    ],
  },
  {
    slug: 'api',
    navLabel: 'API Reference',
    title: 'API reference',
    summary: 'Typed v0.3.2 package surfaces for the core runtime and optional sibling capabilities.',
    sections: [
      {
        id: 'exports',
        title: 'v0.3.2 package surfaces',
        body: [
          'Install `@kevinmarmstrong/edgekit` and `@kevinmarmstrong/edgekit-ui` for the smallest browser-native agent surface. Add sibling packages only when the workflow needs that capability.',
          'Root compatibility exports for moved capabilities remain deprecated transition shims. New integrations should import directly from sibling packages.',
        ],
        bullets: [
          '`@kevinmarmstrong/edgekit`: `createAgent`, `tool`, `chromeAI`, `webLLM`, `resolveModel`, readiness controllers, context providers, and telemetry contracts.',
          '`@kevinmarmstrong/edgekit-ui`: `<edge-chat>`, EdgeView rendering, approvals, action forms, readiness/download UI.',
          '`@kevinmarmstrong/edgekit-skills`: `createSkill`, `createMissionProfile`, `applyMissionProfile`, validation, and Skill/Profile-to-agent options.',
          '`@kevinmarmstrong/edgekit-knowledge`: Knowledge sources, knowledge tools, Knowledge Skills, Markdown memory, citations, and freshness metadata.',
          '`@kevinmarmstrong/edgekit-governance`: audit trails, redaction, policy execution, offline tools, and mutation journals.',
          '`@kevinmarmstrong/edgekit-agui`: `createAgUiAgent`, AG-UI event translation, and handoff envelopes backed by `@ag-ui/client`.',
          '`@kevinmarmstrong/edgekit-mcp`: `loadMcpTools` and `mcpToolsFromDefinitions` for safe backend/proxy MCP catalogs.',
          '`@kevinmarmstrong/edgekit-react`: `EdgeChat`, `useEdgeAgent`, `useEdgeActivity`, and controller helpers.',
          '`@kevinmarmstrong/edgekit-cli`: `edgekit-init` recipes and docs indexing utility.',
        ],
      },
      {
        id: 'create-agent',
        title: 'createAgent',
        body: [
          'Use `createAgent` directly when building a custom UI or when you need complete control over event rendering.',
          'Signature: `createAgent(options)`.',
        ],
        code: {
          language: 'ts',
          text: `import { createAgent, chromeAI } from '@kevinmarmstrong/edgekit'

const agent = createAgent({
  systemPrompt: 'You are a precise app assistant.',
  model: [chromeAI()],
  tools: { searchProducts, addToCart },
  downloadPolicy: 'never',
  toolChoice: 'auto',
  onNoModel: ({ input }) => 'Basic mode answer for: ' + input,
})`,
        },
      },
      {
        id: 'cascade-readiness',
        title: 'Cascade readiness',
        body: [
          'Use `createCascadeReadinessController()` when the app needs to decide what to show before promising a full local agent experience. Public users may arrive without Chrome AI/Nano downloaded, without WebLLM support, or with browser policies that block local models.',
          'The helper is UI-independent. It returns provider status, required and missing capabilities, fallback availability, and a recommended action: `continue`, `prompt`, `suggest`, `message`, `fallback`, `hide`, or `retry`.',
        ],
        code: {
          language: 'ts',
          text: `const readiness = createCascadeReadinessController({
  providers: [chromeAI(), webLLM()],
  downloadPolicy: 'prompt',
  fallback: true,
  requiredCapabilities: ['tools', 'approvals', 'edgeview'],
  requiredTools: ['searchProducts', 'addToCart'],
  tools,
  visibilityPolicy: 'show-basic-when-local-unavailable',
})

const snapshot = await readiness.check()

chat.configure({
  cascadeReadiness: readiness,
  onNoModel: ({ input, readiness }) =>
    \`\${readiness?.message}\\n\\n\${answerWithBasicTools(input)}\`,
})`,
        },
      },
      {
        id: 'tool-choice',
        title: 'Tool choice',
        body: [
          'Set `toolChoice: "required"` for docs search, site-map, catalog, or support assistants that must ground answers in registered app tools instead of answering from model memory.',
          'For agentic workflows, pair required tools with `toolProvider` so read tools stay broadly available while mutation tools appear only when the prompt, session, role, and workflow state justify them. Keep the default `auto` behavior for open-ended assistants where a model may answer directly, and never use required tools as a substitute for backend authorization.',
        ],
        code: {
          language: 'ts',
          text: `chat.configure({
  model: [chromeAI()],
  toolChoice: 'required',
  toolProvider: ({ input }) =>
    /\\b(add|cart|purchase)\\b/i.test(input)
      ? { searchProducts, addToCart }
      : { searchProducts },
})

chat.registerTools({ searchProducts, addToCart })`,
        },
      },
      {
        id: 'approval-resume',
        title: 'Approval resume',
        body: [
          'When a tool needs approval, call `respondToApproval` with the approval id and decision. The resumed model message includes a `tool-approval-response` part with `approvalId`, `approved`, `reason`, and the original `toolCall` payload.',
          'Use that `toolCall` as the source of truth for approved mutations in scripted providers, AG-UI bridges, and test doubles.',
        ],
        code: {
          language: 'ts',
          text: `for await (const event of agent.respondToApproval(approvalId, true)) {
  renderAgentEvent(event)
}`,
        },
      },
    ],
  },
  {
    slug: 'advanced',
    navLabel: 'Enterprise',
    title: 'Enterprise controls',
    summary: 'Identity, RBAC, memory, audit, offline sync, tool policy, and observability primitives.',
    sections: [
      {
        id: 'identity',
        title: 'Identity and session context',
        body: [
          'Use `sessionProvider`, `identityProvider`, and `stateProvider` to bridge the host app session into Edgekit. The model receives only a safe public identity summary and app-state summary; auth headers, cookies, and tokens stay in the tool execution context.',
          'This lets registered tools and MCP proxies enforce the same user, tenant, and permission checks your backend already uses.',
        ],
        code: {
          language: 'ts',
          text: `chat.configure({
  sessionProvider: () => ({
    identity: {
      id: currentUser.id,
      tenantId: currentTenant.id,
      roles: currentUser.roles,
      permissions: currentUser.permissions,
    },
    auth: {
      headers: { authorization: 'Bearer ' + appJwt },
      credentials: 'include',
    },
  }),
})`,
        },
      },
      {
        id: 'rbac',
        title: 'Dynamic RBAC tools',
        body: [
          'Use `toolManifests` when the available agent tools depend on the signed-in user. Edgekit filters the manifest each run, so a customer can see customer tools while an admin session can hydrate elevated account-management tools.',
        ],
        code: {
          language: 'ts',
          text: `const agent = createAgent({
  systemPrompt,
  identityProvider: getCurrentIdentity,
  toolManifests: [
    { name: 'searchOrders', tool: searchOrders, permissions: ['orders:read'] },
    { name: 'suspendAccount', tool: suspendAccount, roles: ['admin'], permissions: ['accounts:suspend'] },
  ],
})`,
        },
      },
      {
        id: 'state-hydration',
        title: 'State hydration',
        body: [
          'Use `stateProvider` to give the model a concise, host-owned view of the current page or workflow before the user asks anything. This reduces wasted tool calls and helps the agent act like it belongs inside the app.',
        ],
        code: {
          language: 'ts',
          text: `chat.configure({
  stateProvider: () => ({
    route: location.pathname,
    view: 'Checkout',
    summary: 'Cart contains 2 items. User is choosing shipping.',
    data: { cartItems: 2, step: 'shipping' },
  }),
})`,
        },
      },
      {
        id: 'markdown-memory',
        title: 'Markdown memory stores',
        body: [
          'Import `createMarkdownMemoryStore()` from `@kevinmarmstrong/edgekit-knowledge` when an app needs persistent local memory without committing to a vector database on day one. Markdown files are easy for developers, coding agents, support teams, and vibe coders to inspect, review, diff, and ship with an app.',
          'The built-in store treats Markdown headings as memory records and searches them with a lightweight term scorer. It is intentionally replaceable: any object with `search(query, context)` and optional `write(record, context)` can back Edgekit memory, including IndexedDB, OPFS, a vector store, or a server profile service.',
          'Store preferences, workflow notes, and non-sensitive support history. Do not store raw secrets, access tokens, payment data, or regulated medical content unless your app has an explicit compliance design for that memory.',
        ],
        code: {
          language: 'ts',
          text: `import { createMarkdownMemoryStore } from '@kevinmarmstrong/edgekit-knowledge'

const memory = createMarkdownMemoryStore({
  documents: [
    {
      id: 'local-preferences',
      source: 'profile-memory.md',
      content: await fetch('/memory/profile-memory.md').then(res => res.text()),
    },
  ],
})

const agent = createAgent({
  systemPrompt,
  tools,
  memory,
  memoryLimit: 3,
})`,
        },
      },
      {
        id: 'memory-compaction',
        title: 'Memory compaction',
        body: [
          'Markdown memory is transparent, but append-heavy history must be compressed before it overwhelms small local context windows. Configure compaction on the Markdown store or pass `memoryCompaction` to `createAgent()` so Edgekit can replace active raw records with a concise current-state snapshot.',
          'The default summarizer is deterministic and local. Production apps can provide `summarize(records, context)` to call a local summarizer, a cloud model route, or an app-owned summarization endpoint. Raw records are archived by default inside the store rather than silently discarded.',
          'Run redaction before writing sensitive memory, and avoid treating memory compaction as a compliance boundary. It is a context-budget and latency control.',
        ],
        code: {
          language: 'ts',
          text: `const memory = createMarkdownMemoryStore({
  documents: [{ id: 'session-log', content: sessionMarkdown }],
  compaction: {
    thresholdTokens: 1200,
    maxSnapshotTokens: 350,
    summarize: async records => summarizeWithAppModel(records),
  },
})

const agent = createAgent({
  systemPrompt,
  tools,
  memory,
  memoryCompaction: { thresholdTokens: 1200 },
})`,
        },
      },
      {
        id: 'hybrid-routing',
        title: 'Deprecated routing experiments',
        body: [
          '`createHybridModelRouter()` is a deprecated root compatibility export in v0.3.x, not part of the stable v0.3 public API contract.',
          'For new integrations, configure the model cascade with `model: [chromeAI(), webLLM(), appCloudRoute]`, use `resolveModel()` when a headless resolver is needed, and route heavier worker behavior behind app-owned tools or AG-UI endpoints.',
        ],
        code: {
          language: 'ts',
          text: `chat.configure({
  model: [chromeAI(), webLLM()],
  toolProvider: ({ input, session }) =>
    shouldExposeMutationTools(input, session) ? mutationTools : readOnlyTools,
})`,
        },
      },
      {
        id: 'supervisor-routing',
        title: 'Worker handoffs',
        body: [
          '`createSupervisorRouter()` is a deprecated root compatibility export in v0.3.x, not part of the stable v0.3 public API contract.',
          'Use `createHandoffEnvelope()` from `@kevinmarmstrong/edgekit-agui` when a local agent needs to pass bounded context to a cloud worker, AG-UI backend, or other specialist service.',
          'The envelope contains the user intent, recent messages, selected memory records, public identity, app state, tool names, and trace ids without secret identity claims.',
        ],
        code: {
          language: 'ts',
          text: `import { createAgUiAgent, createHandoffEnvelope } from '@kevinmarmstrong/edgekit-agui'

const envelope = createHandoffEnvelope({
  input,
  messages,
  session,
  trace: { sessionId, runId, phase: 'send' },
})

chat.useAgent(createAgUiAgent({ endpoint: '/api/agent-events' }))`,
        },
      },
      {
        id: 'handoffs',
        title: 'Cross-agent handoffs',
        body: [
          'Use the handoff envelope when local browser workflow routes work to a cloud worker, AG-UI backend, or other specialist agent. The cloud worker should not wake up cold; it should receive a strict, bounded package of context that mirrors what the local agent already knows.',
          'Edgekit intentionally packages selected memory records and the host-provided state snapshot, not a raw DOM dump. If a developer wants DOM-derived context, they should summarize it through `stateProvider` first.',
        ],
        code: {
          language: 'ts',
          text: `const envelope = createHandoffEnvelope({
  input,
  intent: 'account-analysis',
  messages,
  session,
  memory: selectedMemory,
  tools: ['searchAccounts', 'summarizeRisk'],
  trace: { sessionId, runId, phase: 'send' },
})`,
        },
      },
      {
        id: 'mcp',
        title: 'MCP tool catalogs',
        body: [
          'Edgekit should not connect a browser directly to arbitrary MCP stdio servers with broad filesystem, database, or credential access. The scalable pattern is a safe MCP proxy or app backend that exposes only the approved tool catalog.',
          'Import `loadMcpTools()` or `mcpToolsFromDefinitions()` from `@kevinmarmstrong/edgekit-mcp`. They convert that catalog into normal Edgekit tools, so existing MCP resources can power the agent workflow without hand-writing every wrapper.',
        ],
        code: {
          language: 'ts',
          text: `import { loadMcpTools } from '@kevinmarmstrong/edgekit-mcp'

const tools = await loadMcpTools({
  listTools: () => fetch('/api/mcp/tools').then(res => res.json()),
  callTool: (name, input) =>
    fetch('/api/mcp/call', {
      method: 'POST',
      body: JSON.stringify({ name, input }),
    }).then(res => res.json()),
})

chat.registerTools(tools)`,
        },
      },
      {
        id: 'redaction',
        title: 'PII/PHI redaction',
        body: [
          'Import `createPiiRedactor()` from `@kevinmarmstrong/edgekit-governance` to sanitize values before tool results are emitted back through the agent event stream, telemetry, or audit trail. It masks common emails, phone numbers, SSNs, and card-like numbers, and accepts custom regular expressions for app-specific identifiers.',
          'This is a middleware hook, not a legal guarantee. Regulated deployments should add domain redactors, avoid placing sensitive fields in model prompts, and keep backend permission checks as the final authority.',
        ],
        code: {
          language: 'ts',
          text: `import { createPiiRedactor } from '@kevinmarmstrong/edgekit-governance'

const redactor = createPiiRedactor({
  customPatterns: [
    { name: 'patient-id', pattern: /PAT-[0-9]{6}/g },
  ],
})

const agent = createAgent({
  systemPrompt,
  tools,
  redactors: redactor,
})`,
        },
      },
      {
        id: 'tool-repair',
        title: 'Tool repair loop',
        body: [
          'Browser-local models may produce malformed tool arguments. Edgekit now retries validation-shaped tool failures invisibly before showing the user an error. The repair message includes the validation failure and asks the model to retry the tool call with valid JSON.',
          'The default repair loop retries up to three validation-like failures. Configure `toolRepair` to reduce attempts, disable repair, or plug in your own `shouldRepair` and `instruction` functions for app-specific schemas.',
        ],
        code: {
          language: 'ts',
          text: `const agent = createAgent({
  systemPrompt,
  tools,
  toolRepair: {
    maxAttempts: 2,
    shouldRepair: error => String(error).includes('validation'),
  },
})`,
        },
      },
      {
        id: 'activity-events',
        title: 'Streaming activity states',
        body: [
          'Edgekit emits `activity` events for orchestration states such as cached responses, tool execution, memory compaction, approvals, and tool repair. These are not chain-of-thought; they are safe, user-facing progress markers.',
          'The default `<edge-chat>` component renders active states as transient rows so longer workflows feel alive without dumping internal reasoning into the transcript.',
        ],
        code: {
          language: 'ts',
          text: `for await (const event of agent.send(input)) {
  if (event.type === 'activity') {
    renderProgress(event.activity.label, event.activity.status)
  }
}`,
        },
      },
      {
        id: 'response-cache',
        title: 'Edge response cache',
        body: [
          'Use `responseCache` when repeated read-only questions can be answered without running model inference again. The default cache key includes normalized input, public identity, app state, selected memory, tools, and phase.',
          'Start with `createMemoryResponseCache()` for tests or short-lived sessions. Use `createIndexedDbResponseCache()` when a browser app wants persisted cache entries. Cache writes are skipped by default once a run uses tools, approvals, repairs, or errors.',
          'Do not cache mutation flows, approval outcomes, auth-sensitive outputs, or responses that depend on hidden server state unless your app provides an explicit cache policy and invalidation story.',
        ],
        code: {
          language: 'ts',
          text: `const agent = createAgent({
  systemPrompt,
  tools,
  responseCache: createIndexedDbResponseCache(),
  cachePolicy: {
    ttlMs: 5 * 60 * 1000,
  },
})`,
        },
      },
      {
        id: 'parallel-tools',
        title: 'Parallel-safe tools',
        body: [
          'Use `executeParallelTools()` for app-owned batches of independent tool calls. Edgekit only runs a batch concurrently when each tool manifest is marked `readOnly: true` and `parallelSafe: true`; mutations and unmarked tools stay sequential.',
          'This keeps latency wins focused on safe reads such as profile lookups, catalog searches, weather, documentation search, or permissions checks while avoiding accidental concurrent writes.',
          'The built-in AI SDK model loop remains the primary orchestrator. This helper is for custom harnesses, AG-UI backends, and host apps that receive an array of independent tool intents.',
        ],
        code: {
          language: 'ts',
          text: `const results = await executeParallelTools({
  calls: [
    { id: 'profile', toolName: 'getProfile', input: {} },
    { id: 'docs', toolName: 'searchDocs', input: { query } },
  ],
  tools,
  manifests: [
    { name: 'getProfile', tool: getProfile, readOnly: true, parallelSafe: true },
    { name: 'searchDocs', tool: searchDocs, readOnly: true, parallelSafe: true },
  ],
  context: { session },
})`,
        },
      },
      {
        id: 'offline-journal',
        title: 'Offline mutation journal',
        body: [
          'Local inference can still work without internet, but networked tools and cloud routes cannot. Edgekit handles that boundary with a mutation journal contract rather than forcing a CRDT engine into core.',
          'Wrap approved, idempotent tools with `createOfflineTool()`. When `online()` returns false, the wrapper records the mutation locally and returns a queued result. When connectivity returns, `syncMutationJournal()` replays queued mutations through the original tool execution context so the host app keeps identity, auth, validation, telemetry, and conflict handling.',
          'Use `createMemoryMutationJournal()` for tests and temporary sessions. Use `createLocalStorageMutationJournal()` for simple browser persistence. For collaborative documents or complex shared state, add Yjs or Automerge as an adapter that implements the same journal contract.',
        ],
        code: {
          language: 'ts',
          text: `const journal = createLocalStorageMutationJournal()
const addToCartOffline = createOfflineTool({
  name: 'addToCart',
  tool: addToCart,
  journal,
  online: () => navigator.onLine,
  idempotencyKey: input => \`cart:\${input.productId}:\${input.size}\`,
})

window.addEventListener('online', () => {
  syncMutationJournal({
    journal,
    tools: { addToCart },
    context: { session: currentSession },
    onActivity: activity => renderProgress(activity),
  })
})`,
        },
      },
      {
        id: 'guarded-tools',
        title: 'Guarded tool execution',
        body: [
          'Dynamic MCP catalogs and third-party client tools should not run with unlimited trust. Start with policy isolation: explicit allowlists, timeouts, input and output payload limits, abort signals, and backend/proxy boundaries for secret-bearing work.',
          '`createToolPolicyExecutor()` is intentionally lighter than a WASM runtime. It gives every host app a default safety boundary today, while leaving room for worker and WASM adapters later for pure compute tools.',
          'Use backend MCP proxies for filesystem, database, SaaS, or credentialed tools. Use browser-side policy execution for narrow client capabilities where the host app owns the risk.',
        ],
        code: {
          language: 'ts',
          text: `const executor = createToolPolicyExecutor({
  defaultPolicy: {
    timeoutMs: 3000,
    maxInputBytes: 16_000,
    maxOutputBytes: 64_000,
    allowedTools: ['searchDocs', 'summarizeSelection'],
  },
})

const output = await executor.execute({
  toolName: 'searchDocs',
  tool: searchDocs,
  input: { query },
  context: { session },
})`,
        },
      },
      {
        id: 'telemetry',
        title: 'Telemetry and mission control',
        body: [
          'Pass `telemetry` to `createAgent()`, `createAgUiAgent()`, or `<edge-chat>.configure()` to observe runs, model availability, tool calls, approvals, views, errors, and UI actions.',
          '`createMissionControl()` is an in-memory aggregator for demos and dashboards. Production teams can send the same event contract to OpenTelemetry, Datadog, PostHog, Supabase, or their own warehouse.',
        ],
        code: {
          language: 'ts',
          text: `const missionControl = createMissionControl()
missionControl.subscribe((_event, snapshot) => renderDashboard(snapshot))

chat.configure({
  telemetry: missionControl,
  sessionId: currentUser.id,
})`,
        },
      },
      {
        id: 'audit',
        title: 'Approval audit trails',
        body: [
          'Import `createAuditTrail()` from `@kevinmarmstrong/edgekit-governance` to record tool calls, tool results, approval requests, approval decisions, UI actions, and errors into a hash chain. The default hash is portable and deterministic; compliance deployments should provide their own cryptographic hash or signing function and persist entries server-side.',
        ],
        code: {
          language: 'ts',
          text: `import { createAuditTrail } from '@kevinmarmstrong/edgekit-governance'

const auditTrail = createAuditTrail({
  sessionId: currentUser.id,
  hash: payload => signOrHash(payload),
})

const agent = createAgent({
  systemPrompt,
  tools,
  auditTrail,
})`,
        },
      },
      {
        id: 'agent-handoff',
        title: 'Coding-agent handoff',
        body: [
          'The repository includes `AGENTS.md` for implementation agents. It names the architecture, extension points, commands, and release rules so future coding agents can make changes without drifting from the product model.',
          'For smart but non-specialist builders: start with `<edge-chat>`, register a few app tools, add `registerActions()` for buttons/forms, then add telemetry or AG-UI only when the app needs them.',
        ],
      },
      {
        id: 'roadmap',
        title: 'Roadmap',
        body: [
          'The near-term roadmap is adoption and safety before heavier infrastructure: publish the packages, keep React first-class, add Vue and Svelte wrappers after the React API settles, and ship a browser worker adapter for guarded tools.',
          'The offline roadmap is adapter-driven. Core owns the mutation journal and sync contract; optional Yjs and Automerge packages can provide CRDT-backed journals for collaborative state without making every Edgekit app adopt a CRDT.',
          'The isolation roadmap is progressive. Start with policy execution and backend MCP proxies, then add worker isolation, then add a WASM adapter for pure compute tools where the browser sandbox meaningfully helps.',
        ],
      },
    ],
  },
  {
    slug: 'ecosystem',
    navLabel: 'Ecosystem',
    title: 'Ecosystem and integrations',
    summary: 'Framework wrappers, AG-UI backends, MCP tool catalogs, CRDT adapters, and future isolation adapters.',
    sections: [
      {
        id: 'frameworks',
        title: 'Framework wrappers',
        body: [
          'The base UI is a standards-based web component, so it can run in any frontend. The ecosystem packages make that universal primitive idiomatic inside popular frameworks.',
          '`@kevinmarmstrong/edgekit-react` is the first official wrapper. It exposes JSX and hooks while preserving the same core agent runtime and `<edge-chat>` renderer. Vue and Svelte wrappers are roadmap items once the React API shape settles.',
        ],
        code: {
          language: 'tsx',
          text: `import { EdgeChat, useEdgeAgent } from '@kevinmarmstrong/edgekit-react'

function Assistant({ agent }) {
  const edge = useEdgeAgent(agent)
  return <EdgeChat onReady={chat => chat.useAgent?.(agent)} />
}`,
        },
      },
      {
        id: 'ag-ui',
        title: 'AG-UI providers',
        body: [
          'Use AG-UI when a backend agent already owns the reasoning loop. Edgekit can render the event stream inside the application and keep the same EdgeView component contract for forms, cards, tables, and charts.',
          'Production AG-UI integrations need a hosted route or worker that can stream provider events, hold secrets, enforce rate limits, and call only the tools the app intentionally exposes.',
        ],
        bullets: [
          'Use `createAgUiAgent({ endpoint })` from `@kevinmarmstrong/edgekit-agui` for HTTP/SSE endpoints.',
          'Use `createAgUiAgent({ run })` when adapting an event iterator from an existing agent client.',
          'Keep public demos explicit when they use scripted streams instead of a real provider backend.',
        ],
      },
      {
        id: 'mcp',
        title: 'MCP adapters',
        body: [
          'Edgekit adapts safe MCP catalogs with `loadMcpTools()` and `mcpToolsFromDefinitions()` from `@kevinmarmstrong/edgekit-mcp`. The browser should not connect directly to broad stdio servers, file systems, databases, or credential-bearing resources.',
          'The enterprise pattern is a backend MCP proxy that exposes a least-privilege catalog for the current user and tenant, then lets Edgekit treat those capabilities as normal app tools.',
        ],
      },
      {
        id: 'offline-adapters',
        title: 'Offline and CRDT adapters',
        body: [
          'Core owns the mutation journal contract: queue an approved idempotent mutation, replay it through the original app tool, and preserve conflict status when sync cannot be resolved automatically.',
          'Yjs and Automerge belong as optional adapters on top of that journal, not as mandatory core dependencies. Use CRDTs for collaborative state and shared documents; use the built-in journals for simpler queued app actions.',
        ],
      },
      {
        id: 'isolation-adapters',
        title: 'Worker and WASM isolation',
        body: [
          'Tool isolation is progressive. Start with `createToolPolicyExecutor()` for allowlists, timeouts, payload limits, and abort signals. Add a Worker adapter when client-side tools need to run off the main thread.',
          'WASM is a future adapter for pure compute tools. It is not a substitute for backend authorization around MCP, SaaS, database, or filesystem access.',
        ],
      },
    ],
  },
  {
    slug: 'ui',
    navLabel: 'Interface',
    title: 'The edge-chat component',
    summary: 'Use the Lit web component for the default agent UI, prompts, and approval controls.',
    sections: [
      {
        id: 'component',
        title: 'Component usage',
        body: [
          '`<edge-chat>` is a web component. It can live inside any framework or vanilla app surface.',
          'For vanilla sites, use `mountChat()` to configure the component in one call. Use `agent-title`, `agent-subtitle`, `status-text`, CSS variables, and `::part()` selectors for normal site-level styling.',
        ],
        code: {
          language: 'ts',
          text: `import { mountChat } from '@kevinmarmstrong/edgekit-ui'

const chat = mountChat('#assistant', {
  agentTitle: 'Ask me anything',
  agentSubtitle: 'About this workflow',
  statusText: '',
  model: [chromeAI()],
  downloadPolicy: 'never',
  onNoModel: ({ input }) => fallbackSearch(input),
})
chat?.registerTools({ searchProducts, addToCart })`,
        },
      },
      {
        id: 'theming',
        title: 'Theme the component',
        body: [
          'The default component is intentionally modest. Host apps can set CSS custom properties for the common tokens and use `::part()` for exact controls without reaching into the shadow DOM.',
          'Use the label attributes for product copy. Hide the status badge with `status-text=""` when the host surface already explains provider mode.',
        ],
        code: {
          language: 'css',
          text: `edge-chat {
  --edge-chat-font-family: var(--font-sans);
  --edge-chat-accent: #0f766e;
  --edge-chat-user-background: #111827;
  --edge-chat-radius: 10px;
  --edge-chat-shadow: 0 24px 70px rgb(15 23 42 / 14%);
}

edge-chat::part(header) {
  background: var(--surface);
}

edge-chat::part(send-button) {
  min-width: 5rem;
}`,
        },
      },
      {
        id: 'cascade-wizard',
        title: 'Cascade wizard',
        body: [
          '`<edge-cascade-wizard>` is optional UI for `createCascadeReadinessController()`. Use it for demos, setup panels, public capability disclosure, or internal diagnostics.',
          'Production apps can replace it completely. The durable contract is the controller snapshot and the `edgekit-cascade-snapshot` / `edgekit-cascade-action` events.',
          'The public cascade lab at `/demos/cascade/` includes both a real visitor setup flow and a developer matrix. The visitor flow checks the current browser, asks before Chrome AI or app-selected WebLLM downloads, offers basic mode, and can hide the assistant. The matrix shows model readiness, RBAC-narrowed tools, validation, fallback, opt-out, and hidden feature policies as resettable scenarios.',
        ],
        code: {
          language: 'ts',
          text: `import '@kevinmarmstrong/edgekit-ui'
import { chromeAI, createCascadeReadinessController } from '@kevinmarmstrong/edgekit'

const readiness = createCascadeReadinessController({
  providers: [chromeAI()],
  downloadPolicy: 'never',
  fallback: true,
  visibilityPolicy: 'show-basic-when-local-unavailable',
})

document.querySelector('edge-cascade-wizard')?.configure(readiness)
document.querySelector('edge-chat')?.configure({ cascadeReadiness: readiness })
void readiness.check()`,
        },
      },
      {
        id: 'react',
        title: 'React wrapper',
        body: [
          'Use `@kevinmarmstrong/edgekit-react` when a React app wants idiomatic hooks and JSX while preserving the same browser-native runtime and `<edge-chat>` renderer.',
          '`EdgeChat` wraps the web component. `useEdgeAgent()` and `createEdgeAgentController()` expose streaming text, approval state, events, and activity rows for custom React surfaces.',
        ],
        code: {
          language: 'tsx',
          text: `import { EdgeChat, useEdgeAgent } from '@kevinmarmstrong/edgekit-react'

function Assistant({ agent }) {
  const edge = useEdgeAgent(agent)

  return (
    <>
      <EdgeChat
        systemPrompt="You are a concise app assistant."
        onReady={chat => chat.useAgent?.(agent)}
      />
      {edge.state.activities.map(activity => (
        <p key={activity.id}>{activity.label}</p>
      ))}
    </>
  )
}`,
        },
      },
      {
        id: 'ag-ui-agent',
        title: 'AG-UI agent',
        body: ['Use `useAgent()` when the agent UI should be powered by an AG-UI-compatible backend instead of the built-in browser model cascade.'],
        code: {
          language: 'ts',
          text: `import { createAgUiAgent } from '@kevinmarmstrong/edgekit-agui'

const agent = createAgUiAgent({
  endpoint: '/api/ag-ui/support-agent',
})

const chat = document.querySelector('edge-chat')
chat?.useAgent(agent)`,
        },
      },
      {
        id: 'actions',
        title: 'User actions',
        body: [
          'Use `registerActions()` to turn tool results into fillable CTAs. This keeps users out of unnecessary chat-confirmation turns: the agent can search, then the UI can render a size selector, plan picker, support-category menu, booking date field, or other app-specific form before running a registered tool.',
          'Action forms resolve against the active tool surface, including `toolProvider` and RBAC-filtered manifests. Forms created by host-owned `registerActions()` are treated as trusted user-confirmed CTAs; arbitrary EdgeView or AG-UI forms cannot execute tools that are hidden from the current session or marked `needsApproval`.',
          'Tool-call trace messages are hidden by default. Add the `show-tool-events` attribute when you want visible debugging markers.',
        ],
        code: {
          language: 'ts',
          text: `chat?.registerActions(({ toolName, output }) => {
  if (toolName !== 'searchProducts' || !Array.isArray(output.results)) return []

  return output.results.map(product => ({
    id: \`add-\${product.id}\`,
    label: \`Add \${product.name} to cart\`,
    toolName: 'addToCart',
    description: 'Choose required details before running the app action.',
    input: { productId: product.id, quantity: 1 },
    fields: [
      {
        name: 'size',
        label: 'Size',
        type: 'select',
        required: true,
        options: product.sizes.map(size => ({ label: size, value: size })),
      },
    ],
  }))
})`,
        },
      },
      {
        id: 'states',
        title: 'Built-in states',
        body: ['The component renders the states expected in an embedded agent workflow.'],
        bullets: [
          'Provider status: checking, downloading, ready, unavailable, error.',
          'Download prompt for local model setup when policy allows prompting.',
          'Approval prompt for guarded tools.',
          'Optional tool-call markers when `show-tool-events` is enabled.',
          'Action cards with select, text, and number fields from `registerActions()`.',
          'No-model fallback messages for browsers without local model support.',
        ],
      },
    ],
  },
  {
    slug: 'cli',
    navLabel: 'Docs Indexing',
    title: 'Documentation index CLI',
    summary: 'Build a portable docs index and expose it as an edgekit search tool.',
    sections: [
      {
        id: 'index-command',
        title: 'Index project docs',
        body: ['The CLI creates JSON that can be registered behind a normal tool.'],
        code: {
          language: 'bash',
          text: 'pnpm --filter @kevinmarmstrong/edgekit-cli build\npnpm --filter @kevinmarmstrong/edgekit-cli index -- README.md DESIGN.md --out edgekit-docs-index.json',
        },
      },
      {
        id: 'register-docs-tool',
        title: 'Register a docs search tool',
        body: ['The public site uses this pattern for the project Q&A demo.'],
        code: {
          language: 'ts',
          text: `const searchDocsTool = tool({
  description: 'Search project documentation.',
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }) => ({ query, results: searchDocs(query) }),
})`,
        },
      },
    ],
  },
  {
    slug: 'mission-profiles',
    navLabel: 'Mission Profiles',
    title: 'Mission Profile authoring',
    summary: 'Design Skills and Mission Profiles that localize one agent mission while executable tools remain app-owned.',
    sections: [
      {
        id: 'belongs-where',
        title: 'What belongs where',
        body: [
          'Primitives are Edgekit-owned runtime capabilities: model routing, execution, telemetry, audit, redaction, rendering, memory, and provider adapters.',
          'Skills describe one capability with examples, approval posture, required facts, and UI hints. Mission Profiles assemble those Skills into one app-owned agent mission.',
        ],
      },
      {
        id: 'minimal-profile',
        title: 'Minimal profile',
        body: [
          'Profiles should name a narrow mission, list expected app-owned tools with `requiredTools`, set local-first defaults, and spell out synthesis rules that the harness can test.',
        ],
        code: {
          language: 'ts',
          text: `const profile = createMissionProfile({
  id: 'support-queue-v1',
  mission: 'support-workflow',
  version: '1.0.0',
  systemPrompt: 'Search the support queue before answering. Ask for approval before creating tickets.',
  requiredTools: ['searchTickets', 'createTicket'],
  defaults: { toolChoice: 'required', downloadPolicy: 'never' },
  synthesis: { requiredAttributes: ['ticketId', 'status', 'owner'], style: 'explicit' },
})`,
        },
      },
      {
        id: 'executable-tools',
        title: 'Executable tools stay app-owned',
        body: [
          'A profile declares expected tools. The host app still registers executable implementations, owns authorization, and remains the source of truth for state changes.',
        ],
        code: {
          language: 'ts',
          text: `chat.applyMissionProfile(profile)
chat.registerTools({ searchTickets, createTicket })`,
        },
      },
      {
        id: 'validation',
        title: 'Validate before mounting',
        body: [
          '`validateMissionProfile()` catches structural foot-guns before users hit the agent workflow: missing ids, duplicate required tools, `toolChoice: "required"` with no tool contract, and required tools that were never registered.',
        ],
        code: {
          language: 'ts',
          text: `const validation = validateMissionProfile(profile, {
  registeredTools: ['searchTickets', 'createTicket'],
})

if (!validation.ok) {
  throw new Error(validation.errors.map(issue => issue.message).join('\\n'))
}`,
        },
      },
      {
        id: 'quality-checklist',
        title: 'Quality checklist',
        body: ['Use this checklist before treating a profile as production-ready.'],
        bullets: [
          'The profile names a narrow mission.',
          'Each expected tool maps to a real app-owned implementation.',
          '`validateMissionProfile(profile, { registeredTools })` passes with zero errors.',
          'Risky tools require approval.',
          'Required facts are tested in final user-visible output.',
          'Telemetry and audit are wired before release.',
          'State and identity providers summarize context without exposing secrets.',
        ],
      },
    ],
  },
  {
    slug: 'skill-optimization',
    navLabel: 'Skill Optimization',
    title: 'Skill optimization principles and maintainer loop',
    summary: 'Adopter-safe principles for measured Skill edits, plus maintainer-facing optimization loops for the public project.',
    sections: [
      {
        id: 'research-basis',
        title: 'Research basis',
        body: [
          'Edgekit treats Skills and Mission Profiles as inspectable artifacts that can improve without changing runtime model weights.',
          'This direction is inspired by SkillOpt: Executive Strategy for Self-Evolving Agent Skills.',
        ],
        bullets: [
          'Paper: https://arxiv.org/pdf/2605.23904',
          'Related ecosystem release: https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering/releases/tag/v2.3.0',
        ],
      },
      {
        id: 'two-surfaces',
        title: 'Description and body are separate surfaces',
        body: [
          'The Skill `description` is router-visible. The `instructions` body is activated after selection.',
          'Outcome tests must catch disagreement between these two surfaces.',
        ],
        code: {
          language: 'ts',
          text: `const searchSkill = createSkill({
  id: 'catalog-search-v1',
  name: 'Catalog Search',
  description: 'Answer catalog availability, exact price, size, color, and stock questions.',
  instructions: 'Always restate price, sizes, color, and stock signals from tool results.',
  protectedSections: ['policy', 'instructions.safety'],
  requiredTools: ['searchProducts'],
})`,
        },
      },
      {
        id: 'protected-state',
        title: 'Fast state and slow state',
        body: [
          'Fast state includes recent failures, traces, prompt variants, rejected patches, and score deltas.',
          'Slow state includes safety invariants, host-app authority boundaries, tone, tool policies, and durable synthesis rules.',
        ],
      },
      {
        id: 'acceptance-gate',
        title: 'Acceptance gate',
        body: [
          'Held-out validation is the gate. Candidate edits must strictly improve the score; ties are rejected.',
          'Patch size should be bounded, usually 4-8 operations.',
        ],
        code: {
          language: 'ts',
          text: `const candidate = validateSkillOptimizationCandidate({
  skillId: 'catalog-search-v1',
  baselineScore: 0.94,
  candidateScore: 0.97,
  protectedPaths: ['policy', 'instructions.safety'],
  patch: [
    {
      op: 'replace',
      path: 'description',
      value: 'Answer product availability, exact price, size, color, and stock questions.',
    },
  ],
})`,
        },
      },
      {
        id: 'per-skill-effect-size',
        title: 'Per-skill effect size',
        body: [
          'Do not rely only on aggregate score. Report per-skill baseline, candidate score, and improvement.',
        ],
        code: {
          language: 'ts',
          text: `const report = summarizeSkillOptimizationScores([
  { skillId: 'catalog-search-v1', baselineScore: 0.72, candidateScore: 0.95 },
  { skillId: 'admin-update-v1', baselineScore: 0.98, candidateScore: 0.99 },
])`,
        },
      },
      {
        id: 'live-pages-loop',
        title: 'Maintainer: Live GitHub Pages Optimization Loop',
        body: [
          'This is project-process material for Edgekit maintainers. Use the deployed GitHub Pages site as a held-out public surface when tuning documentation-facing Skills for this repository.',
          'The maintainer optimizer report maps suite IDs to Skills, calculates per-skill scores from live transcripts, and validates bounded candidates against protected paths. Adopters should copy the principle, not the exact public-site command shape.',
        ],
        code: {
          language: 'bash',
          text: `EDGEKIT_SUITE_TARGET=live EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_SUITE_HEADLESS=0 EDGEKIT_SUITE_OUTPUT=research-results/skill-optimization/live-before.json pnpm research:suite
EDGEKIT_SKILL_RESULT=research-results/skill-optimization/live-before.json pnpm optimize:skills

EDGEKIT_SKILL_BASELINE=research-results/skill-optimization/live-before.json EDGEKIT_SKILL_RESULT=research-results/agent-suite.json pnpm optimize:skills`,
        },
      },
      {
        id: 'recommended-loop',
        title: 'Recommended loop',
        body: ['Run optimization as a development or CI loop, not as inference-time behavior.'],
        bullets: [
          'Split prompts into train, selection, and held-back test sets.',
          'Collect transcripts, tool calls, UI state, approval events, and rubric failures.',
          'Ask an optimizer model for a bounded patch, not a full rewrite.',
          'Validate the candidate with `validateSkillOptimizationCandidate()`.',
          'Accept only strict improvements with safety, workflow state, and answer faithfulness green.',
          'Store accepted and rejected patch history.',
        ],
      },
    ],
  },
  {
    slug: 'production',
    navLabel: 'Production',
    title: 'Production readiness',
    summary: 'Security, telemetry, local/cloud routing, approvals, and release checks for real deployments.',
    sections: [
      {
        id: 'local-first',
        title: 'Local-first defaults',
        body: [
          'Use Chrome AI or WebLLM for low-cost, private, low-latency work. Escalate only when task complexity, policy, or model availability requires it.',
        ],
        bullets: [
          'Use local models for intent classification, simple tool extraction, local app navigation, and privacy-sensitive page context.',
          'Escalate for deep multi-source reasoning, regulated workflows that require approved server routes, explicit cloud-capable synthesis, or server-side logging policy.',
        ],
      },
      {
        id: 'tool-ownership',
        title: 'Tool ownership',
        body: [
          'The host app owns state, authorization, and business logic. Edgekit calls registered tools; it does not replace backend authorization.',
        ],
      },
      {
        id: 'risk-telemetry-security',
        title: 'Risk, telemetry, and security',
        body: [
          'Every risky mutation must use approval, audit, and telemetry. Rejections must preserve state.',
          'Capture run start, run finish, tool call, approval, rejection, model status, and error events.',
          'Do not put JWTs, cookies, API keys, payment data, or regulated records into system prompts, memory, or state summaries.',
        ],
      },
      {
        id: 'profile-validation',
        title: 'Profile validation',
        body: [
          'Run `validateMissionProfile(profile, { registeredTools })` in local development, CI, or app startup diagnostics. Validation proves the profile is structurally executable; the outcome harness proves the agent made the right decisions and produced faithful user-visible output.',
        ],
      },
      {
        id: 'release-checklist',
        title: 'Release checklist',
        body: ['Run the release battery before shipping a public release.'],
        bullets: [
          '`pnpm test`',
          '`pnpm typecheck`',
          '`pnpm build`',
          '`pnpm test:e2e`',
          '`pnpm eval:adoption`',
          '`pnpm research:agents`',
          '`pnpm research:suite`',
          'strict real-provider run when available',
        ],
      },
    ],
  },
  {
    slug: 'reproducibility',
    navLabel: 'Maintainer Proof',
    title: 'Maintainer reproducibility guide',
    summary: 'Project-process guidance for verifying Edgekit local models, fallback behavior, live Pages, cloud routes, and outcome quality.',
    sections: [
      {
        id: 'goal',
        title: 'Maintainer goal',
        body: [
          'This public page documents the Edgekit project maintainer proof process. The goal is to make evidence repeatable outside the maintainer machine. A passing run should say which provider path was exercised, which host was tested, which scenarios were skipped, and whether skips were required or environmental.',
          'Treat model availability as an environment fact, not a product claim. Chrome AI, WebLLM, cloud routes, and no-model fallback should each have explicit proof or an explicit skip reason.',
        ],
      },
      {
        id: 'baseline',
        title: 'Baseline local gates',
        body: ['Start with deterministic checks. These do not prove model quality, but they prove the repo and public surfaces are executable.'],
        code: {
          language: 'bash',
          text: `pnpm install
pnpm test
pnpm typecheck
pnpm build
pnpm test:e2e
pnpm eval:adoption
pnpm research:suite`,
        },
      },
      {
        id: 'provider-matrix',
        title: 'Provider matrix',
        body: [
          'Use the provider matrix to separate capability from availability. A local Chrome AI/Nano run, a WebLLM-capable host, an explicit cloud route, and no-model fallback are different architectures and should be reported separately.',
        ],
        bullets: [
          'Chrome AI/Nano: launch a Chrome profile with model support, connect through CDP, and run strict provider checks.',
          'WebLLM: use a host with cross-origin isolation headers and enough device memory for the selected model.',
          'Cloud route: provide `EDGEKIT_SUITE_CLOUD_ROUTE_URL` for a developer-owned model endpoint. The Cloudflare proof host exercises this lane beyond GitHub Pages.',
          'No-model fallback: verify the app still produces honest basic-mode answers and never pretends an agent model ran.',
          'Live Pages: run `EDGEKIT_SUITE_TARGET=live pnpm research:suite` and record public-host limitations honestly.',
          'Clean-room adoption: run `pnpm proof:clean-room-adoption` to prove packed packages, CLI recipes, Mission Profile validation, build, and first-serious deterministic outcome checks outside the monorepo.',
        ],
        code: {
          language: 'bash',
          text: `pnpm chrome:profile
EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:suite

EDGEKIT_SUITE_PROVIDER_MODES=cloud-route EDGEKIT_SUITE_CLOUD_ROUTE_URL=https://edgekit-cloudflare-sidecar.kevinmichaelarmstrong.workers.dev/api/edgekit/cloud-route EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:suite

EDGEKIT_SUITE_PROVIDER_MODES=none pnpm research:suite

pnpm proof:clean-room-adoption

EDGEKIT_SUITE_TARGET=live pnpm research:suite`,
        },
      },
      {
        id: 'evidence',
        title: 'Evidence to keep',
        body: ['A useful run leaves enough data for another maintainer, coding agent, or adopter to inspect what actually happened.'],
        bullets: [
          '`research-results/agent-suite.json`: machine-readable score, skip, failure, category, and provider evidence.',
          '`research-results/agent-suite.md`: human-readable scenario summary.',
          '`research-results/provider-matrix.md`: provider-by-host pass, fail, and skip reasons.',
          '`research-results/provider-matrix-cloudflare.md`: hosted Cloudflare cloud-route proof beyond GitHub Pages.',
          '`research-results/adopter-simulations/latest.md`: clean-room packed-artifact adoption proof.',
          '`research-results/suite-screenshots/*`: browser screenshots for product surfaces.',
          'Live URL, commit SHA, Chrome version, model availability result, and whether the run was strict.',
        ],
      },
      {
        id: 'interpretation',
        title: 'Interpretation',
        body: [
          'A green deterministic run means the integration contract works. A green strict provider run means the current machine and browser can exercise the local-model path. A green live Pages run means the public docs and demos still satisfy outcome checks under public-host constraints.',
          'Do not collapse these into one claim. A production-ready report should say exactly which architecture was tested and which architecture still needs evidence.',
        ],
      },
    ],
  },
  {
    slug: 'runtime-guarantees',
    navLabel: 'Guarantees',
    title: 'Runtime guarantees',
    summary: 'What Edgekit enforces at runtime, what the harness proves, and what remains host-app responsibility.',
    sections: [
      {
        id: 'contract-types',
        title: 'Two contract types',
        body: [
          'Edgekit has runtime guarantees and authoring contracts. Runtime guarantees are enforced by core, UI, tests, or tool execution. Authoring contracts guide humans, coding agents, documentation, and harnesses, but are not safety boundaries by themselves.',
        ],
      },
      {
        id: 'guarantee-table',
        title: 'Guarantee table',
        body: [
          '`requiredTools`, safe profile application, registered executable tools, tool `needsApproval`, telemetry, audit primitives, and profile validation have runtime behavior today.',
          'EdgeView action forms are also runtime-mediated. Submitted forms resolve against the active tool surface, including `toolProvider` and RBAC-filtered manifests. Host-owned `registerActions()` forms are trusted user-confirmed CTAs; arbitrary EdgeView or AG-UI forms cannot execute tools hidden from the current session or marked `needsApproval`.',
          'Model-history redaction applies before tool results and approval responses are retained for later turns. It redacts payloads while preserving protocol metadata such as `toolName`, `toolCallId`, and approval ids so approval-gated flows remain executable.',
          '`synthesis`, mission-level `policy`, `uiAffordances`, and optimization metadata are authoring and harness contracts today. Use outcome tests to prove their intended behavior.',
        ],
      },
      {
        id: 'release-rule',
        title: 'Release rule',
        body: [
          'If a value changes state, authorization, money, account status, inventory, or regulated data, put the guardrail on the executable tool and backend authorization path. Do not rely on descriptive metadata alone.',
        ],
      },
    ],
  },
  {
    slug: 'distribution-readiness',
    navLabel: 'Maintainer Dist.',
    title: 'Maintainer distribution readiness',
    summary: 'Project-process checks for packages, fresh-app fixtures, and public release readiness outside the monorepo.',
    sections: [
      {
        id: 'fresh-app-smoke',
        title: 'Maintainer fresh app smoke',
        body: [
          'This is maintainer-facing release process. A release candidate must build from packed packages in a fresh app fixture. This catches workspace-only dependencies, missing files, and package README drift before public publish.',
        ],
        code: { language: 'bash', text: 'pnpm build\npnpm pack:packages\npnpm test:fresh-app' },
      },
      {
        id: 'compatibility',
        title: 'Compatibility policy',
        body: [
          'Core primitives follow semver. Mission Profiles should declare compatibility metadata. Runtime behavior changes that affect approvals, tool execution, provider routing, or EdgeView require migration notes and harness proof.',
        ],
      },
    ],
  },
  {
    slug: 'production-recipes',
    navLabel: 'Recipes',
    title: 'Production recipes',
    summary: 'Concrete telemetry, audit, RBAC, state hydration, and escalation patterns for real apps.',
    sections: [
      {
        id: 'ownership-boundary',
        title: 'Ownership boundary',
        body: [
          'Edgekit is strongest when each responsibility has one owner. The host app owns identity truth, backend authorization, business state, retrieval infrastructure, persistence, and provider secrets. Edgekit owns the agent runtime, tool-call protocol, approval UX, telemetry/audit event contracts, and validation helpers.',
          'Do not move app authority into prompts. Put authority in executable tools, backend policy, and outcome tests.',
        ],
        bullets: [
          'Identity: host app owns login, JWTs, cookies, tenant truth, and permissions; Edgekit receives safe public summaries.',
          'State: host app owns carts, orders, inventory, tickets, and records; Edgekit renders tool-call and approval outcomes.',
          'Knowledge: host app owns vector, graph, SQL, CMS, or API retrieval; Edgekit packages it as a cited Knowledge Access Skill.',
          'Mutations: host app owns API writes, idempotency, validation, and conflicts; Edgekit owns approval protocol and evidence events.',
          'Escalation: host app owns provider secrets and rate limits; Edgekit owns local-first routing hooks and handoff envelopes.',
        ],
      },
      {
        id: 'telemetry-audit',
        title: 'Telemetry and audit',
        body: [
          'Capture run start, run finish, model status, tool calls, tool results, approval decisions, errors, and UI actions. Persist audit entries server-side when workflow compliance matters.',
        ],
      },
      {
        id: 'rbac-state',
        title: 'RBAC and state',
        body: [
          'Use `identityProvider`, `sessionProvider`, `stateProvider`, and RBAC-filtered tool manifests to pass public context into the agent without putting JWTs, cookies, or secret claims into the prompt.',
        ],
      },
      {
        id: 'escalation',
        title: 'Local vs cloud escalation',
        body: [
          'Use local browser models for intent, simple tool extraction, local page help, and privacy-sensitive context. Escalate through explicit developer-owned routes for deep synthesis, required server logging, or repeated local-model failures.',
        ],
      },
      {
        id: 'recipe-shape',
        title: 'Recipe shape',
        body: [
          'Opinionated recipes should remain additive to the core docs. A recipe can know about Astro, support workflows, intake pipelines, ERP dispatch, or a retrieval stack, but it should still emit the same Edgekit primitives.',
        ],
        bullets: [
          '2-5 Skills and one Mission Profile.',
          'Typed app-owned tools and explicit approval policy for mutations.',
          'Telemetry and audit hooks.',
          'Knowledge Access when retrieval is needed.',
          'Outcome scenarios for read, approve, reject, no-evidence, and hostile prompts.',
          'Replacement notes that identify exactly what the real app should own.',
        ],
      },
    ],
  },
  {
    slug: 'security-threat-model',
    navLabel: 'Security',
    title: 'Security threat model',
    summary: 'Security boundaries for prompt secrets, tool authorization, approvals, redaction, and third-party tools.',
    sections: [
      {
        id: 'boundary',
        title: 'Boundary',
        body: [
          'The host application is authoritative for user identity, tenant permissions, database writes, external API calls, payment records, inventory, and regulated data.',
          'Edgekit owns the agent event stream, provider routing hooks, approval request/resume protocol, UI primitives, telemetry/audit event contracts, and validation helpers.',
        ],
      },
      {
        id: 'controls',
        title: 'Controls',
        bullets: [
          'Never put JWTs, cookies, API keys, payment data, or secret claims in prompts, memory, or state summaries.',
          'Keep backend authorization and RBAC checks inside host-owned tools.',
          'Use `needsApproval` for risky executable tools.',
          'Use guarded tool execution for dynamic or third-party tools.',
          'Redact sensitive tool output before UI, telemetry, audit, or cloud handoffs.',
        ],
        body: [],
      },
    ],
  },
  {
    slug: 'migration-upgrades',
    navLabel: 'Upgrades',
    title: 'Migration and upgrades',
    summary: 'How to move from raw configure calls to profile-owned agent workflows and upgrade safely.',
    sections: [
      {
        id: 'raw-to-profile',
        title: 'Raw configure to profile',
        body: [
          'Move mission-specific prompts, required tools, synthesis rules, and safety intent into a Mission Profile. Keep executable tools app-owned and registered with `registerTools()`.',
        ],
      },
      {
        id: 'upgrade-gate',
        title: 'Upgrade gate',
        body: [
          'Before accepting a core upgrade, run profile validation, focused outcome scenarios, and compare `synthesisFaithfulness`, `safety`, `workflowState`, and `answerQuality`.',
        ],
      },
    ],
  },
  {
    slug: 'outcome-quality',
    navLabel: 'Outcome Quality',
    title: 'Testing outcome quality',
    summary: 'Measure whether the agent achieved the workflow and answer quality the user needed.',
    sections: [
      {
        id: 'do-not-stop-at-code-ran',
        title: 'Do not stop at code ran',
        body: [
          'Agent tests must verify the final user-visible answer, generated UI, approval boundary, telemetry, and app state. A green tool call is not enough if the user-visible answer drops the facts the user asked for.',
        ],
        bullets: [
          '`answerQuality`',
          '`synthesisFaithfulness`',
          '`safety`',
          '`workflowState`',
          '`generativeUi`',
          '`observability`',
          '`integrationTransparency`',
        ],
      },
      {
        id: 'catalog-example',
        title: 'Catalog example',
        body: ['For `how much are Nike dunks and what sizes are carried?`, passing output must show Nike Dunk Low, $64.99, sizes 9, 10, 11, White / Black, and no cart mutation.'],
      },
      {
        id: 'mutation-example',
        title: 'Mutating workflow example',
        body: [
          'For `find me size nine white nike dunks and put in cart`, passing output must search first, request approval before `addToCart`, add size 9 only after approval, and leave cart unchanged after rejection.',
        ],
      },
      {
        id: 'harness-rule',
        title: 'Harness rule',
        body: [
          'Add or update scenario and rubric checks before tuning a demo-specific response. Prefer reusable Edgekit fixes over narrow demo patches.',
        ],
      },
    ],
  },
  {
    slug: 'adopter-simulation',
    navLabel: 'Maintainer Adoption',
    title: 'Maintainer adopter simulation',
    summary: 'Project-process loops for proving elite programmers and agent-assisted builders can reach production-grade agent workflows.',
    sections: [
      {
        id: 'agent-assisted-path',
        title: 'Maintainer: 30-minute agent-assisted path',
        body: [
          'This page documents a maintainer evaluation loop, not a required adopter workflow. An agent-assisted builder should be able to choose one mission, copy the starter, replace tool executes with app-owned APIs, mount `<edge-chat>`, validate the Mission Profile, and record the first serious outcome run inside 30-45 minutes.',
          'The coding agent may use public docs, package READMEs, `llms.txt`, `llms-full.txt`, and starter artifacts. Hidden maintainer knowledge or demo-specific hardcodes are failure signals.',
        ],
      },
      {
        id: 'evidence-levels',
        title: 'Evidence levels',
        body: [
          '`dry-run` proves docs are understandable enough to plan from. `starter-run` proves the starter can become a real mission. `first-serious-run` proves a realistic sidecar reaches score >= 0.95 with required failures 0. `production-shaped` adds telemetry, audit, RBAC/state boundaries, and provider-lane proof.',
        ],
      },
      {
        id: 'elite-programmer-path',
        title: '90-minute elite programmer path',
        body: [
          'An expert developer should be able to read the architecture, inspect extension points, build a profile-owned sidecar, add telemetry/audit/state/identity providers, add a harness scenario, and run the full test battery.',
        ],
      },
      {
        id: 'starter-kit',
        title: 'Mission Profile starter kit',
        body: [
          'Use `docs/templates/mission-profile-starter/profile.ts` and `docs/templates/mission-profile-starter/harness-scenarios.json` as the copyable starting point for a new mission.',
        ],
      },
      {
        id: 'passing-standard',
        title: 'Passing standard',
        body: [
          'The workflow must finish its first serious harness run with 0 required failures after reasonable setup and bounded tuning. The evaluation must include answer quality, generated UI, approval boundaries, telemetry, app state, provider honesty, and host-app authority.',
          'If the first serious run fails, keep it in the report. Then record the smallest reusable fix that improved the result.',
        ],
      },
      {
        id: 'report-records',
        title: 'Required records',
        body: [
          'Record timing, files changed, public docs consulted, validation errors/warnings, outcome scores, required failures/skips, provider lane, screenshots or transcripts, friction points, fixes made, and remaining risks.',
        ],
      },
    ],
  },
  {
    slug: 'testing',
    navLabel: 'Maintainer Tests',
    title: 'Maintainer testing loops',
    summary: 'Project-process test and research loops for Edgekit CI, provider quality, adoption quality, and release gates.',
    sections: [
      {
        id: 'workflow-tests',
        title: 'Maintainer deterministic workflow tests',
        body: [
          'This public page documents the Edgekit maintainer test process. The ecommerce and admin demos include scripted provider modes. They are not the user-facing model path. They exist so CI can prove tool calling, approval prompts, rejection, and state mutation without depending on local model availability.',
          'Scripted providers should validate Edgekit contracts rather than patch a fixture. In particular, approval-loop tests should assert that the exact approved tool input survives resume, not just that the demo happens to add a known product or update a known account.',
        ],
        code: {
          language: 'bash',
          text: 'pnpm test:workflows\npnpm test:e2e',
        },
      },
      {
        id: 'model-evals',
        title: 'Real-model evals',
        body: [
          '`pnpm eval:models` launches a browser against the standalone ecommerce demo and records model/provider behavior to `test-results/model-cascade-eval.json`. Model unavailability is reportable by default and becomes a failure when `EDGEKIT_REQUIRE_REAL_MODEL=1` is set.',
        ],
        code: {
          language: 'bash',
          text: 'pnpm eval:models\nEDGEKIT_EVAL_HEADLESS=0 pnpm eval:models\nEDGEKIT_REQUIRE_REAL_MODEL=1 pnpm eval:models',
        },
      },
      {
        id: 'adoption-quality',
        title: 'Adoption-quality evals',
        body: [
          '`pnpm eval:adoption` opens the docs Q&A demo and the site-wide site assistant, asks developer implementation and safety questions, and records the actual transcripts to `research-results/adoption-quality.*`.',
          'This gate exists because a returned docs-search result is not the same thing as a useful answer. The rubric rejects stock snippet dumps and requires concrete integration steps, host-app authority, local-first value, approval boundaries, and unsafe-secret guidance.',
        ],
        code: {
          language: 'bash',
          text: 'pnpm eval:adoption\nEDGEKIT_ADOPTION_TARGET=live pnpm eval:adoption\nEDGEKIT_ADOPTION_HEADLESS=0 pnpm eval:adoption\nEDGEKIT_ADOPTION_STRICT=0 pnpm eval:adoption',
        },
      },
      {
        id: 'research-loops',
        title: 'Research loops',
        body: [
          '`pnpm research:agents` is the end-to-end product research harness. It opens the docs site and demos in Chromium, sends real user prompts, scores answer quality, verifies approval boundaries, checks app state after mutations, probes AG-UI component rendering, confirms site self-test coverage, and captures transcripts plus screenshots.',
          'Run it locally before release work and against GitHub Pages after deploy. The goal is to tune Edgekit contracts, reusable harnesses, prompts, and integration guidance. Do not use it as an excuse to add hardcoded patches that only satisfy one demo fixture.',
        ],
        code: {
          language: 'bash',
          text: 'pnpm research:agents\nEDGEKIT_RESEARCH_TARGET=live pnpm research:agents\nEDGEKIT_RESEARCH_HEADLESS=0 pnpm research:agents\nEDGEKIT_RESEARCH_STRICT=0 pnpm research:agents',
        },
      },
      {
        id: 'expansive-suite',
        title: 'Expansive outcome suite',
        body: [
          '`pnpm research:suite` is deterministic regression and outcome coverage. It reads scenario packs from `evals/agent-suite/scenarios.json`, applies thresholds from `evals/agent-suite/rubric.json`, runs seeded prompt variants across browser demos, and executes architecture probes that cannot be safely exposed from GitHub Pages.',
          'The suite covers Chrome AI/WebLLM/provider fallback behavior, hybrid cloud-route selection, supervisor handoffs, response caching, tool repair, MCP adapters, tool policy boundaries, offline mutation journals, parallel-safe tools, PII redaction, loaded-page offline behavior, AG-UI rendering, admin approvals, and agent-readable docs. Treat it as regression evidence with 0 required failures and 0 required skips, then pair it with `pnpm research:quality` and provider-matrix lanes before making browser-local claims. Strict real-provider runs can target a dedicated Chrome profile through `EDGEKIT_CHROME_USER_DATA_DIR` or a normal Chrome remote-debugging session through `EDGEKIT_CHROME_CDP_URL`.',
        ],
        code: {
          language: 'bash',
          text: 'pnpm research:env\npnpm research:suite\npnpm research:quality\npnpm research:full\npnpm chrome:profile\npnpm test:routes\nEDGEKIT_SUITE_TARGET=live pnpm research:suite\nEDGEKIT_SUITE_PROMPT_LIMIT=2 pnpm research:suite\nEDGEKIT_QUALITY_PROMPT_LIMIT=2 pnpm research:quality\nEDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:full\nEDGEKIT_CHROME_USER_DATA_DIR="$HOME/.edgekit/chrome-profile" EDGEKIT_SUITE_HEADLESS=0 EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:full\nEDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_SUITE_CLOUD_ROUTE_URL=http://127.0.0.1:4198/api/edgekit/cloud-route EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:full',
        },
      },
      {
        id: 'release-gates',
        title: 'Release gates',
        body: ['Run the full gates before publishing a public release.'],
        bullets: ['`pnpm test`', '`pnpm typecheck`', '`pnpm build`', '`pnpm test:e2e`', '`pnpm eval:adoption`', '`pnpm research:agents`', '`pnpm research:suite`'],
      },
    ],
  },
  {
    slug: 'deployment',
    navLabel: 'Maintainer Deploy',
    title: 'Maintainer deployment and hosting',
    summary: 'Project-process notes for Edgekit public docs hosting, GitHub Pages, and WebLLM-capable preview hosts.',
    sections: [
      {
        id: 'github-pages',
        title: 'Maintainer GitHub Pages',
        body: [
          'This is maintainer-facing deployment process. The canonical public site is deployed from `site/dist` by `.github/workflows/pages.yml`. GitHub Pages is good for the docs, Chrome AI demos, and basic fallback demos.',
        ],
      },
      {
        id: 'webllm-hosting',
        title: 'WebLLM hosting headers',
        body: [
          'WebLLM works best when the host can set cross-origin isolation headers. The repo includes local Vite headers plus a Cloudflare Pages `_headers` file.',
        ],
        code: {
          language: 'http',
          text: `Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: cross-origin`,
        },
      },
      {
        id: 'cloudflare-pages',
        title: 'Cloudflare Pages',
        body: ['The repo includes `site/wrangler.jsonc` and a convenience deploy script for a WebLLM-capable Pages host.'],
        code: {
          language: 'bash',
          text: 'pnpm deploy:cloudflare',
        },
      },
    ],
  },
]

export function getDocsPage(slug: string) {
  return docsPages.find(page => page.slug === slug) ?? docsPages[0]
}

export function docsPath(page: DocsPage) {
  return page.slug === 'overview' ? '/docs/' : `/docs/${page.slug}/`
}
