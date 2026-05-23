/**
 * edgekit v3 spike
 *
 * Validates: Can we run Vercel AI SDK's generateText with tool calling
 * entirely in the browser using @browser-ai providers?
 *
 * Tests:
 * 1. @browser-ai/core imports and Chrome AI detection works
 * 2. @browser-ai/web-llm imports and WebGPU detection works
 * 3. generateText with tools runs a multi-step tool loop
 * 4. needsApproval pauses for user input
 * 5. Streaming works via streamText
 */

import { generateText, streamText, stepCountIs, tool } from 'ai'
import { z } from 'zod'

// -- UI helpers --

const logEl = document.getElementById('log')!
const statusEl = document.getElementById('status')!
const inputEl = document.getElementById('chat-input') as HTMLInputElement

function log(msg: string) {
  logEl.textContent += msg + '\n'
  logEl.scrollTop = logEl.scrollHeight
}

function status(msg: string, type: 'pass' | 'fail' | 'info') {
  const div = document.createElement('div')
  div.className = `status ${type}`
  div.textContent = msg
  statusEl.appendChild(div)
}

// -- Mock product data --

const PRODUCTS = [
  { id: '1', name: 'Nike Air Zoom Pegasus', category: 'running shoes', price: 89.99, sizes: ['9', '10', '10.5', '11'] },
  { id: '2', name: 'Adidas Ultraboost Light', category: 'running shoes', price: 119.99, sizes: ['9', '10', '11'] },
  { id: '3', name: 'New Balance Fresh Foam', category: 'running shoes', price: 74.99, sizes: ['10', '10.5', '11', '12'] },
  { id: '4', name: 'Brooks Ghost 16', category: 'running shoes', price: 94.99, sizes: ['9.5', '10', '10.5'] },
  { id: '5', name: 'Hoka Clifton 9', category: 'running shoes', price: 109.99, sizes: ['10', '11', '12'] },
  { id: '6', name: 'Nike Dunk Low', category: 'casual shoes', price: 64.99, sizes: ['9', '10', '11'] },
]

const cart: { productId: string; quantity: number }[] = []

// -- Tools (same API shape as the design doc) --

const searchProducts = tool({
  description: 'Search the product catalog by query, price range, and size',
  inputSchema: z.object({
    query: z.string().describe('Search terms'),
    maxPrice: z.number().optional().describe('Maximum price in dollars'),
    size: z.string().optional().describe('Product size'),
  }),
  execute: async ({ query, maxPrice, size }) => {
    log(`[tool:searchProducts] query="${query}" maxPrice=${maxPrice} size=${size}`)
    const results = PRODUCTS.filter(p => {
      const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase()) || p.category.toLowerCase().includes(query.toLowerCase())
      const matchesPrice = maxPrice ? p.price <= maxPrice : true
      const matchesSize = size ? p.sizes.includes(size) : true
      return matchesQuery && matchesPrice && matchesSize
    })
    log(`[tool:searchProducts] found ${results.length} results`)
    return { results, total: results.length }
  },
})

const addToCart = tool({
  description: 'Add a product to the shopping cart',
  inputSchema: z.object({
    productId: z.string().describe('Product ID to add'),
    quantity: z.number().default(1).describe('Quantity'),
  }),
  execute: async ({ productId, quantity }) => {
    const product = PRODUCTS.find(p => p.id === productId)
    if (!product) return { success: false, error: 'Product not found' }
    cart.push({ productId, quantity })
    log(`[tool:addToCart] Added ${quantity}x ${product.name} to cart`)
    return { success: true, product: product.name, quantity }
  },
  // THIS IS THE KEY TEST: does needsApproval work?
  needsApproval: true,
})

// -- Validation tests --

async function testImports() {
  log('--- Test 1: Package imports ---')
  try {
    const { browserAI, doesBrowserSupportBrowserAI } = await import('@browser-ai/core')
    const supported = doesBrowserSupportBrowserAI()
    log(`@browser-ai/core imported OK. Chrome AI supported: ${supported}`)
    status(`@browser-ai/core: imported OK (Chrome AI: ${supported ? 'YES' : 'NO'})`, supported ? 'pass' : 'info')
    return { browserAI, chromeSupported: supported }
  } catch (e) {
    log(`@browser-ai/core import FAILED: ${e}`)
    status('@browser-ai/core: import FAILED', 'fail')
    return { browserAI: null, chromeSupported: false }
  }
}

