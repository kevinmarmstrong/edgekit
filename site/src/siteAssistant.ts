import '@kevinmarmstrong/edgekit-ui/lite'
import { chromeAI, tool } from '@kevinmarmstrong/edgekit'
import type { EdgeTelemetrySink } from '@kevinmarmstrong/edgekit'
import { createGroundedQaSkill } from '@kevinmarmstrong/edgekit-knowledge'
import type { EdgeKnowledgeResult } from '@kevinmarmstrong/edgekit-knowledge'
import { EdgeChat as EdgeChatElement } from '@kevinmarmstrong/edgekit-ui/lite'
import type { EdgeChat } from '@kevinmarmstrong/edgekit-ui/lite'
import { z } from 'zod'
import { searchDocs } from './content'
import { composeEdgekitAnswer } from './answerComposer'

type SiteAssistantOptions = {
  telemetry?: EdgeTelemetrySink
}

const demoLinks = [
  { label: 'Ecommerce retrofit', href: 'https://edgekit-demo-ecommerce.pages.dev/', description: 'External COOP/COEP packed-package demo with product search, generated add-to-cart CTAs, and approval gates.' },
  { label: 'Field ops ERP', href: '/demos/operations/', description: 'Work-order triage, inventory reservation, and technician dispatch.' },
  { label: 'Docs Q&A', href: 'https://edgekit-demo-docs.pages.dev/', description: 'External Knowledge Access demo with citations and transparent fallback.' },
  { label: 'AG-UI event stream', href: '/demos/ag-ui/', description: 'Generated forms, charts, tables, and cards from an event stream.' },
  { label: 'SaaS admin workflow', href: 'https://edgekit-demo-admin.pages.dev/', description: 'External approval-gated account workflow with app-owned audit.' },
  { label: 'Mission control', href: '/demos/mission-control/', description: 'Telemetry for runs, tools, approvals, and model fallback.' },
  { label: 'Cascade and permission lab', href: '/demos/cascade/', description: 'Resettable browser-model, permission, fallback, validation, and feature-gating flows.' },
]
const siteBasePath = import.meta.env.BASE_URL.replace(/\/$/, '')

const siteQa = createGroundedQaSkill({
  id: 'edgekit-site',
  name: 'Edgekit site Q&A',
  description: 'Answer questions from the public Edgekit docs and project guidance.',
  toolName: 'searchDocs',
  identity: {
    name: 'Edgekit site assistant',
    description: 'Built with Edgekit and grounded in the public Edgekit docs.',
    noEvidenceMessage: 'I did not find a matching Edgekit docs section.',
    modelDisclosure: 'technical',
  },
  source: {
    id: 'edgekit-docs',
    label: 'Edgekit docs',
    description: 'Public Edgekit documentation and project guidance.',
    search: async query => searchDocs(query).map(toKnowledgeResult),
  },
})

const listDemosTool = {
  ...tool({
  description: 'List the public edgekit demo pages and what each one proves. Leave focus empty unless the user asks for one specific demo area.',
  inputSchema: z.object({
    focus: z.string().optional().describe('Optional demo area such as ecommerce, admin, AG-UI, docs, or telemetry'),
  }),
  execute: async ({ focus }) => {
    const normalized = focus?.toLowerCase()
    const shouldFilter = normalized && !/\b(all|available|demo|demos|surface|surfaces|try|what)\b/i.test(normalized)
    const demos = shouldFilter
      ? demoLinks.filter(demo => `${demo.label} ${demo.description}`.toLowerCase().includes(normalized))
      : demoLinks
    return {
      currentPage: currentPageSummary(),
      demos: demos.map(demo => ({ ...demo, href: absoluteOrSiteHref(demo.href) })),
      total: demos.length,
    }
  },
  }),
  readOnly: true,
  parallelSafe: true,
}

