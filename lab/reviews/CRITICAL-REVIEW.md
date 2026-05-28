# edgekit — Critical Review

**Reviewers:** Market/PMF critic, Staff-engineer architecture critic, Marketing/landing-page critic, Product/roadmap critic.
**Date:** 2026-05-28
**Verdict (one line):** A promising technical instinct that is being smothered by scope sprawl, doc thrash, and an overreach into "platform" vocabulary the project hasn't earned. Salvageable, but only with a 70–80% cut.

---

## 0. TL;DR

edgekit is a thoughtful instinct — *browser-first inference for app-embedded agents* — wrapped around a competent technical spike, then buried under six months of accretion that violates almost every rule the project wrote for itself in DESIGN.md.

The team's own GAP-ANALYSIS.md already names most of the symptoms. This review names the disease: **the project is generating planning artifacts (40+ markdown docs, world-class definitions, gap analyses, loop-status dashboards, mission-control frameworks) faster than it is generating adopters, and the code has grown to look like the planning docs — a 3,771-line core with 164 exports masquerading as "small composable primitives."**

The four critical lanes converged independently on the same diagnosis:

- **Market:** The technical wedge (browser-first cascade) is correct but small, undefended, and 6–12 months from being subsumed by Vercel AI SDK, CopilotKit, or the model vendors. The invented vocabulary ("agent-operable software," "Mission Profiles") is making the project sound smaller than it is.
- **Architecture:** The DESIGN.md mandate of "use don't build, <500 LOC core, <2,000 LOC total" has been blown out 7.5×. The core is now a god-module re-implementing things the AI SDK already does — exactly the v1/v2 failure mode DESIGN.md warned against.
- **Marketing:** The hero buries the lede, the visual contradicts the brand's own banned vocabulary, the page has zero proof, and the CTAs are three "read more" doors. A skeptical developer bounces in 30 seconds.
- **Product:** Wedge clarity has been lost — DESIGN.md, ARCHITECTURE.md, README.md, and MARKETING-BRIEF.md each pitch a different product. Seven demos for v0.1.0 (several scripted). Roadmap is aimed at users that do not exist yet.

**Should you keep working on this?** Yes — but as a much smaller, sharper project. **Don't kill it; kill the scope.** Concrete cut/keep list at the end.

---

## 1. The big finding

The project is fighting itself.

DESIGN.md (May 23) wrote what is, frankly, an unusually well-considered constitution: three packages, <500 LOC core, "use don't build," test the product not the internals, the wedge is the two-line embed and the ecommerce demo. It even named the exact bugs it didn't want to recreate from v1/v2.

ARCHITECTURE.md (May 26) — three days later — quietly replaced that constitution with a different one: "production-grade browser-native agent runtime that enables any web application to become agent-operable... Primitives → Skills → Mission Profiles." The wedge shifted from "ship a button" to "ship a governance platform."

The README, MARKETING-BRIEF, and live site now pitch yet other framings ("agent worker / software tool separation," "local-first, privacy-first agent runtime," "agentic workflows without a rewrite"). All thoughtful. None aligned.

Every other problem in this review descends from this one. The scope creep, the doc thrash, the abstraction sprawl, the seven demos, the missing wedge in the hero — they are all what happens when a 0.1 product is told to be a 1.0 platform.

**The single most useful action you could take this week is to pin DESIGN.md back as the constitution, treat ARCHITECTURE.md as a lab branch, and delete the rest.**

---

## 2. Market & positioning critique

### 2.1 The addressable market is smaller than the pitch implies

The required intersection of constraints to be edgekit's user:

1. Team adding agents to an existing web app — **large pool, growing fast.**
2. AND willing to commit to Chromium users (and increasingly OK with Safari 26 / Firefox 145 WebGPU) — **acceptable today.**
3. AND OK with 1–2GB WebLLM downloads or Nano's "writing assistance"–grade tool calling — **this is the killer.**
4. AND doesn't already have a working cloud-LLM agent stack — **eliminates most active buyers.**

The realistic ICP after that intersection is internal tools, privacy-sensitive verticals (legal/health intake), Chromebook-fleet ed-tech, embedded kiosk apps, and cost-sensitive indie SaaS. That's a few thousand teams worldwide. It can sustain an OSS project. It cannot sustain "the runtime for agent-operable software."

The "costs nothing per user" pitch is also fighting macro: cloud inference is *getting cheaper* and is currently subsidized. The breakeven for going on-device is at millions-of-tokens-per-day scale — exactly the cohort that won't trust a visitor's browser.

### 2.2 The competitive map is brutal

