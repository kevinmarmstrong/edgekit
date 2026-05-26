# Edgekit World-Class Loop — Live Status

**Last Updated:** 2026-05-26 22:03:02 UTC

**This is the single source of truth for the current loop state.**

You can `cat LOOP-STATUS.md` or open it in your editor at any time to see exactly where we are.

**Timestamp convention:** Every significant update to this file includes a UTC timestamp in the "Last Updated" line at the top and/or within the "Latest Update" section. This makes it easy to see how recently the loop has progressed.

---

## Current Overall Phase

**Phase:** Sustained World-Class Iteration Loop  
**Target:** World-class product, docs, and demos ready for immediate production use by elite programmers and agent-assisted developers (as defined in `WORLD-CLASS-DEFINITION.md`).

**Loop Rule:** We continue Document → Implement → Test (real local model research harness) → Learn until the criteria in `WORLD-CLASS-DEFINITION.md` are clearly met.

---

## Current Iteration — Started 2026-05-26 03:50:04 UTC

**Iteration:** 4 (Making Profile-Driven Demos Obviously the Default + Continuous Progress Visibility)

**Note from agent (2026-05-26 03:50:04 UTC):** User requested explicit confirmation that loops are actively running and that LOOP-STATUS.md is being updated in real time. This iteration will focus on visible, incremental improvements to demo clarity while maintaining strict update cadence on this file.

**Focus of this iteration:**
- Make the Skills + Mission Profiles pattern the obviously correct default way to use Edgekit.
- Deliver excellent onboarding so both target personas can reach high outcome quality quickly.
- Improve visibility of the loop itself (this file).

**Status:** In progress

**Latest significant data point:**
- Latest `research:agents` run (real Chrome model): 11/11 passed, 0 required failures, average score 1.0, `synthesisFaithfulness` fully green.

---

## Last Completed Turn — 2026-05-26 03:30 UTC (approx)

**Turn Summary:**
- Created `WORLD-CLASS-DEFINITION.md` (explicit, measurable success criteria for both personas).
- Created `docs/GETTING-STARTED-REAL-APPS.md` (high-signal guide for real production use).
- Updated root `README.md` to direct serious users to the world-class path immediately.
- Wired second mission (`docs-qa` profile) into live demo initialization.
- Logged Iterations 1–3 with learnings in `ARCHITECTURE.md`.

**Outcome Quality Signal:** Previous harness run was perfect (1.0). No regression introduced by architectural changes.

---

## Key Gaps vs World-Class Bar (Current Honest Assessment)

From `WORLD-CLASS-DEFINITION.md`:

1. **Onboarding / Time-to-Value** — Partially addressed (new guide exists). Still needs to be the primary path presented everywhere.
2. **Mental Model Clarity** — Skills + Profiles pattern is documented but not yet dominant in the top-level experience.
3. **Demo Quality** — Improving (profiles now drive the live surfaces), but demos don't yet feel like "obviously production-grade examples."
4. **Production Guidance** — Still scattered. Needs to be crisp and authoritative.
5. **Outcome Quality on New Missions** — We have a second profile skeleton. Need to wire it + run harness to prove "new mission creation" works at high quality.

---

## Next Planned Actions (This Iteration)

1. Make the new Getting Started guide and world-class definition the most visible onboarding experience.
2. Continue cleaning demo initialization and demo pages so the profile-driven approach is the obvious "right way."
3. Add production-oriented notes to the demos.
4. Wire + test the docs-qa profile in the live harness surfaces.
5. Run full research harness (including stricter modes) and capture data.
6. Update this file after each meaningful sub-turn.

---

## How to Monitor Progress

- Check this file (`LOOP-STATUS.md`) — it will be updated after every significant turn, with timestamps.
- Check `ARCHITECTURE.md` for deeper iteration logs and learnings.
- Check `research-results/` for the latest harness output (the real measure of outcome quality).
- Ask me "what is the current loop status?" at any time — I will read this file and report the latest timestamped state.

---

## Historical Turns (Condensed)

**Iteration 1** — Skills + Profiles foundation + first validation run (perfect 1.0 score on harness).

**Iteration 2** — Second mission example created (`docs-qa.ts`).

**Iteration 3** — World-class definition + onboarding materials + visibility improvements (current).

