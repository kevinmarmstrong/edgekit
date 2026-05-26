# The edge-chat component

Use the Lit web component for the default sidecar UI, prompts, and approval controls.

## Component usage

`<edge-chat>` is a web component. It can live inside any framework or vanilla app surface.



```ts
import '@kevinmarmstrong/edgekit-ui'

const chat = document.querySelector('edge-chat')
chat?.configure({
  model: [chromeAI()],
  downloadPolicy: 'never',
  onNoModel: ({ input }) => fallbackSearch(input),
})
chat?.registerTools({ searchProducts, addToCart })
```

## React wrapper

Use `@kevinmarmstrong/edgekit-react` when a React app wants idiomatic hooks and JSX while preserving the same browser-native runtime and `<edge-chat>` renderer.

`EdgeChat` wraps the web component. `useEdgeAgent()` and `createEdgeAgentController()` expose streaming text, approval state, events, and activity rows for custom React surfaces.



```tsx
import { EdgeChat, useEdgeAgent } from '@kevinmarmstrong/edgekit-react'

function Assistant({ agent }) {
  const edge = useEdgeAgent(agent)

  return (
    <>
      <EdgeChat
        systemPrompt="You are a concise app assistant."
        onReady={chat => chat.useAgent?.(agent)}
      />
      {edge.state.activities.map(activity => (
        <p key={activity.id}>{activity.label}</p>
      ))}
    </>
  )
}
```

## AG-UI agent

Use `useAgent()` when the sidecar should be powered by an AG-UI-compatible backend instead of the built-in browser model cascade.



```ts
import { createAgUiAgent } from '@kevinmarmstrong/edgekit'

const agent = createAgUiAgent({
  endpoint: '/api/ag-ui/support-agent',
})

const chat = document.querySelector('edge-chat')
chat?.useAgent(agent)
```

## User actions

Use `registerActions()` to turn tool results into fillable CTAs. This keeps users out of unnecessary chat-confirmation turns: the agent can search, then the UI can render a size selector, plan picker, support-category menu, booking date field, or other app-specific form before running a registered tool.

Tool-call trace messages are hidden by default. Add the `show-tool-events` attribute when you want visible debugging markers.



```ts
chat?.registerActions(({ toolName, output }) => {
  if (toolName !== 'searchProducts' || !Array.isArray(output.results)) return []

  return output.results.map(product => ({
    id: `add-${product.id}`,
    label: `Add ${product.name} to cart`,
    toolName: 'addToCart',
    description: 'Choose required details before running the app action.',
    input: { productId: product.id, quantity: 1 },
    fields: [
      {
        name: 'size',
        label: 'Size',
        type: 'select',
        required: true,
        options: product.sizes.map(size => ({ label: size, value: size })),
      },
    ],
  }))
})
```

## Built-in states

The component renders the states expected in an embedded agent workflow.

- Provider status: checking, downloading, ready, unavailable, error.
- Download prompt for local model setup when policy allows prompting.
- Approval prompt for guarded tools.
- Optional tool-call markers when `show-tool-events` is enabled.
- Action cards with select, text, and number fields from `registerActions()`.
- No-model fallback messages for browsers without local model support.