- **Vercel AI SDK v6** is the orchestration layer edgekit sits on top of. They can add `providers: [chromeAI(), webLLM(), openai()]` first-match cascade in a sprint.
- **CopilotKit** raised $27M in May 2026 with Fortune-500 logos and owns the AG-UI protocol — the direct positional competitor for "drop an agent into your app." They've won that lane.
- **assistant-ui** (YC W25, 50k+ monthly downloads) owns the "headless React components for agent chat" lane.
- **Microsoft Magentic-UI / MagenticLite** ships the *exact* on-device-orchestrator + remote-execution paradigm edgekit pitches, with a research lab and brand behind it. The DESIGN.md openly says edgekit "adopts patterns" from Magentic-UI.
- **WebLLM** itself has 17k+ stars and an OpenAI-compatible API with built-in tool calling. A developer reading edgekit's docs and clicking one link reaches WebLLM and skips the wrapper.
- **`@browser-ai/built-in-ai`** (the package edgekit depends on) already does seamless Chrome AI → server fallback. Half the cascade exists one layer down.
- **WebMCP origin trial in Chrome 149** standardizes "tool registration" at the *browser* level. If WebMCP ships, "register tools" becomes a `<meta>` tag, not an npm install.
- **Anthropic Claude Skills + Claude Agent SDK** is the industry-standard term for the org pattern edgekit re-uses for a different thing. The vocabulary collision is active confusion.

### 2.3 Vocabulary thrash is doing negative work

"Agent-operable software," "Skills + Mission Profiles," "agent worker vs software tool" — none of this language exists outside the edgekit repo. "Skills" already has a different, well-documented meaning at Anthropic. "Agentic" is the industry term; "agent-operable" loses to it. The novel vocabulary makes edgekit look like a project written without reading the room — which it isn't, but the page reads that way.

### 2.4 Defensibility is effectively zero

The technical moat is ~200 lines of cascade logic wrapping libraries the team doesn't control. Head start: 3–6 months on niche packaging. No data network effects, no proprietary model, no community lock-in, no enterprise contracts, no protocol ownership.

### 2.5 Adoption physics

First 100 users from a Show HN: plausible. First 1,000 production users: very hard, because the buyer journey for "add an agent to my web app" today lands at Vercel AI SDK, CopilotKit, assistant-ui, or the model vendor's own SDK. None of those routes lead to edgekit.

**The honest go-to-market would be to pick one vertical where on-device actually matters (HIPAA-adjacent intake, EU privacy flows, offline PWAs, education on Chromebooks) and become the drop-in for that.** Generic "browser-native agent runtime" loses to incumbents.

### 2.6 Market verdict

**Mid wedge, trending toward non-existent.** Without a hard pivot (verticalize, narrow framing, drop the platform vocabulary, contribute the cascade upstream to `ai` instead of competing with it), the most likely outcome is a respectable few-hundred-star OSS project that gets cited in 2026 listicles, gets a flurry of attention when Vercel ships the same cascade natively, then goes quiet. **Abandonware within 12–18 months is the base case.**

---

## 3. Architecture & technical-bet critique

### 3.1 "Use, don't build" — violated, repeatedly

DESIGN.md was emphatic: do not hand-roll orchestration, tool loops, streaming, model adapters, message formatting, or event buses. The current `packages/core/src/index.ts` violates every clause:

- **Custom orchestrator around `streamText`.** A hand-rolled `while (true)` loop wrapping `aiStreamText`, switching on part types (`text-delta`, `tool-call`, `tool-result`, `tool-approval-request`, `error`), injecting telemetry, audit, redaction, repair, activity events, and cache writes between every step. This is not "thin packaging"; it is a parallel event bus.
- **Custom message/history management.** The file mutates its own `ModelMessage[]` from at least six sites (`messages.push` lines 1534, 1541, 2501, 2702, 2732, 2770), splices `repairMessages`, redacts response messages, and synthesizes synthetic `tool-approval-response` envelopes with `as unknown as ModelMessage` casts. This is the exact "system prompt handling wrong twice" failure mode DESIGN.md called out as Mistake #1.
- **Custom tool-repair loop** re-implementing AI SDK v6's `experimental_repairToolCall`.
- **Custom response cache layer** wedged into the loop, with two implementations (`createMemoryResponseCache`, `createIndexedDbResponseCache`), short-circuiting AI SDK before/after `streamText` and synthesizing fake assistant messages into history.
- **Hand-rolled AG-UI SSE parser** with manual `TextDecoder`, `buffer.split(/\r?\n/)`, line parsing — when `@ag-ui/client` exists and is namechecked in the README.
- **Custom routers** (`createHybridModelRouter`, `createSupervisorRouter`) layered on top of AI SDK provider selection.
- **Custom mutation journals (×2), audit hash chain, PII redactor, cascade-readiness state machine** — all hand-built.

