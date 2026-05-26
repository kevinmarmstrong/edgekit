import '@kevinmarmstrong/edgekit-ui'
import {
  chromeAI,
  createAgUiAgent,
  createCascadeReadinessController,
  createMissionControl,
  createModelProvider,
  modelOptional,
  tool,
} from '@kevinmarmstrong/edgekit'
import { publicCatalogShoppingProfile } from './profiles/public-catalog-shopping'
import { docsQaProfile } from './profiles/docs-qa'
import { mountOpsDemo } from './opsDemo'
import type { AgUiRunInput, EdgeViewNode, LanguageModelV3, MissionControlSnapshot } from '@kevinmarmstrong/edgekit'
import type { EdgeCascadeWizard, EdgeChat } from '@kevinmarmstrong/edgekit-ui'
import { z } from 'zod'
import { mountAdminDemo } from './adminDemo'
import { searchDocs } from './content'
import { docsPages, docsPath } from './docsContent'
import { composeEdgekitAnswer } from './answerComposer'
import { mountSiteAssistant } from './siteAssistant'
import './styles.css'

type Product = {
  id: string
  name: string
  category: string
  price: number
  sizes: string[]
  color: string
  support: string
}

type CartItem = {
  productId: string
  quantity: number
  size?: string
}

type ProductSearchInput = {
  query: string
  maxPrice?: number
  size?: string
  color?: string
}

const products: Product[] = [
  {
    id: 'pegasus',
    name: 'Nike Air Zoom Pegasus',
    category: 'running shoes',
    price: 89.99,
    sizes: ['9', '10', '10.5', '11'],
    color: 'Volt / Black',
    support: 'Daily road trainer',
  },
  {
    id: 'fresh-foam',
    name: 'New Balance Fresh Foam',
    category: 'running shoes',
    price: 74.99,
    sizes: ['10', '10.5', '11', '12'],
    color: 'Sea Salt',
    support: 'Soft neutral cushion',
  },
  {
    id: 'ghost',
    name: 'Brooks Ghost 16',
    category: 'running shoes',
    price: 94.99,
    sizes: ['9.5', '10', '10.5'],
    color: 'Blue / Lime',
    support: 'Stable everyday miles',
  },
  {
    id: 'ultraboost',
    name: 'Adidas Ultraboost Light',
    category: 'running shoes',
    price: 119.99,
    sizes: ['9', '10', '11'],
    color: 'Cloud White',
    support: 'Responsive long runs',
  },
  {
    id: 'dunk',
    name: 'Nike Dunk Low',
    category: 'casual shoes',
    price: 64.99,
    sizes: ['9', '10', '11'],
    color: 'White / Black',
    support: 'Streetwear',
  },
]

const cart: CartItem[] = []
const missionControl = createMissionControl()
missionControl.subscribe((_event, snapshot) => renderMissionControl(snapshot))
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
const scriptedCommerceMode = new URLSearchParams(window.location.search).get('commerceAgentMode') === 'scripted'

const searchDocsTool = tool({
  description: 'Search edgekit project documentation by natural language query.',
  inputSchema: z.object({
    query: z.string().describe('Question or topic to search for'),
  }),
  execute: async ({ query }) => ({
    query,
    results: searchDocs(query),
  }),
})

const searchProducts = tool({
  description: 'Search the product catalog by query, maximum price, size, and color.',
  inputSchema: z.object({
    query: z.string().describe('Product search terms, such as running shoes'),
    maxPrice: modelOptional(z.number()).describe('Maximum price in dollars'),
    size: modelOptional(z.string()).describe('Shoe size'),
    color: modelOptional(z.string()).describe('Requested product color'),
  }),
  execute: async input => searchProductCatalog(input),
})

const addToCart = tool({
  description: 'Add a product to the shopping cart after the user approves.',
  inputSchema: z.object({
    productId: z.string().describe('The product id to add'),
    quantity: z.number().default(1).describe('Quantity to add'),
    size: modelOptional(z.string()).describe('Selected shoe size'),
  }),
  execute: async ({ productId, quantity, size }) => {
    const product = products.find(item => item.id === productId)
    if (!product) return { success: false, error: 'Product not found' }
    cart.push({ productId, quantity, size })
    renderCart()
    return { success: true, product: product.name, quantity, size }
  },
  needsApproval: true,
})

