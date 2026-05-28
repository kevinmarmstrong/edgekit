Audience: adopter

# Demo Strategy and Gap Analysis

Edgekit demos should do two jobs at once:

1. Give developers, architects, and product managers a concrete picture of what an in-app sidecar can do.
2. Feed the outcome harness with realistic tool calls, user actions, approvals, state changes, and answer-quality checks.

The demo bed is not a marketing carousel. It is a measured product lab.

## App Pattern Map

| App pattern | Why Edgekit fits | Required proof |
| --- | --- | --- |
| Ecommerce and marketplace | Product discovery, fit questions, cart actions, checkout risk | Search tools, generated CTAs, selected variants, guarded cart mutation |
| Internal CRM and success | Account lookup, plan changes, retention workflows, support triage | RBAC tool exposure, account state, approval gates, audit and telemetry |
| ERP and field operations | Work orders, inventory, dispatch, offline or mobile work | Work-order search, inventory reservation, assignment, SLA facts, offline-safe patterns |
| Support console | Ticket triage, queue summaries, structured intake | Forms, tables, charts, AG-UI or EdgeView event streams |
| Admin and governance | High-risk mutations, human approval, compliance evidence | Approval/rejection paths, telemetry, audit trail, policy errors |
| Documentation and developer tools | Project Q&A, integration guidance, agent-readable docs | Docs search, answer synthesis, anti-snippet checks, llms exports |
| Analytics and mission control | Observability for decentralized edge agents | Run, tool, approval, error, and model-status aggregation |
| Healthcare, government, finance | Sensitive data and strict permission boundaries | Local-first routing, redaction, identity/session context, no prompt secrets |

## Current Coverage

| Surface | Current demo | Coverage |
| --- | --- | --- |
| Ecommerce | `https://edgekit-demo-ecommerce.pages.dev/` / `https://github.com/kevinmarmstrong/edgekit-demo-ecommerce` | Externalized in Phase E/F: COOP/COEP Cloudflare Pages mirror, catalog search, action cards, cart mutation, variant preservation, packed-package install proof |
| Docs Q&A | `demos/docs` | Strong: docs search, implementation answers, Skill optimization answers |
| AG-UI | `demos/ag-ui` | Strong: forms, charts, tables, cards, provider transparency |
| SaaS admin | `demos/admin` | Strong: account search, plan update, suspension, approval/rejection |
| Mission control | `demos/mission-control` | Strong: local telemetry and site-wide site assistant events |
| ERP / field ops | `demos/operations` | Stronger: work-order triage, inventory reservation, technician dispatch, role capability clarity, approval/audit/telemetry, scripted-mode transparency, and online/offline posture |
| Cascade and permissions | `demos/cascade` | Strong: browser model states, Nano download consent, WebLLM/cloud-route posture, opt-out, RBAC tool narrowing, approval/EdgeView setup, validation, fallback, hide, and reset loops |

## Gaps To Close Next

| Gap | Why it matters | Candidate demo expansion |
| --- | --- | --- |
| Multi-step workflow chaining | Real agents need to carry state across several app actions | Partially covered in Field ops: workflow state now advances from triage to reservation to ETA monitoring; next expansion should make reserve → assign → ETA a single guided run |
| Role-specific tool manifests | Enterprise buyers need proof that tools hydrate by session role | Covered in Field ops surface: viewer, dispatcher, and supervisor capabilities are visible and backed by e2e assertions |
| Flaky network and offline mutation recovery | Field apps and government workflows often run with unreliable connectivity | Partially covered in Field ops: online/offline posture is visible; next expansion should execute a queued mutation through the offline journal |
| Third-party MCP tool catalog | Developers need to see safe integration beyond local tools | Docs or admin: load mock MCP catalog through a backend-safe adapter |
| Rich generated UI beyond forms | Product teams need to see agentic UX, not text with buttons | AG-UI: map, timeline, comparison table, approval summary |

## Demo Quality Bar

Every compelling demo should include:

- A realistic app surface with domain objects visible before the agent acts.
- At least one read tool and one user-confirmed action or approval-gated mutation.
- Visible state change after the action.
- A rejection or no-mutation safety path for risky operations.
- Visible workflow state, role capability boundaries, approval/audit/telemetry posture, and resilience expectations for internal operational demos.
- Clear scripted-mode disclosure whenever the public demo path does not depend on a live provider or backend.
- Mission Profile + Skills for localization.
- Outcome harness coverage that scores final user-visible text, UI state, app state, and safety.

## Implementation Direction

The next best demo investment is not more chat. It is richer app state:

- Ecommerce proves public conversion workflows.
- Admin proves governed internal mutations.
- Field ops proves ERP-style operational workflows with inventory and dispatch state.
- AG-UI proves dynamic generative UI provider integration.
- Mission control proves observability around all of the above.

Together, these cover the most persuasive adoption story: Edgekit can sit inside real applications, call app-owned tools, preserve app authority, and produce measurable outcomes.
