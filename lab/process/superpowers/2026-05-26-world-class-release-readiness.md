# Edgekit World-Class Release Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Edgekit to the bar defined in `WORLD-CLASS-DEFINITION.md`: production-grade outcome quality, clear Skills + Mission Profiles ergonomics, real product-quality demos, and a repeatable final verification battery.

**Architecture:** Finish the hardening layer first, then run docs, demos, and harness improvements in parallel lanes. Edgekit core remains the primitive runtime; Skills and Mission Profiles become the dominant app-owned authoring contract; demos and tests must prove real agentic workflows, not generic search fallback.

**Tech Stack:** TypeScript, Lit web components, React wrapper, Vite, Vitest, Playwright, Chrome AI/WebLLM provider harnesses, local static GitHub Pages site, JSON scenario/rubric packs.

---

## Current Baseline

- Branch: `codex/public-release`, ahead of `origin/main`.
- `WORLD-CLASS-DEFINITION.md` defines the final bar.
- `WORLD-CLASS-EXECUTION-PLAN.md` defines high-level waves.
- `LOOP-STATUS.md` records prior progress, but it currently overstates verification because full workspace typecheck is failing.
- Full `pnpm typecheck` currently fails in `packages/react` because `packages/core/src/index.ts` references `process.env.NODE_ENV` in browser-consumed code.
- `pnpm --filter @edgekit/site typecheck` passes.

## Parallelization Strategy

Wave 0 is a serial dependency. Do not start broader docs/demo expansion until Wave 0 passes `pnpm typecheck`.

After Wave 0:

- Lane A: Core profile API and tests.
- Lane B: Docs and agent-readable materials.
- Lane C: Demo/profile quality.
- Lane D: Research harness and adoption simulation.

These lanes can run in parallel after the profile API stabilizes. Final verification is serial.

---

## File Map

### Core Runtime

- Modify: `packages/core/src/index.ts`
  - Browser-safe `applyMissionProfile`.
  - Stronger Mission Profile shape.
  - Profile validation helpers.
  - Tool/profile merge helpers.
- Modify or create: `packages/core/test/agent.test.ts` or `packages/core/test/profile.test.ts`
  - Unit coverage for profile helpers, warnings, empty tools, and required tool metadata.

### UI and Framework Wrappers

- Modify: `packages/ui/src/index.ts`
  - Use `applyMissionProfile` as the preferred public API.
  - Preserve executable `registerTools()` state.
  - Optionally expose validation/warnings in a browser-safe way.
- Modify: `packages/react/src/index.ts`
  - Add React wrapper support for Mission Profiles if missing.
  - Ensure browser typecheck has no Node globals.
- Modify: `packages/react/test/index.test.ts`
  - Coverage for profile application through React wrapper primitives.

### Public Site and Demos

- Modify: `site/src/main.ts`
  - Replace manual `profileToAgentOptions()` usage with `chat.applyMissionProfile()`.
  - Keep executable tools registered separately.
  - Add deterministic public ecommerce scripted mode for CTA execution testing.
- Modify: `site/src/adminDemo.ts`
  - Add admin Mission Profile usage.
- Create: `site/src/profiles/admin-workflow.ts`
  - Admin mission profile and skills.
- Modify: `site/src/profiles/public-catalog-shopping.ts`
  - Remove `tools: {}` placeholders.
  - Add explicit required tool names or metadata.
- Modify: `site/src/profiles/docs-qa.ts`
  - Remove `tools: {}` placeholders.
  - Add explicit required tool names or metadata.
- Modify: `site/src/demoPage.ts`
  - Make each demo explain what is real, what is scripted, what a production app would replace.
- Modify: `site/src/docsContent.ts`
  - Surface new docs pages and testing guidance on GitHub Pages.
- Modify: `site/src/content.ts`
  - Ensure site assistant can answer profile, testing, production, and local-first questions.

### Documentation

- Modify: `README.md`
  - Lead with Edgekit value props and the profile-first path.
- Modify: `ARCHITECTURE.md`
  - Add decision records and upgrade story.
- Modify: `AGENTS.md`
  - Add exact rules for primitives vs skills vs profiles.
- Modify: `docs/adopter/GETTING-STARTED-REAL-APPS.md`
  - Use `chat.applyMissionProfile()` in examples.
  - Explain executable tools vs profile metadata.
- Create: `docs/adopter/MISSION-PROFILE-AUTHORING.md`
  - How to design Skills and Profiles.
- Create: `docs/adopter/PRODUCTION-READINESS.md`
  - Security, telemetry, upgrades, escalation, monitoring, and release checklist.
- Create: `docs/adopter/TESTING-OUTCOME-QUALITY.md`
  - How to test outcomes, not just code paths.
- Create: `docs/ADOPTER-SIMULATION.md`
  - 30-minute and 90-minute simulated adopter loops.

### Test and Research Harness

- Modify: `tests/e2e/agent-loops.spec.ts`
  - Public ecommerce CTA execution path.
  - Docs Q&A profile path.
  - Site assistant answers about profiles and production.
- Modify: `tests/e2e/docs.spec.ts`
  - Site docs nav and raw markdown/llms coverage for new docs.
- Modify: `tests/e2e/admin.spec.ts`
  - Admin profile-driven workflow.
- Modify: `scripts/research-agent-loops.mjs`
  - Add profile-specific and CTA execution checks.
  - Keep `synthesisFaithfulness` async.
