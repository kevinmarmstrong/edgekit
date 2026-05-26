# @kevinmarmstrong/edgekit-ui

Lit web component UI for Edgekit sidecars.

Use it when an existing web app wants to mount a browser-native agent surface without adopting a specific frontend framework.

```ts
import '@kevinmarmstrong/edgekit-ui'
import { chromeAI, validateMissionProfile } from '@kevinmarmstrong/edgekit'
import { supportTools, supportWorkflowProfile } from './support-profile'

const chat = document.querySelector('edge-chat')

const validation = validateMissionProfile(supportWorkflowProfile, {
  registeredTools: supportTools,
})
if (!validation.ok) throw new Error(validation.errors.map(issue => issue.message).join('\n'))

chat?.configure({ model: [chromeAI()], telemetry })
chat?.applyMissionProfile(supportWorkflowProfile)
chat?.registerTools(supportTools)
```

```html
<edge-chat placeholder="Ask for support help"></edge-chat>
<edge-cascade-wizard></edge-cascade-wizard>
```

`<edge-cascade-wizard>` is optional demo-grade UI for the headless `createCascadeReadinessController()` contract. Production apps can replace it with their own banner, setup wizard, settings panel, or feature gate.

The host app owns state, authorization, business logic, and tool execution. The component renders chat, activity states, EdgeView cards/forms/tables/charts, approval prompts, and optional cascade-readiness status.
