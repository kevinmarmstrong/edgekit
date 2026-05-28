Audience: adopter

# Security Threat Model

Edgekit assumes the host application is authoritative for data, identity, authorization, and business logic.

## Main Risks

| Risk | Control |
| --- | --- |
| Prompt secrets | Never put JWTs, cookies, API keys, payment data, or secret claims in prompts, memory, or state summaries. |
| Unauthorized mutations | Keep backend authorization and RBAC checks inside host-owned tools. |
| Silent state changes | Put `needsApproval: true` on risky executable tools and test rejection paths. |
| Over-broad tool exposure | Use `toolProvider()` and RBAC-filtered manifests to hydrate only mission-relevant tools. |
| Third-party tool abuse | Use `createToolPolicyExecutor()` with allowlists, timeouts, payload limits, and abort signals. |
| Sensitive tool output | Apply redactors before UI, telemetry, audit, and cloud handoffs. |
| Cloud escalation leakage | Use explicit cloud routes, bounded handoff envelopes, redaction, and app policy. |

## Host App Owns

- User identity and session validation.
- Tenant and permission checks.
- Database writes and external API calls.
- Payment, account, inventory, and regulated records.
- Production audit persistence and signing.

## Edgekit Owns

- Agent event stream.
- Provider routing and fallback hooks.
- Approval request/resume protocol.
- Declarative sidecar UI primitives.
- Telemetry/audit event contracts.
- Validation and outcome-harness helpers.

## Release Rule

If a prompt can cause money movement, account change, inventory reservation, privileged data access, or regulated workflow state, the runnable tool must enforce authorization and approval. Profile `policy` metadata alone is not a security boundary.