The DESIGN.md Mistake #1 was literally "hand-rolled orchestrator … ~2,000 lines … tool calling had bugs, event bus added complexity with no value." **The team rebuilt the same thing.**

### 3.2 The single-file core problem

- `packages/core/src/index.ts`: **3,771 lines** (mandate: <500 — **7.5× overshoot**)
- Total TS source across packages: **~5,737 LOC** (mandate: <2,000 total)
- **164 exported symbols** from one file. No public API fits in a person's head.
- **Two unit tests** for the entire core (`agent.test.ts`, `profile.test.ts`).
- Tree-shaking is effectively dead — every consumer pulls the import surface for MCP loaders, IndexedDB cache, audit trails, supervisor router, AG-UI SSE parser whether they want them or not.
- The "modular and swappable" claim from CLAUDE.md is contradicted by the bundle reality. The orchestrator IS `createAgent` IS the file — you cannot swap it.

### 3.3 The Chrome AI / WebLLM bet, honestly

The thesis is "browser-first by default; cloud is escalation." Mid-2026 reality:

- **Chrome AI / Gemini Nano:** Chromium-only, 4+ GB model, ~22 GB recommended free disk, ~41% Chrome-install eligibility per published field data, ~6× slower than equivalent cloud calls, tool-calling reliability of a 2–3B parameter model is not Sonnet-class. The model is currently positioned by Chrome as "writing assistance" — not agent-grade orchestration.
- **WebLLM:** Requires WebGPU. 1–2 GB download per visitor. **Requires COOP/COEP headers, which GitHub Pages doesn't supply** — the README admits this and points to Cloudflare/Vercel. The official live demo therefore isn't running the headline path it's selling.
- **The spike's own data:** Chrome AI was in "downloading" state requiring a user gesture and fell back automatically. The "instant zero-download" path is the marketing story; in practice the cascade falls through. The 0.5B model "called the right tool but didn't decompose parameters well."

Realistic addressable surface for the "instant agent" promise: optimistically **15–25% of visitors** (Chrome desktop, Nano pre-warmed, eligible hardware, COOP/COEP-served origin). Everyone else lands on: (a) a 1–2 GB download prompt most users decline, (b) the cloud provider the developer was supposed to avoid configuring, or (c) the "search-only mode" that has no agent in it.

The cascade is a beautiful diagram. For most visitors today it is a fall-through.

### 3.4 Abstraction sprawl as god-module

The README catalogs 25+ "scalable integration primitives" — Mission Profiles, Skills, Knowledge Sources, Knowledge Tools, Knowledge Skills, Memory Stores, Memory Compaction, Mutation Journals (×2), Response Caches (×2), Audit Trails, Mission Control, RBAC, Identity Providers, State Providers, Session Providers, Tool Manifests, Tool Providers, Tool Repair, Tool Policy Executors, Parallel Tool Executors, Supervisor Router, Hybrid Router, Cascade Readiness Controller, MCP Loader, AG-UI Bridge, Handoff Envelopes, EdgeView Nodes, Action Registration, Redactors, Telemetry, Activity Events.

GAP-ANALYSIS.md frankly notes "some Skills/Profile fields are currently authoring contracts, not runtime-enforced guarantees." Translation: **the abstractions are typed surface area that the runtime does not actually enforce.** That's the worst kind of abstraction — looks like a contract, costs maintenance, gives no guarantees.

### 3.5 Test/proof credibility

The "research harness" the README promotes (`research:suite`, `research:agents`, "average score 1.0", "shipReady: true") is regex assertions Playwright runs against rendered demo text — the prompts, the demo data, and the regex checks were all written by the same person. "Score" = `passed / total` over a fixed scenario list. There is no LLM judge (which would be more rigorous than this), no randomized prompts, no external evaluator.

**This is the exact failure mode DESIGN.md Mistake #4 called out:** "Built a 79-question retrieval quality test battery. It passed at 100%. The live site was returning garbled content." The current harness is a more elaborate version of the same mistake. "Ship-ready, 1.0 average" is not a credible claim off a self-graded regex suite — and a tech-due-diligence reviewer would flag it immediately.

### 3.6 Modularity claim vs reality

Provider wrappers (`chromeAI()`, `webLLM()`) are genuinely swappable — that part is right. Caches are too. Everything else (orchestrator, history, UI, EdgeView renderer, profile schema) is not — the trunk is welded.

### 3.7 Bus factor

Solo maintainer; 5,700 LOC source; 36 docs; 9 research/eval scripts (~6,600 LOC of mjs); 7 demos; 4 packages; CLI; Pages site; Cloudflare deploy. What breaks first when the maintainer takes a vacation: AI SDK v7 lands (hand-rolled orchestrator is welded to v6 internals); model registry changes (hardcoded IDs); 36 cross-referenced strategy docs go stale immediately.

