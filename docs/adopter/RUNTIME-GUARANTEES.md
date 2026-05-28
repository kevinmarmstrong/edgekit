Audience: adopter

# Runtime Guarantees

Edgekit has two kinds of contracts:

- **Runtime guarantees**: enforced by core, UI, tests, or tool execution.
- **Authoring contracts**: metadata that guides humans, coding agents, docs, and harnesses, but is not yet enforcement by itself.

Use this page when deciding what Edgekit guarantees and what the host app must still own.

## Guarantee Matrix

| Surface | Purpose | Runtime-enforced today | Harness-enforced today | Host app responsibility |
| --- | --- | --- | --- | --- |
| `EdgeMissionProfile.id`, `mission`, `version`, `systemPrompt` | Stable profile identity and mission localization | `validateMissionProfile()` errors on missing fields | Profile validation probes | Version and review profiles |
| `requiredTools` | Declare executable tools the host must register | Validation detects missing registered tools when provided | Research suite checks validation failures | Register real app-owned implementations |
| `EdgeKnowledgeSource` | Normalize app-owned retrieval into cited results | `createKnowledgeTool()` returns source, results, and optional freshness metadata | Knowledge grounding and citation scenarios | Own indexing, authorization, reranking, and freshness policy |
| `defaults.toolChoice` | Configure model/tool behavior | Applied through `applyMissionProfile()`/`profileToAgentOptions()` | Browser and architecture probes | Choose mission-appropriate defaults |
| `tools` on profile | Optional executable tools | Non-empty maps are passed to agent config; empty maps do not wipe registered tools | Unit tests cover no tool-wiping | Prefer `registerTools()` for app functions |
| `synthesis` | Facts that must survive into final UI/text | Authoring-only warning today | `synthesisFaithfulness` scenarios | Write prompts/tests that prove final answers |
| `policy` on profile | Mission-level safety intent | Authoring-only warning today | Adoption/security checks | Enforce approvals on executable tools |
| `uiAffordances` | Rendering intent for CTAs/forms | Authoring-only warning today | Generative UI checks | Render with `registerActions()`, EdgeView, or AG-UI |
| `EdgeSkill.description` | Router-visible skill surface | Stored and typed | Skill optimization checks | Keep short and accurate |
| `EdgeSkill.instructions` | Activated skill body | Stored and typed | Outcome and optimization checks | Keep compact and procedural |
| Tool `needsApproval` | Pause risky mutations | Approval request/resume events in core/UI | Workflow tests and research suite | Mark every risky mutation |
| EdgeView form actions | Run user-confirmed UI actions | Forms resolve against the active tool surface; untrusted generated forms cannot execute approval-gated tools | UI unit tests and E2E workflow tests | Use `registerActions()` for host-owned CTAs and keep backend authorization in tools |
| Redactors | Keep sensitive tool data out of visible and future model context | Tool outputs are redacted before UI, telemetry, audit, and stored model history | Unit tests and privacy scenarios | Minimize prompts and add domain-specific redactors |
| Telemetry sink | Observe runs/tools/approvals/errors | Events emitted by agent/UI | Mission-control checks | Forward to production observability |
| Audit trail | Hash-chain tool/approval events | Core audit primitive records entries | Architecture probes | Persist/sign server-side for compliance |

## Practical Rule

If a value changes state, authorization, money, account status, inventory, or regulated data, do not rely on profile metadata alone. Put the guardrail on the executable tool, keep backend authorization in the host app, and test the full user-visible workflow.

## Validation vs Outcome Quality

`validateMissionProfile(profile, { registeredTools })` proves the sidecar is structurally executable. It does not prove the model made the right decision or said the right thing.

The outcome harness proves behavior. It must check tool decisions, approval boundaries, final answer faithfulness, generated UI, app state, hostile inputs, provider fallback, and observability.