const createSupportTicket = tool({
  description: 'Create a support ticket from a user-confirmed form.',
  inputSchema: z.object({
    category: z.string(),
    priority: z.string(),
  }),
  execute: async ({ category, priority }) => ({
    success: true,
    ticketId: `SUP-${category.toUpperCase()}-${priority.toUpperCase()}`,
    category,
    priority,
  }),
})

const submitDemoRequest = tool({
  description: 'Submit a sample AG-UI form from the public demo.',
  inputSchema: z.object({
    name: z.string(),
    useCase: z.string(),
    urgency: z.string(),
  }),
  execute: async input => ({
    success: true,
    requestId: `DEMO-${String(input.useCase).toUpperCase()}`,
    ...input,
  }),
})

const docsChat = document.querySelector<EdgeChat>('edge-chat#docs-chat')
const docsCascadeWizard = document.querySelector<EdgeCascadeWizard>('edge-cascade-wizard#docs-cascade')
const docsCascade = createCascadeReadinessController({
  providers: [chromeAI()],
  downloadPolicy: 'never',
  fallback: true,
  requiredCapabilities: ['tools', 'edgeview'],
  requiredTools: ['searchDocs'],
  tools: { searchDocs: searchDocsTool },
  visibilityPolicy: 'show-basic-when-local-unavailable',
  messages: {
    ready: 'Chrome AI is ready for local docs Q&A.',
    fallback: 'This browser is using transparent docs-basic mode. Tool-backed answers still work, but local model reasoning is not active.',
    unavailable: 'Local browser AI is not available here. The docs assistant can stay visible in basic mode.',
  },
})
docsCascadeWizard?.configure(docsCascade)
void docsCascade.check()
// Docs Q&A mission (defined in ./profiles/docs-qa.ts using the recommended pattern)
docsChat?.configure({
  sessionId: 'site-docs-demo',
  telemetry: missionControl,
  model: [chromeAI()],
  streamText: createDocsSearchStream() as never,
  cascadeReadiness: docsCascade,
  onNoModel: ({ input, readiness }) => `${readiness?.message ?? 'Basic mode active.'}\n\n${answerFromDocs(input)}`,
})
docsChat?.applyMissionProfile(docsQaProfile)
docsChat?.registerTools({ searchDocs: searchDocsTool })

// ─────────────────────────────────────────────────────────────────────────────
// Demo Surface Initialization — Skills + Mission Profile Pattern (Recommended)
// 
// Both live demos below are intentionally driven primarily through Mission Profiles
// rather than raw configure() calls. This is the pattern we want adopters to follow.
// See ARCHITECTURE.md and docs/GETTING-STARTED-REAL-APPS.md for rationale.
// ─────────────────────────────────────────────────────────────────────────────

const commerceChat = document.querySelector<EdgeChat>('edge-chat#commerce-chat')
const commerceCascadeWizard = document.querySelector<EdgeCascadeWizard>('edge-cascade-wizard#commerce-cascade')
const commerceCascade = createCascadeReadinessController({
  providers: [chromeAI()],
  downloadPolicy: 'never',
  fallback: true,
  requiredCapabilities: ['tools', 'approvals', 'edgeview'],
  requiredTools: ['searchProducts', 'addToCart'],
  tools: { searchProducts, addToCart },
  visibilityPolicy: 'show-basic-when-local-unavailable',
  messages: {
    ready: 'Chrome AI is ready for local tool-calling recommendations and guarded cart actions.',
    fallback: 'This public demo is running in basic mode because local browser AI is unavailable or not enabled. Search, CTAs, approvals, and app-owned actions remain testable.',
    unavailable: 'Local browser AI is unavailable. Edgekit can either hide the sidecar or expose a transparent fallback.',
  },
})
commerceCascadeWizard?.configure(commerceCascade)
void commerceCascade.check()

