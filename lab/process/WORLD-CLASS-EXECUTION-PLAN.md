# Edgekit World-Class Execution Plan

**Last Updated:** 2026-05-27
**Status:** Release-candidate threshold passed by automated/simulated evidence. Remaining work is final deploy verification plus honest caveat tracking.
**Purpose:** Keep the remaining work aligned with `WORLD-CLASS-DEFINITION.md`, `ARCHITECTURE.md`, and the current repo evidence.

---

## Current Evidence Snapshot

The plan has moved past the original "starter and distribution are missing" state. These items are now concrete:

- **Skills + Mission Profiles are the dominant implementation path.** Public catalog, docs Q&A, admin, Field Ops, and starter materials use the Primitives -> Skills -> Mission Profiles model.
- **The starter is concrete.** `docs/templates/mission-profile-starter/profile.ts` contains a support-workflow mission with read and approval-gated mutation tools, Skills, a Mission Profile, synthesis expectations, policy metadata, and starter scenarios in `harness-scenarios.json`.
- **`edgekit-init` exists.** `packages/cli` exposes `edgekit-init`, with recipe scaffolding for `support-workflow`, `knowledge-skill`, and `astro-intake-knowledge`.
- **Distribution smoke exists.** `pnpm test:fresh-app` builds from packed tarballs in an external temp app and is documented in `lab/proofs/DISTRIBUTION-READINESS.md`.
- **Outcome harness evidence is strong.** Recent repo-owned runs include unit, typecheck, build, E2E, adoption eval, agent suite, live Pages suite, fresh-app smoke, and strict Chrome/Nano CDP lanes with 0 required failures.
- **Provider reporting is substantially improved.** The suite can label proof lanes such as local resilience, strict Chrome/Nano CDP, WebLLM host, cloud route, no-model fallback, and live Pages.

These are meaningful release-readiness signals. The final proof lanes below now move Edgekit past the automated/simulated release-candidate threshold.

## True Remaining Gaps

1. **Independent human/third-party adopter proof.** The automated clean-room proof is green. A truly independent transcript remains the next confidence multiplier, not a hidden release blocker.
2. **WebLLM downloaded-model quality proof.** Cloudflare now proves the host shape and `crossOriginIsolated === true`, but device/browser-specific WebLLM model download and answer-quality proof should remain explicit when claimed.
3. **Public deployment verification.** Push the current release candidate and verify GitHub Pages after Actions/Pages finish.

## Remaining Work Plan

### Wave A: External Adopter Proof

**Goal:** Prove that the docs, starter, CLI, and packages work without maintainer context.

**Complete automated lane:**
- `pnpm proof:clean-room-adoption`
- Fresh app outside the monorepo.
- Packed Edgekit tarballs, no workspace aliases.
- Public `edgekit-init` support recipe.
- New facilities-maintenance Mission Profile.
- Validation, build, and deterministic outcome scoring.

**Latest result:** score `1.0`, required failures `0`.

**Next confidence work:** Run one truly independent human or third-party-agent transcript and keep the friction log.

### Wave B: Provider Matrix

**Goal:** Produce one release-candidate matrix that makes provider and resilience claims unambiguous.

**Complete lanes:**
- Strict Chrome/Nano CDP: `research-results/provider-matrix-chrome-strict.md`, score `1.0`, required failures/skips `0`.
- Hosted Cloudflare cloud-route: `research-results/provider-matrix-cloudflare.md`, score `1.0`, required failures/skips `0`.
- No-model fallback: `research-results/provider-matrix-no-model.md`, score `1.0`, required failures/skips `0`.
- Live Pages static-host evidence: `research-results/live-agent-suite.md`, average `1.0`, required failures/skips `0`.
- Cloudflare host capability: live headers plus Playwright smoke verified `crossOriginIsolated === true`.

**Caveat:** WebLLM host capability is proven; a specific downloaded WebLLM model answer-quality run is still device/browser dependent and should not be implied unless run.

### Wave C: Final Threshold Review

**Goal:** Decide what can be claimed publicly.

**Complete:**
- `docs/WORLD-CLASS-READINESS-ANALYSIS.md` separates pass, conditional pass, and caveats.
- `LOOP-STATUS.md` names the current release-candidate state and remaining confidence work.

**Pass threshold:** The analysis honestly says the automated/simulated release-candidate threshold passes and names the exact conditional exceptions.

---

## Claiming Rules

- A green repo-owned harness run proves current repo quality, not external adoption.
- A green starter and CLI prove scaffolding exists, not that cold-start adoption is solved.
- A green fresh-app smoke proves packed install/build viability, not full production integration.
- A strict Chrome/Nano CDP pass proves the browser-native local path on that machine/profile, not WebLLM or hosted cloud-route proof.
- A local cloud-route stub proves routing shape, not hosted-provider reachability.
- Live Pages proof validates public static docs/demos, not all provider execution paths.

## Current Release Posture

Edgekit is in a **world-class release-candidate** state by automated/simulated evidence:

- Core architecture, docs, demos, package smoke, and repo-owned outcome quality are strong.
- Clean-room packed-artifact adoption proof passes.
- Strict Chrome/Nano CDP, hosted Cloudflare cloud-route, and no-model fallback lanes pass.
- GitHub Pages remains the public static demo/docs host; Cloudflare proves the Worker/header/cloud-route architecture that Pages cannot.

**Next immediate step:** Push and verify GitHub Pages, then keep independent adopter and WebLLM downloaded-model runs as explicit follow-up evidence.
