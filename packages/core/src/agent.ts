/**
 * defineAgent() — declarative agent builder for edgekit v2.
 *
 * Constructs an 8-node graph from an AgentDefinition, reusing the
 * existing graph engine and node factories. Users can override
 * individual nodes, supply custom edges, or accept the standard
 * pipeline as the default.
 */

import type { AgentEvent } from './events/types.js'
import type { EventEmitter } from './events/emitter.js'
import type { GraphNode, NodeContext, AgentConfig } from './graph/node.js'
import type { GraphDefinition, GraphEdge } from './graph/types.js'
import type { AgentState } from './graph/state.js'
import type {
  Tool,
  DownloadPolicy,
  ConversationState,
} from './types.js'
import type { ModelProvider, RAGProvider, GuardrailsConfig } from './providers.js'

import { createEventEmitter } from './events/emitter.js'
import { createGraphEngine } from './graph/engine.js'
import { createInitialState } from './graph/state.js'
import { createInputGuardrailNode } from './nodes/input-guardrail.js'
import { createRouteNode } from './nodes/route.js'
import { createRetrieveNode } from './nodes/retrieve.js'
import { createThinkNode } from './nodes/think.js'
import { createActNode } from './nodes/act.js'
import { createHitlNode } from './nodes/hitl.js'
import { createRespondNode } from './nodes/respond.js'
import { createEscalateNode } from './nodes/escalate.js'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AgentDefinition {
  readonly name: string
  readonly description: string
  readonly version?: string
  readonly systemPrompt?: string
  readonly tools?: readonly Tool[]
  readonly nodes?: Readonly<Record<string, GraphNode>>
  readonly edges?: readonly GraphEdge[]
  readonly entryNode?: string
  readonly model?: ModelProvider
  readonly rag?: RAGProvider
  readonly downloadPolicy?: DownloadPolicy
  readonly guardrails?: GuardrailsConfig
  readonly maxToolRounds?: number
  readonly onEvent?: (event: AgentEvent) => void
}

export interface Agent {
  readonly name: string
  readonly description: string
  readonly version: string

  /** Run a query through the agent, yielding text tokens. */
  query(input: string): AsyncIterable<string>

  /** Get conversation state. */
  getConversation(): ConversationState

  /** Clear conversation history. */
  clearConversation(): void

  /** Subscribe to agent events. */
  on(handler: (event: AgentEvent) => void): () => void

  /** Initialize the model (download if needed). */
  initModel(): Promise<void>

  /** Clean up resources. */
  dispose(): Promise<void>
}

// ---------------------------------------------------------------------------
// Default graph construction
// ---------------------------------------------------------------------------

const DEFAULT_ENTRY_NODE = 'input_guardrail'
const DEFAULT_VERSION = '1.0.0'
const DEFAULT_DOWNLOAD_POLICY: DownloadPolicy = 'prompt'
const DEFAULT_MAX_TOOL_ROUNDS = 3

function buildDefaultNodes(
  definition: AgentDefinition,
): Readonly<Record<string, GraphNode>> {
  const blockedPatterns = definition.guardrails?.blockedPatterns
    ? [...definition.guardrails.blockedPatterns]
    : undefined

  const maxInputLength = definition.guardrails?.maxInputTokens
    ? definition.guardrails.maxInputTokens * 4
    : undefined

  const inputGuardrailNode = createInputGuardrailNode({
    blockedPatterns,
    maxInputLength,
  })

  const routeNode = createRouteNode({})
  const retrieveNode = createRetrieveNode()

  const thinkNode = definition.model
    ? createThinkNode({
        model: definition.model,
        systemPrompt: definition.systemPrompt,
        maxTokens: definition.guardrails?.maxOutputTokens,
      })
    : createPassthroughNode('think')

  const toolHandlers = buildToolHandlers(definition.tools)
  const actNode = createActNode({ toolHandlers })

  const hitlNode = createHitlNode()

  const respondNode = createRespondNode({
    blockedPatterns,
  })

  const escalateNode = createEscalateNode()

  return {
    input_guardrail: inputGuardrailNode,
    route: routeNode,
    retrieve: retrieveNode,
    think: thinkNode,
    act: actNode,
    hitl: hitlNode,
    respond: respondNode,
    escalate: escalateNode,
  }
}

function buildToolHandlers(
  tools: readonly Tool[] | undefined,
): Record<string, (args: Record<string, unknown>) => Promise<string>> {
  if (!tools || tools.length === 0) return {}

  const handlers: Record<string, (args: Record<string, unknown>) => Promise<string>> = {}
  for (const tool of tools) {
    handlers[tool.name] = async (_args) => `Tool ${tool.name} executed`
  }
  return handlers
}

function createPassthroughNode(id: string): GraphNode {
  return {
    id,
    execute: async (state: AgentState) => state,
  }
}