commerceChat?.configure({
  sessionId: 'site-commerce-demo',
  telemetry: missionControl,
  model: scriptedCommerceMode ? [scriptedCommerceProvider()] : [chromeAI()],
  cascadeReadiness: commerceCascade,
  ...(scriptedCommerceMode
    ? { streamText: createScriptedCommerceStream() as never }
    : {
        toolProvider: ({ input }) => commerceToolsForInput(input),
        onNoModel: ({ input, readiness }) => `${readiness?.message ?? 'Basic mode active.'}\n\n${answerFromCatalog(input)}`,
      }),
})
commerceChat?.applyMissionProfile(publicCatalogShoppingProfile)

// Explicitly register the executable tools for action card execution on the public site.
// This ensures EdgeView forms (add-to-cart CTAs) have real implementations even when
// most other config comes from the Mission Profile.
commerceChat?.registerTools({ searchProducts, addToCart })

commerceChat?.registerActions(({ toolName, output }) => {
  if (toolName !== 'searchProducts') return []
  return extractProducts(output).map(product => ({
    id: `add-${product.id}`,
    label: `Add ${product.name} to cart`,
    toolName: 'addToCart',
    description: `$${product.price.toFixed(2)}. Available sizes: ${product.sizes.join(', ')}. Color: ${product.color}. Choose a size and add it directly from the sidecar.`,
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
    successMessage: (_output, input) =>
      `Added ${product.name} to your cart${input.size ? ` (size ${input.size})` : ''}.`,
  }))
})

const agUiChat = document.querySelector<EdgeChat>('edge-chat#agui-chat')
agUiChat?.configure({ sessionId: 'site-agui-demo', telemetry: missionControl })
agUiChat?.registerTools({ createSupportTicket, submitDemoRequest })
agUiChat?.useAgent(createAgUiAgent({ run: mockAgUiRun, sessionId: 'site-agui-demo', telemetry: missionControl }))

renderDocCards()
renderCatalog()
renderCart()
renderMissionControl()
wireDocSearch()
mountAdminDemo()
mountOpsDemo()
mountSiteAssistant({ telemetry: missionControl })

function renderDocCards() {
  const grid = document.querySelector<HTMLElement>('#doc-card-grid')
  if (!grid) return

  grid.innerHTML = docsPages
    .map(
      page => `
        <a class="doc-card" href="${docsHref(page.slug)}">
          <span>${page.navLabel}</span>
          <h3>${page.title}</h3>
          <p>${page.summary}</p>
        </a>
      `,
    )
    .join('')
}

function docsHref(slug: string) {
  const page = docsPages.find(candidate => candidate.slug === slug)
  return page ? withBase(docsPath(page)) : withBase('/docs/')
}

function withBase(path: string) {
  if (path === '/') return `${basePath}/`
  return `${basePath}${path}`
}

function renderCatalog() {
  const catalog = document.querySelector<HTMLElement>('#catalog')
  if (!catalog) return

  catalog.innerHTML = products
    .map(
      product => `
        <article class="product-card" data-testid="product-card">
          <div class="product-art" aria-hidden="true">${product.name.slice(0, 2)}</div>
          <div>
            <h3>${product.name}</h3>
            <p>${product.support}</p>
          </div>
          <dl>
            <div><dt>Price</dt><dd>$${product.price.toFixed(2)}</dd></div>
            <div><dt>Sizes</dt><dd>${product.sizes.join(', ')}</dd></div>
            <div><dt>Color</dt><dd>${product.color}</dd></div>
          </dl>
        </article>
      `,
    )
    .join('')
}

function answerFromDocs(input: string) {
  const matches = searchDocs(input)
  if (matches.length === 0) {
    return 'Local browser AI is unavailable here, and the docs search did not find a matching section.'
  }

  return composeEdgekitAnswer({
    input,
    results: matches,
    mode: 'docs-demo',
  })
}

function createDocsSearchStream() {
  return (options: { messages?: unknown[]; tools?: Record<string, unknown> }) => {
    const input = latestUserInput(options.messages ?? [])
    const toolName = 'searchDocs'
    const toolInput = { query: input }
    const outputPromise = executeTool(options.tools?.[toolName], toolInput)
    const textPromise = outputPromise.then(output => formatDocsAnswer(output, input))

    return {
      fullStream: (async function* () {
        const toolCallId = 'site-docs-search'
        yield { type: 'tool-call', toolCallId, toolName, input: toolInput }
        const output = await outputPromise
        yield { type: 'tool-result', toolCallId, toolName, output }
        yield { type: 'text-delta', delta: formatDocsAnswer(output, input) }
      })(),
      response: textPromise.then(text => ({
        messages: [{ role: 'assistant', content: [{ type: 'text', text }] }],
      })),
    }
  }
}