export function mountSiteAssistant(options: SiteAssistantOptions = {}) {
  if (document.querySelector('#site-assistant')) return
  ensureEdgeChatDefined()

  const basePath = siteBasePath
  const wrapper = document.createElement('aside')
  wrapper.id = 'site-assistant'
  wrapper.className = 'site-assistant'
  wrapper.dataset.open = 'false'
  wrapper.setAttribute('aria-label', 'edgekit site assistant')
  wrapper.innerHTML = `
    <button class="site-assistant-toggle" type="button" aria-expanded="false" aria-controls="site-assistant-panel">
      <span>Site assistant</span>
      <strong>Ask edgekit</strong>
    </button>
    <section class="site-assistant-panel" id="site-assistant-panel" aria-label="Ask edgekit about this site">
      <header>
        <div>
          <span>Running on this site</span>
          <strong>edgekit assistant</strong>
        </div>
        <button class="site-assistant-close" type="button" aria-label="Close site assistant">Close</button>
      </header>
      <edge-chat
        id="site-assistant-chat"
        system-prompt="You are the edgekit site assistant. Use searchDocs for project questions and listDemos when the user asks what to try. When listing demos, preserve the exact labels and hrefs returned by listDemos; do not invent external URLs or rename demos. Keep answers concise and point to the most relevant demo or docs page."
        placeholder="Ask about edgekit or which demo to try"
      ></edge-chat>
    </section>
  `
  document.body.appendChild(wrapper)

  const toggle = wrapper.querySelector<HTMLButtonElement>('.site-assistant-toggle')
  const close = wrapper.querySelector<HTMLButtonElement>('.site-assistant-close')
  const setOpen = (open: boolean) => {
    wrapper.dataset.open = open ? 'true' : 'false'
    toggle?.setAttribute('aria-expanded', String(open))
  }
  toggle?.addEventListener('click', () => setOpen(wrapper.dataset.open !== 'true'))
  close?.addEventListener('click', () => setOpen(false))

  void customElements.whenDefined('edge-chat').then(() => {
    const chat = wrapper.querySelector<EdgeChat>('edge-chat#site-assistant-chat')
    chat?.applyMissionProfile(siteQa.profile)
    chat?.configure({
      sessionId: 'site-assistant',
      telemetry: options.telemetry,
      model: [chromeAI()],
      downloadPolicy: 'never',
      streamText: createSiteAssistantStream(basePath) as never,
      onNoModel: async ({ input, callTool }) => {
        if (wantsDemoList(input)) {
          await callTool('listDemos', {})
          return answerDemoQuestion(basePath)
        }
        const evidence = await callTool('searchDocs', { query: input })
        const adoptionAnswer = formatAdoptionAnswer(input)
        if (adoptionAnswer) return adoptionAnswer
        return siteQa.answerFromResults(input, evidence)
      },
    })
    chat?.registerTools({ ...siteQa.tools, listDemos: listDemosTool })
  })
}

function ensureEdgeChatDefined() {
  if (!customElements.get('edge-chat')) {
    customElements.define('edge-chat', EdgeChatElement)
  }
}

function absoluteOrSiteHref(href: string) {
  return href.startsWith('http') ? href : `${siteBasePath}${href}`
}

function createSiteAssistantStream(basePath: string) {
  return (options: { messages?: unknown[]; tools?: Record<string, unknown> }) => {
    const input = latestUserInput(options.messages ?? [])
    const wantsDemos = wantsDemoList(input)
    const toolName = wantsDemos ? 'listDemos' : 'searchDocs'
    const toolInput = wantsDemos ? {} : { query: input }
    const outputPromise = executeTool(options.tools?.[toolName], toolInput)
    const textPromise = outputPromise.then(output =>
      wantsDemos ? formatDemoAnswer(output, basePath) : formatDocsAnswer(output, input),
    )

    return {
      fullStream: (async function* () {
        const toolCallId = `site-${toolName}`
        yield { type: 'tool-call', toolCallId, toolName, input: toolInput }
        const output = await outputPromise
        yield { type: 'tool-result', toolCallId, toolName, output }
        yield { type: 'text-delta', delta: wantsDemos ? formatDemoAnswer(output, basePath) : formatDocsAnswer(output, input) }
      })(),
      response: textPromise.then(text => ({
        messages: [{ role: 'assistant', content: [{ type: 'text', text }] }],
      })),
    }
  }
}

