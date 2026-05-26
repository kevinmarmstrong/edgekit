# Edgekit - Consensus Gap Analysis vs World-Class Definition

**Date:** 2026-05-26  
**Status:** Final current-state gap analysis for the next world-class execution loop  
**Primary reference:** `WORLD-CLASS-DEFINITION.md`

This document combines the third-party review with an independent repo review. It is intentionally outcome-oriented: the question is not "does the code run?" but "can an outside developer or coding agent use Edgekit to ship a production-grade in-app agentic sidecar with confidence?"

## Executive Summary

Edgekit has crossed the credibility threshold. The architecture is coherent, the Skills + Mission Profiles direction is right, and the research harness now measures far more than smoke-test success. Latest repo evidence shows strong outcomes on the existing demo surfaces, including live GitHub Pages suite results with 52 passed, 0 failed, 0 required failures, and average score 1.0.

It is not yet world-class.

The remaining gap is adoption proof. Edgekit must prove that someone outside the core authoring context can install it, understand the mental model, build a new mission, wire real tools, run outcome-quality tests, and trust the runtime boundaries without handholding.

The consensus highest-priority gaps are:

1. **Onboarding and time-to-value** - The 30-45 minute agent-assisted path is still more of a checklist than a guided, working experience.
2. **Demo realism** - The demos are useful and tested, but the flagship examples need to feel like serious product surfaces, not just framework capability showcases.
3. **Runtime contract clarity** - Some Skills/Profile fields are currently authoring contracts, not runtime-enforced guarantees. That is acceptable only if documented plainly and tested where guarantees exist.
4. **External adopter proof** - The harness is strong, but we need a cold-start integration proof in a blank or third-party-style app.
5. **Distribution readiness** - The packages need install, pack, starter, versioning, and migration proof before public release claims become enterprise-grade.
6. **Provider and resilience matrix** - The current scores are excellent, but the matrix needs repeatable strict runs across Chrome AI/Nano, WebLLM, explicit cloud routes, no-model fallback, flaky tools, hostile inputs, offline paths, and MCP-style third-party tools.

## Current Strengths To Preserve

- **North Star clarity:** `ARCHITECTURE.md` now states the correct product model: Edgekit is an embeddable browser-native agent sidecar runtime, not a hosted chatbot service.
- **Correct abstraction:** Primitives -> Skills -> Mission Profiles is the right scalable layering for rapid core iteration without breaking every integration.
- **Outcome harness maturity:** The test loops now measure answer quality, synthesis faithfulness, tool calls, workflow state, approvals, safety, generative UI, observability, docs, and architecture probes.
- **Local-first economic thesis:** The site and docs now capture the key reason many developers investigate Edgekit: agent UX without uncertain per-message token liability.
- **Agent-readable docs:** `llms.txt`, `llms-full.txt`, raw Markdown exports, `AGENTS.md`, and repo-level guidance are important differentiators and should remain first-class.
- **Honest demo posture:** Scripted demos and AG-UI mock streams are increasingly transparent about what is real, mocked, local, or backend-required.

## Consensus Scorecard

| World-class criterion | Current state | Gap | Priority | Required evidence to close |
| --- | --- | --- | --- | --- |
| Outcome quality | Strong on current repo-owned missions | Medium | High | Repeated strict provider matrix runs with no required failures and average >= 0.98 |
| Mental model clarity | Good in architecture docs | Medium | High | README, public docs, package READMEs, and starter path all lead with Skills + Profiles |
| Onboarding/time-to-value | Early scaffolding | Large | Critical | Cold-start adopter simulation reaches a harness-passing mission in <= 45 minutes |
| Documentation quality | Good but fragmented | Medium | High | One authoritative zero-to-production path plus concrete production recipes |
| Demo quality | Useful but still demo-like | Large | High | At least one flagship demo feels like a product team could ship it as-is |
| Production readiness | Structural guidance exists | Medium-large | High | Install, security, telemetry, audit, RBAC, migration, and escalation recipes with tests |
| Runtime guarantees | Mixed authoring contracts and enforced behavior | Medium-large | High | Clear guarantee table plus runtime tests for every enforced contract |
| Distribution readiness | Packages are shaped but not release-proven | Large | Critical | `npm pack`/install smoke, starter template, versioning policy, package docs, release checklist |
| External adopter proof | Not yet proven | Large | Critical | New app integration proof run using only public docs and package artifacts |
| Provider/resilience coverage | Strong harness, incomplete matrix proof | Medium | High | Repeatable matrix report for Nano, WebLLM, cloud route, no-model, offline, flaky, hostile, MCP |

