# @kevinmarmstrong/edgekit-ui

Lit web component UI for Edgekit sidecars.

Use it when an existing web app wants to mount a browser-native agent surface without adopting a specific frontend framework.

```ts
import { mountChat } from '@kevinmarmstrong/edgekit-ui'
import { chromeAI } from '@kevinmarmstrong/edgekit'
import { supportTools, supportWorkflowProfile } from './support-profile'

const chat = mountChat('#assistant', {
  missionProfile: supportWorkflowProfile,
  tools: supportTools,
  agentTitle: 'Ask me anything',
  agentSubtitle: 'About this workflow',
  statusText: '',
  placeholder: 'Ask for support help',
  model: [chromeAI()],
  telemetry,
})
```

For public sites that use `downloadPolicy: "never"` and a grounded fallback, prefer
the lite entry:

```ts
import { mountChat } from '@kevinmarmstrong/edgekit-ui/lite'
```

Pair it with `createGroundedQaSkill()` from `@kevinmarmstrong/edgekit-knowledge`
when adding Q&A to a public website.

```html
<div id="assistant"></div>
<edge-cascade-wizard></edge-cascade-wizard>
```

For direct element usage, `<edge-chat>` also supports `agent-title`, `agent-subtitle`, `status-text`, `placeholder`, `ready-message`, and `show-tool-events` attributes.

The component exposes CSS custom properties such as `--edge-chat-accent`, `--edge-chat-font-family`, `--edge-chat-radius`, and `--edge-chat-shadow`, plus `::part()` hooks for `header`, `title`, `subtitle`, `status`, `messages`, `message`, `user`, `assistant`, `system`, `form`, `input`, `button`, and `send-button`.

`<edge-cascade-wizard>` is optional demo-grade UI for the headless `createCascadeReadinessController()` contract. Production apps can replace it with their own banner, setup wizard, settings panel, or feature gate.

The host app owns state, authorization, business logic, and tool execution. The component renders chat, activity states, EdgeView cards/forms/tables/charts, approval prompts, and optional cascade-readiness status.

Action forms are resolved through the active tool surface. If the app uses a `toolProvider` or RBAC-filtered `toolManifests`, generated forms can only call tools exposed for the current session and intent. Forms produced by host-owned `registerActions()` are trusted user-confirmed CTAs; arbitrary EdgeView or AG-UI forms cannot execute approval-gated tools directly.
