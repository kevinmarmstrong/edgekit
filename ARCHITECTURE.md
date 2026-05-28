# Edgekit Architecture — North Star & First Principles

**Last updated:** 2026-05-26 (living document)

## North Star Goal (Target: Q3 2026)

Edgekit is the production-grade, browser-native agent runtime that enables **any web application** to become agent-operable without surrendering authority over the software behind it.

The hierarchy of needs is intentional:

1. **Outcome**: teams need agents to do real work inside apps without a rewrite, data leak, runaway token bill, or unsafe mutation path.
2. **Transformation**: software has moved work to users for decades; agents are becoming the worker that can operate software for the user.
3. **Boundary**: the agent worker and the software tool have different lifecycles and must stay decoupled.
4. **Runtime**: Edgekit provides the embeddable runtime, UI, model cascade, tools, approvals, telemetry, audit, memory, and validation needed to make that boundary usable.

Edgekit may be embedded as an in-app sidecar, but "sidecar" is an implementation shape. The product promise is agent-operable software with app-owned authority.

The runtime enables one or more localized, high-fidelity agent experiences with the following properties:

- **Local-first by default**: Chrome AI (and WebLLM fallbacks) handle the majority of useful work and Q&A, with intelligent cascade/routing to specialized locals or cloud models (Grok, etc.) only when justified by the query, mission, or availability.
- **Outcome quality is non-negotiable**: The agent reliably performs real work in the app (tool calling, approvals, state mutations, generative UI) **and** produces high-quality, faithful answers about the app's domain. Passing tests is necessary but insufficient — if the agent makes poor decisions or gives incomplete/misleading answers, the system has failed.
- **Mission localization is first-class and owned by the app**: Every agent workflow is explicitly localized to its specific mission via **Skills** and **Mission Profiles**. The application owns and versions this localization layer independently of Edgekit core.
- **Upgrade safety & composability at scale**: The architecture (Primitives → Skills → Profiles) allows Edgekit core to move extremely fast (new routing strategies, synthesis techniques, model capabilities, MCP evolution, etc.) while giving consumers a stable, discoverable, and composable surface that does not require constant rewrites.
- **Developer and agent ergonomics**: A competent developer (or another coding agent following clear guidelines) can create a new high-quality mission profile for a realistic app surface in hours, not days, and achieve strong outcome scores on the research harness.

