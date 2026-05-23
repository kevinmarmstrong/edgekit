# edgekit v3

## What this is

Browser-native agent runtime. AI agents that run entirely in the visitor's browser via Chrome AI (Gemini Nano) or WebLLM (WebGPU). No backend, no API keys, zero marginal cost.

Read `DESIGN.md` first — it is the source of truth. Everything in this file supports it.

## Critical Rules

1. **Use, don't build.** If Vercel AI SDK or @browser-ai handles it, use them. Do not hand-roll orchestration, model adapters, streaming, tool loops, or message formatting. This is the #1 cause of bugs in v1/v2.
2. **Three packages, not nine.** `packages/core`, `packages/ui`, `packages/cli`. That's it.
3. **Test the product.** Open the demo in a real browser and try it. Unit tests are secondary to "does a user get a good result?"
4. **The agent does things, not just answers questions.** Tool calling is the core value, not RAG Q&A.
5. **Modular and configurable.** Every layer is a default, not a mandate. The model cascade is an array the developer controls. Notifications are callbacks the developer can override or suppress. No hardcoded UX — sensible defaults with full escape hatches.

## Architecture

```
edgekit sidecar (web component)
  |
  +-- Vercel AI SDK (orchestration, tool loops, streaming, HITL)
  |     +-- @browser-ai/core (Chrome AI / Gemini Nano)
  |     +-- @browser-ai/web-llm (WebGPU models)
  |
  +-- Tool registry (developer's endpoints registered as tools)
  +-- UI (Lit web component)
```

## Key Dependencies

| Package | Version (spike-tested) | Purpose |
|---------|----------------------|---------|
| `ai` | 6.0.191 | Vercel AI SDK v6 — orchestration, tool loops, streaming |
| `@browser-ai/core` | 2.1.12 | Chrome AI (Gemini Nano) provider for AI SDK |
| `@browser-ai/web-llm` | 2.1.7 | WebLLM (WebGPU) provider for AI SDK |
| `zod` | latest | Tool parameter schemas |
| `lit` | latest | Web component framework (~5KB) |

## Validated API Patterns (from spike)

### Import pattern
```typescript
import { generateText, streamText, tool } from 'ai'
import { z } from 'zod'
```

### @browser-ai/core (Chrome AI)
```typescript
const { browserAI, doesBrowserSupportBrowserAI } = await import('@browser-ai/core')
const supported = doesBrowserSupportBrowserAI() // true = API exists, NOT "model ready"
const model = browserAI('language-model')
```

### @browser-ai/web-llm (WebGPU)
```typescript
const { createWebLLM, doesBrowserSupportWebLLM } = await import('@browser-ai/web-llm')
const supported = doesBrowserSupportWebLLM() // true = WebGPU available
const provider = createWebLLM({
  model: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
  onProgress: (progress) => { /* download progress */ },
})
const model = provider('Qwen2.5-0.5B-Instruct-q4f16_1-MLC')
```

### Tool definition (re-exports from AI SDK)
```typescript
const searchProducts = tool({
  description: 'Search the product catalog',
  parameters: z.object({ query: z.string(), maxPrice: z.number().optional() }),
  execute: async ({ query, maxPrice }) => { /* ... */ },
  needsApproval: false,
})
```

### generateText with tool loop
```typescript
const result = await generateText({
  model,
  system: 'You are a shopping assistant.',
  prompt: userMessage,
  tools: { searchProducts, addToCart },
  stopWhen: (event) => {
    if (event.steps.length > 0 && event.finishReason === 'stop') return true
    if (event.steps.length >= 5) return true // safety limit
    return false
  },
})
// result.steps contains each step (tool calls + responses)
// result.text contains the final text response
```

### streamText with tool loop
```typescript
const result = streamText({
  model,
  system: 'You are a shopping assistant.',
  prompt: userMessage,
  tools: { searchProducts },
  stopWhen: (event) => {
    if (event.steps.length > 0 && event.finishReason === 'stop') return true
    if (event.steps.length >= 3) return true
    return false
  },
})
for await (const chunk of result.textStream) {
  // render chunk
}
```

## Progressive Model Cascade (decision tree)

This is NOT a simple fallback list. Each step has distinct UX. See DESIGN.md for the full tree.

```
1. Chrome AI ready? → Use instantly (zero download)
2. Chrome AI available but downloading? → Based on downloadPolicy: auto-wait / prompt user / skip
3. WebGPU available? → Based on downloadPolicy: auto-download WebLLM / prompt user / skip
4. Server provider configured? → Use cloud API (optional, developer-configured)
5. Nothing? → Search-only tools + graceful human-readable error message
```

**downloadPolicy values:**
- `'auto'` — developer pre-authorized downloads (during app onboarding). No user prompt.
- `'prompt'` (default) — ask user before any download. Non-technical language.
- `'never'` — no downloads. Server provider or search-only.

**Chrome AI user gesture requirement:** `'downloadable'` state requires a button click to start. Design UI so the user's first chat message or an "Enable AI" button provides the gesture. NEVER show `NotAllowedError` to users.

## Chrome AI Availability States

- `'readily'` = model cached and ready (instant, no prompt needed)
- `'downloading'` = download in progress (show progress, wait)
- `'downloadable'` = available but not started (needs user gesture to begin)

`doesBrowserSupportBrowserAI()` returning `true` only means the API exists. You MUST check availability state. See `spike/src/main.ts` for the working pattern.

## WebLLM Model IDs

Use MLC-format model IDs. Tested in spike:
- Tiny (spike): `Qwen2.5-0.5B-Instruct-q4f16_1-MLC`
- Standard (target): `Phi-4-mini-instruct-q4f16_1-MLC` or `SmolLM2-1.7B-Instruct-q4f16_1-MLC`
- High: `Qwen2.5-3B-Instruct-q4f16_1-MLC`

Verify model IDs exist in WebLLM's model registry before using. Model landscape changes fast.

## Monorepo Setup

- Package manager: **pnpm** with workspaces
- Build: **Vite** (lib mode for packages, dev server for examples)
- TypeScript: strict mode, ES2022 target, bundler module resolution
- Tests: **Vitest** (unit) + **Playwright** (E2E, primary)
- CI: GitHub Actions — lint + typecheck + test + build on PRs

## Spike Reference

Working code at `spike/src/main.ts` — demonstrates all validated patterns. Use as reference, not as production code.

## What NOT to do

- Do not build a custom orchestrator or graph engine
- Do not build custom model adapters or message formatters
- Do not build a custom event bus or context manager
- Do not build framework-specific content parsers
- Do not write more than 100 lines for any single concern
- Do not optimize internal metrics that don't reflect real user experience
- Do not create 9 packages (core, model-webllm, model-chrome, rag-local, embeddings, skills, ui-component, cli, docs-agent) — that was v2's mistake

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming -> invoke /office-hours
- Architecture -> invoke /plan-eng-review
- Bugs/errors -> invoke /investigate
- QA/testing site behavior -> invoke /qa or /qa-only
- Code review/diff check -> invoke /review
- Ship/deploy/PR -> invoke /ship or /land-and-deploy