### 3.8 Architecture verdict

Would a senior engineer ship this in production at a serious company today? **No.** What it is: an ambitious, thoughtful prototype demonstrating an interesting bet, by an author who understood the failure modes (they wrote them down in DESIGN.md) and then walked into every one of them again. What it is not: a small, focused integration on Vercel AI SDK that an outside team can adopt safely.

---

## 4. Marketing & landing-page critique

### 4.1 Hero buries the lede

> "Add an agent to your app without handing every interaction to a cloud meter."

This doesn't land in 2 seconds. "Cloud meter" is clever-coded language that requires the reader to parse a metaphor and infer that it means token billing. A developer scanning at 800ms doesn't get there. The marketing brief's own message — "Add agentic workflows to your app without rewriting the software behind them" — is a sharper *product* promise (don't rewrite your app). The live H1 chose a *cost* metaphor instead.

The subhead is worse: six clauses joined by semicolons. "Run Chrome AI, WebLLM, and app-tuned local models first; call your existing APIs as tools; keep sensitive context close to the user; and route to cloud workers only when a workflow actually needs it." That's a feature list pretending to be a value prop.

The kicker — "local-first, privacy-first agent runtime" — is architecture language at the top of the page. The brief explicitly says **"Do not start with architecture language."** Self-inflicted violation.

### 4.2 The visual contradicts the brand's own banned vocabulary

The hero mockup is literally labeled **"edgekit sidecar"** with an "Existing app" box beside it. The marketing brief lists "sidecar as the main pitch" under language to avoid in top-level marketing — and here it is rendered as the hero visual, the first concrete word a visual learner reads. The prose mostly avoids "sidecar" up high; the picture leans into it.

The visual is also static. It's a wireframe of a placeholder chat with "find running shoes under $100 → searchProducts() → approval required: addToCart()". A 6-second GIF of the *actual* ecommerce demo would do 10× the work this wireframe does.

### 4.3 The 8-problem matrix is a wall of abstractions

Eight stacked "Problem / edgekit" cards with no hierarchy, no priority, no progressive disclosure. Reads like a Gartner quadrant.

Per-card honesty:

- **"Token costs become an open-ended liability"** — real, sharp, would resonate with anyone burned by an OpenAI bill. Should be #1 visually; the only card with visceral fear in it.
- **"Sensitive app context crosses the wrong boundary"** — real but bureaucratic. Rewrite: "Your users' data ends up in someone else's logs."
- **"The agent ignores the app you already built"** — strong concept, anemic copy. This is the actual thesis of the project, hidden in card #3 with Confluence-page energy.
- **"One model does not fit every workflow"** — generic; every AI vendor says this.
- **"Slow orchestration"** — solution copy ("parallel-safe read tools, semantic response caching") sounds like a roadmap, not a benefit.
- **"Network drops break cloud-only agents"** — niche; save for a vertical page.
- **"Autonomous mutations need trust and evidence"** — good. The phrase **"invisible model side effects"** is the sharpest line on the entire page. Promote it.
- **"Dynamic tools expand the attack surface"** — security-team language; won't move a product engineer.

**Cut to 3 problems. Lead with the one that bleeds (cost), then authority, then guarded mutations.**

### 4.4 CTAs: three doors, no path

"Read the docs" / "Agent docs" / "Try live demos." All three are "go read more." None says "try it now." Missing:

- A copy-paste embed snippet above the fold.
- A "60-second quickstart" CTA with a code block.
- A "Star on GitHub" button with a live count — free social proof.
- A "watch the 90s demo" thumbnail.

Three "read more" buttons in a row is decision paralysis.

### 4.5 Proof gap: zero

No star count, no "used by," no testimonial, no benchmark number ("3.2s first token on M1"), no Loom from the maintainer, no contributor count. For a v0.1.0 solo project you have to overcompensate — a skeptical reader currently has nothing to anchor trust to.

### 4.6 "Agent docs" as a hero CTA is the wrong call

Featuring `llms.txt` as a top-3 hero CTA in May 2026 talks to the wrong audience. The brief named humans first; coding agents were listed last for a reason. Demote to footer.

### 4.7 Voice is written for retrieval, not humans

Noun stacks ("agent-operable workflow layer," "implementation surface," "deeper primitives," "identity-aware tool hydration"). Passive/impersonal constructions throughout. **Zero numbers anywhere** — no latency, no cost, no model size, no bundle size, no demo count, no star count. "Jump into the docs for the implementation surface" is nobody's actual sentence.

### 4.8 Banned-words check

- **"sidecar"** as a noun in the hero visual: **VIOLATED.**
- "robust", "seamless", "unlock", "leverage", "magic": clean — good discipline.
- "AI copilot for everything": absent.