function formatDocsAnswer(output: unknown, input: string) {
  const results = isRecord(output) && Array.isArray(output.results) ? output.results.filter(isRecord).slice(0, 3) : []
  if (results.length === 0) return 'I did not find a matching EdgeKit docs section.'
  return composeEdgekitAnswer({
    input,
    results,
    mode: 'docs-demo',
  })
}

function answerFromCatalog(input: string) {
  const maxPrice = input.match(/under\s+\$?(\d+)/i)?.[1]
  const requestedSize = extractSize(input)
  const requestedColor = input.match(/\b(white|black|blue|green|volt)\b/i)?.[1]?.toLowerCase()
  const { results } = searchProductCatalog({
    query: input,
    maxPrice: maxPrice == null ? undefined : Number(maxPrice),
    size: requestedSize,
    color: requestedColor,
  })

  if (results.length === 0) {
    return 'Local browser AI is unavailable here, and basic catalog mode did not find matching products.'
  }

  return [
    'Local browser AI is unavailable here, so edgekit answered through basic catalog mode.',
    '',
    ...results.map(
      product =>
        `${product.name} - $${product.price.toFixed(2)} - sizes ${product.sizes.join(', ')} - ${product.color} - ${product.support}`,
    ),
    '',
    'Enable Chrome AI for tool-calling recommendations and guarded add-to-cart actions.',
  ].join('\n')
}

function scriptedCommerceProvider() {
  const scriptedModel = {
    provider: 'scripted-commerce',
    modelId: 'public-catalog-shopping',
    specificationVersion: 'v3',
  } as LanguageModelV3

  return createModelProvider({
    id: 'scripted-commerce',
    label: 'Scripted commerce agent',
    resolve: async () => scriptedModel,
  })
}

function createScriptedCommerceStream() {
  return (options: { messages?: unknown[]; tools?: Record<string, unknown> }) => {
    const input = latestUserInput(options.messages ?? [])
    const maxPrice = input.match(/under\s+\$?(\d+)/i)?.[1]
    const requestedSize = extractSize(input)
    const requestedColor = input.match(/\b(white|black|blue|green|volt)\b/i)?.[1]?.toLowerCase()
    const toolInput = {
      query: input,
      maxPrice: maxPrice == null ? undefined : Number(maxPrice),
      size: requestedSize,
      color: requestedColor,
    }
    const outputPromise = executeTool(options.tools?.searchProducts, toolInput)
    const textPromise = outputPromise.then(formatCatalogToolAnswer)

    return {
      fullStream: (async function* () {
        const toolCallId = 'site-commerce-search'
        yield { type: 'tool-call', toolCallId, toolName: 'searchProducts', input: toolInput }
        const output = await outputPromise
        yield { type: 'tool-result', toolCallId, toolName: 'searchProducts', output }
        yield { type: 'text-delta', delta: formatCatalogToolAnswer(output) }
      })(),
      response: textPromise.then(text => ({
        messages: [{ role: 'assistant', content: [{ type: 'text', text }] }],
      })),
    }
  }
}

function formatCatalogToolAnswer(output: unknown) {
  const products = extractProducts(output)
  if (products.length === 0) return 'I did not find a matching product in the catalog.'
  return products.map(productSummary).join('\n')
}

function commerceToolsForInput(input: string) {
  return hasCartMutationIntent(input)
    ? { searchProducts, addToCart }
    : { searchProducts }
}

function hasCartMutationIntent(input: string) {
  return /\b(add|cart|buy|purchase|checkout|order)\b/i.test(input)
}