---

*This file is updated as part of the loop. Do not edit manually unless coordinating with the agent.*

---

## Latest Update — 2026-05-26 05:24:16 UTC

**Wave 3 adopter simulation progress:**

- Added the adopter-simulation guide and mission-profile starter kit.
- Expanded the public docs and dogfood assistant content so coding agents can find the Skills + Mission Profiles path.
- Added a new adoption-quality scenario for an agent-assisted developer asking how to add a production-grade sidecar.
- First run correctly failed because the answer omitted outcome/harness verification guidance.
- Fixed the reusable answer composer, then reran `pnpm eval:adoption`.

**Verification result:**

- `pnpm eval:adoption`: 7/7 scenarios passed, 55/55 checks passed, 0 required failures, average score 1.0, `meetsRubric: true`.

**Next step:**

- Add profile validation and production guardrails so new Mission Profiles can fail fast before runtime.

---

## Latest Update — 2026-05-26 05:27:03 UTC

**Wave 4 profile validation and guardrails:**

- Added `validateMissionProfile()` in core with structured errors/warnings.
- Validation catches missing identity fields, duplicate required tools, `toolChoice: "required"` without a tool contract, and required tools not present in the registered app surface.
- Exposed profile validation from `<edge-chat>` and added React wrapper support for applying Mission Profiles.
- Updated Mission Profile and production docs to teach validation as a structural guardrail, separate from outcome testing.

**Verification result:**

- Core profile tests: 9/9 passed.
- React primitive tests: 3/3 passed.
- `pnpm typecheck`: passed across the workspace.

**Next step:**

- Expand the research suite with public action-card execution, adopter guidance, and Mission Profile validation probes, then run the broad verification battery.

---

## Latest Update — 2026-05-26 05:30:43 UTC

**Wave 5 expanded suite result:**

- Added public ecommerce action-card execution to `research:suite`.
- Added profile/adopter guidance checks to catch shallow "getting started" answers.
- Added a Mission Profile validation architecture probe.
- First expanded run correctly failed on adopter guidance because the public assistant omitted validation/outcome proof language.
- Fixed the reusable answer composer and reran `pnpm research:suite`.

**Verification result:**

- `pnpm research:suite`: 49/49 scenarios passed, 0 failed, 0 skipped, 0 required failures, average score 1.0, confidence rating 1.0, confidence band `high-confidence`, `meetsRubric: true`.

**Next step:**

- Run the full release verification battery from `AGENTS.md`.

---

## Latest Update — 2026-05-26 05:34:51 UTC

**Final release verification battery completed:**

- `pnpm test`: 5 test files, 52/52 tests passed.
- `pnpm typecheck`: passed across the workspace.
- `pnpm build`: passed.
- `pnpm test:e2e`: 46/46 Playwright tests passed after updating the stale doc-card count for the new Adopter Simulation page.
- `pnpm eval:models`: completed with 6 model-unavailable results under `downloadPolicy: never`; fallback behavior matched expectations. This is acceptable because strict real-model mode was not enabled and the local Chrome AI/Nano model reports unavailable on this machine.
- `pnpm eval:adoption`: 7/7 scenarios passed, 55/55 checks passed, average score 1.0, `meetsRubric: true`.
- `pnpm research:agents`: 12/12 scenarios passed, average score 1.0, `shipReady: true`.
- `pnpm research:env`: score 1.0, 0 required failures, 1 optional gap (`Chrome AI/Nano model availability=unavailable`).
- `pnpm research:suite`: 49/49 scenarios passed, 0 required failures, average score 1.0, confidence rating 1.0, confidence band `high-confidence`.
- `pnpm research:full`: passed; repeated env, suite, and adoption loops successfully.

**Status:**

- Plan execution is complete.
- No required release-readiness verifier is failing.
- Correction: the default isolated headless run did not use the user Chrome profile where Nano is available. A later CDP-backed run against the real Chrome session confirmed Nano availability and passed strict model-cascade testing.

---

## Latest Update — 2026-05-26 05:40:30 UTC

**Chrome/Nano correction after user pushback:**

User correctly challenged the earlier interpretation of `model-unavailable`. The initial final battery launched an isolated headless Chrome context (`persistentProfile: false`, no CDP URL), so it did not prove the real user Chrome/Nano path.

