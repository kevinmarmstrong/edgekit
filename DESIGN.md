# edgekit v3 — Design Document

## Status: APPROVED — Ready for Implementation

---

## North Star

**edgekit is a browser-native agent runtime.** It lets developers add an AI agent sidecar to any web app — new or existing — that runs entirely in the visitor's browser using Chrome AI (Gemini Nano) or WebLLM (WebGPU). No backend, no API keys, zero marginal cost per user.

The agent orchestrates the app's existing capabilities (API endpoints, UI components, functions) via tool calls. The developer describes their tools; the agent handles the reasoning and multi-step execution.

### One-sentence pitch
> Drop an AI agent into any web app with two lines of HTML — it runs in the browser, calls your existing APIs as tools, and costs nothing per user.

### The demo that proves it
An e-commerce product search agent: the user says "find me running shoes under $100 in size 10", the agent calls the product search API, filters results, and offers to add to cart — all via tool calls, all in the browser, zero backend.

---

## Rules of Engagement

These rules exist because v1 and v2 violated them, resulting in months of wasted work. They are non-negotiable.

### Rule 1: Use, Don't Build (for solved problems)

**If a capability exists in an established library, USE IT. Do not reimplement.**

The test: "Would a senior engineer at a startup hand-roll this?" If no, use the library.

Specifically:
- **Orchestration / tool loops / streaming**: Use Vercel AI SDK (`ai` package)
- **Model adapters / message formatting**: Use `@browser-ai/core` (Chrome AI) and `@browser-ai/web-llm` (WebLLM)
- **Text splitting / chunking**: Use an established text splitter (LangChain or similar)
- **System prompt handling, multi-turn, tool result formatting**: All handled by Vercel AI SDK

**Why this rule exists:** v1/v2 hand-rolled an orchestrator, model adapters, and RAG pipeline. The orchestrator had bugs in tool calling. The Chrome AI adapter got system prompt handling wrong — twice. The RAG pipeline needed framework-specific (Astro) parsing hacks. Every one of these bugs was in code that established libraries handle correctly.

### Rule 2: Build Only What's Unique

edgekit's unique value is:
1. **The sidecar packaging** — web component that drops into any app
2. **Progressive model cascade** — Chrome AI (zero download) -> WebLLM (download) -> server fallback
3. **The retrofit pattern** — register existing endpoints as agent tools with minimal code
4. **Download policy UX** — prompt/auto/never for model downloads
5. **The e-commerce (and future) demos** that prove the concept

Everything else is plumbing. Use libraries for plumbing.

### Rule 3: Test the Product, Not the Internals

The test suite should answer: "Does a user get a good answer when they ask a question?"

- **Good test**: Open the live site, type a question, verify the response is correct and well-formatted
- **Bad test**: Check that the right source title appears in top-5 retrieval results (a vanity metric that passed at 100% while the live site was broken)

Test from the outside in. E2E tests with Playwright that exercise the real widget in a real browser.

### Rule 4: The Agent Does Things, Not Just Answers Questions

RAG Q&A is one skill the agent might have. The core product is: register tools, run an agent with tool calling, in the browser. Every architectural decision should be evaluated against: "Does this make tool calling better?"

### Rule 5: Don't Deviate from the North Star

The north star is: **browser-native agent runtime for retrofitting or building agent-first apps**. If a task doesn't serve this, don't do it. Specifically:
- Don't spend time on framework-specific content parsing (Astro, MDX, etc.)
- Don't build custom graph engines or node systems (use AI SDK's tool loop)
- Don't build custom event buses or context managers (use AI SDK's built-in state)
- Don't optimize retrieval metrics that don't reflect real user experience

---

## Architectural Blueprint: Magentic-UI Patterns in the Browser

