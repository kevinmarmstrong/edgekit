# Edgekit Marketing Brief

## Working Position

Edgekit helps teams add agentic workflows to existing web apps without rewriting the app, losing control of business logic, or accepting runaway cloud-token costs.

For new products, Edgekit helps teams build agent-ready workflows from day one: the app remains the durable software tool, while the agent worker can change, improve, and route across models over time.

## The Core Thesis

Software tools and agent workers have different lifecycles. Do not weld them together.

The software tool needs stable state, permissions, APIs, UI, audit, compliance, tests, and predictable releases. The agent worker changes constantly: models improve, prompts change, routing changes, Skills get tuned, providers come and go, and UX patterns evolve.

Edgekit creates the boundary between the two.

Your app remains the system of record and the durable tool. The agent becomes an interchangeable worker that uses the tool through explicit, governed interfaces.

## Primary Audience

Edgekit is for teams that already have, or are building, real software workflows.

- Product engineers adding AI agents to existing apps.
- Technical founders building agent-ready products from scratch.
- Product managers who want useful agent features without a risky rewrite.
- Enterprise architects who need AI adoption without collapsing existing systems.
- Security and platform teams that care about auth, permissions, audit, and data boundaries.
- Coding agents helping developers implement Edgekit correctly.

## The User's Actual Problem

The user is not shopping for a "sidecar." They are trying to solve one of these problems:

- "How do I add agentic features to my existing app without rewriting it?"
- "How do I keep the agent from becoming a second, unsafe version of my application?"
- "How do I stop agent usage from turning into an unpredictable API bill?"
- "How do I let an agent use my app's existing APIs without giving it authority it should not have?"
- "How do I make my app agent-ready from the beginning?"
- "How do I eventually operate across CRM, ERP, support, billing, docs, and internal systems without replacing all of them?"

## Main Message

Add agentic workflows to your app without rewriting the software behind them.

Edgekit lets agents operate your existing app through governed tools, local-first model routing, approvals, telemetry, and audit hooks. Your app keeps ownership of state, auth, permissions, and business logic.

## Short Tagline Options

Use these as options, not all at once.

1. Add agents to existing apps without a rewrite.
2. Make your app agent-operable.
3. Agentic workflows without surrendering control of your app.
4. Turn existing software into agent-operated workflows.
5. Separate the agent worker from the software tool.
6. Add AI agents where the work already happens.
7. Local-first agents for app-owned workflows.

## Preferred Homepage Frame

### Hero

Add agents to existing apps without a rewrite.

Edgekit lets agent workers use your app through governed tools, approvals, and local-first model routing. Your app keeps control of state, auth, permissions, and business logic.

### Supporting Proof

- Retrofit real workflows: expose existing APIs and functions as typed tools.
- Keep control: actions still run through your app's permissions and backend rules.
- Reduce token-cost risk: use browser-local models first and explicit cloud routes only when needed.
- Make actions governable: approvals, telemetry, audit events, and policy boundaries are built in.
- Grow over time: start with one workflow, then compose more tools and systems.

## Value Propositions

### 1. Retrofit agents into software you already have

Most organizations cannot rewrite every app around AI. Edgekit lets you add agentic workflows to an existing product surface by registering the app capabilities you already own.

### 2. Keep the app authoritative

The agent can request actions. The app still owns execution. Auth, permissions, state, business logic, persistence, and compliance checks remain in the software system that already owns them.

### 3. Separate worker lifecycle from tool lifecycle

Models, prompts, routing, Skills, and UX patterns will change quickly. Your application should not need a rewrite every time the agent layer improves. Edgekit keeps the agent worker replaceable and the software tool stable.

### 4. Control variable AI cost

Edgekit is local-first by default. Use Chrome AI, WebLLM, or other browser-side routes for useful work when available. Escalate to cloud models only through explicit developer-owned paths.

Local-first does not mean pretending every inference job is the same. In Edgekit, the local model is usually the agent worker acting on behalf of the user: reading the current context, searching app-owned tools, entering data, preparing forms, and stepping through workflows the user could do themselves. Heavy reasoning, high-risk synthesis, or policy-sensitive work can route to a developer-owned cloud worker when the app chooses.

