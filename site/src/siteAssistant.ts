import '@kevinmarmstrong/edgekit-ui'
import { chromeAI, tool } from '@kevinmarmstrong/edgekit'
import type { EdgeTelemetrySink } from '@kevinmarmstrong/edgekit'
import type { EdgeChat } from '@kevinmarmstrong/edgekit-ui'
import { z } from 'zod'
import { searchDocs } from './content'
import { composeEdgekitAnswer } from './answerComposer'

type SiteAssistantOptions = {
  telemetry?: EdgeTelemetrySink
}

const demoLinks = [
  { label: 'Ecommerce retrofit', href: 'https://edgekit-demo-ecommerce.pages.dev/', description: 'External COOP/COEP packed-package demo with product search, generated add-to-cart CTAs, and approval gates.' },
  { label: 'Field ops ERP', href: '/demos/operations/', description: 'Work-order triage, inventory reservation, and technician dispatch.' },
  { label: 'Docs Q&A', href: '/demos/docs/', description: 'Project documentation exposed as a search tool.' },
  { label: 'AG-UI event stream', href: '/demos/ag-ui/', description: 'Generated forms, charts, tables, and cards from an event stream.' },
  { label: 'SaaS admin workflow', href: '/demos/admin/', description: 'Account search, plan changes, and suspensions behind approval.' },
  { label: 'Mission control', href: '/demos/mission-control/', description: 'Telemetry for runs, tools, approvals, and model fallback.' },
  { label: 'Cascade and permission lab', href: '/demos/cascade/', description: 'Resettable browser-model, permission, fallback, validation, and feature-gating flows.' },
]
const siteBasePath = import.meta.env.BASE_URL.replace(/\/$/, '')

const siteSearchTool = tool({
  description: 'Search edgekit documentation and project guidance for the current site visitor.',
  inputSchema: z.object({
    query: z.string().describe('Question or topic to search for'),
  }),
  execute: async ({ query }) => ({
    query,
    currentPage: currentPageSummary(),
    results: searchDocs(query),
  }),
})

const listDemosTool = tool({
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
})

export function mountSiteAssistant(options: SiteAssistantOptions = {}) {
  if (document.querySelector('#site-assistant')) return

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

  const chat = wrapper.querySelector<EdgeChat>('edge-chat#site-assistant-chat')
  chat?.configure({
    sessionId: 'site-assistant',
    telemetry: options.telemetry,
    model: [chromeAI()],
    downloadPolicy: 'never',
    toolChoice: 'required',
    streamText: createSiteAssistantStream(basePath) as never,
    onNoModel: ({ input }) => answerSiteQuestion(input, basePath),
  })
  chat?.registerTools({ searchDocs: siteSearchTool, listDemos: listDemosTool })
}

function absoluteOrSiteHref(href: string) {
  return href.startsWith('http') ? href : `${siteBasePath}${href}`
}

function createSiteAssistantStream(basePath: string) {
  return (options: { messages?: unknown[]; tools?: Record<string, unknown> }) => {
    const input = latestUserInput(options.messages ?? [])
    const wantsDemos = /\b(demo|demos|surface|surfaces|try|show)\b/i.test(input)
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
  const results = isRecord(output) && Array.isArray(output.results) ? output.results : []
  if (results.length === 0) return 'I did not find a matching Edgekit docs section.'
  return composeEdgekitAnswer({
    input,
    results: results.filter(isRecord).slice(0, 3),
    mode: 'site-assistant',
    currentPage: currentPageSummary(),
  })
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
  if (normalized.includes('demo') || normalized.includes('try') || normalized.includes('show')) {
    return [
      'Local browser AI is unavailable here, so the site assistant answered through its deterministic site map.',
      '',
      ...demoLinks.map(demo => `${demo.label}: ${demo.description} ${basePath}${demo.href}`),
    ].join('\n')
  }

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

function currentPageSummary() {
  const path = window.location.pathname
  const title = document.title || 'edgekit'
  const pageLabel = document.querySelector<HTMLHeadingElement>('h1')?.textContent?.trim() ?? 'edgekit page'
  return `${title} at ${path}; primary heading: ${pageLabel}`
}
