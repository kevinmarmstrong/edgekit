import '@kevinmarmstrong/edgekit-ui'
import { tool } from '@kevinmarmstrong/edgekit'
import type { EdgeChat } from '@kevinmarmstrong/edgekit-ui'
import { z } from 'zod'
import { docChunks, searchDocs } from './content'
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
]

const cart: Array<{ productId: string; quantity: number }> = []

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
  description: 'Search the product catalog by query, maximum price, and size.',
  inputSchema: z.object({
    query: z.string().describe('Product search terms, such as running shoes'),
    maxPrice: z.number().optional().describe('Maximum price in dollars'),
    size: z.string().optional().describe('Shoe size'),
  }),
  execute: async ({ query, maxPrice, size }) => {
    const normalizedQuery = query.toLowerCase()
    const results = products.filter(product => {
      const matchesQuery =
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.category.toLowerCase().includes(normalizedQuery) ||
        product.support.toLowerCase().includes(normalizedQuery)
      const matchesPrice = maxPrice == null || product.price <= maxPrice
      const matchesSize = size == null || product.sizes.includes(size)
      return matchesQuery && matchesPrice && matchesSize
    })
    return { results, total: results.length }
  },
})

const addToCart = tool({
  description: 'Add a product to the shopping cart after the user approves.',
  inputSchema: z.object({
    productId: z.string().describe('The product id to add'),
    quantity: z.number().default(1).describe('Quantity to add'),
  }),
  execute: async ({ productId, quantity }) => {
    const product = products.find(item => item.id === productId)
    if (!product) return { success: false, error: 'Product not found' }
    cart.push({ productId, quantity })
    renderCart()
    return { success: true, product: product.name, quantity }
  },
  needsApproval: true,
})

document.querySelector<EdgeChat>('edge-chat#docs-chat')?.registerTools({ searchDocs: searchDocsTool })
document.querySelector<EdgeChat>('edge-chat#commerce-chat')?.registerTools({ searchProducts, addToCart })

renderDocCards()
renderCatalog()
renderCart()
wireDocSearch()

function renderDocCards() {
  const grid = document.querySelector<HTMLElement>('#doc-card-grid')
  if (!grid) return

  grid.innerHTML = docChunks
    .map(
      chunk => `
        <article class="doc-card">
          <span>${chunk.tags[0]}</span>
          <h3>${chunk.title}</h3>
          <p>${chunk.body}</p>
        </article>
      `,
    )
    .join('')
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
      return `${item.quantity}x ${product?.name ?? item.productId}`
    })
    .join(', ')
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