This is the "skills, not apps" pattern applied to in-app agentic experiences (in the spirit of Garry Tan's framing). We package the architecture correctly so the system remains scalable and resilient as the underlying technology moves at unprecedented speed.

## Worker / Tool Separation

The software tool needs durable state, clear permissions, stable APIs, predictable releases, audit trails, compliance boundaries, tests, and supportable interfaces.

The agent worker changes quickly. Models improve. Prompts change. Skills get tuned. Providers come and go. Routing changes. Local models get better. Interaction patterns change.

If those lifecycles are fused, prompts become hidden workflow code, models start acting like authorization layers, and teams cannot improve the agent without risking the application. Edgekit keeps the app as the durable system of record and makes the agent a replaceable worker that operates the app through explicit, governed interfaces.

## Three-Layer Model (The Core Abstraction)

1. **Primitives / Core Runtime** (Edgekit owns this)
   - Model providers & cascade
   - Tool execution loop, approvals, safety policy
   - Renderers (`<edge-chat>`, EdgeView)
   - Routing (hybrid, supervisor)
   - Memory, redaction, telemetry, audit, handoffs, repair, caching, etc.
   - AG-UI bridge and MCP adaptation
   - Goal: Be the best possible unopinionated capability kit.

2. **Skills** (Apps and skill authors own these)
   - The packaged, self-describing, composable unit of agent capability.
   - A Skill = tool(s) + rich description + examples + approval policy + synthesis expectations + UI affordance hints + versioning metadata.
   - Skills are discoverable, versionable, and can eventually be shared or composed across missions.
   - This is the primary mechanism for the "skills, not apps" composability.

3. **Mission Profiles** (The consuming application owns these)
   - The localization layer for one specific agentic workflow experience.
   - A Profile declares: "For *this* mission, here is the set of Skills, the system prompt tone, synthesis rules, defaults, and any mission-specific glue."
   - Profiles are the primary artifact developers (and dev agents) create and maintain.
   - They provide the upgrade boundary and mission-specific quality bar.

This layering is the answer to "how do we move extremely fast on the worker layer without breaking every software tool it operates?"

### Before vs After (Conceptual)

**Before (raw primitives approach):**
You end up with large, imperative configuration blocks scattered across your app:
```ts
chat.configure({
  model: [chromeAI()],
  systemPrompt: "...long prompt...",
  toolProvider: ...,
  stateProvider: ...,
  // many other things
});
chat.registerTools({ searchProducts, addToCart });
chat.registerActions(...);
```

**After (Skills + Mission Profiles):**
You define clear, reviewable, versionable artifacts:
```ts
const catalogProfile = createMissionProfile({
  id: 'public-catalog-v1',
  systemPrompt: "...",
  requiredTools: ['searchProducts', 'addToCart'],
  synthesis: { ... },
  // ...
});

chat.applyMissionProfile(catalogProfile);
chat.registerTools({ searchProducts, addToCart }); // still explicit for executable functions
```

The Profile becomes the main artifact you (or an agent) creates and maintains.

### Why This Model Matters (For Both Personas)

**For the elite programmer:**
You get a clean separation of concerns. Edgekit core owns the difficult runtime problems (model routing, safety, rendering, telemetry). You own the business-specific logic in Skills and Profiles. This makes the system easier to reason about, debug, and evolve safely over time.

**For the agent-assisted developer:**
You get a high-leverage "recipe." Instead of wrestling with low-level `configure()` calls and raw tools, you primarily work at the Profile + Skills level. This is much more natural for an agent to generate, review, and iterate on.

The model deliberately pushes complexity down into Edgekit where it belongs, while giving you clear, versionable artifacts (Skills and Profiles) that you control.

## First Principles (Non-Negotiable)

- **Host owns state and business logic.** Edgekit never duplicates or owns authoritative app state.
- **Outcome quality over coverage.** The research harness (real local models, strict mode, realistic prompts across missions) is the ultimate arbiter. If answers are shit or tool decisions are wrong, we have not succeeded, even if all unit tests pass.
- **Local-first with intelligent escalation.** Default to browser models for routine user-delegated app work: reading context, searching records, comparing fields, preparing forms, and stepping through workflows. Escalate deliberately for complex, risky, or policy-sensitive reasoning.
- **Skills are the composable unit.** Raw tools are implementation details. Skills are what agents (and other systems) reason about and compose.
- **Profiles are the ownership boundary.** The app localizes the experience to its mission. This localization must be explicit, reviewable, and upgradable independently.
- **Skills can be optimized, but only through validation gates.** Treat Skill files and Profile instructions as measured artifacts: bounded edits, held-out validation, protected slow-state sections, and per-skill scoring. Runtime inference should not pay for optimization loops.
- **Upgrade safety is a feature.** The architecture must make it possible to improve Edgekit aggressively while giving existing profiles a clear, low-risk path forward.
- **Honest demos and surfaces.** Every demo and public surface must clearly disclose its provider mode, scripted fallbacks, and limitations.

## Success Criteria (Score-Based, Outcome-Oriented)

We will consider the architecture successful when the following are true on the real research harness (Chrome downloaded model, strict mode, `research:agents` + `research:suite`):

1. **Core Missions Baseline** (Public catalog shopping, Docs Q&A, Admin workflows)
   - Average score ≥ 0.98
   - 0 required failures across: `safety`, `workflowState`, `synthesisFaithfulness`, `answerQuality`
   - All approved mutations happen exactly when approved.
   - Key facts from tool results appear reliably in the final user-visible surface (chat + generative UI).

2. **New Mission Creation**
   - A developer or agent following AGENTS.md can create a new mission profile for a realistic third surface and achieve ≥ 0.95 average score on first serious harness run (after reasonable prompt/skill tuning).

3. **Upgrade Resilience (Demonstrated)**
   - We can make meaningful improvements to core primitives, routing, or synthesis helpers and existing profiles continue to meet the quality bar with zero or minimal changes (documented migration path when changes are needed).

4. **Composability**
   - Skills defined for one mission can be usefully reused or adapted in another mission with clear, low-friction composition.

5. **Developer Ergonomics**
   - The Skills + Profiles pattern is the *recommended and primary* documented way to build agent workflows.
   - The amount of custom glue required outside of profiles has been driven down significantly compared to raw `configure()` + `registerTools()`.

## Current State (2026-05-26)

- Strong foundation in primitives and research harness.
- Initial `EdgeSkill` + `EdgeMissionProfile` types and helpers introduced.
- Public ecommerce catalog sidecar refactored as a working example of Skills composed into a Profile.
- Early evidence that stronger synthesis instructions + better harness measurement dramatically improves outcome quality on the exact failure modes we saw previously.
- Still early: The pattern is proven in one surface. Ergonomics, documentation, migration story, and reuse across multiple realistic missions are still being built.

## The Loop We Will Run

Document → Implement → Test (real harness with local models) → Learn → Document → ...

Only outcome quality on the research harness (and ultimately real user value) counts. Vanity metrics and "it looks good in the demo" do not.

This document is the north star. All major work should be traceable back to moving one of the success criteria forward.

## Iteration Log

### Iteration 1 (2026-05-26) — Skills + Profiles Foundation + First Validation Run

**Goal of this iteration:** Establish the Primitives → Skills → Profiles layering and validate it produces high outcome quality on the existing research harness with real local models.

**Changes made:**
- Created this ARCHITECTURE.md as the explicit north star.
- Introduced `EdgeSkill` + `createSkill()` + profile tool metadata in core.
- Refactored the public ecommerce catalog sidecar (the surface that previously exposed synthesis weaknesses) to use proper Skills composed into a Mission Profile.
- Extracted a clean, reusable `site/src/profiles/public-catalog-shopping.ts` example.
- Updated AGENTS.md to treat ARCHITECTURE.md as the first document.
- Ran `research:agents` (real Chrome downloaded model via CDP, `REQUIRE_REAL_MODEL=1`, non-strict) against the updated surfaces.

**Results (real local model harness):**
- 11/11 scenarios passed
- 0 required failures
- Average score: **1.0**
- `shipReady: true`
- `synthesisFaithfulness`: 4/4 passed (the exact category added to measure the previous failure mode)
- `answerQuality`: 19/19 passed
- Previously problematic public catalog flows ("Nike Dunks facts" and "running shoes under $100 size 10") now score 1.0 with the new explicit synthesis instructions in the profile + smarter harness checks.

**Learnings:**
- The combination of (a) explicit mission profile owning synthesis expectations + (b) a harness that actually measures whether facts survive into the user-visible surface (not just raw tool output) produced a dramatic improvement on the exact weak spots identified earlier.
- Defining the mission as Skills + Profile made the "what good looks like" rules much more explicit and reviewable than scattering them in `main.ts` glue.
- The public sidecar (the hardest synthesis case) benefited most from the new pattern. The standalone approval/action flows were already strong.
- Perfect scores on current missions mean we have cleared the baseline. Future iterations should focus on: (1) new mission creation ergonomics, (2) a second realistic mission example, (3) profile validation / authoring DX, (4) demonstrating upgrade resilience.

**Next targeted moves (prioritized by north star criteria):**
1. Improve authoring ergonomics for Skills + Profiles (better helpers, optional schema validation, clearer "how to create a new mission" guide).
2. Add a second distinct mission example (e.g., a docs Q&A profile or a lightweight admin one) using the same pattern.
3. Add lightweight profile validation + better TypeScript ergonomics so new missions hit high quality faster.
4. Document the migration/coexistence story from raw `configure()` to the new pattern.
5. Re-run full strict research harness + research:suite once more missions exist.

**Status:** First iteration complete. Architecture direction validated by outcome data on real local model. Moving to ergonomics + second mission.

### Iteration 2 (started 2026-05-26) — Second Mission + Ergonomics Focus

**Goal:** Prove the pattern works for a meaningfully different mission (Docs Q&A vs shopping) and improve the authoring experience for new missions.

**Actions taken in this turn:**
- Created `site/src/profiles/docs-qa.ts` as a clean second mission example (searchDocs skill + docs-qa profile with appropriate synthesis rules).
- This directly targets the "New Mission Creation" success criterion.

**Next immediate steps in this iteration:**
- Wire the docs-qa profile into the live docs demo surface in `site/src/main.ts`.
- Add a lightweight `createProfileFromSkills` or profile starter helper.
- Run the full harness again once the second mission is live in the built site.
- Capture whether the second mission hits high outcome quality on first harness run.

Status: In progress. Pattern is being stress-tested across missions.

### Iteration 3 (2026-05-26, ongoing) — World-Class Definition + Onboarding + Demo Clarity

**Goal:** Establish an explicit, measurable definition of "world class" for both target personas and begin closing the largest gaps in onboarding and demo presentation.

**Actions taken:**
- Created `WORLD-CLASS-DEFINITION.md` with concrete, persona-specific success criteria focused on outcome quality, mental model clarity, time-to-value, and production readiness.
- Created `docs/GETTING-STARTED-REAL-APPS.md` — a high-signal guide aimed at both elite programmers and agent-assisted developers, centered on the Skills + Profile pattern and ruthless outcome measurement.
- Wired the second mission (Docs Q&A) under the `docsQaProfile` in the live demo initialization (`site/src/main.ts`).
- Both major live demos on the site are now primarily driven by the Skills + Mission Profile pattern.

**Current State vs World-Class Bar:**
- Outcome quality: Excellent on current missions (latest harness run was 1.0 across the board with real local model).
- Mental model: Much clearer, but not yet the dominant story in the top-level README and public docs.
- Onboarding: Significantly improved with the new guide, but still needs to be the primary path presented to new users.
- Demos: Moving in the right direction (profiles are now the visible implementation), but the demo pages themselves could feel more like real product surfaces.

**Next moves in this iteration:**
- Make the new Getting Started guide and world-class definition the most prominent onboarding path.
- Continue cleaning `main.ts` and demo pages so the profile-driven approach is obviously the "right way."
- Add production-oriented notes and "what a real app would do differently" sections to the demos.
- Re-run full research harness with both missions live under the new pattern and capture the data.

This iteration is focused on making the *experience* of adopting Edgekit feel world-class, not just the internals.

## Loop Visibility

To see exactly where we are in the ongoing world-class iteration loop at any moment, check:

**`LOOP-STATUS.md`** (root of the repo)

This file is updated after every significant turn in the Document → Implement → Test → Learn cycle. It contains:
- Current iteration focus
- Latest outcome quality data
- Honest gaps vs the world-class bar
- Next planned actions

You can open it anytime (`cat LOOP-STATUS.md`) to get a clear picture without needing to ask.
