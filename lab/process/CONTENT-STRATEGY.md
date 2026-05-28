# Edgekit Content Strategy

## Editorial Goal

Make Edgekit read like adopter-first open-source infrastructure: a practical way to add a local-first AI sidecar to an existing web app while the host application keeps control of state, tools, auth, approvals, telemetry, and provider escalation.

This content strategy is shared guidance for README, docs, demos, and LLM-readable exports. Maintainer evidence is important, but it should support trust after the reader understands what they can build.

## Audiences

1. **Adopting product engineers**
   - Need to know what Edgekit is, where it fits, how to install it, and how to ship a first sidecar without surrendering app control.
   - Care about APIs, runtime boundaries, browser/provider behavior, approvals, auth, state ownership, and production readiness.

2. **Agent-assisted developers**
   - Need crisp task shape, repeatable recipes, and files that are easy for another coding agent to modify safely.
   - Care about Skills, Mission Profiles, starter recipes, validation, and outcome scenarios.

3. **Technical evaluators and maintainers**
   - Need proof that the system works across providers, demos, release gates, and adoption loops.
   - Care about research harnesses, reproducibility, release readiness, architecture constraints, and roadmap risk.

4. **App/security owners**
   - Need confidence that Edgekit does not become an uncontrolled hosted chatbot or secret-bearing runtime.
   - Care about least privilege, backend authorization, redaction, audit trails, approval gates, MCP boundaries, and no-secret prompt policy.

## Primary Tagline

Add a local-first AI sidecar to your web app without giving up control of state, tools, or approvals.

Use this sentence as the default README and public-docs pitch unless a surface has stricter space constraints.

## Message Hierarchy

1. **What it is**
   - Edgekit is an embeddable browser-native agent sidecar runtime for web apps.

2. **Why it matters**
   - It lets teams add agentic help, tool use, approvals, and generative UI without turning their product into a hosted chatbot service.

3. **Control model**
   - The host app owns state, auth, data access, business logic, and mutation execution.
   - Edgekit owns the sidecar runtime, local-first model routing, tool-call contract, approval UX, rendering, telemetry hooks, and validation helpers.

4. **Adoption path**
   - Pick one mission.
   - Define Skills for capabilities.
   - Assemble a Mission Profile.
   - Register app-owned tools.
   - Mount `<edge-chat>`.
   - Validate outcomes with realistic prompts.

5. **Proof and maintainer evidence**
   - Release evidence, research loops, provider matrices, and world-class readiness analysis belong after the adoption path or in explicitly labeled maintainer docs.

## Docs Information Architecture

The public docs should keep this ordering:

1. **Overview**
   - Pitch, control model, local-first provider path, and when to use Edgekit.

2. **Quick Start**
   - Install/build, run a demo, and build a first sidecar with Skills + Mission Profiles.

3. **Core Concepts**
   - Primitives, Skills, Mission Profiles, tools, actions, approvals, providers, state hydration, telemetry, audit, memory, and AG-UI.

4. **Recipes**
   - Support workflow, Knowledge Access, framework-specific starters, and other repeatable app patterns.

5. **Production Readiness**
   - Runtime guarantees, auth boundaries, redaction, audit, RBAC, provider fallback, deployment headers, and escalation patterns.

6. **Testing and Outcome Quality**
   - Structural validation, workflow tests, adoption-quality checks, model/provider checks, and scenario authoring.

7. **Maintainer / Release Evidence**
   - Research loops, public release workflow, strict provider evidence, reproducibility, world-class readiness analysis, and loop status.

8. **Reference**
   - Package APIs, CLI, EdgeView, MCP adapters, AG-UI, examples, and migration/upgrades.

## Adopter vs Maintainer Docs

Adopter docs should include:

- A narrow mission-first path.
- Exact APIs and commands needed to build a first sidecar.
- Clear host-app ownership boundaries.
- Skills + Mission Profiles as the recommended integration model.
- Honest provider requirements and fallback behavior.
- Approval, telemetry, audit, redaction, and security recipes.
- Outcome scenarios that adopters can copy into their own app.

Maintainer docs should include:

- Research harness command batteries.
- Release gates and thresholds.
- Provider matrix evidence.
- Loop status, readiness analysis, and internal iteration logs.
- Distribution, clean-room proof, public deploy, and reproducibility evidence.
- Skill optimization methodology and held-out scoring policy.

When a document serves both audiences, lead with adopter value and put maintainer machinery in a clearly labeled section.

## LLM Export Policy

LLM-readable exports should optimize for accurate adoption, not internal theater.

- Include the tagline, product definition, control model, and Skills + Mission Profiles path near the top.
- Include exact package names, important APIs, and safe starter commands.
- Include security boundaries: no JWTs/cookies/API keys in prompts or `stateProvider`, backend authorization for sensitive tools, no broad browser MCP access, approval gates for risky mutations.
- Include provider truth: Chrome AI and WebLLM are local-first paths; cloud routes must be developer-provided and explicit; no-model behavior should be honest.
- Include maintainer evidence links only after the adoption path.
- Do not foreground WORLD-CLASS, LOOP, or research harness language in the first screen of LLM exports.
- Do not flatten technical docs into marketing copy. LLM exports should keep API names, command names, and boundary language precise.
- Mark scripted demos and backend/provider demos honestly so downstream agents do not misrepresent requirements.

## Voice And Style

- Lead with builder utility, not internal achievement.
- Prefer "host app owns..." over vague trust language.
- Prefer "build a first sidecar" over "run the full suite" in onboarding.
- Keep proof concrete but secondary.
- Say "Edgekit" in prose and `edgekit` only for package, CLI, or repository references.