async function* mockAgUiRun({ input }: AgUiRunInput) {
  const normalized = input.toLowerCase()
  if (normalized.includes('component') || normalized.includes('ui')) {
    yield* renderAgUiDemoResponse(
      'This Pages demo is a scripted AG-UI stream. It can still show the EdgeView component contract that a real AG-UI backend would emit dynamically.',
      componentCatalogView(),
    )
    return
  }

  if (normalized.includes('hard coded') || normalized.includes('hardcoded') || normalized.includes('same example')) {
    yield* renderAgUiDemoResponse(
      'Yes. This public Pages demo uses a local scripted AG-UI event source so the repo can be tested without a backend. In production, replace the script with createAgUiAgent({ endpoint }) and stream events from your agent provider.',
      transparencyView(),
    )
    return
  }

  if (normalized.includes('form')) {
    yield* renderAgUiDemoResponse(
      'Here is a sample EdgeView form emitted through the AG-UI adapter. The app still owns the tool execution when you submit it.',
      sampleFormView(),
    )
    return
  }

  yield* renderAgUiDemoResponse(
    'This response came from a scripted AG-UI-compatible event stream. Edgekit translated the stream into text plus a declarative EdgeView payload.',
    supportQueueView(),
  )
}

async function* renderAgUiDemoResponse(message: string, view: EdgeViewNode | EdgeViewNode[]) {
  yield {
    type: 'TEXT_MESSAGE_CONTENT',
    delta: message,
  }

  yield {
    type: 'CUSTOM',
    name: 'edgekit.view',
    value: view,
  }

  yield { type: 'RUN_FINISHED' }
}

function componentCatalogView(): EdgeViewNode[] {
  return [
    {
      type: 'table',
      id: 'edgeview-components',
      columns: [
        { key: 'component', label: 'Component' },
        { key: 'use', label: 'Use' },
      ],
      rows: [
        { component: 'Text', use: 'Streaming assistant copy or generated explanation' },
        { component: 'Card', use: 'Grouped recommendations, summaries, and action containers' },
        { component: 'Form', use: 'User-confirmed inputs before app-owned tool execution' },
        { component: 'Table', use: 'Comparable records, status lists, and result sets' },
        { component: 'Chart', use: 'Simple bar charts for metrics and queues' },
      ],
    },
    {
      type: 'card',
      id: 'agui-provider-note',
      title: 'Provider path',
      description:
        'A real AG-UI provider can choose these views at runtime. The public Pages demo is scripted only so it can run without a server.',
    },
  ]
}

function transparencyView(): EdgeViewNode {
  return {
    type: 'card',
    id: 'agui-transparency',
    title: 'What is scripted here',
    description:
      'GitHub Pages is serving a deterministic AG-UI mock stream. The scalable integration point is createAgUiAgent({ endpoint }) or createAgUiAgent({ run }), which accepts provider events and renders the same EdgeView payloads.',
  }
}

function sampleFormView(): EdgeViewNode {
  return {
    type: 'card',
    id: 'demo-request-card',
    title: 'Sample intake form',
    description: 'This form was emitted as an EdgeView payload through the AG-UI adapter.',
    children: [
      {
        type: 'form',
        id: 'demo-request-form',
        toolName: 'submitDemoRequest',
        submitLabel: 'Submit request',
        input: {},
        fields: [
          {
            name: 'name',
            label: 'Name',
            type: 'text',
            required: true,
            value: 'Demo user',
          },
          {
            name: 'useCase',
            label: 'Use case',
            type: 'select',
            required: true,
            options: [
              { label: 'Support', value: 'support' },
              { label: 'Shopping', value: 'shopping' },
              { label: 'Admin workflow', value: 'admin' },
            ],
          },
          {
            name: 'urgency',
            label: 'Urgency',
            type: 'select',
            required: true,
            options: [
              { label: 'Normal', value: 'normal' },
              { label: 'Urgent', value: 'urgent' },
            ],
          },
        ],
        successMessage: (_output: unknown, formInput: Record<string, unknown>) =>
          `Submitted ${formInput.urgency} ${formInput.useCase} request for ${formInput.name}.`,
      },
    ],
  }
}

