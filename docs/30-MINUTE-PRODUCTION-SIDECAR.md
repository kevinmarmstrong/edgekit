# 30-Minute Production Sidecar

This is the fastest supported path for an agent-assisted developer to add a high-quality Edgekit sidecar to a real app surface.

The goal is not a generic chatbot. The goal is one narrow mission with real app-owned tools, visible approval boundaries, and outcome tests.

## Minute 0-5: Pick One Mission

Choose a mission narrow enough to test:

- Support: search cases and create a ticket.
- Commerce: answer product questions and add an item to cart.
- Admin: search accounts and request an approved plan change.

Write one sentence:

```text
This sidecar helps [user] do [read task] and [risky task] inside [app surface].
```

## Minute 5-15: Copy The Starter

Copy `docs/templates/mission-profile-starter/profile.ts` into your app as `edgekit/support-profile.ts`.

Or scaffold the same shape with the CLI:

```bash
edgekit-init mission --recipe support-workflow --out edgekit/support
```

Keep these parts:

- `supportSearchSkill`
- `createTicketSkill`
- `supportWorkflowProfile`
- `supportTools`

Replace only the sample data and tool `execute` functions with your app-owned APIs.

## Minute 15-25: Mount The Sidecar

```ts
import '@kevinmarmstrong/edgekit-ui'
import { chromeAI, createCascadeReadinessController, validateMissionProfile } from '@kevinmarmstrong/edgekit'
import { supportTools, supportWorkflowProfile } from './edgekit/support-profile'

const chat = document.querySelector('edge-chat#support-agent')
const readiness = createCascadeReadinessController({
  providers: [chromeAI()],
  downloadPolicy: 'never',
  fallback: true,
  requiredCapabilities: ['tools', 'approvals', 'edgeview'],
  requiredTools: supportWorkflowProfile.requiredTools,
  tools: supportTools,
  visibilityPolicy: 'show-basic-when-local-unavailable',
})

const validation = validateMissionProfile(supportWorkflowProfile, {
  registeredTools: supportTools,
})

if (!validation.ok) {
  throw new Error(validation.errors.map(issue => issue.message).join('\n'))
}

chat?.configure({
  model: [chromeAI()],
  downloadPolicy: 'never',
  toolChoice: 'required',
  cascadeReadiness: readiness,
  telemetry: event => console.debug('[edgekit]', event.name, event),
})

chat?.applyMissionProfile(supportWorkflowProfile)
chat?.registerTools(supportTools)
void readiness.check()
```

```html
<edge-chat
  id="support-agent"
  placeholder="Ask: what urgent support cases are open for Riverside?"
></edge-chat>
```

Optional demo/setup UI:

```html
<edge-cascade-wizard id="support-readiness"></edge-cascade-wizard>
```

```ts
document.querySelector('edge-cascade-wizard#support-readiness')?.configure(readiness)
```

## Minute 25-30: Prove Outcomes

Start with the scenarios in `docs/templates/mission-profile-starter/harness-scenarios.json`.

The release bar is:

- Read-only prompt uses the search tool and surfaces the requested facts.
- Risky prompt requires approval before mutation.
- Rejection preserves state.
- The final answer does not expose tool chatter.
- The host app still owns auth, permissions, data, telemetry, and execution.

## Common Fixes

| Symptom | Fix |
| --- | --- |
| The model answers without tools | Use `toolChoice: "required"` and make sure `requiredTools` match `registerTools()` names. |
| The answer omits important facts | Add those facts to profile `synthesis.requiredAttributes` and the outcome scenario `mustInclude` list. |
| A mutation happens too early | Put `needsApproval: true` on the executable tool, not only in profile metadata. |
| The profile validates but answer quality is weak | Validation is structural. Add outcome scenarios and tune Skill `description`, `instructions`, and examples. |
| A coding agent wants to put JWTs in the prompt | Stop. Use `identityProvider`, `sessionProvider`, `withToolContext()`, and backend authorization instead. |

## Done

You have a production-shaped first sidecar when:

- `validateMissionProfile(profile, { registeredTools })` has zero errors.
- Your outcome scenarios pass at `>= 0.95`.
- Risky work is approval-gated and observable.
- You can explain what the host app owns and what Edgekit owns.