## Gap Analysis By World-Class Criterion

### 1. Outcome Quality

**Current state:** Strong on existing missions. The live suite reports a 1.0 average and zero required failures across the current scenario set.

**Remaining gaps:**

- The best evidence is still generated by the repo's own harness and known demos.
- Some strict real-model paths depend on the user's Chrome profile and CDP setup.
- The suite has skipped optional local-only standalone scenarios in live mode, which is fine, but the release story should distinguish "not applicable on Pages" from "untested."
- The prompt space is still relatively small compared to real public usage.

**World-class closure criteria:**

- Strict local-model runs pass with Chrome AI/Nano through CDP.
- WebLLM behavior is tested where browser hosting supports required headers.
- Explicit cloud-route fallback is tested with a developer-provided route.
- Randomized prompts, hostile prompts, long workflows, flaky tools, offline loaded pages, and MCP-style catalogs are all represented.
- Required categories remain green: `safety`, `workflowState`, `synthesisFaithfulness`, and `answerQuality`.

### 2. Mental Model And Architecture Clarity

**Current state:** Good and improving. The architecture document clearly explains Primitives, Skills, and Mission Profiles.

**Remaining gaps:**

- The pattern is clearer in dedicated docs than in every public entry point.
- Package READMEs still read more primitive-first than profile-first.
- Advanced concepts such as Skill optimization, MCP, AG-UI, CRDTs, telemetry, and audit can distract from the first-use model if presented too early.

**World-class closure criteria:**

- Every primary entry point answers: "I want to add an agent to my app. What do I create first?"
- The answer is consistently: choose a mission, define Skills, create a Mission Profile, register app-owned tools, validate, run outcome tests.
- Raw `configure()` is documented as an escape hatch, not the primary path for normal adopters.

### 3. Onboarding And Time-To-Value

**Current state:** This is the largest gap. The docs have the right direction, but the starter path still requires too much interpretation.

**Specific blockers:**

- `docs/templates/mission-profile-starter/profile.ts` is mostly placeholder text.
- `ADOPTER-SIMULATION.md` is a short checklist, not a timed, guided path.
- There is no true copyable "30-minute production sidecar" walkthrough with expected outputs.
- There is no one-command starter that creates a realistic mission pack, demo page, and harness scenario.
- The distinction between structural validation and outcome testing is explained, but not reinforced enough in the actual onboarding flow.

**World-class closure criteria:**

- A coding agent following only repo/public docs can create a new realistic mission in <= 45 minutes.
- The generated mission includes 2-5 Skills, one Mission Profile, app-owned tools, approval behavior, telemetry, and at least two outcome tests.
- The first serious run reaches average score >= 0.95 after reasonable tuning.
- The docs include a transcript-style proof of this timed run.

### 4. Documentation Quality

**Current state:** Good trajectory, but still fragmented.

**Remaining gaps:**

- There is no single authoritative "From zero to production sidecar" guide that feels complete.
- Production guidance is mostly checklist-level rather than recipe-level.
- Package-level docs need to teach the same mental model as the root docs.
- The docs should include concrete "what belongs in host app vs Edgekit" examples for state, auth, permissions, memory, tools, telemetry, audit, and model routing.

**World-class closure criteria:**

- A new reader can follow one primary path without hopping across many documents.
- Advanced docs are clearly sequenced after the first successful sidecar.
- Agent-readable exports include the same production-critical guidance as the human docs.

### 5. Demo Quality

**Current state:** Improved and tested, but not yet flagship-grade.

**Remaining gaps:**

- Demos prove capabilities, but the strongest examples should feel like real product workflows.
- The field ops and ecommerce demos are the best candidates for flagship treatment.
- Role-specific tooling, offline mutation recovery, multi-step workflow chaining, and realistic telemetry are not yet compelling enough visually or behaviorally.
- Some demos rely on scripted paths for public hosting, which is acceptable only if clearly labeled and paired with real-provider test evidence elsewhere.

**World-class closure criteria:**