**Corrected verification:**

- Chrome plugin checks: Chrome is running; Codex Chrome Extension is installed/enabled in the selected `Default` profile; native host manifest is correct.
- Existing remote-debuggable Chrome session found at `http://127.0.0.1:9223`.
- Direct CDP probe: `LanguageModel.availability()` returned `available`; `LanguageModel.create()` succeeded.
- Strict model cascade: `EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_EVAL_HEADLESS=0 EDGEKIT_REQUIRE_REAL_MODEL=1 EDGEKIT_EVAL_DOWNLOAD_POLICY=never pnpm eval:models` passed 6/6 with `modelUnavailable: 0`.
- CDP-backed research suite smoke: `EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_SUITE_HEADLESS=0 EDGEKIT_SUITE_PROMPT_LIMIT=1 pnpm research:suite` passed 29/29, average score 1.0, confidence rating 1.0, `high-confidence`.

**Current caveat:**

- Full strict `EDGEKIT_REQUIRE_REAL_PROVIDERS=1` still requires a cloud-route URL if we want to prove cloud fallback in the same command. Nano itself is available and working in the user Chrome CDP session.

---

## Latest Update — 2026-05-26 05:56:23 UTC

**SkillOpt-inspired Skill optimization layer:**

- Added router/body separation to `EdgeSkill`: `description` remains router-visible, while optional `instructions` is the activated body.
- Added Skill activation metadata: `activationExamples`, `doNotActivateWhen`, `protectedSections`, and dev-time `optimization` hints.
- Added bounded optimization contracts: `EdgeSkillPatchOperation`, `validateSkillOptimizationCandidate()`, and `summarizeSkillOptimizationScores()`.
- Guardrails enforce strict held-out improvement, reject ties, cap patch size, and block normal edits to protected slow-state paths.
- Added `docs/SKILL-OPTIMIZATION.md` with the SkillOpt paper link: https://arxiv.org/pdf/2605.23904 and the related v2.3.0 release link.
- Added public docs page `/docs/skill-optimization/` and raw Markdown export `/docs/skill-optimization.md`.
- Kept `llms-full.txt` under 50K after adding the page.

**Verification result:**

- Core profile/skill tests: 14/14 passed.
- `pnpm typecheck`: passed across the workspace.
- `pnpm --filter @edgekit/site build`: passed.
- `pnpm exec playwright test tests/e2e/docs.spec.ts --reporter=list`: 16/16 passed.

---

## Latest Update — 2026-05-26 04:06:16 UTC

**Response to third-party review + concrete hardening work (Iteration 4, 2026-05-26 04:06:16 UTC):**

Direct fixes applied after reviewing the external feedback:

1. **Fixed `profileToAgentOptions()` tool-wiping foot-gun** (packages/core/src/index.ts):
   - Now only includes `tools` in the returned config if `profile.tools` is a non-empty object.
   - This prevents profiles with placeholder `tools: {}` from silently overriding tools registered via `registerTools()`.

2. **Fixed async false-positive bug in `synthesisFaithfulness` harness** (scripts/research-agent-loops.mjs):
   - Made `checkSynthesisFaithfulness` properly async.
   - All call sites now `await` it.
   - The helper now correctly does `await Promise.resolve(fact.test(scope))` before calling `Boolean()`.
   - This eliminates the `Boolean(Promise) === true` false-positive risk on UI-based checks.

**Additional context recorded:**
- Confirmed the reviewer's other two concerns (public demo CTA execution path and descriptor nature of the new APIs) are valid based on code inspection.
- These two fixes address the highest-risk "sharp edges" that would teach adopters bad patterns or give us false confidence in our own quality harness.

**Next steps in this wave:**
- Address the public ecommerce sidecar action-card execution gap (ensure executable tools are properly available for EdgeView forms on the public site).
- Improve documentation framing around the current "recommended authoring contract" status of synthesis/policy fields.
- Run the research harness again to validate the harness fix didn't break anything and still produces clean results.
- Continue toward the criteria in WORLD-CLASS-DEFINITION.md while hardening the public pattern.

**Verification (2026-05-26 04:06:36 UTC):**
- `pnpm --filter @edgekit/site typecheck` → clean
- `pnpm --filter @kevinmarmstrong/edgekit typecheck` → clean

