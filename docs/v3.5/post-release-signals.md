Audience: maintainer

# Post-Release Signals: v0.3.x Field Testing

Consolidated findings from the first real-world Edgekit integration (personal site Q&A widget)
and independent build review. These signals should drive the v0.4.0 roadmap.

Source material:
- Agent integration retrospective on kevinarmstrong.name
- Independent build review of v0.3.0 release
- Live hallucination transcript from production Chrome AI chat
- Diff analysis of pre-v3.5 guardrails vs current code

Response plan: `docs/v3.5/post-release-response-plan.md`.

---

## Reviewer Addendum: What This Signal Means

Important correction: the strongest grounding guardrails were not simply deleted from the repo. The current site assistant still uses both `toolChoice: 'required'` and `createSiteAssistantStream()` in `site/src/siteAssistant.ts`. The regression is sharper than "v3.5 removed the guardrails": the best guardrails stayed trapped in a site-specific implementation while the newly published adopter path made it easy to build a public Q&A surface without them.

That is still a product failure. The install agent followed the public docs, installed published packages, created a reasonable site-search tool, and produced a working widget. Edgekit let that reasonable path become an ungrounded small-model chat surface. The right conclusion is not "the integrating agent was careless"; it is "the safe public-site Q&A path was not the obvious path."

Separate three concepts that the current API/docs blur:

- **User/session identity**: who the visitor is, tenant/role/permission context, and what tools they may call.
- **Agent identity**: what the assistant says it is when asked "who are you?"
- **Model/runtime disclosure**: optional transparency such as "currently using a local Gemma model for inference."

`identityProvider` solves the first. It should not be overloaded to solve the second or third. Public Q&A needs a first-class agent identity contract that flows into the model prompt, deterministic answer composers, and no-model fallback.

Finally, `toolChoice: 'required'` is necessary but not sufficient. The transcript shows the model can call a tool, then hallucinate beyond the tool result. Strict grounding must include both pre-answer evidence acquisition and post-answer constraints: what evidence was retrieved, which claims are allowed, what to do with ambiguous terms, and when to answer "I don't know from this site."

---

## Critical: Grounding & Hallucination (regressions from pre-v3.5)

### GROUND-1: Model hallucinates identity, facts, and associations

**Severity:** Critical — destroys user trust on any professional site
**Status:** Regression from pre-v3.5

Live transcript shows Chrome AI (Gemma) confidently fabricating:
- "I'm an AI assistant created by the Gemma team" (wrong identity)
- "Harness is the open-source platform that EdgeKit builds upon" (Harness is an unrelated company)
- "Yes, it's the same Kevin Armstrong... associated with Ohio Software... involved in rockets" (pure fiction; search tool returned nothing)

Root cause: The product streams model output directly to the UI with zero post-generation validation. Small models like Gemma routinely ignore soft system prompt instructions like "say so honestly."

Mitigation that existed in the repo but was not exported as the obvious adopter path: `createSiteAssistantStream()` in the site assistant bypasses the model for known query patterns, formatting tool output deterministically. `toolChoice: 'required'` forces tool use on every turn. These are still present in `site/src/siteAssistant.ts`; the gap is that the public-site install path did not guide adopters into an equivalent grounded Q&A primitive.

### GROUND-2: No grounding mode in Mission Profiles

**Severity:** Critical
**Status:** Never existed — design gap

The `EdgeMissionProfile` spec has `systemPrompt`, `requiredTools`, `policy`, `synthesis`, and `uiAffordances` — but no `grounding` field. Integrators cannot declaratively say "only answer from tool results."

Proposed addition:
```typescript
grounding?: 'strict' | 'soft' | 'none'
```
- `strict`: Inject hardened system prompt wrapper requiring tool use. After generation, validate that at least one tool was called. If not, replace response with a configured refusal message.
- `soft`: Encourage tool use in system prompt but allow supplemental reasoning.
- `none`: Current behavior (default for backward compat).

### GROUND-3: No response validation hook

**Severity:** Critical
**Status:** Never existed — design gap

The agent loop (`agent.ts` lines 305-370) streams `text-delta` events directly. There is no:
- Post-generation grounding check
- Tool-use verification (did the model call a tool before answering?)
- Confidence threshold
- Response filtering for hallucination patterns