function buildDefaultEdges(
  definition: AgentDefinition,
): readonly GraphEdge[] {
  const hasTools =
    (definition.tools?.length ?? 0) > 0 ||
    (definition.nodes?.act !== undefined)

  const edges: readonly GraphEdge[] = [
    ['input_guardrail', 'route'],
    ['route', 'retrieve'],
    ['retrieve', 'think'],
    ...(hasTools
      ? ([
          ['think', 'act', { condition: (state: AgentState) => state.pendingToolCalls.length > 0 }],
          ['think', 'respond', { condition: (state: AgentState) => state.pendingToolCalls.length === 0 }],
          ['act', 'think'],
        ] as const)
      : ([['think', 'respond']] as const)),
    ['respond', 'hitl', { condition: (state: AgentState) => state.awaitingApproval }] as const,
    [
      'think',
      'escalate',
      {
        condition: (state: AgentState) =>
          state.routingConfidence > 0 &&
          state.routingConfidence < 0.3 &&
          state.pendingToolCalls.length === 0,
      },
    ] as const,
    ['escalate', 'respond'] as const,
  ]

  return edges
}

// ---------------------------------------------------------------------------
// Graph assembly
// ---------------------------------------------------------------------------

function buildGraphDefinition(definition: AgentDefinition): GraphDefinition {
  const defaultNodes = buildDefaultNodes(definition)

  // Merge custom nodes over defaults (custom nodes override)
  const mergedNodes: Readonly<Record<string, GraphNode>> = {
    ...defaultNodes,
    ...(definition.nodes ?? {}),
  }

  const edges = definition.edges ?? buildDefaultEdges(definition)
  const entryNode = definition.entryNode ?? DEFAULT_ENTRY_NODE

  return { nodes: mergedNodes, edges, entryNode }
}

function buildNodeContext(
  definition: AgentDefinition,
  emitter: EventEmitter,
): NodeContext {
  const maxToolRounds = definition.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS
  const downloadPolicy = definition.downloadPolicy ?? DEFAULT_DOWNLOAD_POLICY

  const config: AgentConfig = {
    systemPrompt: definition.systemPrompt,
    maxIterations: maxToolRounds * 2 + 8,
    tracing: true,
    downloadPolicy,
  }

  return {
    emitter,
    signal: new AbortController().signal,
    tools: definition.tools ?? [],
    rag: definition.rag,
    config,
  }
}

function buildInitialState(definition: AgentDefinition): AgentState {
  return createInitialState({
    runId: crypto.randomUUID(),
    modelId: definition.model?.id ?? 'none',
    downloadPolicy: definition.downloadPolicy ?? DEFAULT_DOWNLOAD_POLICY,
    systemPrompt: definition.systemPrompt,
  })
}

// ---------------------------------------------------------------------------
// defineAgent
// ---------------------------------------------------------------------------

export function defineAgent(definition: AgentDefinition): Agent {
  const name = definition.name
  const description = definition.description
  const version = definition.version ?? DEFAULT_VERSION

  const emitter = createEventEmitter()
  const graphDefinition = buildGraphDefinition(definition)
  const nodeContext = buildNodeContext(definition, emitter)
  let agentState = buildInitialState(definition)

  // Wire up the onEvent callback if provided
  const onEventUnsub = definition.onEvent
    ? emitter.on(definition.onEvent)
    : undefined

  async function* query(input: string): AsyncIterable<string> {
    const textChunks: string[] = []
    let generationComplete = false
    let resolveWait: (() => void) | null = null

    const unsubscribe = emitter.on((event: AgentEvent) => {
      if (event.type === 'text:content') {
        textChunks.push(event.content)
        resolveWait?.()
      }
      if (event.type === 'text:end' || event.type === 'run:finished') {
        generationComplete = true
        resolveWait?.()
      }
    })

    try {
      const engine = createGraphEngine(
        graphDefinition,
        nodeContext,
        agentState,
      )

      const runPromise = engine.run(input)

      while (!generationComplete) {
        while (textChunks.length > 0) {
          yield textChunks.shift()!
        }

        if (!generationComplete) {
          await new Promise<void>((resolve) => {
            resolveWait = resolve
            setTimeout(resolve, 50)
          })
        }
      }

      // Drain remaining chunks
      while (textChunks.length > 0) {
        yield textChunks.shift()!
      }

      const finalState = await runPromise
      agentState = finalState
      engine.dispose()
    } finally {
      unsubscribe()
    }
  }

  function getConversation(): ConversationState {
    return {
      messages: agentState.messages,
      turn: agentState.turn,
    }
  }

  function clearConversation(): void {
    agentState = buildInitialState(definition)
  }

  function on(handler: (event: AgentEvent) => void): () => void {
    return emitter.on(handler)
  }

  async function initModel(): Promise<void> {
    if (definition.model) {
      await definition.model.init()
    }
  }

  async function dispose(): Promise<void> {
    onEventUnsub?.()
    emitter.dispose()
    await definition.model?.dispose()
    await definition.rag?.dispose()
  }

  return {
    name,
    description,
    version,
    query,
    getConversation,
    clearConversation,
    on,
    initModel,
    dispose,
  }
}
