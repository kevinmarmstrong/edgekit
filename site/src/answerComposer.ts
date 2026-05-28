import type { DocChunk } from './content'

type ComposeMode = 'docs-demo' | 'site-assistant'

export type ComposeEdgekitAnswerOptions = {
  input: string
  results: Array<Partial<DocChunk> & Record<string, unknown>>
  mode?: ComposeMode
  currentPage?: string
}

export function composeEdgekitAnswer({ input, results, mode = 'docs-demo', currentPage }: ComposeEdgekitAnswerOptions) {
  const intent = detectAnswerIntent(input)
  const sourceNote = sourceLine(results, currentPage, mode)

  if (intent === 'unsafe-secrets-or-database') {
    return [
      'No. Keep JWTs, cookies, API keys, and database credentials out of the model prompt.',
      '',
      'Edgekit should call only host-owned tools. Your app or backend keeps the real session in the tool execution context through `sessionProvider`, `identityProvider`, `withToolContext()`, or your normal server authorization path. The host app enforces RBAC, tenant boundaries, and row-level permissions before any database mutation runs.',
      '',
      'For risky actions, expose a narrow tool, mark it for approval, and record telemetry/audit events. The agent can propose the action; the application still owns permission checks and execution.',
      sourceNote,
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (intent === 'first-step') {
    return [
      'First choose the outcome you want the agent to help with, then define one narrow mission and add `<edge-chat>` where that workflow happens in your app.',
      '',
    'The recommended integration is: define 2-5 Skills, create a Mission Profile for the app surface, import `@kevinmarmstrong/edgekit-ui`, render `<edge-chat>`, call `chat.configure({ model: [chromeAI()], ... })`, apply the profile with `chat.applyMissionProfile(profile)`, and use `chat.registerTools({ ... })` to expose existing app functions such as search, checkout, account lookup, or support-ticket creation.',
    '',
    'Validate the shape with `validateMissionProfile(profile, { registeredTools })` so missing required tools or unsafe profile defaults fail before users hit the agent workflow.',
    '',
    'Keep business logic in the existing app. Edgekit provides the agent runtime, model cascade, tool orchestration, approvals, activity events, telemetry, and fallbacks; the host app keeps state, auth, permissions, and API execution.',
    '',
    'Then run outcome harness prompts before release to prove tool decisions, approvals, answer faithfulness, generated UI actions, hostile inputs, and fallback behavior.',
    sourceNote,
  ]
      .filter(Boolean)
      .join('\n')
  }

  if (intent === 'starter-path') {
    return [
      'Use the concrete support-workflow starter, not a blank prompt.',
      '',
      'Copy `docs/templates/mission-profile-starter/profile.ts`, or scaffold it with `edgekit-init mission --recipe support-workflow --out edgekit/support`. Keep the two Skills (`support-case-search` and `create-support-ticket`), keep the `support-workflow-v1` Mission Profile, replace the sample tool `execute` bodies with your app APIs, and mount it behind `<edge-chat>`.',
      '',
      'Then validate with `validateMissionProfile(profile, { registeredTools })` and run the starter outcome scenarios from `docs/templates/mission-profile-starter/harness-scenarios.json`. Passing means the read prompt surfaces case facts, ticket creation requires approval, rejection preserves state, and no tool chatter leaks to the user.',
      sourceNote,
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (intent === 'chatbot-difference') {
    return [
      'Edgekit is different from embedding a chatbot because it lets an agent operate app-owned tools inside a governed workflow.',
      '',
      'A chatbot usually answers text beside the product. Edgekit lets the app expose selected capabilities as tools, render CTAs/forms through EdgeView or AG-UI, ask for approval before risky mutations, and resume the host app workflow after the user acts.',
      '',
      'The boundary is the important part: Edgekit orchestrates the agent loop, while the host app owns state, identity, permissions, and business logic.',
      sourceNote,
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (intent === 'token-cost') {
    return [
      'This is app-agent infrastructure economics, not SaaS subscription pricing.',
      '',
      'Use Edgekit when you want agent UX without making every user message a variable cloud-token expense.',
      '',
      'The default cascade runs Chrome AI, WebLLM, or another browser-local model first, so common classification, Q&A, tool extraction, and workflow help run on the visitor device. That makes heavy engagement less likely to become an unbounded API bill.',
      '',
      'Cloud routes still fit the architecture, but they are explicit, developer-provided fallbacks for work that needs a stronger model. You decide which prompts can leave the browser and which stay local for cost, privacy, latency, or policy reasons.',
      sourceNote,
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (intent === 'cascade-readiness') {
    return [
      'Use cascade readiness when the app needs to decide whether to show the full agent, ask for model-download consent, suggest a supported browser, run basic mode, or hide agent-only features.',
      '',
      '`createCascadeReadinessController()` checks the provider cascade and returns a headless snapshot: provider statuses, required and missing capabilities, fallback availability, and a recommended action such as `continue`, `prompt`, `suggest`, `message`, `fallback`, `hide`, or `retry`.',
      '',
      'The optional `<edge-cascade-wizard>` component is demo UI for that snapshot. Production apps can replace it with their own onboarding wizard, settings panel, banner, modal, disabled CTA, or no visible UI at all.',
      '',
      'For public sites, prefer `downloadPolicy: "never"` plus transparent fallback messaging so visitors who do not have Chrome AI/Nano ready are not pushed into surprise downloads. Controlled internal apps can use `downloadPolicy: "prompt"` when explicit local-model enablement makes sense.',
      sourceNote,
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (intent === 'skill-optimization') {
    return [
      'Use Skill optimization as a measured development loop, not as runtime self-editing.',
      '',
      'Run the live outcome harness against GitHub Pages, map each scenario to the Skill and Mission Profile it exercises, and score the actual user-visible transcript, generated UI, approval state, and safety boundaries per Skill.',
      '',
      'Only accept a candidate Skill edit when it is small, touches allowed fast-state fields such as `description`, `instructions`, `activationExamples`, or `synthesis`, strictly improves held-out validation, and leaves protected slow-state sections such as approval policy, safety invariants, and host-app authority untouched. Ties should be rejected.',
      '',
      'The useful output is a per-skill effect-size report: which prompts improved, which checks failed, what patch was accepted or rejected, and whether the redeployed GitHub Pages site still clears the outcome rubric.',
      sourceNote,
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (intent === 'agentic-not-rag') {
    return [
      'Edgekit is not just fallback search or RAG. Search can be one tool, but the stack is meant to enable agentic workflows inside the app.',
      '',
      'The agent can use `registerTools()` to call typed, app-owned capabilities; use `stateProvider` for current page and workflow context; render CTAs, forms, and generated UI through `registerActions()`, EdgeView, or AG-UI; and pause risky mutations behind `needsApproval`, telemetry, and audit.',
      '',
      'That means the model can help a user search, choose, fill, approve, and continue a workflow while the host app still owns state, identity, permissions, business logic, and final execution.',
      sourceNote,
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (intent === 'thesis') {
    return [
      'The Edgekit thesis starts with the outcome: teams need agents to do useful work inside software without rewriting the app, leaking sensitive context, accepting unbounded token costs, or letting a model bypass the authority model.',
      '',
      'The architecture answer is to separate the agent worker from the software tool. The app remains the durable system of record for state, auth, permissions, business logic, and execution. The worker layer can improve quickly as models, prompts, Skills, routing, and UX patterns change.',
      '',
      'Local-first matters because much of the agent job is routine user-delegated app work: read the current context, search records, compare fields, fill a form, request approval, and submit through the normal app path. Heavy or risky reasoning can still route to developer-owned cloud workers when the app chooses.',
      sourceNote,
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (intent === 'knowledge-access') {
    return [
      'Use Knowledge Access Skills when the agent needs app-owned retrieval, RAG, graph search, or a dynamic knowledge base.',
      '',
      'Do not put a vector database or graph engine inside Edgekit core. Wrap the source with `EdgeKnowledgeSource`, expose it as a read-only retrieval tool with `createKnowledgeTool()` or `createKnowledgeSkill()`, then compose that Skill into a Mission Profile.',
      '',
      'The source can be Markdown, a docs index, local embeddings in IndexedDB or OPFS, LlamaIndex, LangChain, Qdrant, pgvector, Pinecone, Weaviate, Neo4j GraphRAG, SQL, or a private backend API. The host app owns indexing, permission filtering, reranking, freshness, and source authorization.',
      '',
      'Edgekit owns the agent-facing contract: when the Skill activates, what tool is visible, whether citations and stale labels are surfaced, how telemetry/audit records the retrieval, and whether outcome tests prove source facts survived into the final answer or generated UI.',
      sourceNote,
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (intent === 'adoption-kit') {
    return [
      'Use the Adoption Kit when you want a developer or coding agent to implement Edgekit with less friction and fewer wrong turns.',
      '',
      'The kit has four layers: human docs, coding-agent `SKILL.md` files, recipe scaffolds, and outcome harnesses. The current agent skills are `edgekit-implementer`, `edgekit-outcome-tester`, `edgekit-skill-optimizer`, and `edgekit-security-review`.',
      '',
      'Recipes keep opinionated install paths out of the core quick start. Start with `edgekit-init --list`, then scaffold a focused path such as `support-workflow`, `knowledge-skill`, or `astro-intake-knowledge`. The Astro recipe mounts `<edge-chat>`, wires a Knowledge Access Skill, and keeps intake submission behind an approval-gated app-owned tool.',
      '',
      'This is the scalable direction: recipes can grow by framework or workflow, while Skills, Mission Profiles, app-owned tools, approvals, citations, and outcome tests stay consistent.',
      sourceNote,
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (intent === 'reproducibility') {
    return [
      'Use the reproducibility guide to keep provider claims honest and repeatable.',
      '',
      'Run deterministic gates first (`pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm test:e2e`, `pnpm eval:adoption`, `pnpm research:suite`). Then run each architecture as a separate provider lane: Chrome AI/Nano through CDP, WebLLM on a cross-origin-isolated host, a developer-owned cloud route, no-model fallback, and live GitHub Pages.',
      '',
      'The evidence to keep is `research-results/agent-suite.json`, `research-results/provider-matrix.md`, screenshots, the commit SHA, browser version, model availability result, and whether strict provider flags were enabled. A green deterministic run, a green strict provider run, and a green live Pages run are related but not interchangeable claims.',
      sourceNote,
    ]
      .filter(Boolean)
      .join('\n')
  }

  return [
    'Edgekit helps you add an agent to an app by giving you the local-first runtime, model cascade, tool loop, and approval/UI contracts so the agent can operate existing software through governed boundaries.',
    '',
    'A practical path is: choose one workflow outcome, define Skills for the app capabilities, create a Mission Profile, add `<edge-chat>`, configure Chrome AI/WebLLM plus any explicit fallback, apply the profile with `chat.applyMissionProfile(profile)`, register existing app functions with `registerTools()`, validate the shape with `validateMissionProfile(profile, { registeredTools })`, turn tool results into CTAs or forms with `registerActions()`, and mark risky tools with `needsApproval` plus telemetry/audit.',
    '',
    'The host app keeps ownership of state, auth, permissions, business logic, and backend execution. Edgekit stays as the configurable runtime that lets the agent reason over current app context and call only the capabilities you expose.',
    '',
    'Before calling it production-grade, run the outcome harness against realistic prompts: verify tool decisions, approvals, final answer faithfulness, generated UI actions, hostile inputs, and fallback behavior.',
    sourceNote,
  ]
    .filter(Boolean)
    .join('\n')
}

export function detectAnswerIntent(input: string) {
  const normalized = input.toLowerCase()
  if (/\b(jwt|cookie|token|database|db|credential|secret)\b/.test(normalized)) return 'unsafe-secrets-or-database'
  if (/\b(cascade readiness|capability wizard|edge-cascade-wizard|download prompt|model download|hide agent|basic mode|fallback mode|browser state|nano.*download|downloaded nano)\b/.test(normalized)) return 'cascade-readiness'
  if (/\b(reproduc|provider matrix|chrome ai|nano|webllm|cloud route|github pages|live pages|strict provider|model availability|works on.*machine)\b/.test(normalized)) return 'reproducibility'
  if (/\b(adoption kit|agent skills?|skill\.md|recipes?|edgekit-init|astro|intake|scaffold|scaffolding|onboarding)\b/.test(normalized)) return 'adoption-kit'
  if (/\b(starter|template|30.minute|thirty.minute|new mission|first sidecar|first agent|support workflow)\b/.test(normalized)) return 'starter-path'
  if (/\b(chatbot|chat bot|different|instead of chat)\b/.test(normalized)) return 'chatbot-difference'
  if (/\b(knowledge|retrieval|vector|embeddings|graph|graphrag|llamaindex|langchain|qdrant|neo4j|citation|citations)\b/.test(normalized)) return 'knowledge-access'
  if (/\b(skillopt|skill opt|optimi[sz]e|optimization|held[- ]out|bounded edit|per[- ]skill|protected section|protected sections|trainable|gradient|optimizer)\b/.test(normalized) ||
    (/\bskill\b/.test(normalized) && /\b(candidate|edit|edits|patch|protected|tie|ties|harmless|validation)\b/.test(normalized))) {
    return 'skill-optimization'
  }
  if (/\b(just|only|fallback|rag|search)\b/.test(normalized) && /\b(agentic|workflow|actions?|tools?|app)\b/.test(normalized)) {
    return 'agentic-not-rag'
  }
  if (/\b(retrofit|rewrite|agent.operable|agent-operated|worker|software tool|tool lifecycle|local thesis|self-service|transformation|future)\b/.test(normalized)) return 'thesis'
  if (/\b(first|start|begin|install|add first|what do i add)\b/.test(normalized)) return 'first-step'
  if (/\b(cost|token|cloud|bill|spend|paying|api|pricing|economics|infrastructure|liability)\b/.test(normalized)) return 'token-cost'
  return 'add-agent'
}

function sourceLine(results: Array<Partial<DocChunk> & Record<string, unknown>>, currentPage: string | undefined, mode: ComposeMode) {
  const titles = results
    .map(result => (typeof result.title === 'string' ? result.title : ''))
    .filter(Boolean)
    .slice(0, 3)
  const prefix = mode === 'site-assistant' && currentPage ? `Grounded in docs search from ${currentPage}` : 'Grounded in docs search'
  if (titles.length === 0) return `${prefix}.`
  return `${prefix}: ${titles.join(', ')}.`
}