These two concrete fixes (safe profile tool merging + correct async faithfulness checking) directly address the two highest-risk issues raised in the review. The loop is now incorporating the external feedback into the world-class goal.

**Files created in this broader turn:**
- `WORLD-CLASS-DEFINITION.md` — Explicit bar for both personas.
- `docs/GETTING-STARTED-REAL-APPS.md` — Primary onboarding guide for real production use.
- `LOOP-STATUS.md` — This file (the live dashboard).

**Visibility improvements made:**
- Root `README.md` now directs serious users to the world-class materials first.
- This status file now exists as the single place to check loop progress.

**Next expected update:** After the next meaningful Document or Implement step (or after the next research harness run).

---

## Gap Analysis Completed — 2026-05-26 15:00:00 UTC

**Work completed:**
- Created `GAP-ANALYSIS.md` — a focused, honest assessment of current state against every criterion in `WORLD-CLASS-DEFINITION.md`.
- Special deep emphasis on **Onboarding & Speed to Tremendous Value** (the area the user specifically called out).
- The analysis concludes that while architecture, process, and outcome quality have advanced significantly, the largest remaining gap is in making the "30–45 minute path to production-grade results with excellent outcome quality" a reality for agent-assisted developers (and the 60–90 minute path for elite programmers).

**Key takeaway from the analysis:**
The current onboarding materials are good scaffolding, but they are not yet at the level of "this delivers tremendous value extremely quickly" required by the world-class definition.

**Status:** Gap analysis complete. Ready for prioritization and next wave planning.

---

## Wave 0 Progress — 2026-05-26 05:08:11 UTC

**Work completed in this session:**
- Removed the browser-hostile `process.env.NODE_ENV` reference from `applyMissionProfile()` in `packages/core/src/index.ts`.
- Added browser-safe `ApplyMissionProfileOptions` with injectable warning logger.
- Added focused unit coverage in `packages/core/test/profile.test.ts` for:
  - empty profile tools not overwriting registered tools,
  - non-empty executable profile tools flowing through,
  - warning behavior without Node globals,
  - silencing warnings when needed.

**Verification:**
- `pnpm --filter @kevinmarmstrong/edgekit exec vitest run test/profile.test.ts` → 4/4 passed.
- `pnpm typecheck` → full workspace clean.

**Impact:**
- The known full-workspace typecheck regression is fixed.
- Wave 0 can continue to canonical API usage and profile metadata cleanup.

---

## Wave 0 Progress — 2026-05-26 05:09:32 UTC

**Work completed:**
- Switched the live site docs and commerce sidecars from manual `profileToAgentOptions()` spreading to `chat.applyMissionProfile(...)`.
- Kept executable tools explicit through `registerTools(...)`.
- Added `requiredTools` metadata to Mission Profiles and Skills.
- Removed empty `tools: {}` placeholders from the public catalog and docs profiles.
- Updated core `skillsToTools()` to tolerate metadata-only Skills.
- Updated architecture and getting-started examples to teach `requiredTools` + explicit `registerTools()`.

**Verification:**
- `pnpm --filter @kevinmarmstrong/edgekit exec vitest run test/profile.test.ts` → 5/5 passed.
- `pnpm typecheck` → full workspace clean.

**Impact:**
- The recommended pattern is now less misleading: profiles declare expected tools, while executable functions remain app-owned and registered explicitly.

---

## Wave 0 Progress — 2026-05-26 05:12:51 UTC

**Work completed:**
- Added a deterministic `commerceAgentMode=scripted` public-site mode for the ecommerce demo so CI can exercise the public Pages route without depending on local model availability.
- Added browser E2E coverage proving a generated Nike Dunk action card on `/demos/ecommerce/` can execute the registered `addToCart` tool and update cart state.
- Added the same public-route CTA execution scenario to `scripts/research-agent-loops.mjs`.

**Verification:**
- `pnpm build` → clean.
- `pnpm exec playwright test tests/e2e/agent-loops.spec.ts --reporter=list` → 12/12 passed across desktop and mobile Chromium.
- `pnpm typecheck` → full workspace clean.