### 4.9 Compared to peers

Vercel AI SDK opens with a code block and `npm i ai`. CopilotKit has a working chat widget on the landing page itself. LangChain.js has logo wall + "1M weekly downloads" badge. Resend / Inngest / Trigger.dev all show code snippets above the fold, animated terminals, logos, and a single dominant CTA. edgekit has prose where peers have artifacts.

### 4.10 30-second cold-arrival test

A product engineer lands, reads "cloud meter" (pauses — what?), looks at a wireframe labeled "sidecar" (so it's another chat widget?), scans 8 dense cards, sees no code, no GIF, no stars, no "used by." They click **GitHub**, not the docs, to validate the project themselves. The landing page didn't earn the docs click.

### 4.11 Five rewrites to ship Monday

**1) Rewrite the hero around the brief's actual message:**

> **H1:** Add an AI agent to your existing app. Don't rewrite the app.
> **Sub:** Two lines of HTML. The agent runs in the user's browser, calls your existing APIs as tools, and falls back to the cloud only when it has to. Open source, MIT.

Concrete, second-person, no metaphors, no "sidecar," no semicolons.

**2) Replace the wireframe with a 6-second autoplaying GIF** of the live ecommerce demo. Caption: "Running in Chrome. 0 cloud calls. Source below." Kill the "edgekit sidecar" label entirely.

**3) Put the embed snippet above the fold.** Four lines of `<edge-chat>` + one tool registration. Make it copyable. This single change moves the page from "marketing site" to "developer tool."

**4) Collapse 8 problems to 3, with numbers:**
- Stop metering every keystroke (cost — show a $/MAU comparison)
- Your app is still the authority (architecture — show the host-app-calls-tool flow)
- Mutations require approval, not vibes (trust — show the approval modal)

**5) Replace the CTA row:**
- Primary: **"Quickstart (60 seconds)"** → quickstart anchor
- Secondary: **"Star on GitHub (★ live count)"**
- Tertiary text link: "Watch the 90s demo"

Move "Agent docs / llms.txt" to the footer.

---

## 5. Product & roadmap critique

### 5.1 Wedge clarity has been lost

DESIGN.md pitched: "Drop an AI agent into any web app with two lines of HTML."
ARCHITECTURE.md pitched: "Production-grade browser-native agent runtime that enables any web application to become agent-operable."
README pitched: "Add agents to existing web apps without rewriting the software behind them."
MARKETING-BRIEF banned "sidecar" — which is the package's own product visual.

These cannot all be the wedge. For an OSS infra project trying to attract first 20 real adopters, this is a fatal marketing problem.

### 5.2 Scope creep audit

DESIGN.md scope: 3 packages, e-commerce demo + docs-chat, single RAG skill, basic cascade, <500 LOC core, <2,000 LOC total.

Today: 4 packages, 7 demos, 25+ "scalable primitives," 3,771-LOC core, 5,737-LOC source, 36 docs.

Categorizing the additions:

**Keep (valuable enabling primitives):**
- `chromeAI()` / `webLLM()` providers, model cascade, `downloadPolicy`
- `registerTools()` (re-export `tool`), `needsApproval`, approval UI
- `<edge-chat>` web component, `registerActions()` for action cards
- `telemetry` callback, basic `identityProvider` / `stateProvider`
- `toolRepair` (tiny, high-ROI)

**Cut (speculative concept-creep):**
- `createSupervisorRouter()` — multi-agent without a user asking
- `createHandoffEnvelope()` — solves a problem no v0.1 user has
- `createMissionControl()` — invented vocabulary for "an array of telemetry events"
- `createAuditTrail()` with hash chain — compliance theater at v0.1
- Skill optimization (SkillOpt paper citation in a 0.1 README is a tell)
- `executeParallelTools()`, response caches (×2), offline mutation journal + sync
- Cloudflare proof, AG-UI scripted-mock bridge, MCP loader as first-class items

**Defer (demo-driven features added before validation):**
- 5+ extra demos beyond ecommerce/docs
- Three names for the same RAG concept (`createKnowledgeSkill` / `EdgeKnowledgeSource` / `createKnowledgeTool`)

### 5.3 Documentation thrash

13 root + 23 in `/docs` = **36 docs supporting 5,700 LOC of source.** The signal is not "thorough"; it's *planning as a substitute for shipping.* Specifically:

