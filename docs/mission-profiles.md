# Mission Profile authoring

Design Skills and Mission Profiles that localize one sidecar mission while executable tools remain app-owned.

## What belongs where

Primitives are Edgekit-owned runtime capabilities: model routing, execution, telemetry, audit, redaction, rendering, memory, and provider adapters.

Skills describe one capability with examples, approval posture, required facts, and UI hints. Mission Profiles assemble those Skills into one app-owned sidecar mission.

## Minimal profile

Profiles should name a narrow mission, list expected app-owned tools with `requiredTools`, set local-first defaults, and spell out synthesis rules that the harness can test.



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

## Executable tools stay app-owned

A profile declares expected tools. The host app still registers executable implementations, owns authorization, and remains the source of truth for state changes.



```ts
chat.applyMissionProfile(profile)
chat.registerTools({ searchTickets, createTicket })
```

## Validate before mounting

`validateMissionProfile()` catches structural foot-guns before users hit the sidecar: missing ids, duplicate required tools, `toolChoice: "required"` with no tool contract, and required tools that were never registered.



```ts
const validation = validateMissionProfile(profile, {
  registeredTools: ['searchTickets', 'createTicket'],
})

if (!validation.ok) {
  throw new Error(validation.errors.map(issue => issue.message).join('\n'))
}
```

## Quality checklist

Use this checklist before treating a profile as production-ready.

- The profile names a narrow mission.
- Each expected tool maps to a real app-owned implementation.
- `validateMissionProfile(profile, { registeredTools })` passes with zero errors.
- Risky tools require approval.
- Required facts are tested in final user-visible output.
- Telemetry and audit are wired before release.
- State and identity providers summarize context without exposing secrets.