**Impact:**
- The public-site action-card path is now covered directly, not inferred from the standalone ecommerce demo.
- Wave 0 hardening criteria are now functionally covered. Next step is Wave 1 documentation/mental-model expansion.

---

## Wave 1 Progress — 2026-05-26 05:16:11 UTC

**Work completed:**
- Added `docs/MISSION-PROFILE-AUTHORING.md`.
- Added `docs/PRODUCTION-READINESS.md`.
- Added `docs/TESTING-OUTCOME-QUALITY.md`.
- Added public docs pages for Mission Profiles, Production, and Outcome Quality.
- Added the new pages to the Vite docs build and agent-readable Markdown exports.
- Added dogfood search chunks for Skills + Mission Profiles, production readiness, and outcome-quality testing.
- Updated homepage docs-card coverage for the expanded IA.

**Verification:**
- `pnpm --filter @edgekit/site build` → clean; emitted new `.md` pages and expanded `llms-full.txt`.
- `pnpm exec playwright test tests/e2e/docs.spec.ts --reporter=list` → 16/16 passed across desktop and mobile Chromium.

**Impact:**
- The three-layer model is now more prominent in public docs and agent-ingestable exports.
- The site now has dedicated production and outcome-quality documentation instead of burying those concerns in generic testing copy.

---

## Wave 2 Progress — 2026-05-26 05:18:55 UTC

**Work completed:**
- Added `site/src/profiles/admin-workflow.ts` with Search Accounts, Update Plan, and Suspend Account Skills plus an `adminWorkflowProfile`.
- Wired the SaaS admin demo through `chat.applyMissionProfile(adminWorkflowProfile)` while keeping executable `registerTools({ searchAccounts, updatePlan, suspendAccount })` explicit.

**Verification:**
- `pnpm --filter @edgekit/site typecheck` → clean.
- `pnpm --filter @edgekit/site build` → clean.
- `pnpm exec playwright test tests/e2e/admin.spec.ts --reporter=list` → 6/6 passed across desktop and mobile Chromium.

**Impact:**
- Public catalog, docs Q&A, and admin workflows now all use the Mission Profile pattern.

---

## Wave 2 Progress — 2026-05-26 05:20:15 UTC

**Work completed:**
- Added production notes blocks to the docs Q&A, ecommerce, AG-UI, admin, and mission-control demo pages.
- Added styling for production notes.
- Added browser coverage that confirms the admin demo exposes production notes.

**Verification:**
- `pnpm --filter @edgekit/site typecheck` → clean.
- `pnpm --filter @edgekit/site build` → clean.
- `pnpm exec playwright test tests/e2e/admin.spec.ts tests/e2e/docs.spec.ts --reporter=list` → 22/22 passed across desktop and mobile Chromium.

**Impact:**
- Demo pages now explain the production integration boundary instead of looking like isolated toy demos.

---

## Wave 1 Progress — 2026-05-26 04:39:35 UTC

**Work completed:**
- Added a clear "Before vs After (Conceptual)" section to `ARCHITECTURE.md`.
- This shows the difference between the old raw `configure()` + `registerTools()` style versus the new Skills + Mission Profile approach.
- This is a high-value item for making the mental model more concrete and dominant for both personas.

---

## Wave 1 Progress — 2026-05-26 04:39:19 UTC

**Work completed in this micro-turn (Documentation & Mental Model):**
- Added a new "Why This Model Matters (For Both Personas)" section to `ARCHITECTURE.md`.
- This section explicitly explains the benefits of the three-layer model for *both* the elite programmer and the agent-assisted developer.
- It strengthens the mental model dominance by making the "why" clearer and more persona-specific right after the layer descriptions.

This is the first concrete step in Wave 1. More documentation work (Before/After examples, AGENTS.md updates, etc.) will follow in subsequent steps.

---

## Wave 1 Started — 2026-05-26 04:39:02 UTC

**Wave:** 1 — Documentation & Mental Model Dominance

**Goal:** Make the three-layer model (Primitives → Skills → Mission Profiles) the clearly dominant and best-explained way to use Edgekit for both target personas.