function supportQueueView(): EdgeViewNode[] {
  return [
      {
        type: 'chart',
        id: 'support-chart',
        chartType: 'bar',
        title: 'Open support queue',
        data: [
          { label: 'Billing', value: 7 },
          { label: 'Orders', value: 12 },
          { label: 'Returns', value: 4 },
        ],
      },
      {
        type: 'card',
        id: 'support-ticket-card',
        title: 'Create a support ticket',
        description: 'The AG-UI stream can ask Edgekit to render a structured form while the app keeps ownership of the tool.',
        children: [
          {
            type: 'form',
            id: 'support-ticket-form',
            toolName: 'createSupportTicket',
            submitLabel: 'Create ticket',
            input: {},
            fields: [
              {
                name: 'category',
                label: 'Category',
                type: 'select',
                required: true,
                options: [
                  { label: 'Billing', value: 'billing' },
                  { label: 'Orders', value: 'orders' },
                  { label: 'Returns', value: 'returns' },
                ],
              },
              {
                name: 'priority',
                label: 'Priority',
                type: 'select',
                required: true,
                options: [
                  { label: 'Normal', value: 'normal' },
                  { label: 'Urgent', value: 'urgent' },
                ],
              },
            ],
            successMessage: (_output: unknown, input: Record<string, unknown>) =>
              `Created a ${input.priority} ${input.category} support ticket.`,
          },
        ],
      },
    ]
}

function renderCart() {
  const cartState = document.querySelector<HTMLElement>('#cart-state')
  if (!cartState) return
  if (cart.length === 0) {
    cartState.textContent = 'No items yet'
    return
  }

  cartState.textContent = cart
    .map(item => {
      const product = products.find(candidate => candidate.id === item.productId)
      const size = item.size ? ` (size ${item.size})` : ''
      return `${item.quantity}x ${product?.name ?? item.productId}${size}`
    })
    .join(', ')
}

function renderMissionControl(snapshot: MissionControlSnapshot = missionControl.snapshot()) {
  setText('#mc-runs', String(snapshot.runs))
  setText('#mc-tools', String(Object.values(snapshot.toolCalls).reduce((total, count) => total + count, 0)))
  setText('#mc-approvals', `${snapshot.approvals.approved}/${snapshot.approvals.requested}`)
  setText('#mc-errors', String(snapshot.errors))
  setText('#mc-local', String(snapshot.localModelUnavailable))
  setText('#mc-last-event', snapshot.lastEvent ? `${snapshot.lastEvent.name} · ${snapshot.lastEvent.sessionId}` : 'Waiting for demo activity')

  const tools = document.querySelector<HTMLElement>('#mc-tool-table')
  if (tools) {
    const entries = Object.entries(snapshot.toolCalls)
    tools.innerHTML = entries.length === 0
      ? '<tr><td colspan="2">Run a demo to see tool activity.</td></tr>'
      : entries
          .map(([name, count]) => `<tr><td>${name}</td><td>${count}</td></tr>`)
          .join('')
  }
}

