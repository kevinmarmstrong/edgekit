# Edgekit — World-Class Definition

**Purpose**: This document defines the concrete bar we must hit before declaring Edgekit "world class and production-ready" for its two target personas. It is the ultimate success criteria for the ongoing Document → Implement → Test → Learn loop.

Everything we build is measured against this.

---

## Target Personas

### Persona 1: The World's Best Programmer
- Extremely high standards for clarity, power, and correctness.
- Wants to understand the full system and have escape hatches.
- Values precise mental models, excellent types, great observability, and zero hidden magic.
- Will ship to real users and cares deeply about reliability, upgrade safety, and debuggability.

### Persona 2: Agent-Assisted Vibe Coder
- Works primarily with AI agents (Claude, Cursor, Grok, etc.) to build.
- Wants maximum leverage with minimum friction.
- Expects that following clear patterns + good examples will produce high-quality results quickly.
- Values "it just works at a high level" while still having guardrails and visibility when things go wrong.

**Success for both personas**: After a modest time investment, they can ship a production-grade, localized agentic sidecar into a real application and feel confident in its quality and maintainability.

---

## World-Class Criteria

### 1. Outcome Quality (Non-Negotiable — Measured on Real Local Models)

Using the existing research harness (real Chrome downloaded model, strict mode, realistic prompts):

- Core missions (at minimum: public catalog shopping + docs Q&A + one admin-style workflow) must achieve:
  - Average score ≥ 0.98
  - **Zero required failures** across `safety`, `workflowState`, `synthesisFaithfulness`, and `answerQuality`
- A new, realistic mission created by following the documented patterns must reach ≥ 0.95 average score on its first serious harness run after reasonable tuning.
- The agent must reliably do useful work (correct tool calls + approvals + state changes) **and** produce faithful, high-quality answers.

If this bar is not met, nothing else matters.

### 2. Mental Model & Architecture Clarity

- The three-layer model (Primitives → Skills → Mission Profiles) must be the dominant, clearly explained mental model in the documentation.
- An elite programmer should be able to explain the full architecture and the upgrade/safety story after reading the key docs once.
- An agent-assisted coder should be able to build a high-quality sidecar by following examples and a "recipe" without needing to deeply understand the primitives layer.

### 3. Onboarding & Time-to-Value

**For the elite programmer**:
- Within 60–90 minutes they should be able to take a real surface in one of their own apps and have a working, high-quality localized sidecar running against real tools, with proper approvals, telemetry, and synthesis behavior.

**For the agent-assisted vibe coder**:
- Within 30–45 minutes (following the guided path + examples + agent assistance) they should have a production-grade sidecar for a realistic mission with excellent outcome quality on the harness.

### 4. Documentation Quality

- README + ARCHITECTURE.md + AGENTS.md + a "Getting Started for Real Apps" guide must form a complete, coherent story.
- Multiple worked examples of real missions (not toy demos) must exist and be the primary teaching tool.
- Production concerns must be covered at a level that gives both personas confidence (error handling, testing, monitoring, upgrades, security boundaries, cost/latency thinking).

### 5. Demo Quality

Demos must feel like **real product surfaces** that a competent team would be proud to ship, not just technical showcases.

Each major demo should:
- Demonstrate a complete, realistic mission.
- Use the Skills + Profile pattern as the primary implementation.
- Achieve high scores on the research harness when run with real local models.
- Include clear production-oriented notes (what would be different in a real app, what telemetry is valuable, etc.).

### 6. Production Readiness Signals

- Clear, honest guidance on when local models are appropriate vs. when escalation is recommended.
- Strong defaults and guardrails that make it hard to ship something dangerous.
- Excellent telemetry and debugging story out of the box.
- Documented upgrade and migration strategy.
- The architecture demonstrably allows rapid core evolution without forcing constant changes in application code.

---

## Definition of Done (When We Can Stop the Aggressive Loop)

We can consider the core product, docs, and demos "world class and production-ready" when:

1. The outcome quality criteria in section 1 are consistently met across multiple missions.
2. Both target personas report (or we can confidently simulate) that they can get to production-grade results significantly faster and with higher confidence than with raw `configure()` + tools approaches.
3. The Skills + Mission Profiles pattern is the clearly dominant and recommended way to build sidecars in all public materials.
4. We (the creators) feel **extremely proud** of the overall experience — the architecture feels right, the documentation is crisp, the demos are legitimately impressive, and we would happily recommend it to top-tier teams today for real production use.

Until all of the above is true, we keep running the loop.

---

This document is the ultimate reference. Every major iteration should be able to point to concrete movement against these criteria.