**Starting work now:**
- Strengthen the explanation of the three-layer model across key docs.
- Add prominent "Before vs After" examples (raw configure() vs Skills + Profile).
- Expand ARCHITECTURE.md with clearer diagrams/descriptions of the layers and responsibilities.
- Improve AGENTS.md guidance on where developers/agents should work (Primitives vs Skills vs Profiles).
- Enhance the Getting Started guide to lead even more strongly with the profile-first path.

Progress will be recorded in timestamped steps.

---

## Wave 0 Progress — 2026-05-26 04:38:04 UTC

**Additional work completed in Wave 0:**

- Added clear "NOTE ON CURRENT API STATUS" framing to both example profiles (`public-catalog-shopping.ts` and `docs-qa.ts`).
  - Explicitly documents that `synthesis`, `policy`, and `uiAffordances` are currently **recommended authoring contracts only** and not yet runtime-enforced.

- Added a development-time console warning in `applyMissionProfile()` when a profile uses rich `synthesis` metadata while providing no executable tools.
  - This acts as a gentle runtime safeguard during Wave 0.

These changes complete the documentation framing and safeguard items for Wave 0.

Wave 0 is now considered complete (core safety + documentation framing for current API status).

Next: User confirmation to move to Wave 1, or run a validation harness pass.

---

## Wave 0 Progress — 2026-05-26 04:36:33 UTC

**Additional work completed:**
- Fixed the public ecommerce sidecar (commerceChat) CTA execution gap by explicitly calling `registerTools({ searchProducts, addToCart })` after applying the Mission Profile.
- This ensures that action cards rendered via `registerActions` have real executable tool implementations on the public site, even when most configuration comes through the profile.

This directly addresses one of the key risks raised in the third-party review regarding the public Pages demo.

---

## Wave 0 Progress — 2026-05-26 04:35:55 UTC

**Work completed in this micro-turn:**
- Added first-class `applyMissionProfile(profile)` helper in core (thin safe wrapper around the hardened `profileToAgentOptions`).
- Exposed `applyMissionProfile(profile)` method on the `EdgeChat` web component for convenient usage.
- Both core and site packages typecheck cleanly.

**Rationale:** This gives adopters a clearer, safer recommended API (`chat.applyMissionProfile(myProfile)`) instead of manual spreading, directly addressing review feedback.

**Remaining Wave 0 items:**
- Further harden public demo CTA execution path.
- Add documentation framing for current descriptor status of synthesis/policy fields.
- Verify harness async fix with a fresh run.

---

## Wave 0 Execution Started — 2026-05-26 04:35:03 UTC

**Wave:** 0 — Pattern Hardening (Safety & Correctness)

**Goal:** Eliminate foot-guns identified in the third-party review so the Skills + Mission Profiles pattern is safe to promote.

**Starting now:**
- Deep review of current `profileToAgentOptions()` implementation and usage.
- Design and implement a first-class `applyMissionProfile()` / `configureWithProfile()` helper.
- Address the public ecommerce sidecar action-card execution gap.
- Document current limitations of synthesis/policy/uiAffordances fields.
- Verify and harden the async synthesisFaithfulness fix.

Progress on this wave will be recorded in small, timestamped steps in this file.

---

## Major Update — 2026-05-26 04:33:06 UTC

**Work Completed:**
- Created `WORLD-CLASS-EXECUTION-PLAN.md` — a comprehensive, wave-based execution plan directly derived from the criteria in `WORLD-CLASS-DEFINITION.md`.
- The plan breaks the world-class goal into 6 major waves (Hardening, Documentation/Mental Model, Demo Quality, Onboarding/Time-to-Value, Production Readiness, Final Verification).
- Includes explicit success criteria per wave, verification methods (heavily harness-driven), and a clear Definition of Done at the end.
- Accounts for the third-party review feedback by prioritizing "Harden Before Expand" in Wave 0.

**Current Status:**
- We now have a structured, outcome-oriented roadmap for reaching the goals.
- This completes the "create a plan" request.
- Ready for review and then execution of the waves.

**Next Action:**
- User review of `WORLD-CLASS-EXECUTION-PLAN.md`.
- Once approved, begin Wave 0 execution with visible updates to this status file.

---

## World-Class Milestone Implementation — 2026-05-26 15:43 UTC

