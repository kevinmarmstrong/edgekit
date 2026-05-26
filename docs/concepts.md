# Core architecture

Understand providers, fallback, tools, approvals, state, and the event stream.

## Model cascade

The default strategy tries local browser providers first. Chrome AI can be used when the browser exposes it. WebLLM can be used on hosts with the right cross-origin isolation headers. If no model is available, apps can provide a deterministic fallback through `onNoModel`.

- `downloadPolicy: "never"` avoids model downloads and is useful for public demos.
- `downloadPolicy: "prompt"` lets the UI ask before a model download.
- `downloadPolicy: "auto"` is useful for explicit eval sessions or controlled environments.

## Tools are app capabilities

Tools should wrap real app capabilities rather than duplicate business logic. Search, retrieve, update, create, cancel, suspend, add-to-cart, and submit-order actions can all be represented as tools.

For optional tool fields, use `modelOptional(schema)`. Browser models may send `null` for an unspecified slot, and the tool should normalize that the same way it handles absence.

## Human approval

Set `needsApproval: true` on tools that change important state. edgekit emits an approval request, the UI renders approve/reject controls, and `respondToApproval()` resumes the agent turn with the approval decision plus the original approved tool call.

Custom providers and deterministic test harnesses should continue from that approved tool call instead of reconstructing the mutation from user text. That keeps fields such as selected size, account id, plan, quantity, or reason intact across the approval boundary.

## Agent events

The core agent streams status, text, tool calls, tool results, declarative views, approval requests, no-model fallbacks, errors, and done events.



```ts
for await (const event of agent.send('upgrade Northwind to Enterprise')) {
  if (event.type === 'tool-call') console.log(event.toolName, event.input)
  if (event.type === 'view') renderEdgeView(event.view)
  if (event.type === 'approval-request') showApproval(event)
}
```

## EdgeView

EdgeView is the default declarative UI layer. `registerActions()` compiles into EdgeView cards and forms, and AG-UI custom events can carry EdgeView payloads. This gives developers a stable, framework-neutral way to render text, cards, forms, tables, and simple charts before adopting a broader A2UI renderer.

## AG-UI compatibility

Use `createAgUiAgent()` when the agent comes from an AG-UI ecosystem backend instead of the browser-native model cascade. Edgekit accepts text events, tool-result events, and custom `edgekit.view` or A2UI-style view events.

Without AG-UI, use `registerTools()` plus `registerActions()` to keep the agent fully browser-native and app-owned. With AG-UI, attach an external event stream with `useAgent()` and keep the same EdgeView renderer for rich UI.

The public GitHub Pages AG-UI demo intentionally uses a scripted mock stream because Pages cannot run a provider backend. It is a renderer and protocol demo, not a general-purpose hosted agent.

- Standard AG-UI HTTP/SSE endpoint: pass `createAgUiAgent({ endpoint })` and attach it with `chat.useAgent(agent)`.
- @ag-ui/client or HttpAgent-backed service: expose the same event stream endpoint, or adapt its event iterator through `createAgUiAgent({ run })`.
- CopilotKit, LangGraph, CrewAI, or other AG-UI bridges: keep their backend agent runtime, then let Edgekit render the user-facing event stream inside your app.
- Backend dependency: a hosted route or worker that can stream AG-UI events, hold provider secrets, enforce rate limits, and call only the app tools you expose.