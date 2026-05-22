<p align="center">
  <strong>edgekit</strong>
</p>

<p align="center">
  Add AI to any website. Runs entirely in the visitor's browser.
</p>

<p align="center">
  <a href="https://github.com/kevinmarmstrong/edgekit/actions/workflows/ci.yml"><img src="https://github.com/kevinmarmstrong/edgekit/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/@edgekit/core"><img src="https://img.shields.io/npm/v/@edgekit/core?label=%40edgekit%2Fcore" alt="npm" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" /></a>
  <a href="https://www.npmjs.com/package/@edgekit/core"><img src="https://img.shields.io/npm/dm/@edgekit/core?label=downloads" alt="Downloads" /></a>
</p>

---

## The Problem

You want to add AI to your website, but:

- **Cloud AI APIs charge per token.** A viral blog post could cost you hundreds overnight. You can't predict usage, so you can't predict cost.
- **Your users' data leaves their device.** Every question goes to someone else's server. For docs, support, and knowledge bases, that's a privacy problem you don't need.
- **You're coupling to a vendor.** API changes, rate limits, outages... you inherit all of it.

## The Solution

Edgekit runs AI directly in the browser. The model, the retrieval engine, and the vector search all execute on the visitor's GPU via WebGPU. No server, no API key, no usage fees, no data leaving the device.

Small language models (1.5B-7B parameters) are good enough for bounded-knowledge domains: documentation sites, product FAQs, help centers, blog archives, internal wikis. You pre-build a content index at deploy time, ship it as a static JSON file, and edgekit grounds every answer in your actual content using retrieval-augmented generation (RAG).

The result: an AI assistant for your site that costs nothing to run, scales to infinite users, and keeps their data completely private.

## Who Is This For

- **Documentation sites** that want an "Ask AI" feature without paying per-query
- **Indie developers and small teams** who can't afford usage-based AI pricing
- **Privacy-conscious products** where user data can't leave the browser
- **Blogs and content sites** that want to let readers ask questions about their archive
- **Internal tools** where you can't send company data to a third-party API

## Principles

**Push everything to the edge.** The server is a liability. Every request you route through a backend is a cost you pay, a failure mode you own, and a privacy promise you have to keep. Edgekit moves inference, retrieval, and vector search to the visitor's device. Your server serves static files. That's it.

**Thin runtime, fat browser.** The runtime library is ~15 KB. The real work happens on the visitor's GPU, in their IndexedDB, inside their browser's cache. Edgekit is a thin orchestration layer that wires together capabilities the browser already has. The heaviest thing you ship is the model weights, and the browser caches those after the first visit.

**Modular by default.** Every piece is a separate package with a clean interface. Swap the model provider, bring your own UI, skip the embeddings layer, use retrieval without generation. The runtime doesn't care what's plugged in, it just calls `generate()`, `retrieve()`, and `mount()`. If you only need vector search, install `@edgekit/rag-local` and nothing else.

**Progressive enhancement, not graceful degradation.** Start with what works everywhere (retrieval), then layer on capabilities as the browser supports them. No WebGPU? Visitors still get cited answers from your content. Model not downloaded yet? Show the retrieved context first, offer the model as an upgrade. The experience gets better, but it never breaks.

**Zero marginal cost.** The economics are the point. Cloud AI charges you per token. Edgekit charges you nothing, because the compute runs on hardware someone else already paid for. Your millionth user costs the same as your first: zero. This isn't a technical detail... it's the entire reason this project exists.

**Privacy as architecture, not policy.** Data doesn't leave the device. Not because of a privacy policy. Not because of encryption. Because the code literally runs locally and makes no network requests after the initial page load. There is no server to send data to. That's a stronger guarantee than any policy can make.

**Grounded answers only.** Edgekit is not a general-purpose chatbot. It answers questions about *your* content using retrieval-augmented generation. Every response is grounded in chunks you indexed at build time. This is a feature, not a limitation... it means the model can't hallucinate about topics outside your content, and users can verify answers against cited sources.

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

One config object, one mount call. The runtime handles model loading, content retrieval, prompt assembly, streaming generation, and the chat UI.

## How It Works

```
Visitor asks a question
         |
         v
  [ Content Retrieval ]  -- cosine similarity against your pre-built index (< 1ms)
         |
         v
  [ Prompt Assembly ]    -- system prompt + matched content + conversation history
         |
         v
  [ Browser Inference ]  -- WebGPU model or Chrome's built-in Gemini Nano
         |
         v
  [ Streaming Response ] -- tokens appear in the chat UI as they're generated
```

