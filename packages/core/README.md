# @kevinmarmstrong/edgekit

Core runtime for browser-native agent sidecars.

The recommended production pattern is **Primitives -> Skills -> Mission Profiles**:

```ts
const profile = createMissionProfile({
  id: 'support-workflow-v1',
  mission: 'support-workflow',
  version: '1.0.0',
  systemPrompt: 'Search support cases before answering. Ask for approval before ticket creation.',
  requiredTools: ['searchSupportCases', 'createSupportTicket'],
  defaults: { toolChoice: 'required', downloadPolicy: 'never' },
})

chat.applyMissionProfile(profile)
chat.registerTools({ searchSupportCases, createSupportTicket })
```

Use raw `createAgent()` when building custom renderers or advanced orchestration. For most app integrations, define Skills and a Mission Profile, register app-owned executable tools, validate the profile, then run outcome tests.

```ts
import { createAgent, modelOptional, tool } from '@kevinmarmstrong/edgekit'
import { z } from 'zod'

const agent = createAgent({
  systemPrompt: 'You are a helpful assistant.',
  tools: {
    searchProducts: tool({
      description: 'Search products',
      inputSchema: z.object({
        query: z.string(),
        maxPrice: modelOptional(z.number()),
      }),
      execute: async ({ query, maxPrice }) => {
        const params = new URLSearchParams({ q: query })
        if (maxPrice) params.set('max_price', String(maxPrice))
        return fetch(`/api/products?${params}`).then(res => res.json())
      },
    }),
  },
})

for await (const event of agent.send('find running shoes')) {
  if (event.type === 'text-delta') process.stdout.write(event.text)
}
```

Use `chromeAI()` and `webLLM()` for the default local model cascade, or pass any AI SDK language model in `model`.
`chromeAI()` sets the Prompt API output language contract to English by default (`expectedOutputs: [{ type: 'text', languages: ['en'] }]`) so Chrome can optimize output quality and safety attestation. Localized apps can override it with `chromeAI({ outputLanguage: 'fr' })` or with `createAgent({ outputLanguage: 'fr' })` when using the default cascade. Supported Chrome output languages are `de`, `en`, `es`, `fr`, and `ja`.
Use `createCascadeOnboardingController()` for the copyable local-first install path. It wraps readiness with product-safe defaults (`downloadPolicy: 'prompt'`, Basic fallback only after explicit choice or provider failure), an injectable preference store, adopter-facing display fields (`displayMode`, `providerKind`, `choiceState`), and switching methods (`chooseLocal`, `chooseServer`, `chooseBasic`, `openChoice`, `resetChoice`).
Use `createCascadeReadinessController()` when the app needs a lower-level headless provider check before showing agent features. It returns a snapshot with provider status, display status, missing capabilities, and a recommended action (`prompt`, `suggest`, `message`, `hide`, `fallback`, or `continue`) so your app can render its own wizard, banner, modal, or disabled state.
Use `modelOptional(schema)` for optional tool fields so browser models can omit a value or send `null` without causing a visible schema-retry loop.
Use `createAgUiAgent({ endpoint })` from `@kevinmarmstrong/edgekit-agui` to connect an AG-UI compatible event stream, and `actionsToEdgeView()` when you want tool results to render as declarative cards/forms.
Use `createHybridModelRouter()` or `createSupervisorRouter()` when an app needs cloud fallback or lightweight supervisor/worker delegation without replacing the browser-native runtime.
When a `modelRouter` is configured, Edgekit emits explicit `handoff-start` and `handoff-finish` telemetry events around the app-owned routing decision. The payload includes the bounded handoff id/version/phase, public identity, host-provided state summary, memory/tool summaries, redaction flag, selected provider on completion, and completion status; it does not include secret identity claims.
Use `createHandoffEnvelope()` or supervisor `onHandoff` callbacks to pass bounded context to cloud workers without leaking secret claims.
Use `createMarkdownMemoryStore()` for inspectable `.md`-backed memory that can later be replaced by IndexedDB, OPFS, vectors, or a server store implementing the same `search()` contract. Configure compaction thresholds when Markdown logs become append-heavy.
Use `EdgeKnowledgeSource`, `createKnowledgeTool()`, and `createKnowledgeSkill()` when retrieval is a first-class app capability. Edgekit normalizes citations and freshness metadata while the app owns Markdown, vector, hybrid, graph, SQL, or backend knowledge infrastructure.
Use `createClaimSupportValidator()` with `grounding: 'strict'` when the app wants user-visible claims to cite prior app-owned tool-result evidence handles. The validator emits a structured `response-validation` event and replaces unsupported claims with a refusal before strict-mode text is released.
Use `createMemoryResponseCache()` or `createIndexedDbResponseCache()` for opt-in state-keyed caching of read-only responses.
Use `createOfflineTool()`, `createMemoryMutationJournal()`, `createLocalStorageMutationJournal()`, and `syncMutationJournal()` for offline-capable mutations that queue locally and sync through the original app tools later.
Use `createToolPolicyExecutor()` or `executeToolWithPolicy()` to put timeouts, payload limits, and allowlists around dynamically loaded or third-party tools before considering heavier worker or WASM isolation.
Use `createPiiRedactor()` or custom redactors to sanitize tool results before they are emitted to UI events, telemetry, and audit trails.
Use `toolRepair` to invisibly retry validation-shaped tool failures before surfacing an error.
Use `activity` events for safe progress UI, and `executeParallelTools()` for host-owned read-only tool batches that explicitly opt into parallel execution.
Use `mcpToolsFromDefinitions()`, `createMissionControl()`, and `createAuditTrail()` when an app needs MCP-backed tools, telemetry, or approval audit logging.
Use `identityProvider`, `sessionProvider`, `stateProvider`, `toolManifests`, and `withToolContext()` to bind tools to the host app identity, RBAC permissions, auth context, and current app state.