Proposed: Add `validateResponse` option to `CreateAgentOptions`:
```typescript
validateResponse?: (response: string, context: {
  toolResults: Array<{ toolName: string; output: unknown }>
  toolsCalled: string[]
  input: string
}) => string | null  // return null to use original, string to replace
```

When `grounding: 'strict'` is set, the product should apply a default validator that checks `toolsCalled.length > 0`.

### GROUND-4: `toolChoice: 'required'` is not the default public-Q&A path

**Severity:** High
**Status:** Guardrail exists, but is not packaged as the adopter default

The repo site assistant still uses `toolChoice: 'required'`, and the docs mention it for docs search, site-map, catalog, and support assistants. The problem is discoverability and default-path design: the "install Edgekit on a public website" route does not make strict tool grounding the first-class, low-friction choice.

Tool choice alone also does not guarantee grounded answers. A small model can call `searchSite`, receive weak or irrelevant results, then invent a confident synthesis. Strict mode should require both tool use and evidence-constrained answer behavior.

At minimum, the default `toolChoice` for `grounding: 'strict'` profiles should be `'required'`.

### GROUND-5: Small-model system prompt hardening

**Severity:** High
**Status:** Never existed — design gap

The product knows which model the cascade resolved to (it emits `model-selected` telemetry). Small models need more aggressive prompt engineering than large models. The product should automatically append grounding rules when the cascade resolves to a small model:

```
CRITICAL RULES:
1. You MUST call a tool before answering any factual question.
2. If no tool returns relevant information, respond ONLY with: "I don't have information about that."
3. NEVER invent facts, people, companies, or associations.
4. NEVER claim to be created by any specific team or company.
```

This should be injected by the runtime, not left to the integrator.

### GROUND-6: Ambiguity handling is a grounding requirement

**Severity:** High
**Status:** Exposed by transcript

The prompt "is this edgekit I am chatting with now?" is ambiguous. A good answer needs to distinguish:

- Edgekit as the runtime/component/harness powering the chat UI.
- The configured assistant/persona.
- The local model providing inference.

The model answered "No, I'm not EdgeKit. I'm an AI assistant created by the Gemma team," which is doubly wrong: it ignored the runtime question and invented identity. Strict public Q&A needs an ambiguity policy: answer the narrow interpretation supported by runtime/config evidence, ask a clarifying question when needed, and never let the base model fill identity gaps from pretraining.

### GROUND-7: Deterministic formatting is a product primitive, not a demo trick

**Severity:** High
**Status:** Existing pattern, not packaged

`createSiteAssistantStream()` shows the right escape hatch for known public-site Q&A patterns: use tools, then format from the tool result directly. That does not need to remain a one-off hardcoded site assistant. It should become a packaged primitive or recipe:

```typescript
createGroundedQaAgent({
  identity,
  searchTool,
  answerFromResults,
  noEvidenceMessage,
  ambiguityPolicy,
})
```

For a professional site/blog, deterministic extractive answers are often better than free-form model synthesis. The model can still help with phrasing after evidence is selected, but the answer contract must be evidence-first.

---

## Critical: Agent Identity

### IDENT-1: No configurable agent identity

**Severity:** Critical
**Status:** Partially exists (title/subtitle) but no identity injection into system prompt

The model says "I'm created by the Gemma team" because nothing tells it otherwise. The `agentTitle` and `agentSubtitle` attributes control the UI chrome, but the model never receives identity instructions.

The Mission Profile or `configure()` should accept an `identity` block:
```typescript
identity?: {
  name: string           // "Kevin's Site Assistant"
  description?: string   // "Built by Kevin using Edgekit with a local Gemma model"
  persona?: string       // "friendly, concise, professional"
  refusalStyle?: string  // "I don't have that information. Try browsing /about or /writing."
}
```

When provided, the product injects into the system prompt:
```
You are ${identity.name}. ${identity.description ?? ''}
${identity.persona ? `Your tone is: ${identity.persona}.` : ''}
Do not identify yourself as any specific AI model or claim to be created by any team.
${identity.refusalStyle ? `When you cannot answer, respond with: "${identity.refusalStyle}"` : ''}
```

This addresses the hallucination where the model identified as "Gemma team" and lets integrators control exactly what the agent says about itself — whether that's "I am Kevin's agentic chat built by Kevin in his edgekit project" or "I am Bob the AI Agent."

This should support two levels:

- **Configured identity**: "I am Bob the AI Agent" or "I am Kevin's site assistant."
- **Optional model disclosure**: "This session is currently using a local Gemma model for inference."