**Progressive enhancement built in.** If the visitor's browser doesn't support WebGPU, or they decline the model download, edgekit falls back to retrieval-only mode. They still get cited answers pulled from your content, just without the generative layer. No blank screen, no error.

## What's Inside

Edgekit is a modular runtime, not a monolith. Use what you need:

```
@edgekit/core .............. Orchestrator, event bus, context manager, guardrails
@edgekit/model-webllm ...... WebGPU inference via WebLLM (Phi-4-Mini, Qwen, etc.)
@edgekit/model-chrome ...... Chrome's built-in Gemini Nano (zero download)
@edgekit/rag-local ......... Vector search in IndexedDB + cosine similarity
@edgekit/embeddings ........ Browser-side embeddings via Transformers.js
@edgekit/ui-component ...... Drop-in <edge-chat> web component (Lit, ~3KB)
@edgekit/skills ............ Pluggable skills with tool calling
@edgekit/cli ............... CLI to build your content index from markdown/HTML
```

Total runtime: **~15 KB gzipped** (excluding model weights). Swap providers, bring your own UI, or use the built-in web component.

## Model Providers

### WebLLM (WebGPU)

Quantized models run on the visitor's GPU. Downloaded once, cached by the browser.

```typescript
import { webllm } from '@edgekit/model-webllm'

webllm({ tier: 'tiny' })     // Qwen2.5-0.5B — ~500MB download, fastest start
webllm({ tier: 'standard' }) // Phi-4-Mini 3.8B — ~2GB, best quality per byte
webllm({ tier: 'high' })     // Phi-3.5-Mini — ~2GB, highest quality
```

### Chrome Prompt API

Chrome 148+ includes Gemini Nano. Zero download, instant start.

```typescript
import { chromeAI } from '@edgekit/model-chrome'

chromeAI() // Uses window.ai — already on the device
```

## Download Policy

You control whether and when the model downloads:

| Policy | What happens | Best for |
|--------|-------------|----------|
| `'auto'` | Downloads on first query, no prompt | Apps where users expect AI |
| `'prompt'` | Asks the visitor first (default) | Websites, blogs, docs |
| `'never'` | Retrieval-only, no model at all | Maximum privacy, lowest friction |

## Building Your Content Index

Edgekit answers questions about *your* content. You build the index at deploy time:

```bash
npx @edgekit/cli init    # Creates config file
npx @edgekit/cli build   # Markdown -> chunks -> embeddings -> content-index.json
```

The output is a static JSON file that ships with your site. The browser loads it into IndexedDB and uses hash-based versioning to detect updates. Redeploy your site, and visitors automatically get the fresh index.

## Events

Every stage of the pipeline emits typed events. Use them for custom UI, analytics, or debugging:

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

| Browser | WebGPU | Chrome AI | What works |
|---------|--------|-----------|------------|
| Chrome 113+ | Yes | Yes (148+) | Full: inference + retrieval |
| Edge 113+ | Yes | No | Full: WebGPU inference + retrieval |
| Firefox 127+ | Yes | No | Full: WebGPU inference + retrieval |
| Safari | No | No | Retrieval-only (cited answers, no generation) |

Edgekit never shows a blank screen. Browsers without WebGPU get retrieval-only mode automatically.

## Performance

Measured with Phi-4-Mini 3.8B (q4f16) on M-series Mac:

| Metric | Value | Note |
|--------|-------|------|
| First visit (model download) | ~80s | One-time, cached after |
| Return visit (warm cache) | ~5s | Model loads from browser cache |
| Time to first token | ~460ms | After model is loaded |
| Generation speed | 29-34 tok/s | Conversational speed |
| Content retrieval | < 1ms | Cosine similarity over IndexedDB |

After the first visit, the AI loads in ~5 seconds and generates at conversational speed. Retrieval is always instant.

## Development

```bash
pnpm install       # Install dependencies
pnpm build         # Build all 8 packages
pnpm test          # 54 tests, runs in < 1s
pnpm typecheck     # TypeScript strict mode
pnpm lint          # ESLint

cd examples/blog-chat && pnpm dev   # Run the demo locally
```

Requires Node 22+ and pnpm 10+.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, project structure, and PR guidelines.

## License

[MIT](LICENSE)
