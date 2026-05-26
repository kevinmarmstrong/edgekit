# Getting Started — Building a Production-Grade Sidecar

This guide is for developers who want to ship a real, high-quality, localized agentic sidecar into a production application **today**.

It is written for two audiences:
- Elite programmers who want clarity and power
- Agent-assisted developers who want high leverage with strong guardrails

The goal: After following this guide, you (or your agent) should be able to create a sidecar that delivers excellent outcome quality on realistic tasks using local models by default.

---

## The Mental Model (Read This Once)

Edgekit is built in three layers:

1. **Primitives** (Edgekit core)
   - The runtime: model routing, tool execution, approvals, rendering, safety, telemetry, etc.
   - This layer moves fast. You should understand it at a high level but rarely touch it directly for most work.

2. **Skills** (`createSkill`)
   - The composable unit of capability.
   - A Skill packages a tool (or small set of tools) with everything an agent needs to use it well: description, examples, approval policy, synthesis expectations, and UI hints.
   - This is the "skills, not apps" abstraction.

3. **Mission Profiles** (`createMissionProfile`)
   - The localization layer that **you own**.
   - A Profile says: "For *this specific mission* in my app, here is the set of Skills, the tone, the synthesis rules, and any mission-specific behavior."
   - This is the primary artifact you create, version, review, and maintain.

**Rule of thumb**: 
- Use raw primitives when you are extending Edgekit itself.
- Create Skills when you want reusable, self-describing capabilities.
- Create a Mission Profile when you want to ship a real sidecar for a specific purpose in your product.

---

## Recommended Path (Fastest to High Quality)

If you want the fastest guided path, start with [30-Minute Production Sidecar](./30-MINUTE-PRODUCTION-SIDECAR.md). It uses the concrete support-workflow starter and ends with outcome scenarios.

If you want a coding agent or CLI scaffold to create the first files, use [Agent Adoption Kit](./AGENT-ADOPTION-KIT.md) and [Recipe Catalog](./RECIPE-CATALOG.md):

```bash
edgekit-init --list
edgekit-init mission --recipe support-workflow --out edgekit/support
edgekit-init mission --recipe astro-intake-knowledge --out src/edgekit/intake
```

### Step 1: Choose Your First Mission (Be Specific)

Do not start with "add an AI assistant to my app."

Start with something narrow and valuable, for example:
- "Product catalog search + guided add-to-cart with approvals for our public storefront"
- "Internal admin account lookup + plan changes behind approval gates"
- "Customer support Q&A over our help center + ticket creation"

Write down:
- What the agent should be able to *do*
- What questions it should answer well
- What must never happen without explicit approval

This becomes your Mission Profile.

### Step 2: Define Your Skills

For most missions you will need 2–5 Skills.

Example (catalog shopping):

```ts
const productSearchSkill = createSkill({
  id: 'product-search',
  name: 'Search Product Catalog',
  description: '...',
  tools: { searchProducts },
  policy: { needsApproval: false },
  synthesis: { requiredFacts: ['price', 'sizes', 'color'], preferredStyle: 'explicit' },
  uiAffordances: { preferActionCards: true },
});

const addToCartSkill = createSkill({ ... });
```

Key questions for each Skill:
- What facts must survive into the final answer or UI?
- What is the approval policy?
- How should results be rendered?

If the mission needs docs, policy, manuals, account history, graph relationships, or another changing knowledge base, make that a **Knowledge Access Skill** instead of stuffing the data into the prompt. Wrap your source with `EdgeKnowledgeSource`, expose it through `createKnowledgeTool()` or `createKnowledgeSkill()`, and return normalized results with citations and freshness metadata. The source can be Markdown, local embeddings, LlamaIndex, LangChain, Qdrant, pgvector, Pinecone, Weaviate, Neo4j GraphRAG, SQL, or a private API. Your app still owns indexing, authorization, reranking, freshness, and source permissions.