edgekit adopts the core design patterns from [Microsoft Magentic-UI](https://github.com/microsoft/magentic-ui) (MIT licensed), a human-centered agentic system. Magentic-UI is Python/server-based; edgekit brings these patterns to the browser. This is not a fork — it's a deliberate adoption of proven agent UX patterns, re-implemented on browser-native infrastructure.

### Patterns We Adopt

#### 1. Two-Loop System (Planning + Execution)

**Magentic-UI**: Outer loop generates a step-by-step plan. Inner loop executes each step, tracking progress. If a step fails or conditions change, it replans.

**edgekit adaptation**: The Vercel AI SDK's `streamText` with `stopWhen` provides the inner execution loop (generate -> tool call -> execute -> feed back -> repeat). The outer planning loop is implemented as a `plan` tool: the agent's first action is to propose a plan, the user reviews/edits/approves it, then the agent executes step by step.

```typescript
const planTool = tool({
  description: 'Create a step-by-step plan before taking action',
  parameters: z.object({
    steps: z.array(z.object({
      title: z.string(),
      action: z.string(),
      tool: z.string(),
    })),
  }),
  execute: async ({ steps }) => steps, // Returns plan for display
  needsApproval: true, // User reviews and approves the plan
})
```

This maps to Magentic-UI's **co-planning**: the agent proposes, the human edits and approves before execution begins.

#### 2. Action Guards (Three-Tier Safety)

**Magentic-UI**: Every action is classified into three tiers:
- `always_safe` (e.g., search, read) -> auto-execute
- `maybe_irreversible` (e.g., click a button) -> LLM judge decides
- `always_irreversible` (e.g., submit order, delete) -> require human approval

For ambiguous cases, a separate LLM evaluates the risk.

**edgekit adaptation**: Mapped directly to Vercel AI SDK's `needsApproval` parameter on each tool:

| Magentic-UI tier | edgekit implementation | Example |
|-----------------|----------------------|---------|
| `always_safe` | `needsApproval: false` | Search products, get details |
| `maybe_irreversible` | `needsApproval: async (args) => llmJudge(args)` | Dynamic risk assessment |
| `always_irreversible` | `needsApproval: true` | Add to cart, submit order, delete |

The developer classifies their tools at registration time. For `maybe_irreversible`, edgekit provides a default risk classifier, or the developer supplies their own.

#### 3. User as Team Member

**Magentic-UI**: The human is represented as a `UserProxy` agent — a first-class member of the agent team. The orchestrator can delegate tasks to the user ("I need you to log in" or "Which of these options do you prefer?") just like it delegates to any other agent.

**edgekit adaptation**: The agent can yield control to the user through two mechanisms:
- **Approval prompts** (action guards) — "I want to add this to your cart. Approve?"
- **Clarification requests** — the agent asks the user for input before proceeding, surfaced as a special message type in the chat UI

The user isn't watching a black box. They see the plan, approve actions, and can interject at any time.

#### 4. Progress Ledger (Structured State)

**Magentic-UI**: Each execution step tracks a structured state:
- `step_complete`: boolean + reason
- `replan`: boolean + reason
- `instruction`: what to do next and which agent does it
- `progress_summary`: where we are in the overall task

**edgekit adaptation**: The AI SDK's `prepareStep` hook runs before each step in the tool loop. edgekit uses this to maintain a lightweight progress state:

```typescript
prepareStep: ({ previousSteps }) => {
  const progress = summarizeProgress(previousSteps)
  return {
    toolChoice: selectNextTool(progress),
    system: `${basePrompt}\n\nProgress so far: ${progress.summary}`,
  }
}
```

This gives the agent awareness of where it is in a multi-step task without building a custom state machine.

#### 5. The Retrofit / Sidecar Pattern

**Magentic-UI**: Retrofits existing web apps by having its WebSurfer agent interact through the browser (Playwright clicks, types, scrolls). The existing app doesn't change.

**edgekit adaptation**: Instead of screen-based interaction (fragile, slow), edgekit retrofits at the API level. The developer registers their existing endpoints as tools:

```
Existing app                    Magentic-UI approach        edgekit approach
/api/products?q=shoes    ->    WebSurfer types in search    ->    Agent calls searchProducts tool
/api/cart/add            ->    WebSurfer clicks "Add"       ->    Agent calls addToCart tool
```

Both achieve the same outcome (agent uses existing app capabilities) but edgekit's approach is more reliable (no DOM fragility), faster (direct API call vs. screenshot-click-wait), and runs in the browser (no server-side Playwright).

#### 6. Long-Term Memory (Future)

**Magentic-UI**: Stores successful task-plan pairs as `(task, plan)` entries. When a similar task appears, retrieves and adapts the previous plan. Uses vector search for matching.

**edgekit adaptation (v3.1, not v3.0)**: Store successful tool-calling sequences in IndexedDB. When a similar user intent appears, suggest the proven plan. This is a natural extension but not in scope for initial launch.

### Patterns We Don't Adopt

| Magentic-UI pattern | Why we skip it |
|--------------------|---------------|
| Multi-agent team (WebSurfer, Coder, FileSurfer) | edgekit is single-agent with tools, not multi-agent. Simpler, sufficient for browser context |
| Docker/QEMU sandboxing | No server, no containers. Browser is the sandbox |
| Playwright browser control | We call APIs directly, not through UI automation |
| MCP server extensibility | Future consideration, not v3.0 |

---

## Architecture

### Foundation: Vercel AI SDK + @browser-ai

```
Developer's existing app
  |
  +-- edgekit sidecar (web component)
        |
        +-- Vercel AI SDK (orchestration, tool loops, streaming, HITL)
        |     |
        |     +-- @browser-ai/core (Chrome AI / Gemini Nano, zero download)
        |     +-- @browser-ai/web-llm (WebGPU models, downloadable)
        |     +-- Any server provider (OpenAI, Anthropic — optional cloud fallback)
        |
        +-- Tool registry (developer's endpoints/functions registered as tools)
        |
        +-- Optional: RAG skill (content index for Q&A use cases)
        |
        +-- UI (Lit web component — the embeddable surface)
```

### Package Structure

```
edgekit-v3/
  packages/
    core/           # ~300 lines: createAgent(), progressive model, tool registry
    ui/             # Lit web component: <edge-chat>
    cli/            # Content indexing for RAG skill (optional)
  examples/
    ecommerce/      # Primary demo: product search agent
    docs-chat/      # Secondary demo: documentation Q&A (RAG skill)
  site/             # Marketing/docs site
```

Three packages. Not nine.

### Key Dependencies

| Dependency | Purpose | Why this one |
|-----------|---------|-------------|
| `ai` (Vercel AI SDK v6) | Orchestration, tool loops, streaming, HITL | Battle-tested, 75k+ stars, handles all the plumbing we kept getting wrong |
| `@browser-ai/core` | Chrome AI (Gemini Nano) provider | Already handles system prompts, message formatting correctly. Sponsored by Chrome team |
| `@browser-ai/web-llm` | WebGPU model provider | Tool calling, structured output, web worker execution. AI SDK compatible |
| `lit` | Web component framework | ~5KB, standards-based, framework-agnostic output |
| `@ag-ui/client` | Agent-UI event protocol (optional) | Standard event format for agent-to-UI communication |

### Progressive Model Cascade

```
1. Chrome AI (Gemini Nano)     — zero download, built into Chrome 148+
2. WebLLM (Qwen3/Phi-4)       — downloads model, requires WebGPU
3. Server provider (optional)  — cloud fallback for unsupported browsers
4. Retrieval-only              — keyword search, no model, last resort
```

The cascade is implemented using AI SDK's provider abstraction, not a custom wrapper. Each provider implements the same interface. The runtime tries them in order.

### The Retrofit Pattern

A developer retrofits their existing app by describing their endpoints as tools:

```typescript
import { createAgent } from 'edgekit'

const agent = createAgent({
  tools: {
    searchProducts: {
      description: 'Search the product catalog',
      parameters: z.object({
        query: z.string(),
        maxPrice: z.number().optional(),
        size: z.string().optional(),
      }),
      execute: async ({ query, maxPrice, size }) => {
        const res = await fetch(`/api/products?q=${query}&max=${maxPrice}&size=${size}`)
        return res.json()
      },
      needsApproval: false,
    },
    addToCart: {
      description: 'Add a product to the shopping cart',
      parameters: z.object({ productId: z.string(), quantity: z.number() }),
      execute: async ({ productId, quantity }) => {
        await fetch('/api/cart', { method: 'POST', body: JSON.stringify({ productId, quantity }) })
        return { success: true }
      },
      needsApproval: true, // HITL: ask user before adding to cart
    },
  },
})
```

The existing `/api/products` and `/api/cart` endpoints don't change. The agent calls them via tool use. `needsApproval` (from Vercel AI SDK) provides human-in-the-loop for irreversible actions.

### HITL (Human-in-the-Loop)

Borrowed from Magentic-UI's action guard pattern, implemented via AI SDK's `needsApproval`:

| Action type | Approval | Example |
|------------|----------|---------|
| Read-only / safe | Auto-execute | Search products, get details |
| Maybe irreversible | Conditional (LLM or rule-based) | Filter, sort, navigate |
| Always irreversible | Require human approval | Add to cart, submit order, delete |

The developer sets `needsApproval` per tool. The UI shows an approval prompt when triggered. The agent pauses until the user approves or rejects.

---

## What We Learned (the hard way)

These are not abstract lessons. They are specific mistakes from v1/v2 that cost weeks of work.

### Mistake 1: Hand-rolled orchestrator
**What happened**: Built a custom orchestrator with tool calling loop, context management, event bus, and guardrails framework. ~2,000 lines across orchestrator.ts, orchestrator-v2.ts, graph engine, 8 node types, defineAgent API.
**What went wrong**: Tool calling had bugs. System prompt handling was wrong. The event bus added complexity with no value. The graph engine was premature.
**What to do instead**: Use `streamText`/`generateText` from Vercel AI SDK with `stopWhen` for tool loops. Zero custom orchestration code.

### Mistake 2: Hand-rolled model adapters
**What happened**: Built `model-chrome` and `model-webllm` packages with custom message formatting, streaming, and session management. ~400 lines.
**What went wrong**: Chrome AI adapter got system prompt handling wrong twice (Gemini Nano requires `systemPrompt` at session creation, not in the prompt string). The error manifested on the live site and wasn't caught by unit tests.
**What to do instead**: Use `@browser-ai/core` and `@browser-ai/web-llm` which are maintained by people who test against real browser APIs.

### Mistake 3: Framework-specific content parsing
**What happened**: Built an Astro file parser to extract structured data from frontmatter, strip JSX expressions, handle balanced braces. ~200 lines of regex-heavy code.
**What went wrong**: The parser was fragile, framework-specific, and only worked for one site. It's the opposite of "agnostic, scalable architecture."
**What to do instead**: Accept markdown/HTML/plain text as input. Use an established text splitter. If a framework generates weird output, that's the framework's problem — the indexer should handle standard formats.

### Mistake 4: Vanity test metrics
**What happened**: Built a 79-question retrieval quality test battery. It passed at 100%.
**What went wrong**: The live site was returning garbled content with JSX artifacts, code blocks, and error messages. The test checked "did the right source title appear?" but not "is the content clean?" or "does the user get a good answer?" We optimized for a metric that didn't measure the product.
**What to do instead**: E2E tests with Playwright that open the real widget, type a question, and verify the response. Test the product, not the internals.

### Mistake 5: Letting the AI agent build instead of integrate
**What happened**: When asked "should we use Vercel AI SDK?", the AI agent (me) generated custom code instead of researching and integrating existing libraries. Custom code is faster to generate than integration code, so the path of least resistance was always "build it."
**What to do instead**: When the human suggests using a library, USE IT. Research the library's API, write integration code, and test it. Don't propose a "simpler" custom alternative.

---

## Implementation Plan

### Phase 0: Spike (2 hours)

Before building anything, validate that the foundation works:

1. Create a single HTML page
2. Import Vercel AI SDK + `@browser-ai/web-llm`
3. Define two tools (search products, add to cart) with mock data
4. Run a multi-step agent loop in the browser
5. Verify: tool calls work, streaming works, `needsApproval` pauses for user input

**If this doesn't work, stop and reassess.** Don't build architecture on an unvalidated foundation.

Measure:
- Time to first token
- Tool calling accuracy (does the agent call the right tool with right args?)
- HITL flow (does approval pause and resume correctly?)
- Chrome AI vs WebLLM behavior differences

#### Spike Results (May 23, 2026) — VALIDATED

The spike ran successfully in Chrome. All core assumptions confirmed.

**Environment**: Chrome (with WebGPU), Vite dev server, packages: `ai@6.0.191`, `@browser-ai/core@2.1.12`, `@browser-ai/web-llm@2.1.7`

| Test | Result | Details |
|------|--------|---------|
| Import `@browser-ai/core` | PASS | Chrome AI API detected in browser |
| Import `@browser-ai/web-llm` | PASS | WebGPU detected |
| Chrome AI availability | INFO | Gemini Nano in "downloading" state — requires user gesture. Falls back to WebLLM automatically. |
| Model: WebLLM (Qwen2.5-0.5B) | PASS | Model loaded via WebGPU, inference runs in browser |
| `generateText` + tools | PASS | 2 steps, 1 tool call. Model called `searchProducts` with extracted parameters. Tool executed, model generated response from results. |
| `streamText` + tools | PASS | 290 chunks, 985 chars streamed successfully |
| `needsApproval` (HITL) | PASS | Framework handled correctly. 0.5B model too small to reliably trigger addToCart tool (expected — larger models like Phi-4-Mini will handle this). |

**Key findings**:
1. **The foundation works.** Vercel AI SDK's `generateText`/`streamText` with `stopWhen` tool loops run correctly in the browser with `@browser-ai` providers.
2. **Chrome AI requires download handling.** `doesBrowserSupportBrowserAI()` returning `true` only means the API exists — the model may still be downloading. Must check availability state and handle the `NotAllowedError` (user gesture required) gracefully. This validates our `downloadPolicy` design.
3. **0.5B models have limited tool accuracy.** The tiny model called the right tool but didn't decompose parameters well (passed entire prompt as query string). This confirms the model ladder is important — default should be 3-4B, not 0.5B.
4. **Progressive cascade works.** Chrome AI -> WebLLM fallback triggered automatically when Chrome AI wasn't ready. The pattern is validated.

**Verdict**: Proceed with implementation. The architecture is sound.

### Phase 1: Core + E-commerce Demo (1 week)

Build the e-commerce demo as the first real test of the architecture:

1. **`packages/core`**: `createAgent()` wrapper around AI SDK. Progressive model cascade. Tool registration API. Download policy.
2. **`examples/ecommerce`**: Mock product API (static JSON or simple service worker). Product search tool. Filter tool. Add-to-cart tool with `needsApproval`. Basic HTML page with the agent embedded.
3. **Test**: Playwright E2E — "search for running shoes under $100" produces correct tool calls and results.

### Phase 2: Web Component UI (1 week)

1. **`packages/ui`**: Lit web component `<edge-chat>`. Chat input, streaming response, tool call visualization, approval prompt UI.
2. Wire the web component to the core agent.
3. Make the e-commerce demo use `<edge-chat>` instead of raw HTML.
4. **Test**: Playwright E2E on the e-commerce demo with the real component.

### Phase 3: RAG Skill + Docs Demo (3 days)

1. **`packages/cli`**: Markdown -> chunks -> JSON index. Use established text splitter. No framework-specific parsing.
2. RAG as a skill/tool: the agent has a `searchDocs` tool that queries the content index.
3. **`examples/docs-chat`**: Documentation Q&A demo using the RAG skill.
4. **Test**: E2E — ask a question, get an answer that cites sources.

### Phase 4: Polish + Ship (3 days)

1. README with two-line embed example
2. npm publish
3. GitHub Pages demo site (e-commerce + docs)
4. Performance optimization (lazy loading, web worker, bundle size)

---

## Testing Strategy

### E2E First (Playwright)

Every feature is tested by running the real product in a real browser:

```typescript
test('agent searches products via tool call', async ({ page }) => {
  await page.goto('/examples/ecommerce')
  await page.fill('[data-testid="chat-input"]', 'find running shoes under $100')
  await page.press('[data-testid="chat-input"]', 'Enter')
  // Agent should call searchProducts tool
  await expect(page.locator('[data-testid="tool-call"]')).toContainText('searchProducts')
  // Results should appear
  await expect(page.locator('[data-testid="response"]')).toContainText('running shoes')
})

test('agent asks approval before adding to cart', async ({ page }) => {
  // ... trigger add to cart
  // Approval prompt should appear
  await expect(page.locator('[data-testid="approval-prompt"]')).toBeVisible()
  // Click approve
  await page.click('[data-testid="approve-button"]')
  // Confirmation should appear
  await expect(page.locator('[data-testid="response"]')).toContainText('added to cart')
})
```

### Unit Tests (Vitest)

Only for edgekit's own code — the thin wrapper layer:
- `createAgent()` configuration validation
- Progressive model cascade logic
- Tool registration API
- Download policy logic

Do NOT unit test:
- AI SDK internals (tool loops, streaming, message formatting)
- @browser-ai provider behavior (system prompts, session management)
- Third-party library functionality

### What "passing" means

A test suite passes when: **a real user can open the demo, interact with the agent, and get correct results.** Not when an internal metric hits a threshold.

---

## Non-Goals (explicitly out of scope)

- Custom orchestrator / graph engine / node system
- Custom model adapters / message formatting
- Custom event bus / context manager
- Framework-specific content parsing (Astro, MDX, etc.)
- Embedding model management (use Transformers.js directly if needed)
- 9-package monorepo architecture
- `defineAgent()` declarative API (use AI SDK's native patterns)
- v1/v2 backward compatibility

---

## API Surface (target)

### Embed in HTML

```html
<script type="module">
  import { createAgent, mountChat } from 'edgekit'

  const agent = createAgent({
    model: 'auto', // Chrome AI -> WebLLM -> server fallback
    tools: { /* ... */ },
    systemPrompt: 'You are a helpful shopping assistant.',
  })

  mountChat('#chat-container', agent)
</script>
```

### Or as a Web Component

```html
<script type="module" src="https://unpkg.com/edgekit"></script>
<edge-chat
  system-prompt="You are a helpful shopping assistant."
  model="auto"
></edge-chat>
<script>
  document.querySelector('edge-chat').registerTools({ /* ... */ })
</script>
```

### Tool Registration

```typescript
import { tool } from 'edgekit'
import { z } from 'zod'

const searchProducts = tool({
  description: 'Search the product catalog by query, price range, and size',
  parameters: z.object({
    query: z.string().describe('Search terms'),
    maxPrice: z.number().optional().describe('Maximum price in dollars'),
    size: z.string().optional().describe('Product size'),
  }),
  execute: async ({ query, maxPrice, size }) => {
    const params = new URLSearchParams({ q: query })
    if (maxPrice) params.set('max_price', String(maxPrice))
    if (size) params.set('size', size)
    const res = await fetch(`/api/products?${params}`)
    return res.json()
  },
  needsApproval: false,
})

const addToCart = tool({
  description: 'Add a product to the shopping cart',
  parameters: z.object({
    productId: z.string(),
    quantity: z.number().default(1),
  }),
  execute: async ({ productId, quantity }) => {
    const res = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity }),
    })
    return res.json()
  },
  needsApproval: true, // Agent pauses, shows user what it wants to do, waits for approval
})
```

---

## Success Criteria

### The demo works
- Open the e-commerce demo in Chrome
- Type "find me running shoes under $100 in size 10"
- Agent calls `searchProducts` with correct parameters
- Results display in the chat
- Say "add the Nike ones to my cart"
- Agent shows approval prompt for `addToCart`
- User approves, cart is updated
- All of this runs in the browser with zero backend

### The embed is trivial
- Two lines of HTML to add to any existing site
- No build step required for basic usage
- `npm install edgekit` for advanced usage

### The progressive cascade works
- Chrome 148+: Gemini Nano responds instantly, no download
- Chrome with WebGPU but no Nano: WebLLM downloads and works
- Other browsers: falls back gracefully (server provider or retrieval-only)

### The code is small
- `packages/core`: < 500 lines
- `packages/ui`: < 800 lines
- `packages/cli`: < 400 lines
- Total edgekit code: < 2,000 lines
- Everything else is dependencies

---

## For the Implementing Agent

You are building a thin packaging layer on top of established libraries. Your job is integration, not invention.

**Before writing any custom code, check:**
1. Does Vercel AI SDK already handle this?
2. Does @browser-ai already handle this?
3. Is there an npm package for this?

If yes to any: use it. Write the integration code. Test it works.

**If you find yourself writing:**
- A custom streaming implementation -> STOP, use AI SDK
- A custom message formatter -> STOP, use AI SDK
- A custom tool calling loop -> STOP, use AI SDK
- A custom model adapter -> STOP, use @browser-ai
- A framework-specific parser -> STOP, use a standard format
- More than 100 lines for any single concern -> STOP, you're probably reimplementing something

**Test by using the product.** After every significant change, open the demo in a browser and try it. Not a unit test. The real thing.

### Reference implementation

The spike at `spike/src/main.ts` is working, validated code that demonstrates every core pattern:
- Package imports and browser capability detection
- Chrome AI `NotAllowedError` handling and fallback to WebLLM
- `generateText` with `stopWhen` tool loops
- `streamText` with streaming
- `needsApproval` for HITL
- Mock product data and tool definitions with Zod schemas

Use it as your reference. Don't guess at APIs — copy the patterns that work.

### Chrome AI gotcha (critical)

`doesBrowserSupportBrowserAI()` returning `true` does NOT mean the model is ready. Gemini Nano may be in "downloading"/"downloadable" state and throws `NotAllowedError: Requires a user gesture when availability is "downloading" or "downloadable"`. You MUST catch this and fall back to WebLLM. See spike code for the exact pattern.

### Setup instructions

```bash
# Clone and install
git clone https://github.com/kevinmarmstrong/edgekit-v3.git
cd edgekit-v3

# Monorepo setup
pnpm init   # if no root package.json yet
# Add pnpm-workspace.yaml:
# packages:
#   - 'packages/*'
#   - 'examples/*'

# Per-package setup
cd packages/core && pnpm init && pnpm add ai @browser-ai/core @browser-ai/web-llm zod
cd packages/ui && pnpm init && pnpm add lit
cd packages/cli && pnpm init  # CLI dependencies TBD

# Dev dependencies (root)
pnpm add -Dw typescript vite vitest @playwright/test
```

### WebLLM model IDs (MLC format)

These are valid as of May 2026. Verify against WebLLM's model registry if building later:
- Tiny: `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` (~300MB, tested in spike)
- Standard: `Phi-4-mini-instruct-q4f16_1-MLC` (~2GB) or `SmolLM2-1.7B-Instruct-q4f16_1-MLC` (~1GB)
- High: `Qwen2.5-3B-Instruct-q4f16_1-MLC` (~1.8GB)

The 0.5B model calls tools but has limited parameter decomposition. Use 1.7B+ for reliable tool calling in production.