function formatDemoAnswer(output: unknown, basePath: string) {
  const demos = isRecord(output) && Array.isArray(output.demos) ? output.demos : []
  if (demos.length === 0) return answerSiteQuestion('demos', basePath)
  return [
    'You can try these Edgekit demos:',
    '',
    ...demos
      .filter(isRecord)
      .map(demo => `- ${String(demo.label)}: ${String(demo.description)} ${String(demo.href)}`),
  ].join('\n')
}

function formatDocsAnswer(output: unknown, input: string) {
  const adoptionAnswer = formatAdoptionAnswer(input)
  if (adoptionAnswer) return adoptionAnswer

  const results = isRecord(output) && Array.isArray(output.results) ? output.results.filter(isRecord).slice(0, 3) : []
  if (results.length === 0) return siteQa.answerFromResults(input, output)
  const composed = composeEdgekitAnswer({
    input,
    results,
    mode: 'site-assistant',
    currentPage: currentPageSummary(),
  })
  return `${composed}\n\n${siteQa.answerFromResults(input, output)}`
}

function formatAdoptionAnswer(input: string) {
  const normalized = input.toLowerCase()
  if (/\b(jwt|token|cookie|database directly|update my database|secret|credential)\b/.test(normalized)) {
    return [
      'No. Do not put a JWT, cookie, API key, or secret claim into the prompt.',
      '',
      'Keep credentials in the host app, backend, `identityProvider`, `sessionProvider`, or tool execution context. Edgekit should call a narrow app-owned tool; the host app enforces authorization, permissions, and RBAC before anything changes.',
      '',
      'For risky mutations, require an approval gate and emit audit/telemetry so the user sees the action before it runs and the app keeps a record.',
    ].join('\n')
  }

  if (/\b(cloud token|cloud tokens|token cost|paying|per user|per-message|every user message|cloud meter)\b/.test(normalized)) {
    return [
      'Edgekit helps when per-message cloud-token cost would be variable or unbounded.',
      '',
      'The default cascade is local-first: Chrome AI first, then WebLLM when you allow downloads. Cloud fallback is explicit and developer-provided, so you choose when a user message leaves the browser and what it costs.',
      '',
      'That makes browser-native work cheap by default while still letting production apps configure a cloud route for unsupported browsers or higher-quality tasks.',
    ].join('\n')
  }

  if (/\b(different from embedding a chatbot|embedding a chatbot|just a chatbot|chatbot)\b/.test(normalized)) {
    return [
      'A chatbot mainly talks next to your app. Edgekit is an embeddable agent sidecar that can participate in the workflow.',
      '',
      'You mount `<edge-chat>`, register existing app tools with `registerTools`, and keep state, auth, permissions, and business logic in the host app. The assistant can return app-owned actions, CTAs, forms, and approval prompts instead of inventing work outside the product.',
      '',
      'That is the difference: registered tools and governed workflow actions, not a detached chat box.',
    ].join('\n')
  }

  if (/\b(just fallback search|just search|just rag|only rag|agentic workflow|agentic workflows|actually enable agentic)\b/.test(normalized)) {
    return [
      'Edgekit is not just search or RAG.',
      '',
      'Knowledge Access Skills are one useful Skill type, but the same runtime supports registered tools, `registerActions`, EdgeView forms, AG-UI streams, state hydration through `stateProvider`, and approval-gated mutations.',
      '',
      'The host app owns and executes the business logic. Edgekit supplies the agent loop, local-first cascade, app context bridge, generated workflow UI, approval gates, and telemetry around those app-owned capabilities.',
    ].join('\n')
  }

  if (/\b(how will this help me add an agent|add an agent to my app|install an agent|embed an agent|wire an agent)\b/.test(normalized)) {
    return [
      'Edgekit lets you add an agent to an existing app by mounting `<edge-chat>` and wiring it to the app tools you already own.',
      '',
      'The short path is: create Skills and a Mission Profile, mount `EdgeChat`, call `registerTools` for typed app APIs, and configure the local-first model cascade. The host app keeps state, auth, permissions, and business logic; Edgekit only calls the tools you expose.',
      '',
      'Risky tools can use approval gates, audit, and telemetry, so the assistant can help with real workflow steps without turning prompts into your authorization layer.',
    ].join('\n')
  }

  if (/\b(what do i add first|add first|first integration|first step|start with)\b/.test(normalized)) {
    return [
      'Start with `<edge-chat>` in the workflow where the user already works.',
      '',
      'Then configure it with a Mission Profile, call `registerTools` with one read-only existing app tool, and use `.configure()` for `agentIdentity`, `grounding`, telemetry, and the local-first model cascade. Keep business logic in the existing app; the assistant should call host-owned tools instead of duplicating app state.',
      '',
      'Once the read path is solid, add approval-gated mutation tools.',
    ].join('\n')
  }

  if (
    /\b(ai coding agent|coding agent|production-grade sidecar|vibe coder|vibe-coder)\b/.test(normalized) &&
    !/\b(starter|new production-grade mission|new mission|personal website|personal site|elegant q&a|astro|intake|recipe|recipes|knowledge base)\b/.test(normalized)
  ) {
    return [
      'For a coding agent, start with `/edgekit/llms.txt`, then the Adoption Kit and the `edgekit-implementer` SKILL.md.',
      '',
      'Build a Mission Profile from Skills, mount `<edge-chat>` or EdgeChat, register typed app tools with `registerTools`, and keep state/auth/business logic in the host app. Add approval gates for risky mutations and telemetry for runs, tools, approvals, and fallback.',
      '',
      'Validate it with outcome scenarios or the adoption/research harness so the agent proves the workflow, not just that the page renders.',
    ].join('\n')
  }

  if (/\b(starter|new production-grade mission|new mission|mission starter|support workflow)\b/.test(normalized)) {
    return [
      'Use the mission starter at `docs/templates/mission-profile-starter/profile.ts`, or run the support-workflow recipe when you want a concrete starting point.',
      '',
      'That gives your coding agent a Skills + Mission Profile shape. Replace sample tool `execute` functions with app-owned APIs, keep ticket creation approval-gated, and make rejection preserve state.',
      '',
      'Before shipping, run `validateMissionProfile` and add outcome scenarios in `harness-scenarios.json` so the mission proves tool use, approvals, and fallback behavior.',
    ].join('\n')
  }

  if (
    /\b(rag|vector search|graphrag|graph rag|citations|dynamic knowledge|knowledge base|retrieval)\b/.test(normalized) &&
    !/\b(astro|intake|recipe|recipes|adoption kit|coding-agent skills)\b/.test(normalized)
  ) {
    return [
      'Use Knowledge Access Skills for scalable retrieval instead of baking a RAG database into Edgekit.',
      '',
      'Implement an `EdgeKnowledgeSource`, then expose it through `createKnowledgeTool`, `createKnowledgeSkill`, or `createGroundedQaSkill`. Edgekit does not own the vector database or graph engine; your app can use LlamaIndex, LangChain, Qdrant, Neo4j, GraphRAG, or another retrieval stack behind that contract.',
      '',
      'The host app keeps permission filtering and freshness rules. Your outcome tests should verify citations, stale-source handling, and whether source facts survive into the answer.',
    ].join('\n')
  }

  if (/\b(astro|intake|recipe|recipes|adoption kit|coding-agent skills|knowledge base)\b/.test(normalized)) {
    return [
      'Yes. Use the Adoption Kit for coding-agent skills and repeatable recipes.',
      '',
      'Point the agent at SKILL.md files such as `edgekit-implementer`, `edgekit-outcome-tester`, and `edgekit-security-review`, then scaffold with `edgekit-init` and the `astro-intake-knowledge` recipe. That path is built for Astro intake plus Knowledge Access.',
      '',
      'Recipes are additive and keep the quick start scalable; they do not replace Edgekit core. Keep intake writes behind approval-gated, app-owned tools.',
    ].join('\n')
  }

  if (/\b(personal website|public site|blog|portfolio|elegant q&a|public-site q&a|public site q&a|personal site)\b/.test(normalized)) {
    return [
      'Use the grounded public-site Q&A path.',
      '',
      'Tell your coding agent to start at `/edgekit/llms.txt`, then read `/edgekit/docs/public-site-qa/` and the `edgekit-public-site-qa` agent skill. The implementation primitive is `createGroundedQaSkill()` plus `mountChat()` from `@kevinmarmstrong/edgekit-ui/lite`.',
      '',
      'That path configures `agentIdentity`, `grounding: "strict"`, a read-only site search tool, and an `onNoModel` fallback that uses `callTool()` against the same evidence source. The assistant can answer gracefully without model downloads, and if the site evidence does not support a claim it should say so.',
    ].join('\n')
  }

  if (/\b(are you edgekit|are you gemma|who are you|what are you|created you|model identity|gemma team|which model)\b/.test(normalized)) {
    return [
      'The assistant should answer from its configured identity, not from model-provider identity.',
      '',
      'A good answer is: "I am the site assistant the developer configured with Edgekit. Edgekit is the runtime/widget that powers this chat and calls the site search tool. The model, when available, is only inference machinery, so I should not claim to be Gemma or say I was created by a model provider unless the developer explicitly configured that identity."',
      '',
      'Configure that with `agentIdentity` and `grounding: "strict"` so the assistant identity, Edgekit runtime, and model/runtime disclosure stay separate.',
    ].join('\n')
  }

  return null
}