- At least one flagship demo looks and behaves like a production feature a serious team would ship.
- It demonstrates multi-step work, stateful app changes, approval/rejection, telemetry, and useful final synthesis.
- The demo is backed by harness evidence and has a "how this maps to your app" implementation page.

### 6. Production Readiness Signals

**Current state:** Structural guidance exists, but elite developers will need more depth before trusting production deployment.

**Remaining gaps:**

- Need concrete security and threat-model docs.
- Need telemetry adapter examples beyond in-memory mission control.
- Need audit persistence examples and guidance on hash/signature expectations.
- Need RBAC and identity examples that show safe session bridging without prompt-secret leakage.
- Need upgrade and migration examples for changing core behavior while preserving profiles.
- Need clear local-vs-cloud escalation policy examples.

**World-class closure criteria:**

- A production team can answer: how do I ship this safely, observe it, debug it, upgrade it, and prove it did not bypass authority?
- The answer is backed by code examples, tests, and deployment notes, not just prose.

## Additional Gaps Added By Independent Review

### A. Runtime Contract Clarity

Skills and Mission Profiles currently include fields such as `synthesis`, `policy`, `uiAffordances`, and `optimization`. Some of these are dev-time authoring contracts rather than runtime-enforced behavior.

That is acceptable for a fast-moving 0.1 release only if the boundary is explicit.

**Needed:**

- A guarantee table: field, purpose, runtime-enforced today, harness-enforced today, docs-only today, planned runtime behavior.
- Tests for every field that claims runtime enforcement.
- Warnings or validation where users might assume enforcement that does not exist yet.
- Examples showing the executable path: `registerTools()`, `registerActions()`, `needsApproval`, `toolProvider`, `identityProvider`, `stateProvider`, telemetry, and audit.

### B. Distribution And Install Readiness

The packages have publish-oriented metadata, but world-class open-source infrastructure needs proof that the public install path works.

**Needed:**

- `npm pack` smoke for core, UI, React, and CLI packages.
- Fresh app install smoke using packed artifacts, not workspace aliases.
- A starter template or `create-edgekit` style path.
- Package README updates that lead with Skills + Profiles.
- Versioning and compatibility policy for core, UI, Skills, Profiles, and demos.
- Release checklist for GitHub Pages, package publish, docs exports, and post-publish smoke.

### C. External-Adopter Proof

The repo-owned harness is strong, but the world-class definition asks whether both target personas can reach production-grade results quickly.

**Needed:**

- A timed blank-app or third-party-style integration run.
- No private knowledge beyond public docs and package APIs.
- Transcript of decisions, friction points, fixes, and final score.
- One human/developer path and one coding-agent path, even if simulated.

### D. Provider And Resilience Matrix

The project must avoid claiming local-first confidence based only on fallback or scripted routes.

**Needed:**

- A matrix report for Chrome AI/Nano, WebLLM, explicit cloud route, no-model fallback, and scripted CI mode.
- Separate labels for local development, live GitHub Pages, and production-capable hosts with COOP/COEP.
- Hostile inputs, invalid tool arguments, flaky network, long multi-step workflows, and third-party MCP catalogs in the matrix.
- Webwright or another independent browser-agent pass as a second validation vector for the existing Playwright harness.

## Keep, Change, Add, Cut

### Keep

- The Primitives -> Skills -> Mission Profiles architecture.
- The local-first economic and privacy thesis.
- The outcome-quality harness and synthesis faithfulness category.
- The public docs site with agent-readable exports.
- The demo set: ecommerce, docs, AG-UI, admin, mission control, field ops.
- Honest disclosure of scripted and backend-required paths.

### Change

- Make onboarding guided and executable, not conceptual.
- Make package READMEs and public docs profile-first.
- Convert production readiness from checklist-only to recipes with code.
- Convert demo pages from "capability examples" to "real product surfaces."
- Treat profile validation as structural only and outcome harness as the quality arbiter everywhere.
- Clarify which profile/skill metadata is enforced by runtime today.

### Add

- A flagship production-grade demo pass.
- A 30-minute agent-assisted sidecar tutorial with working code.
- A 90-minute elite developer deep-dive path.
- A cold-start adopter simulation and report.
- `npm pack` and fresh-app install tests.
- Runtime guarantee matrix.
- Provider/resilience matrix report.
- Migration and upgrade guide.
- Security/threat model guide.
- Telemetry, audit, RBAC, and escalation recipes.

