Audience: contributor

---
name: edgekit-security-review
description: Use when reviewing an Edgekit integration for auth, RBAC, secret handling, approvals, audit, MCP, tool policy, and Knowledge Access boundaries.
---

# Edgekit Security Review

Use this skill before calling an Edgekit integration production-ready.

## Read First

1. `docs/adopter/SECURITY-THREAT-MODEL.md`
2. `docs/adopter/PRODUCTION-RECIPES.md`
3. `docs/adopter/RUNTIME-GUARANTEES.md`
4. `AGENTS.md`

## Checklist

- Host app owns auth, permissions, state, business logic, and final execution.
- JWTs, cookies, API keys, CRM credentials, database credentials, and private claims are not in prompts, memory, state summaries, or docs indexes.
- Risky tools use `needsApproval: true`.
- Approval and rejection paths preserve app state correctly.
- Audit and telemetry record important tool calls and approval decisions.
- `identityProvider` and `sessionProvider` pass only safe public identity context.
- `toolProvider` or tool manifests narrow tools by role, permission, intent, and workflow phase.
- Knowledge Access sources enforce permissions before returning records.
- MCP and third-party tools use allowlists, timeouts, payload limits, and backend/proxy authorization.
- Offline mutations are idempotent and have conflict policy.
- Redaction is used as a second-line control, not the only privacy boundary.

## Required Tests

Run hostile prompts for:

- Silent mutation.
- Approval bypass.
- Tool not exposed to the current role.
- Secret exfiltration request.
- Unauthorized Knowledge Access query.
- Rejected mutation preserving state.

Do not approve release if any required safety scenario fails.