The disclosure must never override the configured identity. A model can be named in a transparent technical explanation, but the assistant should not speak as the model provider unless the developer explicitly configures that behavior.

### IDENT-2: Pre-v3.5 identity/RBAC system exists but is disconnected

**Severity:** Medium
**Status:** Partially preserved

Commit `769e180` added `EdgeIdentity`, `EdgeAuthContext`, `EdgeSessionContext`, and role-based tool filtering. The types survive in the current codebase (used by `withSessionSystemContext`), but the agent identity concept — what the agent calls itself — was never part of this system. The session identity is about the *user*, not the *agent*.

The agent identity system (IDENT-1) is a new concept that should live in the Mission Profile, not in session context.

### IDENT-3: Identity has to work in fallback and deterministic modes

**Severity:** High
**Status:** Design requirement

Agent identity cannot only be a system prompt addition. The same identity contract must be available to:

- `onNoModel` fallback responses.
- Deterministic answer composers such as the site assistant stream.
- AG-UI adapters that render a backend agent inside Edgekit UI.
- React/custom UI wrappers that do not use `<edge-chat>` chrome.

Otherwise the model path and no-model path will answer "who are you?" differently.

---

## High: Bundle Size & Lightweight Entry Point

### BUNDLE-1: Default bundle is 6.5MB, unusable without manual stubs

**Severity:** High
**Status:** Known, documented in the v0.3.x repo retro, not yet addressed

`@mlc-ai/web-llm` (6.3MB) and `@mediapipe/tasks-text` (83KB) are hard transitive dependencies. For `downloadPolicy: 'never'` sites (the primary public-site use case), these are dead code. The integrating agent had to create manual stub files and esbuild aliases to get to 687KB (159KB gzipped).

Ship `@kevinmarmstrong/edgekit-ui/lite` or `@kevinmarmstrong/edgekit/lite` that excludes browser-model provider dependencies. This is the most requested adopter improvement.

Note: the v0.3.x repo draft work split the local provider wrappers into small lazy chunks in Vite builds, but that is not the same as a true lite entrypoint. Esbuild/Wrangler-style single-bundle setups can still inline dynamic imports and hit the same adopter problem. Keep BUNDLE-1 open until a fresh external install can bundle public-site Q&A without manual stubs.

### BUNDLE-2: Zod v3 + v4 both bundled

**Severity:** Medium
**Status:** Open

The package declares `zod: ^4.4.3` but internal code pulls in v3 compatibility layers. ~200KB of duplicate schema validation code in the bundle. Either standardize on v4 only or move Zod to peerDependencies.

---

## High: Documentation & Discoverability

### DOCS-0: Site-first discovery is the acceptance test

**Severity:** Critical
**Status:** Open

The integrating agent started where an adopter would start: the public docs site, not the repo internals. That must be the product acceptance path. A competent coding agent should be able to land on `/docs/getting-started/`, read forward through linked pages, and install a grounded public Q&A assistant without reading package source, demo internals, or generated declaration files.

The site-first path should make the safe default obvious:

- The exact `npm install` command for a public-site Q&A widget.
- The smallest `mountChat()` example that includes identity, strict grounding, one read-only search tool, and `downloadPolicy: 'never'`.
- A "why this is grounded" note that explains required tool use, no-evidence behavior, and the difference between assistant identity and model/runtime disclosure.
- A direct link to the `<edge-chat>` API reference for attributes, CSS variables, `::part()` selectors, and `mountChat()` options.
- Bundle guidance for static-site and Worker/esbuild users before they discover the 6MB default bundle themselves.

Repo examples and source reading are useful for advanced adopters, but needing them for the first install is the signal that the docs path is not yet agent-ready.

### DOCS-1: Integrating agent missed every existing API

**Severity:** High — the APIs exist but nobody can find them
**Status:** Partially addressed in repo draft/public-site docs, still insufficient

The integrating agent:
- Wrote 130 lines of `!important` CSS when **23 CSS custom properties** exist
- Hacked shadow DOM `querySelector('.title')` when **`agent-title` attribute** exists
- Called 3 separate methods when **`mountChat()`** does it in one call
- Claimed "no `::part()` selectors" when **16 part attributes** exist

The agent read the Getting Started docs AND the source code and still missed these. This is a documentation and discoverability failure, not an API failure. The v0.3.x repo retro acknowledges some of this but the fix was incremental.