- Three overlapping definitions-of-done: `WORLD-CLASS-DEFINITION.md`, `WORLD-CLASS-EXECUTION-PLAN.md`, `docs/WORLD-CLASS-READINESS-ANALYSIS.md`.
- Three overlapping positioning docs: `MARKETING-BRIEF.md`, `CONTENT-STRATEGY.md`, `docs/AGENT-OPERATED-SOFTWARE-THESIS.md`.
- `LOOP-STATUS.md` is a self-graded status dashboard.
- `GAP-ANALYSIS.md`, `docs/ADOPTER-SIMULATION.md`, `docs/CLEAN-ROOM-ADOPTION-PROOF.md`, `docs/CLOUDFLARE-ARCHITECTURE-PROOF.md` are simulations and self-tests being held up as "proof."

The author is running an entire shadow QA org against their own repo. A real OSS infra project gets this analysis from a Hacker News comment thread, not from generating it internally.

### 5.4 DX honesty: time-to-first-agent

The README directs new developers to read **seven documents** before writing code (Marketing Brief, Agent-Operated Software Thesis, 30-Minute Workflow, Getting Started For Real Apps, Recipe Catalog, Production Recipes, Runtime Guarantees). Then to wire up `chat.configure({...})` they need to learn: Mission Profile, Skill, `registerTools`, `registerActions`, `toolProvider`, `identityProvider`, `stateProvider`, `sessionProvider`, `redactors`, `responseCache`, `cachePolicy`, `memory`, `memoryCompaction`, `toolRepair`, `auditTrail`, `telemetry`, `downloadPolicy`, `toolChoice`, cascade providers.

Honest time-to-first-agent for a cold reader: **2–4 hours**, not 5 minutes. The "two lines of HTML" promise is broken.

### 5.5 The Skills + Mission Profiles reframe is premature

ARCHITECTURE.md introduces this three days after DESIGN.md was approved. The "before/after" example in that doc shows the "after" still calling `registerTools` — the Profile is a config object with a name. **This is renaming a config block "Profile" and calling it an architecture.** The justification ("Edgekit core can move extremely fast on routing, synthesis, model capabilities, MCP evolution") is solving a maintenance problem that a project with zero adopters has not yet earned.

### 5.6 Seven demos is over-investment

GAP-ANALYSIS.md admits some demos are scripted mocks (AG-UI, parts of the cascade lab). A scripted demo on a project whose wedge is "real agents in real browsers" is *negative signal* — visitors will smell it. **One flagship demo (ecommerce, real model, real tools, no script) is worth more than seven that include mocks.**

### 5.7 Roadmap is pointed at users who don't exist yet

README roadmap: Vue/Svelte wrappers, browser worker adapter, `@edgekit/yjs`, `@edgekit/automerge`, WASM tool adapter. GAP-ANALYSIS.md's own admission: **"External Adopter Proof — Not yet proven — Large — Critical."** The roadmap is adding CRDT collaboration adapters before a single external human has installed the npm package. Vue/Svelte wrappers are useful when the React wrapper has users. It doesn't yet.

### 5.8 The AI-doc-slop tell

The doc voice across `WORLD-CLASS-DEFINITION.md`, `GAP-ANALYSIS.md`, and `AGENT-OPERATED-SOFTWARE-THESIS.md` is consistent: balanced clauses, no contractions, parallel structure, a fondness for "non-negotiable" and "world-class." This reads as polished LLM output structured around bullet-point frameworks, not as a person discovering things by building. Compare to DESIGN.md's "Mistake 5" paragraph — that one has skin in the game in a way the later docs do not.

For OSS adopters this matters because developers smell AI-doc-slop in 5 seconds and bounce. The polished surface signals "nobody actually used this hard enough to be frustrated by it yet."

---

## 6. The unified prescription

The four reviewers independently converged on the same recommendation: **delete most of the surface, pin DESIGN.md as the constitution, ship one flagship demo to 10 real users, let their friction define v0.2.**

Specifically:

### P0 — this week

1. **Restore DESIGN.md as the source of truth.** Move ARCHITECTURE.md, WORLD-CLASS-*, LOOP-STATUS.md, GAP-ANALYSIS.md, CONTENT-STRATEGY.md to a `lab/` branch or delete.
2. **Rewrite the README to ~120 lines** that answer: what is it, the 2-line embed, the one flagship demo link, when not to use it. Cut every primitive listing.
3. **Rewrite the landing page hero.** New H1 ("Add an AI agent to your existing app. Don't rewrite the app."), embed snippet above the fold, real demo GIF, 3-problem matrix, "Quickstart 60s" CTA, GitHub star button with live count. Kill the "sidecar" label in the visual.
4. **Cut the demo set from 7 to 1** (ecommerce, real model, real tools, no scripts) + 1 optional docs-Q&A. Delete or move the rest.
5. **Add honest cascade math** to the README: "~20% of visitors get the instant path today; everyone else sees a download prompt or basic mode." Stop overselling.

### P1 — this month

