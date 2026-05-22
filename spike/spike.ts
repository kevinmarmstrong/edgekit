import * as webllm from '@mlc-ai/web-llm'

interface ChunkData {
  readonly id: string
  readonly content: string
  readonly embedding: readonly number[]
  readonly metadata: { readonly source: string; readonly title?: string }
}

interface ContentIndex {
  readonly chunks: readonly ChunkData[]
}

interface Metrics {
  coldStartMs?: number
  warmCacheMs?: number
  ttftMs?: number
  tokensPerSec?: number
  totalTokens?: number
  retrievalMs?: number
}

const MODEL_ID = 'Phi-4-mini-instruct-q4f16_1-MLC'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const metricsEl = $<HTMLPreElement>('metrics')
const statusEl = $<HTMLDivElement>('status')
const progressEl = $<HTMLProgressElement>('progress')
const progressContainer = $<HTMLDivElement>('progress-container')
const messagesEl = $<HTMLDivElement>('messages')
const inputEl = $<HTMLInputElement>('input')
const sendEl = $<HTMLButtonElement>('send')

let engine: webllm.MLCEngineInterface | null = null
let contentIndex: ContentIndex | null = null
const metrics: Metrics = {}
const conversationHistory: Array<{ role: string; content: string }> = []

function updateMetrics() {
  const lines: string[] = ['=== Spike Metrics ===']
  if (metrics.coldStartMs != null) lines.push(`Cold start:      ${(metrics.coldStartMs / 1000).toFixed(1)}s`)
  if (metrics.warmCacheMs != null) lines.push(`Warm cache:      ${(metrics.warmCacheMs / 1000).toFixed(1)}s`)
  if (metrics.ttftMs != null) lines.push(`TTFT:            ${metrics.ttftMs}ms`)
  if (metrics.tokensPerSec != null) lines.push(`Tokens/sec:      ${metrics.tokensPerSec.toFixed(1)}`)
  if (metrics.totalTokens != null) lines.push(`Total tokens:    ${metrics.totalTokens}`)
  if (metrics.retrievalMs != null) lines.push(`Retrieval:       ${metrics.retrievalMs}ms`)
  if (lines.length === 1) lines.push('Waiting for model load...')
  metricsEl.textContent = lines.join('\n')
}

function setStatus(text: string) {
  statusEl.textContent = text
}

function addMessage(role: 'user' | 'assistant', content: string, citations?: readonly ChunkData[]) {
  const div = document.createElement('div')
  div.className = `message ${role}`

  const label = document.createElement('span')
  label.className = 'label'
  label.textContent = role === 'user' ? 'You' : 'Assistant'
  div.appendChild(label)

  const text = document.createElement('div')
  text.textContent = content
  div.appendChild(text)

  if (citations && citations.length > 0) {
    const citDiv = document.createElement('div')
    citDiv.className = 'citations'
    citDiv.innerHTML = citations
      .map((c) => `<div class="citation">📄 ${c.metadata.title ?? c.metadata.source}</div>`)
      .join('')
    div.appendChild(citDiv)
  }

  messagesEl.appendChild(div)
  messagesEl.scrollTop = messagesEl.scrollHeight
}

function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    const ai = a[i]!, bi = b[i]!
    dot += ai * bi
    normA += ai * ai
    normB += bi * bi
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

function retrieve(query: string, topK = 3): readonly ChunkData[] {
  if (!contentIndex) return []

  // For the spike, use keyword matching since we don't have a real embedding model loaded.
  // Real implementation will encode the query and do vector similarity.
  const queryLower = query.toLowerCase()
  const scored = contentIndex.chunks.map((chunk) => {
    const words = queryLower.split(/\s+/)
    const contentLower = chunk.content.toLowerCase()
    const titleLower = (chunk.metadata.title ?? '').toLowerCase()
    let score = 0
    for (const word of words) {
      if (word.length < 3) continue
      if (contentLower.includes(word)) score += 1
      if (titleLower.includes(word)) score += 2
    }
    return { chunk, score }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter((s) => s.score > 0)
    .map((s) => s.chunk)
}

async function loadContentIndex() {
  const resp = await fetch('./content-index.json')
  contentIndex = (await resp.json()) as ContentIndex
  setStatus(`Content index loaded: ${contentIndex.chunks.length} chunks`)
}

async function initModel() {
  const startTime = performance.now()
  progressContainer.style.display = 'block'

  setStatus(`Loading model: ${MODEL_ID}...`)

  engine = await webllm.CreateMLCEngine(MODEL_ID, {
    initProgressCallback: (report: webllm.InitProgressReport) => {
      const pct = Math.round(report.progress * 100)
      progressEl.value = pct
      setStatus(`${report.text} (${pct}%)`)
    },
  })

  const elapsed = performance.now() - startTime

  // Heuristic: if load took < 5s, model was probably cached
  if (elapsed < 5000) {
    metrics.warmCacheMs = elapsed
  } else {
    metrics.coldStartMs = elapsed
  }

  progressContainer.style.display = 'none'
  setStatus('Model ready. Ask a question!')
  inputEl.disabled = false
  sendEl.disabled = false
  updateMetrics()
}

async function handleQuery(input: string) {
  inputEl.disabled = true
  sendEl.disabled = true
  addMessage('user', input)

  // Retrieve relevant chunks
  const retrievalStart = performance.now()
  const chunks = retrieve(input)
  metrics.retrievalMs = Math.round(performance.now() - retrievalStart)

  // Build prompt with RAG context
  let systemContent = 'You are a helpful assistant. Answer questions based on the provided context. Be concise. Cite sources when possible.'
  if (chunks.length > 0) {
    const context = chunks
      .map((c) => `[Source: ${c.metadata.title ?? c.metadata.source}]\n${c.content}`)
      .join('\n\n')
    systemContent += `\n\nContext:\n${context}`
  }

  conversationHistory.push({ role: 'user', content: input })

  const messages: webllm.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemContent },
    ...conversationHistory.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ]

  setStatus('Generating...')
  const genStart = performance.now()
  let firstToken = true
  let fullResponse = ''
  let tokenCount = 0

  const response = await engine!.chat.completions.create({
    messages,
    stream: true,
    max_tokens: 512,
    temperature: 0.7,
  })

  for await (const chunk of response) {
    const delta = chunk.choices[0]?.delta?.content ?? ''
    if (delta) {
      if (firstToken) {
        metrics.ttftMs = Math.round(performance.now() - genStart)
        firstToken = false
      }
      fullResponse += delta
      tokenCount++
    }
  }

  const genElapsed = performance.now() - genStart
  metrics.tokensPerSec = (tokenCount / genElapsed) * 1000
  metrics.totalTokens = tokenCount

  conversationHistory.push({ role: 'assistant', content: fullResponse })
  addMessage('assistant', fullResponse, chunks)

  updateMetrics()
  setStatus('Ready')
  inputEl.disabled = false
  sendEl.disabled = false
  inputEl.focus()
}

sendEl.addEventListener('click', () => {
  const val = inputEl.value.trim()
  if (val) {
    inputEl.value = ''
    void handleQuery(val)
  }
})

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !inputEl.disabled) {
    sendEl.click()
  }
})

updateMetrics()
void loadContentIndex().then(() => initModel())