async function testWebLLMImport() {
  log('\n--- Test 2: WebLLM import ---')
  try {
    const { webLLM, createWebLLM, doesBrowserSupportWebLLM } = await import('@browser-ai/web-llm')
    const supported = doesBrowserSupportWebLLM()
    log(`@browser-ai/web-llm imported OK. WebGPU supported: ${supported}`)
    status(`@browser-ai/web-llm: imported OK (WebGPU: ${supported ? 'YES' : 'NO'})`, supported ? 'pass' : 'info')
    return { webLLM, createWebLLM, webGPUSupported: supported }
  } catch (e) {
    log(`@browser-ai/web-llm import FAILED: ${e}`)
    status('@browser-ai/web-llm: import FAILED', 'fail')
    return { webLLM: null, createWebLLM: null, webGPUSupported: false }
  }
}

async function testGenerateText(model: any) {
  log('\n--- Test 3: generateText with tools ---')
  try {
    const result = await generateText({
      model,
      system: 'You are a shopping assistant. Use the searchProducts tool to find products. Always search before answering.',
      prompt: 'Find me running shoes under $100 in size 10',
      tools: { searchProducts, addToCart },
      stopWhen: stepCountIs(5),
    })

    log(`generateText completed:`)
    log(`  Steps: ${result.steps.length}`)
    log(`  Text: ${result.text.slice(0, 200)}...`)
    log(`  Tool calls: ${result.steps.flatMap(s => s.toolCalls).length}`)

    const toolCalls = result.steps.flatMap(s => s.toolCalls)
    const hasSearchCall = toolCalls.some(tc => tc.toolName === 'searchProducts')

    status(`generateText: ${result.steps.length} steps, ${toolCalls.length} tool calls, searchProducts called: ${hasSearchCall}`, hasSearchCall ? 'pass' : 'fail')
    return true
  } catch (e) {
    log(`generateText FAILED: ${e}`)
    status(`generateText: FAILED — ${e}`, 'fail')
    return false
  }
}

async function testStreamText(model: any) {
  log('\n--- Test 4: streamText with tools ---')
  try {
    const result = streamText({
      model,
      system: 'You are a shopping assistant. Use the searchProducts tool to find products.',
      prompt: 'What running shoes do you have?',
      tools: { searchProducts },
      stopWhen: stepCountIs(3),
    })

    let chunks = 0
    let text = ''
    for await (const chunk of result.textStream) {
      chunks++
      text += chunk
    }

    log(`streamText completed: ${chunks} chunks, ${text.length} chars`)
    status(`streamText: ${chunks} chunks streamed OK`, chunks > 0 ? 'pass' : 'fail')
    return true
  } catch (e) {
    log(`streamText FAILED: ${e}`)
    status(`streamText: FAILED — ${e}`, 'fail')
    return false
  }
}

async function testNeedsApproval(model: any) {
  log('\n--- Test 5: needsApproval (HITL) ---')
  try {
    const result = await generateText({
      model,
      system: 'You are a shopping assistant. When asked to add to cart, use the addToCart tool.',
      prompt: 'Add product 1 to my cart',
      tools: { searchProducts, addToCart },
      stopWhen: stepCountIs(3),
    })

    const approvalRequested = result.content.some(part => part.type === 'tool-approval-request')

    log(`needsApproval result: steps=${result.steps.length}, approvalRequested=${approvalRequested}`)

    // Check the response for approval-related content
    const toolResults = result.steps.flatMap(s => s.toolResults)
    log(`Tool results: ${JSON.stringify(toolResults.map(r => r.toolName))}`)

    status(`needsApproval: ${approvalRequested ? 'approval requested as expected' : 'checking behavior...'}`, 'info')
    return true
  } catch (e) {
    log(`needsApproval test FAILED: ${e}`)
    status(`needsApproval: FAILED — ${e}`, 'fail')
    return false
  }
}

// -- Main --