async function executeTool(toolDefinition: unknown, input: Record<string, unknown>) {
  const candidate = toolDefinition as { execute?: (input: Record<string, unknown>) => unknown | Promise<unknown> }
  if (!candidate.execute) return { error: 'Tool is not executable.' }
  return candidate.execute(input)
}

function latestUserInput(messages: unknown[]) {
  const userMessage = [...messages]
    .reverse()
    .find((message): message is { role: string; content: unknown } => {
      return isRecord(message) && message.role === 'user'
    })
  return typeof userMessage?.content === 'string' ? userMessage.content : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function answerSiteQuestion(input: string, basePath: string) {
  const normalized = input.toLowerCase()
  if (normalized.includes('demo') || normalized.includes('try') || normalized.includes('show')) return answerDemoQuestion(basePath)

  const matches = searchDocs(input)
  if (matches.length === 0) {
    return 'Local browser AI is unavailable here, and the site assistant did not find a matching docs section.'
  }

  return composeEdgekitAnswer({
    input,
    results: matches,
    mode: 'site-assistant',
    currentPage: currentPageSummary(),
  })
}

function wantsDemoList(input: string) {
  return /\b(demo|demos|surface|surfaces|try|show)\b/i.test(input)
}

function answerDemoQuestion(basePath: string) {
  return [
    'Local browser AI is unavailable here, so the site assistant answered through its deterministic site map.',
    '',
    ...demoLinks.map(demo => `${demo.label}: ${demo.description} ${absoluteDemoHref(demo.href, basePath)}`),
  ].join('\n')
}

function absoluteDemoHref(href: string, basePath: string) {
  return href.startsWith('http') ? href : `${basePath}${href}`
}

function toKnowledgeResult(result: ReturnType<typeof searchDocs>[number]): EdgeKnowledgeResult {
  return {
    id: result.slug,
    title: result.title,
    excerpt: result.body,
    source: 'Edgekit docs',
    uri: absoluteOrSiteHref(`/docs/${result.slug}/`),
    score: result.score,
    metadata: { tags: result.tags, currentPage: currentPageSummary() },
  }
}

function currentPageSummary() {
  const path = window.location.pathname
  const title = document.title || 'edgekit'
  const pageLabel = document.querySelector<HTMLHeadingElement>('h1')?.textContent?.trim() ?? 'edgekit page'
  return `${title} at ${path}; primary heading: ${pageLabel}`
}