## Claim support for strict grounding

`createClaimSupportValidator()` is the reusable claim/evidence contract for apps that need to block user-visible factual or workflow claims unless they cite prior app-owned tool results. Edgekit does not own the app's search, state, identities, permissions, or business rules: the host app still runs the tools and decides how assistant text is converted into claim records. The primitive only checks that every claim has evidence handles, each handle exists, and each cited handle was produced before the claim is released.

```ts
import { createAgent, createClaimSupportValidator, tool } from '@kevinmarmstrong/edgekit'

const agent = createAgent({
  systemPrompt: 'Answer only from support evidence.',
  grounding: 'strict',
  tools: {
    searchCases: tool({
      description: 'Search app-owned support cases',
      inputSchema: searchSchema,
      execute: async input => ({
        evidenceId: `case-search:${crypto.randomUUID()}`,
        records: await appSearchCases(input),
      }),
    }),
  },
  validateResponse: createClaimSupportValidator({
    // The host app owns claim extraction. Use structured model output,
    // a parser, or your own renderer contract to produce these records.
    claims: context => extractClaimsFromAssistantText(context.text).map(claim => ({
      id: claim.id,
      text: claim.text,
      evidence: claim.evidenceIds,
      sequence: context.toolResults.length,
    })),
    refusalMessage: 'I cannot support that claim from prior app evidence.',
  }),
})

for await (const event of agent.send('summarize the open case')) {
  if (event.type === 'response-validation') {
    // Use this for validation UI, logs, or badges. The final text-delta
    // is still the single safe user-visible message/refusal to render.
    setValidationState(event.validation)
  }
  if (event.type === 'text-delta') renderUserVisibleText(event.text)
}
```

Tool results can expose handles as `evidenceId`, `evidenceHandle`, `citation`, or `evidence` fields; apps can also pass an explicit evidence provider to `createClaimSupportValidator()`. Evidence sequences are ordered by tool-result arrival; claim sequences must be greater than every cited evidence sequence so a claim cannot cite evidence that appears at the same step or later. In strict grounding, Edgekit buffers generated text until validation completes, so unsupported claims surface as structured validation/refusal state instead of assistant prose.