### 5. Build agent-ready apps from day one

For new applications, Edgekit encourages the right boundary early: APIs and workflows are designed as agent-callable tools, while state and permissions remain in the app.

### 6. Move toward unified agent interaction

Once agents can operate one app through governed tools, the same pattern can extend across CRM, ERP, ecommerce, support, docs, billing, inventory, and other systems. Edgekit is a bridge toward software that can be safely operated by agents.

## Audience-Specific Messaging

### Existing App Developer

You do not need to rewrite your product to add agentic workflows. Start with one page, one workflow, and a few existing APIs. Edgekit gives the agent a safe way to use them.

### 0-to-1 Builder

Build your app with an agent boundary from the beginning. Your tools, permissions, and workflows stay durable while the agent layer improves over time.

### Enterprise Architect

Edgekit lets teams add agent-operated workflows without centralizing every system into one new AI backend. Existing systems keep authority. The agent layer coordinates through governed interfaces.

### Product Leader

Edgekit lowers the risk of shipping agent features: fewer rewrite demands, clearer control over actions, more predictable AI cost, and a path from one workflow to many.

### Security Reviewer

Edgekit does not ask the model to become your authorization layer. Sensitive actions run through app-owned tools, approval gates, telemetry, audit events, and backend policy.

## Language To Use

- agentic workflows
- existing app
- retrofit
- app-owned tools
- governed tools
- agent worker
- software tool
- agent-operable software
- local-first model routing
- approvals and audit
- host app authority
- workflow layer
- system of record

## Language To Avoid In Top-Level Marketing

- sidecar as the main pitch
- chatbot wrapper
- AI widget
- AI copilot for everything
- autonomous transformation platform
- leverage, robust, seamless, unlock
- hosted agent
- magic

"Sidecar" can appear in architecture docs and implementation guides. It should not carry the product promise.

## What Edgekit Is

Edgekit is open-source infrastructure for adding agentic workflows to web apps. It provides runtime primitives, UI components, model routing, governed tool calling, approvals, telemetry, audit hooks, memory and knowledge-access patterns, and Skills plus Mission Profiles for packaging agent behavior.

## What Edgekit Is Not

- Not a hosted chatbot service.
- Not a replacement for your backend.
- Not the system of record.
- Not an authorization layer.
- Not a mandate to use one model provider.
- Not a rewrite framework.

## Copy Blocks

### 25 Words

Edgekit helps teams add agents to existing web apps through governed tools, local-first models, approvals, and app-owned business logic.

### 50 Words

Edgekit helps teams add agentic workflows to existing web apps without a rewrite. Agents use app-owned tools through explicit permissions, approvals, telemetry, and audit hooks. Browser-local models run first when available, while the app keeps control of state, auth, business logic, and execution.

### 100 Words

Edgekit is open-source infrastructure for making web apps agent-operable. It lets teams add agentic workflows to existing products by exposing app-owned APIs and functions as governed tools. The agent can search, compare, fill forms, request actions, and guide users through workflows, but the app remains the authority for state, auth, permissions, business logic, and persistence. Edgekit runs local-first through browser models when available, supports explicit fallback routes, and includes approvals, telemetry, audit hooks, EdgeView UI, Skills, and Mission Profiles so the agent layer can improve without forcing the software tool to be rewritten.

## Messaging Hierarchy For Site Rewrite

1. Practical promise: add agents to existing apps without a rewrite.
2. Control promise: keep state, auth, permissions, and actions in your app.
3. Local worker promise: browser models are now good enough for much of the user-delegated app work.
4. Cost/privacy promise: local-first model routing reduces cloud dependency.
5. Role-separation promise: use cloud models for heavy or risky thinking, not every routine app step.
6. Architecture thesis: separate agent workers from software tools.
7. Future thesis: make software agent-operable across systems.

## Notes For The Next Copy Pass

Do not start with architecture language. Start with the user problem. Then show why the architecture makes the promise believable.

The homepage should sell the practical wedge. The architecture docs should explain the worker/tool separation. The long-form thesis can describe the broader shift toward agent-operated software.
