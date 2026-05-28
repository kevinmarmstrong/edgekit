Audience: adopter

# Mission Profile Authoring

Mission Profiles are the app-owned artifact for one localized Edgekit sidecar. They let you describe the mission, expected tools, safety posture, synthesis requirements, and runtime defaults without moving business logic out of the host app.

## What Belongs Where

- **Primitive**: model routing, execution, telemetry, audit, redaction, rendering, memory, and provider adapters.
- **Knowledge Access Skill**: a read-only Skill wrapping an app-owned retrieval source. The source may be Markdown, keyword search, vector search, GraphRAG, SQL, or a private API; Edgekit expects citations, freshness, and outcome tests rather than owning the index.
- **Skill**: one capability with examples, approval posture, required facts, and UI hints.
- **Mission Profile**: the assembly for one sidecar mission in one app surface.

Skills have two important authoring surfaces:

- `description`: router-visible. Keep it short and precise because routers may see this before activation.
- `instructions`: activated body. Keep it compact and procedural because the agent sees this only after the Skill is selected.

Test both surfaces end to end. A strong `instructions` body does not help if the router description activates the wrong Skill or misses the right one.

## Minimal Profile

```ts
const profile = createMissionProfile({
  id: 'support-queue-v1',
  mission: 'support-workflow',
  version: '1.0.0',
  systemPrompt: 'Search the support queue before answering. Ask for approval before creating tickets.',
  requiredTools: ['searchTickets', 'createTicket'],
  defaults: { toolChoice: 'required', downloadPolicy: 'never' },
  synthesis: { requiredAttributes: ['ticketId', 'status', 'owner'], style: 'explicit' },
})
```

## Executable Tools Stay App-Owned

Profiles declare what tools the sidecar expects. The host app still registers executable implementations.

```ts
chat.applyMissionProfile(profile)
chat.registerTools({ searchTickets, createTicket })
```

Validate the profile against the registered tool surface before release:

```ts
const validation = validateMissionProfile(profile, {
  registeredTools: ['searchTickets', 'createTicket'],
})

if (!validation.ok) {
  throw new Error(validation.errors.map(issue => issue.message).join('\n'))
}
```

`validateMissionProfile()` catches structural foot-guns such as missing ids, duplicate `requiredTools`, `toolChoice: "required"` with no tool contract, and required tools that the host app never registered.

## Runtime Guarantees

Some Profile and Skill fields are runtime-enforced today, and some are authoring contracts used by docs, coding agents, and the harness. Before relying on a field for safety or compliance, check [Runtime Guarantees](./RUNTIME-GUARANTEES.md).

In short: `requiredTools`, safe profile application, registered executable tools, `needsApproval`, telemetry, and audit primitives have runtime behavior. `synthesis`, mission-level `policy`, `uiAffordances`, and optimization metadata are guidance until the harness or a future runtime helper consumes them.

## Quality Checklist

- The profile names a narrow mission.
- Each expected tool maps to a real app-owned implementation.
- `validateMissionProfile(profile, { registeredTools })` passes with zero errors.
- Risky tools require approval.
- Required facts are tested in final user-visible output.
- Telemetry and audit are wired before release.
- State and identity providers summarize context without exposing secrets.

## Optimization

For measured self-improvement loops, see [Skill Optimization](./SKILL-OPTIMIZATION.md). Edgekit follows the SkillOpt lesson that skill edits should be bounded, held-out validation should be strict, ties should be rejected, and protected slow-state sections should not be changed by normal fast-edit loops.
