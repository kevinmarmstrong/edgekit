# Production Recipes

These recipes show the minimum production shape for real applications.

Use them as implementation patterns, not certification claims. A production
sidecar is ready when the host app has wired the contract, run outcome tests,
and recorded evidence for the provider path it will actually ship.

## Ownership Boundary

Edgekit is strongest when each responsibility has one owner.

| Concern | Host App Owns | Edgekit Owns |
| --- | --- | --- |
| Identity | Login, session cookies, JWTs, tenant and permission truth | Safe public identity summaries through `identityProvider` or `sessionProvider` |
| Authorization | Backend checks inside every executable tool | RBAC-filtered tool visibility and validation helpers |
| Business state | Cart, orders, accounts, inventory, tickets, records | Tool-call events, approval prompts, and UI rendering |
| Knowledge | Retrieval pipeline, indexes, graph/vector stores, freshness | Knowledge Access Skill contract, citations, faithfulness tests |
| Mutations | API routes, idempotency, validation, conflict handling | Approval protocol, mutation journal primitives, telemetry/audit events |
| Observability | Long-term storage, alerts, dashboards, compliance reporting | Event contract and in-memory mission-control aggregator |
| Model escalation | Provider secrets, rate limits, cloud routes | Local-first routing hooks and handoff envelopes |

Do not move app authority into prompts. Put authority in executable tools,
backend policy, and outcome tests.

## Knowledge Access

Treat retrieval as a Skill category, not as a separate chatbot mode. Wrap each knowledge source with `EdgeKnowledgeSource`, expose it through `createKnowledgeTool()` or `createKnowledgeSkill()`, and keep permissions inside the source or backend query.

Use Markdown or JSON for small local knowledge. Use LlamaIndex, LangChain, Qdrant, pgvector, Pinecone, Weaviate, Neo4j GraphRAG, SQL, or private APIs when the source is larger or dynamic. Edgekit should receive normalized results with title, excerpt, source, URI, citations, score, and freshness metadata.

Outcome tests should prove that retrieved facts and citations survive into the final visible answer or generated UI. A successful retrieval call is not enough.

## Telemetry

```ts
chat.configure({
  telemetry: event => {
    analytics.track('edgekit.event', {
      name: event.name,
      sessionId: event.sessionId,
      runId: event.runId,
      toolName: event.toolName,
      approved: event.approved,
      provider: event.provider,
      status: event.status,
    })
  },
})
```

Capture run start/finish, model status, tool calls/results, approval decisions, errors, and UI actions.

### Event Contract To Persist

At minimum, persist enough data to answer these questions after a support ticket,
audit request, or incident:

| Question | Required fields |
| --- | --- |
| Which provider path ran? | `sessionId`, `runId`, `provider`, model status events, fallback mode |
| What did the user ask? | prompt hash or redacted prompt, route/view summary, timestamp |
| What tools were available? | tool names, role/permission snapshot, profile id/version |
| What tool ran? | tool name, redacted input/output, duration, error code |
| Was a mutation approved? | approval id, tool call payload hash, decision, actor id, timestamp |
| What did the user see? | final text hash, EdgeView/action id, outcome scenario id when tested |

Do not store raw regulated data in analytics by default. Hash or redact prompt,
tool, and final-answer payloads unless the host app has an approved retention
policy.

## Audit Persistence

```ts
const auditTrail = createAuditTrail({
  sessionId: session.id,
  hash: async value => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
  sink: entry => fetch('/api/audit/edgekit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(entry),
  }),
})
```

Persist audit entries server-side for regulated workflows. The browser hash chain is useful evidence, but compliance systems should sign or store entries server-side.

### Approval Ledger Pattern

For high-risk tools, store the approval as a separate ledger row from the tool
result. This makes rejection and failed execution auditable without implying
that a mutation succeeded.

| Row | When written | Required proof |
| --- | --- | --- |
| `approval_requested` | Before rendering the approval UI | tool name, redacted input, risk label, profile id |
| `approval_decided` | When the human clicks approve/reject | actor id, decision, timestamp, payload hash |
| `tool_started` | After approval and backend authorization | idempotency key, backend policy version |
| `tool_finished` | After the app-owned API returns | success/failure, redacted output, state version |