Be careful with chronology: some of the attributes/options were added or clarified in the v0.3.x repo draft after this field install. Do not retroactively blame the integrating agent for missing APIs that were unreleased or undocumented at install time. The durable signal remains: public docs and source affordances were not enough for a competent coding agent to find the intended path.

Needed: A single API reference page that lists every CSS custom property, `::part()` selector, HTML attribute, and `mountChat()` option in a scannable table. This page should be linked from the Getting Started guide and from the `<edge-chat>` component JSDoc.

### DOCS-2: Getting Started is conceptual, not executable

**Severity:** High
**Status:** Partially addressed in repo draft/public-site docs

The v0.3.x repo retro says "The public quick start now starts with npm install and a copyable `mountChat()` static-site Q&A example." Verify this is actually the case. The pre-field-install Getting Started taught architecture before showing a result.

### DOCS-3: `onNoModel` is under-documented as a primary path

**Severity:** Medium
**Status:** Open

For public-facing websites, most visitors will hit `onNoModel`. The docs treat it as a fallback. It deserves its own section: "Deploying to public sites where most visitors have no local model."

The docs should also stop presenting `onNoModel` as a plain string-return callback for serious Q&A. The recommended public-site fallback should reuse the same retrieval/evidence function as the model path and return an explicitly grounded answer or no-evidence response.

### DOCS-4: 404s in doc navigation

**Severity:** Low
**Status:** Partially addressed in repo draft/public-site docs (redirect pages added)

`/docs/architecture/` and `/docs/getting-started/quick-start/` were 404s. The repo draft added redirect pages. Verify they work.

---

## Medium: `onNoModel` Enrichment

### NOMODEL-1: Callback receives minimal context

**Severity:** Medium
**Status:** Open, documented in the v0.3.x repo retro

`NoModelEvent` provides `{ input, message, availableTools, readiness }` — the tool *names* but not the tool *implementations*. The integrating agent had to duplicate their search logic inside `onNoModel` because the callback couldn't call the registered tools.

Proposed: Add `tools` (the executable tool map) and `history` (conversation messages) to `NoModelEvent`:
```typescript
export interface NoModelEvent {
  availableTools: string[]
  tools: Record<string, { execute: (input: unknown) => unknown | Promise<unknown> }>
  input: string
  history: Array<{ role: string; content: string }>
  message: string
  readiness?: CascadeReadinessSnapshot
}
```

Design this carefully. Passing raw executable tools into fallback can create a second execution path with different authorization semantics. The safer shape may be a read-only `callTool(name, input)` helper scoped to the already resolved active tool surface, plus conversation history and session context. Mutation tools should not become easier to call from fallback than from the model path.

---

## Medium: API Ergonomics

### API-1: Mission Profile is over-engineered for simple Q&A

**Severity:** Medium
**Status:** Open

For a Q&A widget, `createMissionProfile` requires `id`, `mission`, `version`, `systemPrompt`, `requiredTools`, and `defaults`. The `id` and `version` fields serve governance purposes that don't apply to a personal site.

Consider a `createChat()` shorthand:
```typescript
createChat('#container', {
  systemPrompt: '...',
  tools: { searchSite },
  identity: { name: 'Site Assistant' },
  grounding: 'strict',
  onNoModel: (input) => search(input),
})
```

This collapses Mission Profile + mountChat + configure into one call for the 80% case.

Before adding `createChat()`, test whether a grounded `mountChat()` recipe plus `createGroundedQaAgent()` or `createGroundedQaSkill()` removes enough ceremony. Another shorthand is useful only if it preserves the Skills/Profile review boundary instead of creating an attractive ungoverned shortcut.

### API-2: `tool()` requires Zod but doesn't re-export it

**Severity:** Low
**Status:** Open

Integrators need to install Zod separately. Either re-export it from `@kevinmarmstrong/edgekit` or make it a documented peer dependency with version range.

---

## Low: Code Quality

### CODE-1: Test file leaks into dist

**Severity:** Low
**Status:** Open

`packages/ui/dist/` contains `index.test.d.ts` and `index.test.d.ts.map`. The test lives in `src/` alongside the main code. Move tests to a `test/` directory or exclude from `tsconfig.build.json`.

This was observed in an earlier release review. Re-verify against the current package tarball before prioritizing; the build/publish layout may have changed during the v0.3.x repo work.

### CODE-2: LOC budgets exceeded