function setText(selector: string, value: string) {
  const element = document.querySelector<HTMLElement>(selector)
  if (element) element.textContent = value
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

function extractProducts(output: unknown): Product[] {
  if (!isRecord(output) || !Array.isArray(output.results)) return []
  return output.results.filter((item): item is Product => {
    return isRecord(item) && typeof item.id === 'string' && typeof item.name === 'string'
  })
}

function searchProductCatalog(input: ProductSearchInput) {
  const requestedSize = normalizeSize(input.size ?? extractSize(input.query))
  const requestedColors = colorTokens(input.color ?? input.query)
  const queryTokens = queryTokensForCatalog(input.query)
  const exact = rankedProducts(queryTokens, requestedSize, requestedColors, input.maxPrice)
  const relaxedColor = exact.length > 0 ? exact : rankedProducts(queryTokens, requestedSize, [], input.maxPrice)
  const relaxedSize = relaxedColor.length > 0 ? relaxedColor : rankedProducts(queryTokens, undefined, requestedColors, input.maxPrice)
  const relaxedQuery = relaxedSize.length > 0 ? relaxedSize : rankedProducts([], requestedSize, requestedColors, input.maxPrice)
  const results = relaxedQuery.map(result => result.product)
  const strategy = exact.length > 0
    ? 'strict'
    : relaxedColor.length > 0
      ? 'relaxed-color'
      : relaxedSize.length > 0
        ? 'relaxed-size'
        : relaxedQuery.length > 0
          ? 'relaxed-query'
          : 'no-match'

  return {
    results,
    total: results.length,
    strategy,
    summary: results.map(productSummary),
  }
}

function rankedProducts(queryTokens: string[], size: string | undefined, colors: string[], maxPrice: number | undefined) {
  return products
    .map(product => ({ product, score: productScore(product, queryTokens) }))
    .filter(({ product, score }) => {
      const requiredTokens = queryTokens.filter(token => !brandTokens().has(token))
      const matchesQuery =
        queryTokens.length === 0 ||
        (requiredTokens.length > 0
          ? requiredTokens.every(token => productSearchTokens(product).includes(token))
          : score > 0)
      const matchesPrice = maxPrice == null || product.price <= maxPrice
      const matchesSize = size == null || product.sizes.includes(size)
      const matchesColor = colors.length === 0 || colors.every(color => colorTokens(product.color).includes(color))
      return matchesQuery && matchesPrice && matchesSize && matchesColor
    })
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
}

function productScore(product: Product, queryTokens: string[]) {
  const searchable = productSearchTokens(product)
  const searchableText = searchable.join(' ')
  return queryTokens.reduce((score, token) => {
    if (searchable.includes(token)) return score + 2
    if (searchableText.includes(token)) return score + 1
    return score
  }, 0)
}

function productSearchTokens(product: Product) {
  return queryTokensForCatalog(`${product.name} ${product.category} ${product.support} ${product.color}`)
}

function brandTokens() {
  return new Set(['adidas', 'brooks', 'balance', 'new', 'nike'])
}

function productSummary(product: Product) {
  return `${product.name} costs $${product.price.toFixed(2)}; available sizes: ${product.sizes.join(', ')}; color: ${product.color}; ${product.support}.`
}

function queryTokensForCatalog(value: string) {
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'available', 'below', 'carry', 'carried', 'cheaper', 'cost', 'costs', 'dollar',
    'dollars', 'find', 'for', 'has', 'have', 'how', 'info', 'is', 'me', 'option', 'options', 'price', 'show',
    'size', 'sizes', 'the', 'under', 'what', 'with',
  ])
  return normalizeText(value)
    .split(' ')
    .map(token => singularize(token))
    .filter(token => token.length > 1 && !stopWords.has(token) && !colorTokens(token).includes(token) && !normalizeSize(token))
}

function colorTokens(value: string) {
  const colors = new Set(['black', 'blue', 'green', 'lime', 'sea', 'salt', 'volt', 'white'])
  return normalizeText(value).split(' ').filter(token => colors.has(token))
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9.]+/g, ' ').trim()
}

function singularize(token: string) {
  return token.length > 3 && token.endsWith('s') ? token.slice(0, -1) : token
}

function normalizeSize(value?: string) {
  if (!value) return undefined
  const numeric = value.match(/\d+(?:\.\d+)?/)?.[0]
  if (numeric) return numeric
  const wordSizes: Record<string, string> = {
    nine: '9',
    ten: '10',
    eleven: '11',
    twelve: '12',
  }
  return wordSizes[value.toLowerCase()]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function extractSize(input: string) {
  return normalizeSize(input.match(/size\s+([\d.]+)/i)?.[1]) ??
    normalizeSize(input.match(/\b(nine|ten|eleven|twelve)\b/i)?.[1])
}

function wireDocSearch() {
  const input = document.querySelector<HTMLInputElement>('#doc-search')
  const button = document.querySelector<HTMLButtonElement>('#doc-search-button')
  const results = document.querySelector<HTMLElement>('#doc-results')
  if (!input || !button || !results) return

  const render = () => {
    const matches = searchDocs(input.value || 'runtime')
    results.innerHTML =
      matches.length > 0
        ? matches
            .map(match => `<article><strong>${match.title}</strong><p>${match.body}</p></article>`)
            .join('')
        : '<p>No docs matched that search.</p>'
  }

  button.addEventListener('click', render)
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') render()
  })
  input.value = 'model cascade'
  render()
}
