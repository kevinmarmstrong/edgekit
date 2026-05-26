# Production Readiness

Use this checklist before shipping Edgekit to real users. The bar is not "the chat responds"; the bar is reliable agentic work inside the app under the app's authority.

## Local-First Defaults

Use Chrome AI or WebLLM for low-cost, private, low-latency work. Escalate only when task complexity, policy, or model availability requires it.

| Use local browser model when | Escalate when |
| --- | --- |
| Intent classification | Deep multi-source reasoning is required |
| Simple tool extraction | A regulated workflow requires an approved server route |
| Local app navigation | The user explicitly needs cloud-capable synthesis |
| Privacy-sensitive page context | Developer policy requires server-side logging |

## Capability-Gated UX

Public users arrive with different browsers, local model download states, device policies, and network constraints. Do not present the same agent promise to every visitor.

Use `createCascadeReadinessController()` before or alongside `createAgent()` to produce a headless readiness snapshot:

- `continue`: local browser model is ready.
- `prompt`: a local model can be enabled and the app should ask for consent.
- `suggest`: the user can switch browser/device or use a reduced mode.
- `message`: show transparent status without asking for action.
- `fallback`: run a basic app-owned fallback while keeping the limitation visible.
- `hide`: hide the sidecar or disable agent-only features until requirements are met.

The optional `<edge-cascade-wizard>` component is demo UI for that contract. Production apps should render the snapshot in whatever surface fits their workflow: onboarding wizard, settings drawer, disabled CTA, support banner, or nothing at all.

## Tool Ownership

The host app owns state, authorization, and business logic. Edgekit calls registered tools; it does not replace backend authorization.

## Risky Mutations

Every risky mutation must use approval, audit, and telemetry. Rejections must preserve state.

## Telemetry

Capture run start, run finish, tool call, approval, rejection, model status, and error events. Use mission control locally and forward events to your own observability stack in production.

## Security

Do not put JWTs, cookies, API keys, payment data, or regulated records into system prompts, memory, or state summaries. Keep secrets in tool execution context and enforce permissions on the backend.

## Upgrade Strategy

Version Mission Profiles. Keep executable tools app-owned. Treat profile metadata as a stable authoring contract, and use validation plus harness results before adopting new runtime behavior.

## Profile Validation

Run `validateMissionProfile(profile, { registeredTools })` as part of local development, CI, or app startup diagnostics. Validation should fail the release when required tools are missing, profile identity fields are blank, `requiredTools` contains duplicates, or `toolChoice: "required"` is configured without an executable tool contract.

Validation does not replace outcome testing. It proves the profile is structurally executable; the harness proves the sidecar made the right decisions and said the right thing to the user.

## Runtime Guarantees

Before treating a Profile or Skill field as a production control, confirm whether it is enforced at runtime or is an authoring/harness contract. See [Runtime Guarantees](./RUNTIME-GUARANTEES.md).

Production safety should rely on executable controls: backend authorization, RBAC-filtered tool manifests, `needsApproval` on mutating tools, telemetry, audit persistence, redaction, and outcome tests. Do not rely on descriptive `synthesis`, `policy`, or `uiAffordances` metadata alone.

## Release Checklist

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test:e2e`
- `pnpm eval:adoption`
- `pnpm research:agents`
- `pnpm research:suite`
- strict real-provider run when available