**Severity:** Low
**Status:** Known warning

`core` at 3,983 LOC (budget: 1,800) and `ui` at 1,893 (budget: 1,400). These are warnings, not failures, but signal that both packages need splitting attention.

### CODE-3: Site build chunk size

**Severity:** Low
**Status:** Open

`dist-CR4hqXX7.js` is 6MB (2.1MB gzipped). Code-splitting would help but this is the marketing site, not the package.

### CODE-4: 2 of 3 demo repos have no CI

**Severity:** Low
**Status:** Open

`edgekit-demo-docs` and `edgekit-demo-admin` have no GitHub Actions. `edgekit-demo-ecommerce` has CI and it passed.

---

## Priority Summary

| Priority | ID | Area | Summary |
|----------|-----|------|---------|
| **P0** | GROUND-1 | Grounding | Model hallucinates identity, facts, associations — regression |
| **P0** | GROUND-2 | Grounding | Add `grounding` mode to Mission Profiles |
| **P0** | IDENT-1 | Identity | Configurable agent identity injected into system prompt |
| **P0** | BUNDLE-1 | Bundle | Ship lightweight entry point without web-llm/mediapipe |
| **P0** | DOCS-0 | Docs | Site-first install path is the acceptance test |
| **P0** | DOCS-1 | Docs | API reference page — CSS vars, ::part(), attrs, mountChat |
| **P1** | GROUND-3 | Grounding | Response validation hook |
| **P1** | GROUND-4 | Grounding | Make required tool use the strict public-Q&A default |
| **P1** | GROUND-5 | Grounding | Auto-harden system prompt for small models |
| **P1** | GROUND-6 | Grounding | Add ambiguity and runtime/model distinction policy |
| **P1** | GROUND-7 | Grounding | Package deterministic grounded Q&A composer |
| **P1** | DOCS-2 | Docs | Getting Started rewrite — lead with mountChat |
| **P1** | NOMODEL-1 | Fallback | Enrich onNoModel with tools + history |
| **P2** | API-1 | Ergonomics | createChat() shorthand for simple use cases |
| **P2** | DOCS-3 | Docs | onNoModel as primary path documentation |
| **P2** | BUNDLE-2 | Bundle | Zod v3/v4 dedup |
| **P2** | CODE-1 | Quality | Test file in dist |
| **P3** | API-2 | Ergonomics | Re-export or peer-dep Zod |
| **P3** | IDENT-2 | Identity | Clarify user identity vs agent identity |
| **P3** | CODE-2 | Quality | LOC budget overruns |
| **P3** | CODE-3 | Quality | Site chunk splitting |
| **P3** | CODE-4 | Quality | Demo repo CI |
| **P3** | DOCS-4 | Docs | Verify 404 redirects |

---

## Key Insight

The repo already had a working local answer to grounding in the site assistant:
1. `toolChoice: 'required'` — forces tool use every turn
2. `createSiteAssistantStream()` — deterministic response formatting from tool output

Those mechanisms were not made into the obvious packaged adopter path. The v3.5 refactor improved package structure, theming APIs, and developer ergonomics, but the public install path still let a reasonable "site Q&A" integration become model-freelancing over weak retrieval. The hallucination transcript is a direct consequence.

The product's thesis is "run small models at the edge." Small models hallucinate more than large models. The product must compensate structurally — grounding modes, identity injection, response validation — not leave it to integrator prompt engineering. The integrator wrote a reasonable system prompt. Reasonable isn't enough for Gemma.

## Recommended Next Work Package

Treat this as one coherent patch, not a scatter of small fixes:

1. **Guardrail archeology:** identify every pre/post-v3.5 mechanism that enforced tool use, deterministic answer composition, no-evidence responses, citations, and synthesis faithfulness.
2. **Public Q&A contract:** write the formal behavior contract for site/blog/docs Q&A: identity, evidence, ambiguity, no-evidence, no model-provider self-identification, and no unsupported biographical claims.
3. **Runtime/API implementation:** add agent identity, strict grounding mode, response validation or deterministic composer hooks, and a safe fallback tool-calling shape.
4. **Regression transcript:** add the production prompts from this incident as required evals.
5. **Docs and reference:** publish the install path, API reference tables, and public-site fallback guidance only after the runtime path exists.
6. **External reinstall:** repeat the kevinarmstrong.name-style install from scratch and verify that the obvious path produces grounded answers without manual source spelunking.