Copyable starters:
- `docs/templates/knowledge-skill-starter/simple-markdown-source.ts`
- `docs/templates/knowledge-skill-starter/knowledge-skill.ts`
- `docs/templates/knowledge-skill-starter/mission-profile.ts`
- `docs/templates/knowledge-skill-starter/harness-scenarios.json`

### Step 3: Create the Mission Profile

```ts
const myCatalogProfile = createMissionProfile({
  id: 'public-catalog-v1',
  mission: 'public-catalog-shopping',
  systemPrompt: `... strong instructions about synthesis and faithfulness ...`,
  requiredTools: ['searchProducts', 'addToCart'],
  defaults: { toolChoice: 'required', downloadPolicy: 'never' },
  synthesis: { requiredAttributes: [...], style: 'explicit' },
});
```

### Step 4: Mount and Configure the Sidecar

In your app:

```ts
const chat = document.querySelector('edge-chat#my-sidecar');
chat?.configure({
  model: [chromeAI()],
  telemetry,
  stateProvider,
  identityProvider,
});

chat?.applyMissionProfile(myCatalogProfile);
chat?.registerTools({ searchProducts, addToCart });
```

For public or mixed-browser surfaces, add a cascade readiness check before promising a full local agent experience:

```ts
const readiness = createCascadeReadinessController({
  providers: [chromeAI()],
  downloadPolicy: 'never',
  fallback: true,
  requiredCapabilities: ['tools', 'approvals', 'edgeview'],
  requiredTools: ['searchProducts', 'addToCart'],
  tools: { searchProducts, addToCart },
  visibilityPolicy: 'show-basic-when-local-unavailable',
})

chat?.configure({
  cascadeReadiness: readiness,
  onNoModel: ({ input, readiness }) =>
    `${readiness?.message}\n\n${answerWithBasicCatalogMode(input)}`,
})

void readiness.check()
```

Render the readiness snapshot however your product wants: onboarding wizard, settings panel, banner, disabled CTA, or hidden agent surface. The optional `<edge-cascade-wizard>` component is only the demo UI.

### Step 5: Test With Real Outcome Quality

Use (or copy) the research harness approach:
- Define realistic prompts for your mission.
- Measure not just "did it call tools" but whether the final user-visible result is high quality (correct facts surfaced, correct decisions made, safety respected).

Do not declare victory until your sidecar scores highly on your own version of the research harness with real local models.

---

## Production Checklist (Before Shipping)

- [ ] All risky actions are behind explicit approval with clear messaging.
- [ ] Synthesis expectations are explicit in the Profile and enforced in testing.
- [ ] Good telemetry is wired (runs, tool calls, approvals, model status, errors).
- [ ] Error boundaries and graceful degradation are in place.
- [ ] You have a way to measure outcome quality over time (your own harness or equivalent).
- [ ] You have thought about (and documented) when this sidecar should escalate to a stronger model.
- [ ] The Profile is versioned and reviewable.

---

## Recommended Starting Point in This Repo

Look at these files for the current best examples:

- `site/src/profiles/public-catalog-shopping.ts`
- `site/src/profiles/docs-qa.ts`
- `site/src/main.ts` (how the profiles are applied)
- `ARCHITECTURE.md` (deeper rationale)
- `AGENTS.md` (how to work on this codebase with agents)

The public demos on the site are built using the exact pattern described above.

For a copyable scaffold, start from:

- `docs/templates/mission-profile-starter/profile.ts`
- `docs/templates/mission-profile-starter/harness-scenarios.json`

That starter is intentionally concrete: support case search plus approval-gated ticket creation. Rename the mission and replace the tool `execute` functions with your app APIs rather than starting from an empty template.

---

Start narrow. Define Skills and a Profile explicitly. Measure outcome quality ruthlessly with real local models. This path produces sidecars that elite programmers respect and that agent-assisted developers can ship with high confidence.