**Completed in this pass:**
- Added runtime guarantee documentation and validation warnings for authoring-only profile metadata.
- Replaced the placeholder starter with a concrete support-workflow mission pack and timed 30-minute adoption path.
- Added packed-package/fresh-app distribution smoke coverage outside the monorepo.
- Upgraded Field Ops ERP into the flagship internal-app workflow demo with role-specific tool exposure, ETA approvals, rejection/no-mutation proof, and telemetry-visible state changes.
- Expanded provider/resilience reporting across Chrome, WebLLM, cascade, no-model, scripted, and developer-provided cloud route modes.
- Added production recipes, threat model, migration/upgrade, and distribution readiness docs; docs site and llms exports stay profile-first.

**Verification evidence:**
- `pnpm test` passed: 59/59.
- `pnpm typecheck` passed.
- `pnpm build` passed; `site/dist/llms-full.txt` is 48,990 bytes.
- `pnpm test:fresh-app` passed from packed tarballs in an external temp app.
- `pnpm test:e2e` passed: 48/48.
- `pnpm eval:adoption` passed: average 1.00, required failures 0.
- `pnpm research:agents` passed: 12/12, average 1.00, shipReady true.
- `pnpm research:suite` passed: 66/66, average 1.00, confidence 1.00, required failures/skips 0.
- Strict provider run passed with `EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223`, `EDGEKIT_REQUIRE_REAL_PROVIDERS=1`, and a reachable developer-provided local cloud route stub.
- Webwright-style independent validation passed for docs Q&A and Field Ops ETA approval workflow with screenshots in `research-results/webwright/final_runs/run_1/screenshots/`.

**Live Pages verification completed after deploy:**
- Commit `a667721` was pushed to `kevinmarmstrong/edgekit:main`.
- GitHub Pages workflow `26459016335` completed successfully.
- Live `EDGEKIT_SUITE_TARGET=live EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 pnpm research:suite` passed: 54 passed, 0 failed, 6 non-required skips, required failures/skips 0, average 1.00, confidence 1.00.
- Live `https://kevinmarmstrong.github.io/edgekit/docs/runtime-guarantees.md` returns the runtime guarantees doc.
- Live `https://kevinmarmstrong.github.io/edgekit/llms-full.txt` is 48,990 bytes.
- Live `https://kevinmarmstrong.github.io/edgekit/demos/operations/` returns the Field Ops ERP demo shell.

**Remaining optional proof:**
- Run against a real external cloud route instead of the local cloud-route stub if you want hosted-provider proof before package publication.

---

## Latest Update — 2026-05-26 21:45:10 UTC

**Provider/resilience matrix proof and source-of-truth status docs:**

- Tightened `research:suite` provider reporting so each provider row records its proof lane, proof level, host requirement, strict-mode meaning, evidence pointer, and exact re-run command.
- Added `EDGEKIT_SUITE_ONLY` support for targeted resilience runs without editing the scenario pack.
- Live-target provider rows are now explicit non-required skips instead of an empty provider matrix, so live Pages proof is not confused with local provider execution proof.
- WebLLM host proof now records COOP/COEP isolation through a required strict-provider environment check (`crossOriginIsolated=true`).
- `eval:models` now emits a proof level and runbook commands for strict Chrome/Nano CDP, no-model fallback, and cascade checks.
- Reproducibility, outcome-quality testing, and distribution-readiness docs now state which lanes prove local resilience, strict Chrome AI/Nano CDP, WebLLM COOP/COEP, cloud routes, no-model fallback, live Pages, hostile/offline paths, long workflow paths, and MCP-ish architecture paths.

**Current pushed cascade readiness work:**

- Local resilience and live Pages proof were previously green in the current loop.
- Strict Chrome/Nano CDP proof was previously green using `EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223`.
- Full strict provider proof also requires a reachable `EDGEKIT_SUITE_CLOUD_ROUTE_URL`; a local stub proves routing shape, while an external route is still the optional hosted-provider proof before package publication.

**Verification result:**

