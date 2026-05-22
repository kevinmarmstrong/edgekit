# edgekit

AI chat that runs entirely in the browser. No API keys, no cloud costs, no data leaves the device.

Small language models (1.5B-7B parameters) run on the visitor's GPU via WebGPU. Pair with retrieval-augmented generation (RAG) to ground answers in your site's content.

## Quick Start

```html
<div id="chat"></div>
<script type="module">
  import { createRuntime } from '@edgekit/core'
  import { webllm } from '@edgekit/model-webllm'
  import { localRAG } from '@edgekit/rag-local'
  import { webComponent } from '@edgekit/ui-component'

  const ui = webComponent({ theme: 'auto' })

  const runtime = createRuntime({
    model: webllm(),
    rag: localRAG({ indexUrl: '/content-index.json' }),
    ui,
    downloadPolicy: 'prompt',
    systemPrompt: 'Answer questions about this site using the provided context.',
  })

  ui.mount(document.getElementById('chat'), runtime)
</script>
```

That's it. Two imports, one config object, one mount call.

## How It Works

1. **Visitor asks a question** in the chat widget
2. **RAG retrieves** relevant content chunks from a pre-built index (cosine similarity, runs instantly)
3. **The model generates** a grounded response, streaming tokens as they're produced
4. **Everything runs locally** — the model, embeddings, and vector search all execute in the browser

If the model isn't downloaded yet, the runtime shows retrieved content first (retrieval-only mode) and offers to download the model for smarter answers.

## Packages

| Package | Description | Size |
|---------|-------------|------|
| `@edgekit/core` | Orchestrator, event bus, context manager, guardrails | ~2 KB |
| `@edgekit/model-webllm` | WebLLM adapter (WebGPU inference) | ~3 KB |
| `@edgekit/model-chrome` | Chrome Prompt API adapter (Gemini Nano) | ~2 KB |
| `@edgekit/rag-local` | IndexedDB vector store + cosine similarity | ~3 KB |
| `@edgekit/embeddings` | Transformers.js embedding adapter | ~1 KB |
| `@edgekit/ui-component` | `<edge-chat>` Lit web component | ~3 KB |
| `@edgekit/skills` | Built-in skills (blog-chat) | ~1 KB |
| `@edgekit/cli` | Content ingestion CLI | ~1 KB |

## Model Providers

### WebLLM (WebGPU)

Runs quantized models on the GPU via WebGPU. Requires a one-time model download (~500MB-2GB depending on tier).

```typescript
import { webllm } from '@edgekit/model-webllm'

webllm({ tier: 'tiny' })     // Qwen2.5-0.5B (~500MB, fastest)
webllm({ tier: 'standard' }) // Phi-4-Mini 3.8B (~2GB, best quality/size ratio)
webllm({ tier: 'high' })     // Phi-3.5-Mini (~2GB, highest quality)
```

### Chrome Prompt API

Zero-download inference using Chrome's built-in Gemini Nano (Chrome 148+).

```typescript
import { chromeAI } from '@edgekit/model-chrome'

chromeAI() // Uses window.ai, no download needed
```

## Download Policy

Control when/whether the model downloads:

- `'auto'` — Download immediately on first query (pre-authorized by app)
- `'prompt'` — Ask the user before downloading (default)
- `'never'` — Retrieval-only mode, no model download

```typescript
createRuntime({
  model: webllm(),
  downloadPolicy: 'prompt',
})
```

## Content Index

Build a content index from your site's markdown/HTML:

```bash
npx @edgekit/cli init    # Creates config
npx @edgekit/cli build   # Markdown -> chunks -> JSON index
```

The CLI outputs a `content-index.json` that ships as a static file with your site. The browser loads it, stores chunks in IndexedDB, and uses hash-based versioning to detect updates.

## Events

Subscribe to runtime events for custom UI or analytics:

```typescript
runtime.on((event) => {
  switch (event.type) {
    case 'model:download:start':
    case 'model:download:progress': // event.progress: 0-1
    case 'model:download:complete':
    case 'retrieval:start':
    case 'retrieval:complete':       // event.chunks
    case 'generation:start':
    case 'generation:token':         // event.token
    case 'generation:complete':      // event.text
    case 'tool:call':
    case 'tool:result':
    case 'error':                    // event.error, event.recoverable
  }
})
```

## Browser Support

| Browser | WebGPU | Chrome AI | Status |
|---------|--------|-----------|--------|
| Chrome 113+ | Yes | Yes (148+) | Full support |
| Edge 113+ | Yes | No | WebGPU only |
| Firefox 127+ | Yes | No | WebGPU only |
| Safari | No | No | Retrieval-only fallback |

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck

# Run the demo
cd examples/blog-chat
pnpm dev
```

## Performance (Phi-4-Mini 3.8B, M-series Mac)

| Metric | Value |
|--------|-------|
| Cold start (first download) | ~80s |
| Warm cache load | ~5s |
| Time to first token | ~460ms |
| Tokens/second | 29-34 |
| Retrieval latency | <1ms |

## License

MIT