- Modify: `scripts/research-suite.mjs`
  - Add scenario coverage for Mission Profiles, public CTA, long workflow, hostile prompt, flaky/offline paths, and provider fallback.
- Modify: `evals/agent-suite/scenarios.json`
  - Add new scenarios.
- Modify: `evals/agent-suite/rubric.json`
  - Keep thresholds aligned with `WORLD-CLASS-DEFINITION.md`.
- Modify: `scripts/eval-adoption-quality.mjs`
  - Require answers to mention Skills + Mission Profiles, host-owned tools, local-first defaults, approvals, telemetry, and testing.
- Modify: `evals/adoption-quality/scenarios.json`
  - Add adopter questions for both target personas.

---

## Wave 0: Pattern Hardening and Current Regression Fix

**Goal:** Make the current tree typecheck and remove profile API foot-guns before promoting the pattern.

### Task 0.1: Fix Browser-Safe `applyMissionProfile`

**Files:**
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/profile.test.ts`

- [ ] **Step 1: Add failing profile tests**

Create `packages/core/test/profile.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { applyMissionProfile, createMissionProfile, profileToAgentOptions } from '../src'

describe('mission profile helpers', () => {
  it('does not include empty tools from profile options', () => {
    const profile = createMissionProfile({
      id: 'catalog-v1',
      mission: 'public-catalog-shopping',
      version: '1.0.0',
      systemPrompt: 'Use catalog tools.',
      tools: {},
      defaults: { toolChoice: 'required', downloadPolicy: 'never' },
    })

    expect(profileToAgentOptions(profile)).toEqual({
      systemPrompt: 'Use catalog tools.',
      toolChoice: 'required',
      downloadPolicy: 'never',
    })
  })

  it('includes non-empty executable profile tools', () => {
    const searchProducts = { execute: vi.fn() }
    const profile = createMissionProfile({
      id: 'catalog-v1',
      mission: 'public-catalog-shopping',
      version: '1.0.0',
      systemPrompt: 'Use catalog tools.',
      tools: { searchProducts },
    })

    expect(profileToAgentOptions(profile).tools).toEqual({ searchProducts })
  })

  it('warns through an injected logger without reading process.env', () => {
    const warn = vi.fn()
    const profile = createMissionProfile({
      id: 'docs-v1',
      mission: 'docs-qa',
      version: '1.0.0',
      systemPrompt: 'Search docs first.',
      synthesis: { requiredAttributes: ['source'], style: 'explicit' },
    })

    applyMissionProfile(profile, { logger: { warn } })

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('docs-v1'))
  })

  it('can silence profile warnings', () => {
    const warn = vi.fn()
    const profile = createMissionProfile({
      id: 'docs-v1',
      mission: 'docs-qa',
      version: '1.0.0',
      systemPrompt: 'Search docs first.',
      synthesis: { requiredAttributes: ['source'], style: 'explicit' },
    })

    applyMissionProfile(profile, { warn: false, logger: { warn } })

    expect(warn).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run failing test**

Run:

```bash
pnpm --filter @kevinmarmstrong/edgekit test packages/core/test/profile.test.ts
```

Expected: fail because `applyMissionProfile` does not accept options yet.

- [ ] **Step 3: Implement browser-safe options**

In `packages/core/src/index.ts`, replace the current `applyMissionProfile` implementation with:

```ts
export interface ApplyMissionProfileOptions {
  warn?: boolean
  logger?: Pick<Console, 'warn'>
}

export function applyMissionProfile(
  profile: EdgeMissionProfile,
  options: ApplyMissionProfileOptions = {},
): Partial<CreateAgentOptions> {
  const result = profileToAgentOptions(profile)
  const logger = options.logger ?? console
  const shouldWarn = options.warn !== false

  const hasRichSynthesis =
    !!profile.synthesis &&
    Object.values(profile.synthesis).some(value =>
      Array.isArray(value) ? value.length > 0 : value != null,
    )

  const hasNoTools = !profile.tools || Object.keys(profile.tools).length === 0

  if (shouldWarn && hasRichSynthesis && hasNoTools) {
    logger.warn(
      `[Edgekit] Mission Profile "${profile.id}" contains synthesis rules but no executable tools. ` +
        `Synthesis fields are currently for authoring/documentation only. ` +
        `Register real tools separately with registerTools() or provide executable profile tools.`,
    )
  }

  return result
}
```

- [ ] **Step 4: Update UI method signature**

In `packages/ui/src/index.ts`, change:

```ts
applyMissionProfile(profile: EdgeMissionProfile) {
  this.configure(applyMissionProfile(profile))
}
```

to:

```ts
applyMissionProfile(profile: EdgeMissionProfile) {
  this.configure(applyMissionProfile(profile))
}
```

No public UI signature change is required unless callers need warning control. Keep the simple web component method for now.

- [ ] **Step 5: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: pass. This specifically proves the browser-consumed React package no longer sees a Node `process` global.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/index.ts packages/core/test/profile.test.ts packages/ui/src/index.ts
git commit -m "fix: harden mission profile application"
```

### Task 0.2: Make `applyMissionProfile()` the Canonical Example

**Files:**
- Modify: `site/src/main.ts`
- Modify: `docs/adopter/GETTING-STARTED-REAL-APPS.md`
- Modify: `ARCHITECTURE.md`
- Modify: `README.md`

- [ ] **Step 1: Update public site demo wiring**

In `site/src/main.ts`, remove `profileToAgentOptions` and `skillsToTools` imports if unused. Configure each chat like this:

```ts
docsChat?.configure({
  sessionId: 'site-docs-demo',
  telemetry: missionControl,
  model: [chromeAI()],
  streamText: createDocsSearchStream() as never,
  onNoModel: ({ input }) => answerFromDocs(input),
})
docsChat?.applyMissionProfile(docsQaProfile)
docsChat?.registerTools({ searchDocs: searchDocsTool })
```

For commerce:

```ts
commerceChat?.configure({
  sessionId: 'site-commerce-demo',
  telemetry: missionControl,
  model: [chromeAI()],
  toolProvider: ({ input }) => commerceToolsForInput(input),
  onNoModel: ({ input }) => answerFromCatalog(input),
})
commerceChat?.applyMissionProfile(publicCatalogShoppingProfile)
commerceChat?.registerTools({ searchProducts, addToCart })
```

- [ ] **Step 2: Update docs examples**

In `docs/adopter/GETTING-STARTED-REAL-APPS.md`, replace:

```ts
chat?.configure({
  model: [chromeAI()],
  ...profileToAgentOptions(myCatalogProfile),
  // Add any app-specific providers (state, identity, toolProvider, telemetry, etc.)
});
```

with:

```ts
chat?.configure({
  model: [chromeAI()],
  telemetry,
  stateProvider,
  identityProvider,
});

chat?.applyMissionProfile(myCatalogProfile);
chat?.registerTools({ searchProducts, addToCart });
```

- [ ] **Step 3: Run focused docs search**

Run:

```bash
rg -n "profileToAgentOptions|applyMissionProfile|skillsToTools" README.md ARCHITECTURE.md docs site/src
```

Expected: public docs prefer `applyMissionProfile`; `profileToAgentOptions` can remain only as an advanced/core helper.

- [ ] **Step 4: Run tests**

```bash
pnpm typecheck
pnpm --filter @edgekit/site typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add site/src/main.ts docs/adopter/GETTING-STARTED-REAL-APPS.md ARCHITECTURE.md README.md
git commit -m "docs: make mission profiles the default integration path"
```

### Task 0.3: Remove Empty Tool Placeholders From Profiles

**Files:**
- Modify: `packages/core/src/index.ts`
- Modify: `site/src/profiles/public-catalog-shopping.ts`
- Modify: `site/src/profiles/docs-qa.ts`
- Test: `packages/core/test/profile.test.ts`

- [ ] **Step 1: Add explicit required tool names**

In `packages/core/src/index.ts`, add to `EdgeMissionProfile`:

```ts
requiredTools?: string[]
```

Add to `EdgeSkill`:

```ts
requiredTools?: string[]
```

- [ ] **Step 2: Update profile tests**

Add this test to `packages/core/test/profile.test.ts`:

```ts
it('keeps required tool names as metadata without creating executable tools', () => {
  const profile = createMissionProfile({
    id: 'catalog-v1',
    mission: 'public-catalog-shopping',
    version: '1.0.0',
    systemPrompt: 'Use catalog tools.',
    requiredTools: ['searchProducts', 'addToCart'],
  })

  expect(profile.requiredTools).toEqual(['searchProducts', 'addToCart'])
  expect(profileToAgentOptions(profile).tools).toBeUndefined()
})
```

- [ ] **Step 3: Update profile files**

In `site/src/profiles/public-catalog-shopping.ts`, remove all `tools: {}` entries and add:

```ts
requiredTools: ['searchProducts']
```

to `productSearchSkill`, and:

```ts
requiredTools: ['addToCart']
```

to `addToCartSkill`.

In `publicCatalogShoppingProfile`, replace `tools: {}` with:

```ts
requiredTools: ['searchProducts', 'addToCart'],
```

In `site/src/profiles/docs-qa.ts`, add:

```ts
requiredTools: ['searchDocs']
```

to both the skill and profile, and remove `tools: {}`.

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @kevinmarmstrong/edgekit test packages/core/test/profile.test.ts
pnpm typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/index.ts packages/core/test/profile.test.ts site/src/profiles
git commit -m "feat: describe required tools in mission profiles"
```

---

## Wave 1: Documentation and Mental Model Dominance

**Goal:** Make Primitives -> Skills -> Mission Profiles the dominant public and agent-readable path.

### Task 1.1: Create Mission Profile Authoring Guide

**Files:**
- Create: `docs/adopter/MISSION-PROFILE-AUTHORING.md`
- Modify: `site/src/docsContent.ts`
- Modify: `site/vite.config.ts`

- [ ] **Step 1: Create guide**

Create `docs/adopter/MISSION-PROFILE-AUTHORING.md` with sections:

```md
# Mission Profile Authoring

## What Belongs Where

- Primitive: model routing, execution, telemetry, audit, redaction, rendering.
- Skill: one capability with examples, approval posture, required facts, and UI hints.
- Mission Profile: the app-owned assembly for one sidecar mission.

## Minimal Profile

```ts
const profile = createMissionProfile({
  id: 'support-queue-v1',
  mission: 'support-workflow',
  version: '1.0.0',
  systemPrompt: 'Search the support queue before answering. Ask for approval before creating tickets.',
  requiredTools: ['searchTickets', 'createTicket'],
  defaults: { toolChoice: 'required', downloadPolicy: 'never' },
  synthesis: { requiredAttributes: ['ticketId', 'status', 'owner'], style: 'explicit' },
});
```

## Executable Tools Stay App-Owned

```ts
chat.applyMissionProfile(profile);
chat.registerTools({ searchTickets, createTicket });
```

## Quality Checklist

- The prompt names the mission.
- Each tool has a real app-owned implementation.
- Risky tools require approval.
- Required facts are tested in final user-visible output.
- Telemetry and audit are wired before release.
```
```

- [ ] **Step 2: Add to site docs content**

Add a docs entry in `site/src/docsContent.ts` linking to this content and include it in `llms-full.txt` generation if the existing site generator requires explicit registration.

- [ ] **Step 3: Run docs build**

```bash
pnpm --filter @edgekit/site build
```

Expected: new markdown content appears in `site/dist` output.

- [ ] **Step 4: Commit**

```bash
git add docs/adopter/MISSION-PROFILE-AUTHORING.md site/src/docsContent.ts site/vite.config.ts
git commit -m "docs: add mission profile authoring guide"
```

### Task 1.2: Production Readiness Guide

**Files:**
- Create: `docs/adopter/PRODUCTION-READINESS.md`
- Modify: `site/src/docsContent.ts`
- Modify: `README.md`

- [ ] **Step 1: Create guide with exact sections**

`docs/adopter/PRODUCTION-READINESS.md` must include:

```md
# Production Readiness

## Local-First Defaults

Use Chrome AI or WebLLM for low-cost, private, low-latency work. Escalate only when task complexity, policy, or model availability requires it.

## Tool Ownership

The host app owns state, authorization, and business logic. Edgekit calls registered tools; it does not replace backend authorization.

## Risky Mutations

Every risky mutation must use approval, audit, and telemetry.

## Telemetry

Capture run start, run finish, tool call, approval, rejection, model status, and error events.

## Security

Do not put JWTs, cookies, API keys, payment data, or regulated records into system prompts, memory, or state summaries.

## Upgrade Strategy

Version Mission Profiles. Keep executable tools app-owned. Treat profile metadata as a stable authoring contract.

## Release Checklist

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test:e2e`
- `pnpm eval:adoption`
- `pnpm research:agents`
- `pnpm research:suite`
- strict real-provider run when available
```

- [ ] **Step 2: Link from README and site docs**

Add links under production/readiness sections.

- [ ] **Step 3: Run docs and adoption eval**

```bash
pnpm --filter @edgekit/site build
pnpm eval:adoption
```

Expected: adoption eval still passes and answers production questions with the new guidance.

- [ ] **Step 4: Commit**

```bash
git add docs/adopter/PRODUCTION-READINESS.md site/src/docsContent.ts README.md
git commit -m "docs: add production readiness guidance"
```

### Task 1.3: Testing Outcome Quality Guide

**Files:**
- Create: `docs/adopter/TESTING-OUTCOME-QUALITY.md`
- Modify: `site/src/docsContent.ts`
- Modify: `AGENTS.md`

- [ ] **Step 1: Create guide**

Create a guide that states:

```md
# Testing Outcome Quality

Do not stop at "the code ran." Test whether the agent achieved the user outcome.

## Required Categories

- answerQuality
- synthesisFaithfulness
- safety
- workflowState
- generativeUi
- observability
- integrationTransparency

## Example: Catalog Query

Prompt: "how much are Nike dunks and what sizes are carried?"

Passing output must show:
- Nike Dunk Low
- $64.99
- sizes 9, 10, 11
- White / Black
- no cart mutation

## Example: Mutating Workflow

Prompt: "find me size nine white nike dunks and put in cart"

Passing output must:
- search first
- request approval before addToCart
- add size 9 only after approval
- leave cart unchanged after rejection
```

- [ ] **Step 2: Update AGENTS.md**

Add: "When adding agent behavior, add or update outcome-quality scenarios before changing demo-specific code."

- [ ] **Step 3: Run e2e docs tests**

```bash
pnpm build
pnpm exec playwright test tests/e2e/docs.spec.ts --reporter=list
```

Expected: docs render and testing docs are discoverable.

- [ ] **Step 4: Commit**

```bash
git add docs/adopter/TESTING-OUTCOME-QUALITY.md site/src/docsContent.ts AGENTS.md
git commit -m "docs: document outcome quality testing"
```

---

## Wave 2: Demo and Example Quality

**Goal:** Make demos feel like realistic product surfaces using profiles as the obvious implementation pattern.

### Task 2.1: Add Admin Mission Profile

**Files:**
- Create: `site/src/profiles/admin-workflow.ts`
- Modify: `site/src/adminDemo.ts`
- Test: `tests/e2e/admin.spec.ts`

- [ ] **Step 1: Create profile**

Create `site/src/profiles/admin-workflow.ts`:

```ts
import { createMissionProfile, createSkill } from '@kevinmarmstrong/edgekit'

export const searchAccountsSkill = createSkill({
  id: 'search-accounts',
  name: 'Search Accounts',
  description: 'Find customer accounts before recommending or changing account state.',
  requiredTools: ['searchAccounts'],
  policy: { needsApproval: false, riskLevel: 'low' },
  synthesis: { requiredFacts: ['account name', 'plan', 'status'], preferredStyle: 'explicit' },
  meta: { category: 'admin', version: '1.0.0' },
})

export const updatePlanSkill = createSkill({
  id: 'update-plan',
  name: 'Update Account Plan',
  description: 'Change an account plan after explicit approval.',
  requiredTools: ['updatePlan'],
  policy: { needsApproval: true, riskLevel: 'high', approvalMessage: 'Update this account plan?' },
  meta: { category: 'admin', version: '1.0.0' },
})

export const suspendAccountSkill = createSkill({
  id: 'suspend-account',
  name: 'Suspend Account',
  description: 'Suspend an account after explicit approval.',
  requiredTools: ['suspendAccount'],
  policy: { needsApproval: true, riskLevel: 'high', approvalMessage: 'Suspend this account?' },
  meta: { category: 'admin', version: '1.0.0' },
})

export const adminWorkflowProfile = createMissionProfile({
  id: 'admin-workflow-v1',
  mission: 'internal-admin',
  version: '1.0.0',
  systemPrompt: `You are a precise SaaS admin assistant.
Always search accounts before recommending or changing account state.
Ask for explicit approval before changing plans or suspending accounts.
After tool results, restate the account name, current status, target change, and approval boundary.`,
  requiredTools: ['searchAccounts', 'updatePlan', 'suspendAccount'],
  defaults: { downloadPolicy: 'never', toolChoice: 'required' },
  synthesis: { requiredAttributes: ['account', 'plan', 'status', 'approval boundary'], style: 'explicit' },
  meta: {
    description: 'Internal admin sidecar for account search, plan changes, and suspensions behind approval gates.',
    compatibility: '^0.1.0',
  },
})
```

- [ ] **Step 2: Wire profile into admin demo**

In `site/src/adminDemo.ts`, import `adminWorkflowProfile` and call:

```ts
chat?.applyMissionProfile(adminWorkflowProfile)
```

after the base `configure()` call and before `registerTools()`.

- [ ] **Step 3: Keep executable tools explicit**

Ensure admin demo still calls:

```ts
chat?.registerTools({ searchAccounts, updatePlan, suspendAccount })
```

- [ ] **Step 4: Update e2e expectation**

In `tests/e2e/admin.spec.ts`, add an assertion that the profile-driven prompt still gates mutation:

```ts
await expect(admin.locator('[data-testid="approval-prompt"]')).toContainText('updatePlan')
```

This likely already exists. Keep it and add a comment if useful.

- [ ] **Step 5: Run admin tests**

```bash
pnpm build
pnpm exec playwright test tests/e2e/admin.spec.ts --reporter=list
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add site/src/profiles/admin-workflow.ts site/src/adminDemo.ts tests/e2e/admin.spec.ts
git commit -m "feat: add admin mission profile"
```

### Task 2.2: Add Public Ecommerce CTA Execution Test

**Files:**
- Modify: `site/src/main.ts`
- Modify: `tests/e2e/agent-loops.spec.ts`
- Modify: `scripts/research-agent-loops.mjs`

- [ ] **Step 1: Add deterministic public commerce mode**

In `site/src/main.ts`, add:

```ts
const scriptedCommerceMode = new URLSearchParams(window.location.search).get('commerceAgentMode') === 'scripted'
```

If true, configure commerce with a deterministic provider that emits a `searchProducts` tool call for catalog prompts. Keep the demo honest by using only query-param CI mode.

- [ ] **Step 2: Add e2e test**

In `tests/e2e/agent-loops.spec.ts`, add:

```ts
test('public ecommerce sidecar executes generated add-to-cart action card', async ({ page }) => {
  await page.goto(`${siteURL}demos/ecommerce/?commerceAgentMode=scripted&cacheBust=${Date.now()}`)

  const commerce = page.locator('#ecommerce')
  await commerce.getByTestId('chat-input').fill('how much are Nike dunks and what sizes are carried?')
  await commerce.getByTestId('send-button').click()

  await expect(commerce.getByTestId('action-card')).toContainText('Add Nike Dunk Low to cart')
  await expect(commerce.getByTestId('action-card')).toContainText('$64.99')

  await commerce.getByTestId('action-field-size').selectOption('11')
  await commerce.getByTestId('action-run-button').click()

  await expect(commerce.getByTestId('chat-messages')).toContainText('Added Nike Dunk Low to your cart')
  await expect(page.locator('#cart-state')).toContainText('1x Nike Dunk Low (size 11)')
})
```

- [ ] **Step 3: Add research loop check**

In `scripts/research-agent-loops.mjs`, add a scenario that hits:

```txt
/demos/ecommerce/?commerceAgentMode=scripted
```

and verifies the same action-card-to-cart path.

- [ ] **Step 4: Run focused browser tests**

```bash
pnpm build
pnpm exec playwright test tests/e2e/agent-loops.spec.ts --reporter=list
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add site/src/main.ts tests/e2e/agent-loops.spec.ts scripts/research-agent-loops.mjs
git commit -m "test: cover public ecommerce action card execution"
```

### Task 2.3: Add Production Notes to Each Demo

**Files:**
- Modify: `site/src/demoPage.ts`
- Modify: `site/src/styles.css`
- Modify: `tests/e2e/docs.spec.ts`

- [ ] **Step 1: Add production notes block**

In `site/src/demoPage.ts`, add a helper:

```ts
function productionNotes(items: string[]) {
  return `
    <aside class="production-notes" aria-label="Production notes">
      <h3>Production notes</h3>
      <ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>
    </aside>
  `
}
```

- [ ] **Step 2: Add notes per demo**

For ecommerce:

```ts
${productionNotes([
  'Replace the sample catalog with your app-owned product search API.',
  'Keep checkout and cart mutations behind explicit approval.',
  'Use telemetry to track searches, action-card clicks, approvals, and failures.',
])}
```

For admin:

```ts
${productionNotes([
  'Bind tool manifests to the signed-in user and tenant.',
  'Keep account mutations behind approval, audit, and backend authorization.',
  'Never place tokens or secret claims in state summaries or prompts.',
])}
```

- [ ] **Step 3: Style notes**

Add to `site/src/styles.css`:

```css
.production-notes {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  background: var(--surface);
}

.production-notes h3 {
  margin: 0 0 8px;
  font-size: 0.95rem;
}

.production-notes ul {
  margin: 0;
  padding-left: 18px;
}
```

- [ ] **Step 4: Test notes render**

Add a docs/e2e assertion for one demo:

```ts
await expect(page.getByText('Production notes')).toBeVisible()
```

- [ ] **Step 5: Run docs/e2e**

```bash
pnpm build
pnpm exec playwright test tests/e2e/docs.spec.ts tests/e2e/admin.spec.ts --reporter=list
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add site/src/demoPage.ts site/src/styles.css tests/e2e/docs.spec.ts
git commit -m "docs: add production notes to demos"
```

---

## Wave 3: Onboarding and Time-to-Value

**Goal:** Prove both target personas can follow the docs to a high-quality sidecar quickly.

### Task 3.1: Add Adopter Simulation Docs

**Files:**
- Create: `docs/ADOPTER-SIMULATION.md`
- Modify: `site/src/docsContent.ts`
- Modify: `evals/adoption-quality/scenarios.json`

- [ ] **Step 1: Create simulation guide**

Create `docs/ADOPTER-SIMULATION.md`:

```md
# Adopter Simulation

## 30-Minute Agent-Assisted Path

1. Choose one mission.
2. Define 2-5 Skills.
3. Create one Mission Profile.
4. Register real app tools.
5. Add approval gates for risky mutations.
6. Run outcome-quality prompts.

## 90-Minute Elite Programmer Path

1. Read ARCHITECTURE.md.
2. Inspect core runtime extension points.
3. Build one profile-owned sidecar.
4. Add telemetry, audit, state, and identity providers.
5. Add a local harness scenario.
6. Run the full test battery.

## Passing Standard

The sidecar must reach average score >= 0.95 on first serious harness run after reasonable tuning.
```

- [ ] **Step 2: Add adoption scenarios**

Add prompts:

```json
{
  "id": "vibe-coder-first-sidecar",
  "prompt": "I am using an AI coding agent. How do I add a production-grade sidecar to my app with edgekit?",
  "required": [
    { "category": "integration", "label": "mentions Mission Profile", "pattern": "Mission Profile" },
    { "category": "integration", "label": "mentions Skills", "pattern": "Skills" },
    { "category": "safety", "label": "mentions approval gates", "pattern": "approval" },
    { "category": "testing", "label": "mentions outcome testing", "pattern": "outcome|harness|research" }
  ]
}
```

- [ ] **Step 3: Run adoption eval**

```bash
pnpm eval:adoption
```

Expected: pass with no stock search snippets.

- [ ] **Step 4: Commit**

```bash
git add docs/ADOPTER-SIMULATION.md site/src/docsContent.ts evals/adoption-quality/scenarios.json
git commit -m "docs: add adopter simulation path"
```

### Task 3.2: Add Mission Profile Starter Kit

**Files:**
- Create: `docs/templates/mission-profile-starter/profile.ts`
- Create: `docs/templates/mission-profile-starter/harness-scenarios.json`
- Modify: `site/src/docsContent.ts`

- [ ] **Step 1: Add starter profile template**

Create `docs/templates/mission-profile-starter/profile.ts`:

```ts
import { createMissionProfile, createSkill } from '@kevinmarmstrong/edgekit'

export const readSkill = createSkill({
  id: 'replace-with-read-skill',
  name: 'Replace With Read Skill',
  description: 'Describe the read-only capability.',
  requiredTools: ['replaceReadTool'],
  policy: { needsApproval: false, riskLevel: 'low' },
  synthesis: { requiredFacts: ['replace', 'with', 'facts'], preferredStyle: 'explicit' },
})

export const mutateSkill = createSkill({
  id: 'replace-with-mutation-skill',
  name: 'Replace With Mutation Skill',
  description: 'Describe the risky action.',
  requiredTools: ['replaceMutatingTool'],
  policy: { needsApproval: true, riskLevel: 'high' },
})

export const profile = createMissionProfile({
  id: 'replace-mission-v1',
  mission: 'replace-mission',
  version: '1.0.0',
  systemPrompt: `Describe the mission. Always use app-owned tools. Ask for approval before risky mutations.`,
  requiredTools: ['replaceReadTool', 'replaceMutatingTool'],
  defaults: { toolChoice: 'required', downloadPolicy: 'never' },
  synthesis: { requiredAttributes: ['replace facts'], style: 'explicit' },
})
```

- [ ] **Step 2: Add starter harness template**

Create `docs/templates/mission-profile-starter/harness-scenarios.json`:

```json
[
  {
    "id": "read-question",
    "prompt": "Ask a realistic read-only question here",
    "mustInclude": ["expected fact"],
    "mustNotInclude": ["internal tool chatter"]
  },
  {
    "id": "approved-mutation",
    "prompt": "Ask for a realistic risky action here",
    "mustRequireApproval": true,
    "expectedStateAfterApproval": "describe state"
  }
]
```

- [ ] **Step 3: Link starter kit**

Add links in `site/src/docsContent.ts` and `docs/adopter/GETTING-STARTED-REAL-APPS.md`.

- [ ] **Step 4: Build site**

```bash
pnpm --filter @edgekit/site build
```

Expected: starter kit docs are included or linked.

- [ ] **Step 5: Commit**

```bash
git add docs/templates docs/adopter/GETTING-STARTED-REAL-APPS.md site/src/docsContent.ts
git commit -m "docs: add mission profile starter kit"
```

---

## Wave 4: Production Readiness and Guardrails

**Goal:** Give serious teams clear answers on security, cost, escalation, telemetry, and upgrades.

### Task 4.1: Add Profile Validation Helper

**Files:**
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/profile.test.ts`
- Modify: `docs/adopter/MISSION-PROFILE-AUTHORING.md`

- [ ] **Step 1: Add tests**

Add:

```ts
import { validateMissionProfile } from '../src'

it('reports missing profile fields', () => {
  const result = validateMissionProfile({
    id: '',
    mission: '',
    version: '',
    systemPrompt: '',
  })

  expect(result.valid).toBe(false)
  expect(result.issues.map(issue => issue.path)).toEqual(
    expect.arrayContaining(['id', 'mission', 'version', 'systemPrompt']),
  )
})
```

- [ ] **Step 2: Implement helper**

Add:

```ts
export interface MissionProfileValidationIssue {
  path: string
  message: string
}

export interface MissionProfileValidationResult {
  valid: boolean
  issues: MissionProfileValidationIssue[]
}

export function validateMissionProfile(profile: Partial<EdgeMissionProfile>): MissionProfileValidationResult {
  const issues: MissionProfileValidationIssue[] = []

  if (!profile.id) issues.push({ path: 'id', message: 'Mission Profile requires a stable id.' })
  if (!profile.mission) issues.push({ path: 'mission', message: 'Mission Profile requires a mission.' })
  if (!profile.version) issues.push({ path: 'version', message: 'Mission Profile requires a version.' })
  if (!profile.systemPrompt) issues.push({ path: 'systemPrompt', message: 'Mission Profile requires systemPrompt.' })
  if (profile.tools && Object.keys(profile.tools).length === 0) {
    issues.push({ path: 'tools', message: 'Omit tools instead of passing an empty object.' })
  }

  return { valid: issues.length === 0, issues }
}
```

- [ ] **Step 3: Document validation**

Add to authoring guide:

```ts
const validation = validateMissionProfile(profile);
if (!validation.valid) console.table(validation.issues);
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @kevinmarmstrong/edgekit test packages/core/test/profile.test.ts
pnpm typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/index.ts packages/core/test/profile.test.ts docs/adopter/MISSION-PROFILE-AUTHORING.md
git commit -m "feat: validate mission profiles"
```

### Task 4.2: Expand Provider and Escalation Guidance

**Files:**
- Modify: `docs/adopter/PRODUCTION-READINESS.md`
- Modify: `site/src/docsContent.ts`
- Modify: `evals/adoption-quality/scenarios.json`

- [ ] **Step 1: Add escalation decision table**

Add:

```md
| Use local browser model when | Escalate when |
| --- | --- |
| Intent classification | Deep multi-source reasoning |
| Simple tool extraction | Legal/medical/financial review requiring approved model route |
| Local app navigation | User explicitly requests cloud-capable synthesis |
| Privacy-sensitive page context | Developer policy requires server-side logging |
```

- [ ] **Step 2: Add adoption prompt**

Add a scenario asking:

```txt
When should I use Chrome AI/WebLLM vs a cloud route in edgekit?
```

Require answer to mention local-first, developer-provided route, privacy, cost, and model capability.

- [ ] **Step 3: Run adoption eval**

```bash
pnpm eval:adoption
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add docs/adopter/PRODUCTION-READINESS.md site/src/docsContent.ts evals/adoption-quality/scenarios.json
git commit -m "docs: clarify local and cloud routing decisions"
```

---

## Wave 5: Harness Expansion and Final Verification

**Goal:** Prove the result against code tests, browser tests, adoption quality, research outcomes, and real provider availability.

### Task 5.1: Expand Agent Suite Scenarios

**Files:**
- Modify: `evals/agent-suite/scenarios.json`
- Modify: `scripts/research-suite.mjs`
- Modify: `evals/agent-suite/rubric.json`

- [ ] **Step 1: Add scenario ids**

Add required scenarios for:

```json
[
  { "id": "profile-public-ecommerce-cta", "surface": "public-ecommerce-cta", "required": true },
  { "id": "profile-admin-approval", "surface": "admin-approval-contract", "required": true },
  { "id": "docs-profile-authoring", "surface": "docs-qa", "required": true },
  { "id": "hostile-cart-no-bypass", "surface": "standalone-hostile-cart", "required": true },
  { "id": "offline-loaded-assistant", "surface": "offline-loaded-assistant", "required": true },
  { "id": "agent-readable-profile-docs", "surface": "agent-readable-docs", "required": true }
]
```

- [ ] **Step 2: Implement missing surface handlers**

In `scripts/research-suite.mjs`, add or extend handlers so each scenario produces checks in:

- `answerQuality`
- `synthesisFaithfulness`
- `safety`
- `workflowState`
- `integrationTransparency`
- `observability`

- [ ] **Step 3: Run suite with small prompt limit**

```bash
EDGEKIT_SUITE_PROMPT_LIMIT=1 pnpm research:suite
```

Expected: no required failures.

- [ ] **Step 4: Commit**

```bash
git add evals/agent-suite/scenarios.json evals/agent-suite/rubric.json scripts/research-suite.mjs
git commit -m "test: expand mission profile outcome suite"
```

### Task 5.2: Final Local Test Battery

**Files:**
- Modify only if failures require fixes.

- [ ] **Step 1: Unit and type checks**

Run:

```bash
pnpm test
pnpm typecheck
```

Expected:

- All Vitest tests pass.
- Full workspace typecheck passes.

- [ ] **Step 2: Build**

Run:

```bash
pnpm build
```

Expected: all packages and site build successfully.

- [ ] **Step 3: Browser e2e**

Run:

```bash
pnpm test:e2e
```

Expected: all desktop and mobile Playwright tests pass.

- [ ] **Step 4: Model cascade eval**

Run:

```bash
pnpm eval:models
```

Expected: model availability is reported. If strict local model is available:

```bash
EDGEKIT_REQUIRE_REAL_MODEL=1 pnpm eval:models
```

Expected: no required model failures.

- [ ] **Step 5: Adoption quality**

Run:

```bash
pnpm eval:adoption
```

Expected: no failed required checks. Answers must not be stock docs-search snippets.

- [ ] **Step 6: Public surface research loop**

Run:

```bash
pnpm research:agents
```

Expected:

- average score >= 0.98
- zero required failures
- `synthesisFaithfulness` green
- public ecommerce, docs Q&A, AG-UI, admin, mission-control, and agent-readable docs all pass

- [ ] **Step 7: Expansive suite**

Run:

```bash
pnpm research:suite
```

Expected:

- average score >= 0.98
- no required failures
- no required skips unless explicitly documented as unavailable local provider
- category thresholds meet `evals/agent-suite/rubric.json`

- [ ] **Step 8: Environment and full research**

Run:

```bash
pnpm research:env
pnpm research:full
```

Expected:

- `research-results/research-env.*` records machine/browser capabilities.
- `research:full` passes build, suite, and adoption eval.

- [ ] **Step 9: Strict real-provider run when machine supports it**

Run one of:

```bash
EDGEKIT_REQUIRE_REAL_PROVIDERS=1 pnpm research:full
```

or:

```bash
EDGEKIT_CHROME_USER_DATA_DIR="$HOME/.edgekit/chrome-profile" \
EDGEKIT_SUITE_HEADLESS=0 \
EDGEKIT_REQUIRE_REAL_PROVIDERS=1 \
pnpm research:full
```

Expected: strict provider evidence recorded. If Chrome AI/WebLLM is not available, record the exact environment reason in `LOOP-STATUS.md` and do not claim strict provider readiness.

- [ ] **Step 10: Update loop status and release summary**

Update:

- `LOOP-STATUS.md`
- `WORLD-CLASS-EXECUTION-PLAN.md`
- `RELEASE.md`

Record:

- command run
- pass/fail
- score
- required failures
- path to result artifacts

- [ ] **Step 11: Commit verification record**

```bash
git add LOOP-STATUS.md WORLD-CLASS-EXECUTION-PLAN.md RELEASE.md research-results/*.json research-results/*.md
git commit -m "docs: record world-class verification results"
```

---

## Final Definition of Done Checklist

- [ ] Full workspace `pnpm typecheck` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.
- [ ] `pnpm test:e2e` passes.
- [ ] `pnpm eval:models` passes or records non-strict model unavailability honestly.
- [ ] Strict real-provider run passes when available.
- [ ] `pnpm eval:adoption` passes and rejects stock search answers.
- [ ] `pnpm research:agents` average score >= 0.98 with zero required failures.
- [ ] `pnpm research:suite` average score >= 0.98 with zero required failures and category thresholds met.
- [ ] Public ecommerce CTA path is tested on the public site route, not only standalone ecommerce.
- [ ] Public docs teach `chat.applyMissionProfile()` as the primary path.
- [ ] Profiles no longer use empty executable tool placeholders.
- [ ] Admin, docs, and commerce demos all use Mission Profiles.
- [ ] Production readiness docs cover security, telemetry, approvals, model escalation, upgrades, and testing.
- [ ] Agent-readable docs (`llms.txt`, `llms-full.txt`, raw markdown) include the new profile and production guidance.
- [ ] `LOOP-STATUS.md` contains fresh evidence and no stale claims.

---

## Execution Notes

- Commit after each task unless the repo owner requests squashing.
- Prefer adding or strengthening harness scenarios before fixing a demo-specific symptom.
- Do not claim release readiness from deterministic scripted tests alone.
- Scripted modes are acceptable for CI only when clearly disclosed and paired with real-provider research runs.
- Do not add hardcoded demo fixes when the problem belongs in Edgekit core, the profile contract, or the harness.