6. **Surgically delete ~70% of `packages/core/src/index.ts`.** Target <800 LOC. Cut: Mission Profiles, Skills, Knowledge Sources/Tools/Skills, supervisor/hybrid routers, mission control, audit trails, mutation journals (×2), response caches (×2), parallel tool executor, MCP loader, AG-UI bridge, handoff envelopes, cascade readiness controller, memory compaction. Keep: `createAgent`, providers, tool registration, approval, telemetry callback, identity/state providers, tool repair, EdgeView render primitives.
7. **Stop hand-rolling around AI SDK.** Use `experimental_repairToolCall`, `experimental_prepareStep`, `@ag-ui/client` (if AG-UI returns), and AI SDK's own history management. Every `messages.push` site in `createAgent` is a future bug.
8. **Split the core into real submodules** so consumers can tree-shake. The single-file pattern is incompatible with the "modular and swappable" claim.
9. **Replace the regex "research suite" with outside-in tests** — randomized prompts the maintainer didn't write, an LLM judge for output quality, and a single honest provider-matrix table with real numbers. The "1.0 average" claim is not currently credible.

### P2 — the next quarter

10. **Pick a vertical.** Generic "browser-native agent runtime" will lose to Vercel and CopilotKit. Pick one of: EU/HIPAA intake forms, education on Chromebooks, offline-first PWAs, embedded kiosk apps. Build the flagship demo *for that vertical*. Become *the* drop-in for one place; ignore everything else.
11. **Or contribute the cascade upstream.** If the goal is impact rather than ownership, "browser-first provider cascade for AI SDK" is a 200-line PR to `ai`. That ships the idea to millions of users and frees you to build something only you can build.
12. **Drop the invented vocabulary.** Re-adopt industry terms: agents, tools, skills (in the Anthropic sense), MCP, AG-UI. Position edgekit as a *companion* to those, not a replacement.

---

## 7. Concrete cut/keep list

### Cut from public surface (delete or move to `lab/`)

**Root strategy docs:**
- `WORLD-CLASS-DEFINITION.md`, `WORLD-CLASS-EXECUTION-PLAN.md`
- `LOOP-STATUS.md`, `GAP-ANALYSIS.md`, `CONTENT-STRATEGY.md`, `MODEL_EVALS.md`

**`/docs` files:**
- `WORLD-CLASS-READINESS-ANALYSIS.md`, `AGENT-OPERATED-SOFTWARE-THESIS.md`
- `ADOPTER-SIMULATION.md`, `CLEAN-ROOM-ADOPTION-PROOF.md`, `CLOUDFLARE-ARCHITECTURE-PROOF.md`
- `DISTRIBUTION-READINESS.md`, `REPRODUCIBILITY.md`, `SKILL-OPTIMIZATION.md`
- `MISSION-PROFILE-AUTHORING.md`, `RECIPE-CATALOG.md`, `PRODUCTION-RECIPES.md`
- `RUNTIME-GUARANTEES.md`, `MIGRATION-AND-UPGRADES.md`, `SECURITY-THREAT-MODEL.md`
- `30-MINUTE-PRODUCTION-SIDECAR.md` (until you have a real one)
- `AGENT-ADOPTION-KIT.md`, `DEMO-STRATEGY.md`, `KNOWLEDGE-ACCESS.md`, `RETRIEVAL-RECIPES.md`
- `TESTING-OUTCOME-QUALITY.md`, `PRODUCTION-READINESS.md`, `recipes/`

**Code in `packages/core/src/index.ts`:**
- `createMissionProfile`, `createSkill`, `applyMissionProfile`, `EdgeSkill`, `EdgeMissionProfile`
- `createSupervisorRouter`, `createHybridModelRouter`
- `createHandoffEnvelope`, `createMissionControl`, `createAuditTrail`
- `executeParallelTools`, `createMemoryResponseCache`, `createIndexedDbResponseCache`
- `createOfflineTool`, `createMemoryMutationJournal`, `createLocalStorageMutationJournal`, `syncMutationJournal`
- `createPiiRedactor`, `mcpToolsFromDefinitions`, `loadMcpTools`
- `createKnowledgeTool`, `createKnowledgeSkill`, `EdgeKnowledgeSource`
- `createAgUiAgent` (until backed by a real endpoint)
- `toolManifests`, `filterToolManifestsForSession`, `withToolContext`
- `createCascadeReadinessController`
- `createMarkdownMemoryStore` + memory compaction

**Demos:** `adminDemo`, `cascadeDemo`, `opsDemo`, `siteAssistant`, AG-UI mock, mission-control. Keep `ecommerce`, optionally `docs`.

**Examples:** `examples/cloudflare-sidecar`.

### Keep (this is v0.1)

