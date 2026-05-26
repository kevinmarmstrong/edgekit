# Production readiness

Security, telemetry, local/cloud routing, approvals, and release checks for real deployments.

## Local-first defaults

Use Chrome AI or WebLLM for low-cost, private, low-latency work. Escalate only when task complexity, policy, or model availability requires it.

- Use local models for intent classification, simple tool extraction, local app navigation, and privacy-sensitive page context.
- Escalate for deep multi-source reasoning, regulated workflows that require approved server routes, explicit cloud-capable synthesis, or server-side logging policy.

## Tool ownership

The host app owns state, authorization, and business logic. Edgekit calls registered tools; it does not replace backend authorization.

## Risk, telemetry, and security

Every risky mutation must use approval, audit, and telemetry. Rejections must preserve state.

Capture run start, run finish, tool call, approval, rejection, model status, and error events.

Do not put JWTs, cookies, API keys, payment data, or regulated records into system prompts, memory, or state summaries.

## Profile validation

Run `validateMissionProfile(profile, { registeredTools })` in local development, CI, or app startup diagnostics. Validation proves the profile is structurally executable; the outcome harness proves the agent made the right decisions and produced faithful user-visible output.

## Release checklist

Run the release battery before shipping a public release.

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test:e2e`
- `pnpm eval:adoption`
- `pnpm research:agents`
- `pnpm research:suite`
- strict real-provider run when available