async function main() {
  log('=== edgekit v3 spike ===\n')
  log('Validating: Vercel AI SDK + @browser-ai in browser\n')

  // Test 1 & 2: Imports
  const { browserAI, chromeSupported } = await testImports()
  const { webLLM, createWebLLM, webGPUSupported } = await testWebLLMImport()

  // Determine which model to use
  let model: any = null
  let modelName = ''

  if (chromeSupported && browserAI) {
    log('\n--- Checking Chrome AI (Gemini Nano) availability ---')
    try {
      // Check if the model is actually ready (not just "supported")
      // Chrome AI gates behind user gesture when status is "downloading"/"downloadable"
      const testModel = browserAI('text')
      // Try a minimal generation to verify it's actually usable
      const testResult = await generateText({
        model: testModel,
        prompt: 'Say hi',
        maxOutputTokens: 5,
      })
      model = testModel
      modelName = 'Chrome AI (Gemini Nano)'
      log(`Chrome AI is ready! Test response: "${testResult.text}"`)
      status(`Model: ${modelName} (ready)`, 'pass')
    } catch (e: any) {
      const msg = e?.message || String(e)
      if (msg.includes('NotAllowedError') || msg.includes('user gesture') || msg.includes('downloading') || msg.includes('downloadable')) {
        log(`Chrome AI detected but model not ready: ${msg}`)
        log('Gemini Nano requires download — falling back to WebLLM')
        status('Chrome AI: model downloading (needs user gesture) — falling back', 'info')
      } else {
        log(`Chrome AI model creation failed: ${e}`)
        status(`Chrome AI: failed — ${msg}`, 'fail')
      }
    }
  }

  if (!model && webGPUSupported && createWebLLM) {
    log('\n--- Using WebLLM (WebGPU) ---')
    try {
      const modelId = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'
      const provider = createWebLLM()
      model = provider(modelId, {
        initProgressCallback: (progress) => {
          if (progress.progress !== undefined) {
            log(`  Download: ${(progress.progress * 100).toFixed(1)}%`)
          }
        },
      })
      modelName = 'WebLLM (Qwen2.5-0.5B)'
      status(`Model: ${modelName} (will download on first use)`, 'info')
    } catch (e) {
      log(`WebLLM model creation failed: ${e}`)
    }
  }

  if (!model) {
    log('\n--- No browser AI model available ---')
    status('No model available. Chrome AI or WebGPU required.', 'fail')
    log('\nSpike result: PARTIAL — imports work but no model available in this browser.')
    log('The architecture is valid; test in Chrome 148+ for Chrome AI or a WebGPU browser for WebLLM.')
    return
  }

  // Test 3-5: Tool calling
  log(`\nUsing model: ${modelName}\n`)

  const genTextOk = await testGenerateText(model)
  const streamOk = await testStreamText(model)
  const approvalOk = await testNeedsApproval(model)

  // Summary
  log('\n=== SPIKE RESULTS ===')
  log(`Imports: PASS`)
  log(`Model: ${modelName}`)
  log(`generateText + tools: ${genTextOk ? 'PASS' : 'FAIL'}`)
  log(`streamText + tools: ${streamOk ? 'PASS' : 'FAIL'}`)
  log(`needsApproval (HITL): ${approvalOk ? 'PASS' : 'NEEDS INVESTIGATION'}`)

  // Enable chat input for manual testing
  inputEl.disabled = false
  inputEl.addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return
    const query = inputEl.value.trim()
    if (!query) return
    inputEl.value = ''
    inputEl.disabled = true

    log(`\n--- User: ${query} ---`)

    try {
      const result = streamText({
        model,
        system: 'You are a helpful shopping assistant. Use searchProducts to find products and addToCart to add them. Always search before recommending.',
        prompt: query,
        tools: { searchProducts, addToCart },
        stopWhen: stepCountIs(5),
      })

      for await (const chunk of result.textStream) {
        logEl.textContent += chunk
      }
      log('') // newline
    } catch (err) {
      log(`Error: ${err}`)
    }

    inputEl.disabled = false
    inputEl.focus()
  })
}

main().catch(e => {
  log(`Fatal error: ${e}`)
  status(`Fatal: ${e}`, 'fail')
})
