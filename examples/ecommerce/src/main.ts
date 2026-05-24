import '@kevinmarmstrong/edgekit-ui'
import { chromeAI, createModelProvider, modelOptional, tool, webLLM } from '@kevinmarmstrong/edgekit'
import type { LanguageModelV3 } from '@kevinmarmstrong/edgekit'
import { z } from 'zod'
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

const searchProducts = tool({
  description: 'Search the product catalog by query, maximum price, size, and color.',
  inputSchema: z.object({
    query: z.string().describe('Product search terms, such as running shoes'),
    maxPrice: modelOptional(z.number()).describe('Maximum price in dollars'),
    size: modelOptional(z.string()).describe('Shoe size'),
    color: modelOptional(z.string()).describe('Requested product color'),
  }),
  execute: async ({ query, maxPrice, size, color }) => {
    const normalizedQuery = query.toLowerCase()
    const normalizedColor = color?.toLowerCase()
    const results = products.filter(product => {
      const matchesQuery =
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.category.toLowerCase().includes(normalizedQuery) ||
        product.support.toLowerCase().includes(normalizedQuery)
      const matchesPrice = maxPrice == null || product.price <= maxPrice
      const matchesSize = size == null || product.sizes.includes(size)
      const matchesColor = normalizedColor == null || product.color.toLowerCase().includes(normalizedColor)
      return matchesQuery && matchesPrice && matchesSize && matchesColor
    })
    return { results, total: results.length }
  },
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

const catalog = document.querySelector<HTMLElement>('#catalog')
const chat = document.querySelector('edge-chat')
const params = new URLSearchParams(window.location.search)
const scriptedMode = params.get('agentMode') === 'scripted'
const modelMode = params.get('modelMode') ?? 'chrome'
const downloadPolicy = params.get('downloadPolicy') === 'auto' ? 'auto' : 'never'

renderCatalog()
renderCart()
if (scriptedMode) {
  chat?.configure({
    model: [scriptedProvider()],
    streamText: createScriptedCommerceStream() as never,
  })
} else {
  chat?.configure({
    model: commerceModelCascade(modelMode),
    downloadPolicy,
    onNoModel: ({ input }) => answerFromCatalog(input),
  })
}
chat?.registerTools({ searchProducts, addToCart })
chat?.registerActions(({ toolName, output }) => {
  if (toolName !== 'searchProducts') return []
  return extractProducts(output).map(product => ({
    id: `add-${product.id}`,
    label: `Add ${product.name} to cart`,
    toolName: 'addToCart',
    description: `$${product.price.toFixed(2)}. Choose a size and add it directly from the sidecar.`,
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

function commerceModelCascade(mode: string) {
  if (mode === 'webllm') return [webLLM({ modelSize: 'about 400 MB' })]
  if (mode === 'cascade') return [chromeAI(), webLLM({ modelSize: 'about 400 MB' })]
  return [chromeAI()]
}

function renderCatalog() {
  if (!catalog) return
  catalog.innerHTML = products
    .map(
      product => `
        <article class="product-card" data-testid="product-card">
          <div class="product-art" aria-hidden="true">${product.name.slice(0, 2)}</div>
          <div>
            <h2>${product.name}</h2>
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

function answerFromCatalog(input: string) {
  const maxPrice = input.match(/under\s+\$?(\d+)/i)?.[1]
  const requestedSize = extractSize(input)
  const requestedColor = input.match(/\b(white|black|blue|green|volt)\b/i)?.[1]?.toLowerCase()
  const normalizedInput = input.toLowerCase()
  const wantsDunks = normalizedInput.includes('dunk')
  const results = products.filter(product => {
    const productName = product.name.toLowerCase()
    const matchesQuery =
      (wantsDunks && productName.includes('dunk')) ||
      (!wantsDunks &&
        (normalizedInput.includes('shoe') ||
          normalizedInput.includes('running') ||
          productName.includes(normalizedInput)))
    const matchesPrice = maxPrice == null || product.price <= Number(maxPrice)
    const matchesSize = requestedSize == null || product.sizes.includes(requestedSize)
    const matchesColor = requestedColor == null || product.color.toLowerCase().includes(requestedColor)
    return matchesQuery && matchesPrice && matchesSize && matchesColor
  })

  if (results.length === 0) {
    return 'Local browser AI is unavailable here, and basic catalog mode did not find matching products.'
  }

  return [
    'Local browser AI is unavailable here, so edgekit answered through basic catalog mode.',
    '',
    ...results.map(product => `${product.name} - $${product.price.toFixed(2)} - ${product.support}`),
    '',
    'Enable Chrome AI for tool-calling recommendations and guarded add-to-cart actions.',
  ].join('\n')
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

function scriptedProvider() {
  const scriptedModel = {
    provider: 'scripted',
    modelId: 'ecommerce-workflow',
    specificationVersion: 'v3',
  } as LanguageModelV3

  return createModelProvider({
    id: 'scripted',
    label: 'Scripted agent',
    resolve: async () => scriptedModel,
  })
}

function createScriptedCommerceStream() {
  return (options: { messages?: unknown[]; tools?: Record<string, unknown> }) => {
    const messages = options.messages ?? []
    const approval = findLatestApprovalResponse(messages)

    if (approval) {
      return approval.approved
        ? createApprovedCartStream(options.tools ?? {})
        : createRejectedCartStream()
    }

    const input = latestUserInput(messages)
    const request = parseShoppingRequest(input)
    return createShoppingStream(options.tools ?? {}, request)
  }
}

async function* createFullStream(
  tools: Record<string, unknown>,
  request: ShoppingRequest,
): AsyncGenerator<Record<string, unknown>> {
  const searchCallId = 'tool-search-products'
  yield {
    type: 'tool-call',
    toolCallId: searchCallId,
    toolName: 'searchProducts',
    input: request.searchInput,
  }

  const searchOutput = await executeTool(tools.searchProducts, request.searchInput)
  yield {
    type: 'tool-result',
    toolCallId: searchCallId,
    toolName: 'searchProducts',
    output: searchOutput,
  }

  const results = extractProducts(searchOutput)
  const product = request.productId
    ? products.find(item => item.id === request.productId)
    : results[0]

  if (!request.addToCart) {
    const names = results.map(item => item.name).join(', ')
    yield {
      type: 'text-delta',
      delta: names.length > 0
        ? `I found ${names}.`
        : 'I could not find matching products in the catalog.',
    }
    return
  }

  const cartProduct = product ?? products.find(item => item.id === 'dunk')
  yield {
    type: 'text-delta',
    delta: `I found ${cartProduct?.name ?? 'a matching product'}. Approval is required before adding it to your cart.`,
  }
  yield {
    type: 'tool-approval-request',
    approvalId: 'approval-add-to-cart',
    toolCall: {
      type: 'tool-call',
      toolCallId: 'tool-add-to-cart',
      toolName: 'addToCart',
      input: { productId: cartProduct?.id ?? 'dunk', quantity: 1, size: request.searchInput.size },
    },
  }
}

function createShoppingStream(tools: Record<string, unknown>, request: ShoppingRequest) {
  const responseText = request.addToCart
    ? 'I found Nike Dunk Low. Approval is required before adding it to your cart.'
    : 'I searched the catalog and returned matching products.'

  return {
    fullStream: createFullStream(tools, request),
    response: Promise.resolve({
      messages: [
        {
          role: 'assistant',
          content: request.addToCart
            ? [
                { type: 'text', text: responseText },
                {
                  type: 'tool-approval-request',
                  approvalId: 'approval-add-to-cart',
                  toolCall: {
                    type: 'tool-call',
                    toolCallId: 'tool-add-to-cart',
                    toolName: 'addToCart',
                    input: { productId: request.productId ?? 'dunk', quantity: 1, size: request.searchInput.size },
                  },
                },
              ]
            : [{ type: 'text', text: responseText }],
        },
      ],
    }),
  }
}

function createApprovedCartStream(tools: Record<string, unknown>) {
  return {
    fullStream: (async function* () {
      const input = { productId: 'dunk', quantity: 1 }
      yield {
        type: 'tool-call',
        toolCallId: 'tool-add-to-cart',
        toolName: 'addToCart',
        input,
      }
      const output = await executeTool(tools.addToCart, input)
      yield {
        type: 'tool-result',
        toolCallId: 'tool-add-to-cart',
        toolName: 'addToCart',
        output,
      }
      yield {
        type: 'text-delta',
        delta: 'Added Nike Dunk Low to your cart.',
      }
    })(),
    response: Promise.resolve({
      messages: [{ role: 'assistant', content: [{ type: 'text', text: 'Added Nike Dunk Low to your cart.' }] }],
    }),
  }
}

function createRejectedCartStream() {
  return {
    fullStream: (async function* () {
      yield {
        type: 'text-delta',
        delta: 'I did not add Nike Dunk Low to your cart.',
      }
    })(),
    response: Promise.resolve({
      messages: [
        { role: 'assistant', content: [{ type: 'text', text: 'I did not add Nike Dunk Low to your cart.' }] },
      ],
    }),
  }
}

type ShoppingRequest = {
  searchInput: {
    query: string
    maxPrice?: number
    size?: string
    color?: string
  }
  addToCart: boolean
  productId?: string
}

function parseShoppingRequest(input: string): ShoppingRequest {
  const normalized = input.toLowerCase()
  const maxPrice = normalized.match(/under\s+\$?(\d+)/)?.[1]
  const requestedSize = extractSize(normalized)
  const color = normalized.match(/\b(white|black|blue|green|volt)\b/)?.[1]
  const wantsDunks = normalized.includes('dunk')
  const addToCart = /\b(cart|bag|checkout|buy)\b/.test(normalized)

  return {
    searchInput: {
      query: wantsDunks ? 'nike dunk' : 'running shoes',
      maxPrice: maxPrice == null ? undefined : Number(maxPrice),
      size: requestedSize,
      color,
    },
    addToCart,
    productId: wantsDunks ? 'dunk' : undefined,
  }
}

function latestUserInput(messages: unknown[]) {
  const userMessage = [...messages]
    .reverse()
    .find((message): message is { role: string; content: unknown } => {
      return isRecord(message) && message.role === 'user'
    })
  return typeof userMessage?.content === 'string' ? userMessage.content : ''
}

function findLatestApprovalResponse(messages: unknown[]) {
  const toolMessage = [...messages]
    .reverse()
    .find((message): message is { role: string; content: unknown } => {
      return isRecord(message) && message.role === 'tool'
    })
  const content = Array.isArray(toolMessage?.content) ? toolMessage.content : []
  return content.find(
    (part): part is { type: string; approved: boolean } =>
      isRecord(part) && part.type === 'tool-approval-response' && typeof part.approved === 'boolean',
  )
}

async function executeTool(toolDefinition: unknown, input: Record<string, unknown>) {
  const candidate = toolDefinition as { execute?: (input: Record<string, unknown>) => unknown | Promise<unknown> }
  if (!candidate.execute) return { error: 'Tool is not executable.' }
  return candidate.execute(input)
}

function extractProducts(output: unknown): Product[] {
  if (!isRecord(output) || !Array.isArray(output.results)) return []
  return output.results.filter((item): item is Product => {
    return isRecord(item) && typeof item.id === 'string' && typeof item.name === 'string'
  })
}

function extractSize(input: string) {
  const numeric = input.match(/size\s+([\d.]+)/i)?.[1]
  if (numeric) return numeric

  const wordSizes: Record<string, string> = {
    nine: '9',
    ten: '10',
    eleven: '11',
    twelve: '12',
  }
  return input.match(/\b(nine|ten|eleven|twelve)\b/i)?.[1]?.toLowerCase().replace(
    /nine|ten|eleven|twelve/,
    match => wordSizes[match],
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