If the user rejects a mutation, there should be no `tool_started` row. Outcome
tests should assert both the visible rejection message and the unchanged app
state.

## RBAC And Session Bridge

```ts
chat.configure({
  identityProvider: () => ({
    id: currentUser.id,
    tenantId: currentTenant.id,
    roles: currentUser.roles,
    permissions: currentUser.permissions,
  }),
  toolProvider: ({ input, session }) =>
    filterToolManifestsForSession(toolManifests, session)
      .filter(manifest => /suspend|plan/i.test(input) ? !manifest.readOnly : true)
      .reduce((tools, manifest) => ({ ...tools, [manifest.name]: manifest.tool }), {}),
})
```

Put public identity and permissions in Edgekit context. Keep JWTs and secret claims in the backend or tool execution context.

### Dynamic Tool Exposure

Treat the model-visible tool surface as a capability grant, not a static list.
Expose read tools broadly, then hydrate mutation tools only when the session,
role, and prompt justify them.

```ts
const toolsByRole = ({ input, session }) => {
  const manifests = filterToolManifestsForSession(toolManifests, session)
  const wantsMutation = /\b(update|cancel|suspend|reserve|assign|submit)\b/i.test(input)
  return toolsFromManifests(
    manifests.filter(manifest => wantsMutation || manifest.readOnly),
  )
}

chat.configure({ toolProvider: toolsByRole })
chat.registerTools(allExecutableTools) // UI action forms can still execute approved app tools.
```

The backend must still authorize every tool call. Tool visibility reduces model
confusion and accidental proposals; it does not replace enforcement.

## State Hydration

```ts
chat.configure({
  stateProvider: () => ({
    route: location.pathname,
    view: 'Checkout',
    summary: 'Cart has 2 items. User is choosing shipping.',
  }),
})
```

Summarize current app state. Do not dump raw DOM or secret data.

Good state summaries are short, specific, and replaceable:

- `Checkout page. Cart has 2 items. Shipping method not chosen.`
- `Account admin page. User role: success_manager. Account plan: Pro.`
- `Field ops dispatch page. WO-1842 critical, unassigned, CMP-44 stock 2.`

Bad state summaries include raw DOM, cookies, JWT claims, hidden form values,
payment details, or entire database records.

## Local Vs Cloud Escalation

Use local browser models for intent, tool extraction, page help, simple Q&A, and privacy-sensitive context. Escalate through developer-owned cloud routes for deep multi-source synthesis, policy-required server logging, or tasks where local models repeatedly fail outcome tests.

### Capability-Gated Public UX

Public sites must expect mixed browser capability. Pair the cascade with a
readiness controller so the product can decide whether to show full agent mode,
basic mode, a model-download prompt, or no agent surface.

```ts
const readiness = createCascadeReadinessController({
  providers: [chromeAI(), webLLM()],
  downloadPolicy: 'never',
  fallback: true,
  requiredCapabilities: ['tools', 'approvals', 'edgeview'],
  requiredTools: ['searchProducts', 'addToCart'],
  tools,
  visibilityPolicy: 'show-basic-when-local-unavailable',
})

const snapshot = await readiness.check()
if (snapshot.recommendedAction.type === 'hide') hideAgentSurface()
if (snapshot.recommendedAction.type === 'fallback') showBasicModeBanner(snapshot.message)
```

For controlled internal apps, `downloadPolicy: "prompt"` can ask the user to
enable a local model. For public marketing/docs pages, prefer
`downloadPolicy: "never"` and transparent fallback until the user explicitly
chooses a richer local-model experience.

## Recipe Shape

Every opinionated recipe should remain additive to the core docs. A recipe can
know about Astro, support workflows, intake pipelines, ERP dispatch, or a
specific retrieval stack, but it should still emit the same Edgekit primitives:

- 2-5 Skills
- one Mission Profile
- typed app-owned tools
- explicit approval policy for mutations
- telemetry and audit hooks
- Knowledge Access when retrieval is needed
- outcome scenarios for read, approve, reject, no-evidence, and hostile prompts
- replacement notes that identify exactly what the real app should own
