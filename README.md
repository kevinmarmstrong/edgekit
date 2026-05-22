<p align="center">
  <strong>edgekit</strong>
</p>

<p align="center">
  Browser-native AI runtime. Inference, retrieval, and UI — no server required.
</p>

<p align="center">
  <a href="https://github.com/kevinmarmstrong/edgekit/actions/workflows/ci.yml"><img src="https://github.com/kevinmarmstrong/edgekit/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/@edgekit/core"><img src="https://img.shields.io/npm/v/@edgekit/core?label=%40edgekit%2Fcore" alt="npm" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" /></a>
  <a href="https://www.npmjs.com/package/@edgekit/core"><img src="https://img.shields.io/npm/dm/@edgekit/core?label=downloads" alt="Downloads" /></a>
</p>

---

Embed AI into any website with zero cloud costs. Small language models (1.5B-7B) run on the visitor's GPU via WebGPU. Pair with retrieval-augmented generation to ground answers in your content. Everything runs locally — no API keys, no usage fees, no data leaves the device.

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
    systemPrompt: 'Answer questions using the provided context.',
  })

  ui.mount(document.getElementById('chat'), runtime)
</script>
```

That's it. One config, one mount call.

## How It Works

```
User Query
    |
    v
[ RAG Retrieval ] --- cosine similarity against pre-built index (< 1ms)
    |
    v
[ Prompt Assembly ] --- system prompt + retrieved context + conversation history
    |
    v
[ Local Inference ] --- WebGPU (WebLLM) or Chrome Prompt API (Gemini Nano)
    |
    v
[ Streaming Response ] --- tokens stream to the UI as they're generated
```

If the model isn't downloaded yet, edgekit shows retrieved content immediately (retrieval-only mode) and offers to download the model for richer answers.

## Architecture

```
@edgekit/core .............. Orchestrator, event bus, context manager, guardrails
@edgekit/model-webllm ...... WebLLM adapter — WebGPU inference
@edgekit/model-chrome ...... Chrome Prompt API — Gemini Nano (zero download)
@edgekit/rag-local ......... IndexedDB vector store + cosine similarity
@edgekit/embeddings ........ Transformers.js embedding adapter
@edgekit/ui-component ...... <edge-chat> Lit web component
@edgekit/skills ............ Pluggable skills (blog-chat built in)
@edgekit/cli ............... Content ingestion CLI
```

Total runtime overhead: **~15 KB gzipped** (excluding model weights).

## Model Providers

### WebLLM (WebGPU)

Runs quantized models on the GPU. One-time download, cached by the browser.

```typescript
import { webllm } from '@edgekit/model-webllm'

webllm({ tier: 'tiny' })     // Qwen2.5-0.5B — ~500MB, fastest
webllm({ tier: 'standard' }) // Phi-4-Mini 3.8B — ~2GB, best quality/size
webllm({ tier: 'high' })     // Phi-3.5-Mini — ~2GB, highest quality
```

### Chrome Prompt API

Zero-download inference via Chrome's built-in Gemini Nano (Chrome 148+).

```typescript
import { chromeAI } from '@edgekit/model-chrome'

chromeAI() // Uses window.ai — no download, instant start
```

## Download Policy

Control when the model downloads:

| Policy | Behavior |
|--------|----------|
| `'auto'` | Download immediately on first query |
| `'prompt'` | Ask the user first (default) |
| `'never'` | Retrieval-only, no model download |

```typescript
createRuntime({ model: webllm(), downloadPolicy: 'prompt' })
```

## Content Index

Build an index from your site's content:

```bash
npx @edgekit/cli init    # Create config
npx @edgekit/cli build   # Markdown -> chunks -> embeddings -> JSON
```

Ships as a static `content-index.json`. The browser loads it into IndexedDB and uses hash-based versioning to detect updates automatically.

## Events

Every stage of the pipeline emits typed events:

```typescript
runtime.on((event) => {
  switch (event.type) {
    case 'model:download:progress': // event.progress (0-1)
    case 'retrieval:complete':       // event.chunks
    case 'generation:token':         // event.token (streaming)
    case 'generation:complete':      // event.text (full response)
    case 'tool:call':                // event.toolCall
    case 'error':                    // event.error, event.recoverable
  }
})
```

## Browser Support

| Browser | WebGPU | Chrome AI | Fallback |
|---------|--------|-----------|----------|
| Chrome 113+ | Yes | Yes (148+) | Full support |
| Edge 113+ | Yes | No | WebGPU only |
| Firefox 127+ | Yes | No | WebGPU only |
| Safari | No | No | Retrieval-only |

When WebGPU isn't available, edgekit falls back to retrieval-only mode — visitors still get cited answers from your content, just without generative AI.

## Performance

Measured with Phi-4-Mini 3.8B (q4f16) on an M-series Mac:

| Metric | Value |
|--------|-------|
| Cold start (first download) | ~80s |
| Warm cache load | ~5s |
| Time to first token | ~460ms |
| Tokens/sec | 29-34 |
| Retrieval latency | < 1ms |

## Development

```bash
pnpm install       # Install dependencies
pnpm build         # Build all packages
pnpm test          # Run tests (50 tests, < 1s)
pnpm typecheck     # TypeScript strict mode
pnpm lint          # ESLint

cd examples/blog-chat && pnpm dev   # Run the demo
```

Requires Node 22+ and pnpm 10+.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, project structure, and guidelines.

## License

[MIT](LICENSE)