- `packages/core`: `createAgent`, `chromeAI()`, `webLLM()`, model cascade with `downloadPolicy`, `registerTools` (re-export `tool`), `needsApproval`, `telemetry` callback, basic `identityProvider` / `stateProvider`, `toolRepair`. Target: <800 LOC across multiple files.
- `packages/ui`: `<edge-chat>` web component, approval prompts, `registerActions` action cards. Target: keep at ~1,200 LOC but consider splitting.
- `packages/cli`: docs indexer (small, useful — keep)
- `examples/ecommerce` (single flagship, real model, no scripts)
- `examples/docs-chat` (if it works end-to-end on Pages)
- `DESIGN.md` (constitution)
- New ~120-line `README.md`
- `AGENTS.md` (trimmed to architecture rules + commands)
- `spike/` (working reference)

**Target after cut:** 3 packages (4 if React is staying), ~1,500 LOC core, 1–2 demos, 5 docs total. **That's the project DESIGN.md said to build. It's still the right project. The accretion is the bug.**

---

## 8. The honest verdict

edgekit at v0.1.0 is a smart instinct (browser-first inference + tool calling = real opportunity) being smothered by a planning surrogate. The maintainer is shipping documents instead of users. The codebase is shipping primitives instead of value. The landing page is shipping architecture instead of a demo.

**This is not shit.** The DESIGN.md is unusually thoughtful, the spike was competent, the technical bet on Vercel AI SDK + `@browser-ai` is correct, the architecture instincts (worker/tool separation, host app authority, approval gates) are right.

**But the project as currently shipped is overselling itself by an order of magnitude.** "Production-grade," "world-class," "average score 1.0," "agent-operable software runtime" — none of these are earned. Calling the project's own self-graded regex suite "release evidence" is the kind of thing that gets a project mocked when an actual user finally tries it.

The path forward is not more docs, more primitives, or more demos. It is **a 70–80% cut, a single sharp wedge, and ten real users.** If you ship that, edgekit becomes a real OSS project. If you keep adding primitives and writing world-class definitions, it becomes the kind of repo people read for the README and never install.

Pick a vertical. Ship one demo. Find ten users. Let the next 25 primitives come from their complaints, not from a forecasting exercise.

---

## Sources

Competitive & technical claims:

- [Built-in AI | Chrome for Developers](https://developer.chrome.com/docs/ai/built-in)
- [Chrome at I/O 2026 — Chrome for Developers](https://developer.chrome.com/blog/chrome-at-io26)
- [WebGPU is now supported in major browsers — web.dev](https://web.dev/blog/webgpu-supported-major-browsers)
- [GitHub — jakobhoeg/browser-ai](https://github.com/jakobhoeg/browser-ai)
- [GitHub — jakobhoeg/built-in-ai](https://github.com/jakobhoeg/built-in-ai)
- [WebLLM — Vercel AI SDK integration](https://www.webllm.org/docs/vercel-ai-sdk)
- [Community Providers: Browser AI — Vercel AI SDK](https://ai-sdk.dev/providers/community-providers/browser-ai)
- [CopilotKit raises $27M to help devs deploy app-native AI agents — TechCrunch](https://techcrunch.com/2026/05/05/copilotkit-raises-27m-to-help-devs-deploy-app-native-ai-agents/)
- [AG-UI Protocol](https://github.com/ag-ui-protocol/ag-ui/)
- [Microsoft Magentic-UI](https://github.com/microsoft/magentic-ui)
- [Anthropic Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Claude Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview)
- [WebMCP: AI Agent Browser Interaction — Medium](https://medium.com/aimonks/webmcp-ai-agent-browser-interaction-f86838a564ec)
- [Google Chrome silently downloading 4GB Gemini Nano — gHacks](https://www.ghacks.net/2026/05/06/google-chrome-is-silently-downloading-a-4gb-gemini-nano-ai-model-to-user-devices-without-consent/)
- [Browser-Native LLM Inference with WebGPU](https://tianpan.co/blog/2026-04-17-browser-native-llm-inference-webgpu)
- [WebGPU bugs are holding back the browser AI revolution](https://medium.com/@marcelo.emmerich/webgpu-bugs-are-holding-back-the-browser-ai-revolution-27d5f8c1dfca)

Internal repo evidence:

- `DESIGN.md` lines 25–37, 397, 405–408, 786 (constitutional rules)
- `ARCHITECTURE.md` lines 36–110 (the reframe to Skills + Mission Profiles)
- `packages/core/src/index.ts` — 3,771 LOC, 164 exports
- `packages/ui/src/index.ts` — 1,240 LOC
- `GAP-ANALYSIS.md` — the project's own self-assessment
- `MARKETING-BRIEF.md` — the brand's own banned-vocabulary list
- 13 root `.md` files + 23 in `/docs` = 36 docs total