- `node --check scripts/research-suite.mjs`: passed after fixing a Markdown-template escaping issue.
- `node --check scripts/eval-model-cascade.mjs`: passed.
- `EDGEKIT_SUITE_ONLY=standalone-hostile-cart,offline-loaded-assistant EDGEKIT_SUITE_PROVIDER_MODES=none node scripts/research-suite.mjs`: passed 17/17, 0 failed, 0 skipped, required failures/skips 0, average score 1.0, confidence band `high-confidence`.
- Regenerated ignored local artifacts `research-results/provider-matrix.md/json` with proof level `local-resilience`, suite filter `standalone-hostile-cart, offline-loaded-assistant`, and an explicit no-model fallback provider row.
- `EDGEKIT_SUITE_TARGET=live EDGEKIT_SUITE_ONLY=__none__ EDGEKIT_SUITE_PROVIDER_MODES=none EDGEKIT_SUITE_OUTPUT=research-results/live-provider-matrix-check.json EDGEKIT_PROVIDER_MATRIX_OUTPUT=research-results/live-provider-matrix-check-provider.json node scripts/research-suite.mjs`: passed 12/12 with 1 non-required provider skip, required failures/skips 0, average score 1.0. The generated temporary provider matrix shows proof level `live-pages` and explicitly marks the provider row skipped.

**Current caveat:**

- The full `pnpm research:suite` wrapper was stopped because the build phase hung in `@kevinmarmstrong/edgekit-ui` TypeScript compilation for over two minutes. The targeted harness was then run directly against the existing built dist to verify the script changes.

---

## Latest Update — 2026-05-26 22:03:02 UTC

**World-class gap closure pass: onboarding proof, demo realism, provider matrix, and local verification:**

- Upgraded the Field Ops ERP demo so it now shows workflow state, next action, policy evidence, resilience posture, role capability lists, approval counters, audit counts, and scripted-mode disclosure. The demo remains honest: scripted public mode exercises the same tools, approvals, UI state, and audit surfaces without pretending to be a live provider.
- Expanded Field Ops E2E assertions for dispatcher, viewer, supervisor, approval, rejection, telemetry, audit, state change, and cited knowledge paths.
- Expanded `ADOPTER-SIMULATION.md` and the public docs page with evidence levels (`dry-run`, `starter-run`, `first-serious-run`, `production-shaped`), timed proof rules, required records, scoring rubric, and first-serious-run reporting.
- Expanded production recipes with persistable event contracts, approval-ledger rows, dynamic RBAC tool exposure, state hydration examples, and capability-gated cascade UX guidance.
- Fixed provider-matrix semantics so strict Chrome/Nano proof does not require WebLLM COOP/COEP or a cloud route unless those provider modes are actually being claimed.

**Verification result:**

- `node --check scripts/research-suite.mjs`: passed.
- `node --check scripts/eval-model-cascade.mjs`: passed.
- `git diff --check`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: 71/71 passed.
- `pnpm build`: passed.
- `pnpm test:e2e`: 52/52 passed.
- `pnpm eval:adoption`: 10/10 scenarios, 82/82 checks, required failures 0, average score 1.0, `meetsRubric: true`.
- `pnpm research:suite`: 76/76 scenarios, required failures/skips 0, average score 1.0, confidence rating 1.0, `high-confidence`.
- `pnpm test:fresh-app`: packed package install/build smoke passed outside workspace aliases.
- `pnpm eval:models`: local-cascade resilience completed with 6 expected isolated-headless model-unavailable fallback results and no unsafe mutation.
- `EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_EVAL_HEADLESS=0 EDGEKIT_REQUIRE_REAL_MODEL=1 EDGEKIT_EVAL_DOWNLOAD_POLICY=never pnpm eval:models`: strict Chrome/Nano CDP proof passed 6/6 with `modelUnavailable: 0`.
- `EDGEKIT_CHROME_CDP_URL=http://127.0.0.1:9223 EDGEKIT_SUITE_HEADLESS=0 EDGEKIT_REQUIRE_REAL_PROVIDERS=1 EDGEKIT_SUITE_PROVIDER_MODES=chrome EDGEKIT_SUITE_ONLY=__none__ pnpm research:suite`: strict Chrome provider-matrix proof passed 13/13, required failures/skips 0, average score 1.0.
- `pnpm research:agents`: 12/12 scenarios passed, average score 1.0, `shipReady: true`.

**Current caveat:**

- Hosted cloud-route proof still requires a real external `EDGEKIT_SUITE_CLOUD_ROUTE_URL`. The local suite proves routing shape and fallback behavior; it should not be represented as hosted-provider proof.