### Cut Or Defer

- Avoid adding more advanced primitives until the primary adoption path is excellent.
- Avoid presenting Skill optimization before the first sidecar path is understood.
- Avoid broad enterprise claims until package install, external-adopter, and provider matrix proof exist.
- Avoid demo-specific fixes that do not strengthen reusable Edgekit contracts.

## Release Gates To Reach World Class

### Gate 1: Adopter Success

**Goal:** A new user or coding agent can create a useful sidecar quickly.

**Must pass:**

- Guided 30-minute path exists.
- Starter template is concrete, not placeholder-only.
- Cold-start adopter simulation creates a new mission and reaches score >= 0.95.
- Friction log is documented and addressed.

### Gate 2: Flagship Demo

**Goal:** A product manager, architect, or developer immediately sees how Edgekit enables agentic app workflows.

**Must pass:**

- One flagship demo is visually and functionally production-grade.
- It includes read tools, generated UI, approval-gated mutation, rejection path, app state change, telemetry, and outcome tests.
- It is not hardcoded to pass one prompt.

### Gate 3: Runtime Guarantees

**Goal:** Developers know exactly what Edgekit guarantees and what the host app owns.

**Must pass:**

- Guarantee table is documented.
- Runtime-enforced contracts have tests.
- Authoring-only contracts are labeled as such.
- Validation warnings catch common false assumptions.

### Gate 4: Provider And Resilience Matrix

**Goal:** Local-first and fallback behavior are proven across supported architectures.

**Must pass:**

- Chrome AI/Nano strict run.
- WebLLM run or explicitly documented host limitation.
- Explicit cloud route run.
- No-model fallback run.
- Offline/flaky/hostile/long-workflow/MCP scenarios.
- Independent browser-agent validation pass, such as Webwright, compared against Playwright evidence.

### Gate 5: Distribution Readiness

**Goal:** The public install path works outside the monorepo.

**Must pass:**

- `npm pack` for publishable packages.
- Fresh app consumes packed packages successfully.
- Package docs and examples use the public package shape.
- Starter path is tested from scratch.
- Release checklist covers docs, packages, GitHub Pages, and post-release smoke.

## Prioritized Next Work

| Order | Work item | Why now | Acceptance evidence |
| ---: | --- | --- | --- |
| 1 | Replace starter template with a concrete mission pack | Biggest onboarding blocker | New user can run the starter without inventing every field |
| 2 | Write "30-Minute Production Sidecar" guide | Directly targets the world-class time-to-value bar | Timed adopter simulation follows the guide and passes |
| 3 | Make package READMEs profile-first | Aligns distribution with the core mental model | Core/UI/React READMEs teach Skills + Profiles before primitives |
| 4 | Create runtime guarantee table | Prevents overclaiming and user confusion | Docs list enforced vs authoring-only fields with tests |
| 5 | Run fresh-app packed-package smoke | Proves installability outside workspace | Fresh app builds and runs with packed packages |
| 6 | Upgrade one flagship demo | Makes value obvious to less imaginative evaluators | Demo passes harness and looks/feels production-grade |
| 7 | Expand provider/resilience matrix | Proves local-first architecture honestly | Matrix report generated with strict provider evidence |
| 8 | Add production recipes | Builds enterprise trust | Telemetry, audit, RBAC, escalation, migration guides include code |
| 9 | Run external-adopter simulation | Final proof of world-class adoption | Report includes time, transcript, score, failures, fixes |
| 10 | Final public release battery | Confirms no regression | `pnpm test`, `typecheck`, `build`, `test:e2e`, `eval:models`, `eval:adoption`, `research:agents`, `research:suite`, `research:full`, live Pages smoke |

## Bottom Line

Edgekit is architecturally credible and increasingly well tested. The path to world class is not to add many more primitives right now. The path is to make the current architecture undeniable:

- a new adopter can build with it fast,
- the demos make the value obvious,
- the package install path works outside the repo,
- runtime guarantees are precise,
- the provider and resilience matrix is proven,
- and every quality claim is backed by repeatable evidence.

Until those gates are closed, Edgekit should be described as a strong release candidate with unusually serious outcome testing, not yet as a finished world-class production standard.
