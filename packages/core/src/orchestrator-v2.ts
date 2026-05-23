/**
 * v2 Graph-backed orchestrator with v1-compatible createRuntime() API.
 *
 * This module constructs a 3-node graph (retrieve → think → respond)
 * from a v1 RuntimeConfig, then exposes the same Runtime interface
 * that the existing UI component and demo site expect.
 *
 * The v1 query() async generator is bridged by subscribing to
 * TextMessageContent events from the graph engine and yielding
 * text chunks.
 */

import type { RuntimeEvent, Chunk } from './types.js'
import type { Runtime, RuntimeConfig } from './providers.js'
import type { AgentEvent } from './events/types.js'
import { createEventEmitter, type EventEmitter } from './events/emitter.js'
import { createGraphEngine } from './graph/engine.js'
import { createInitialState, updateState, type AgentState } from './graph/state.js'
import type { GraphDefinition, GraphEdge } from './graph/types.js'
import type { NodeContext } from './graph/node.js'
import { createInputGuardrailNode } from './nodes/input-guardrail.js'
import { createRetrieveNode } from './nodes/retrieve.js'
import { createThinkNode } from './nodes/think.js'
import { createActNode } from './nodes/act.js'
import { createRespondNode } from './nodes/respond.js'
import { validateInput } from './guardrails.js'

// ---------------------------------------------------------------------------
// v2 event → v1 RuntimeEvent adapter
// ---------------------------------------------------------------------------

function adaptEventToLegacy(event: AgentEvent, pendingChunks: readonly Chunk[]): RuntimeEvent | null {
  switch (event.type) {
    case 'text:start':
      return { type: 'generation:start' }
    case 'text:content':
      return { type: 'generation:token', token: event.content }
    case 'text:end':
      return { type: 'generation:complete', text: '' } // text accumulated by consumer
    case 'edgekit:retrieval:start':
      return { type: 'retrieval:start', query: event.query }
    case 'edgekit:retrieval:complete':
      return { type: 'retrieval:complete', chunks: pendingChunks }
    case 'edgekit:model:download:start':
      return { type: 'model:download:start', modelId: event.modelId }
    case 'edgekit:model:download:progress':
      return { type: 'model:download:progress', modelId: event.modelId, progress: event.progress }
    case 'edgekit:model:download:complete':
      return { type: 'model:download:complete', modelId: event.modelId }
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Build a 3-node graph from v1 RuntimeConfig
// ---------------------------------------------------------------------------

function buildGraphFromConfig(config: RuntimeConfig): {
  readonly definition: GraphDefinition
  readonly nodeContext: NodeContext
  readonly emitter: EventEmitter
} {
  // Build tool handler map from v1 skills
  const toolHandlers: Record<string, (args: Record<string, unknown>) => Promise<string>> = {}
  for (const skill of config.skills ?? []) {
    if (skill.handleToolCall) {
      for (const tool of skill.tools) {
        const handler = skill.handleToolCall.bind(skill)
        toolHandlers[tool.name] = (args) => handler(tool.name, args)
      }
    }
  }

  const inputGuardrailNode = createInputGuardrailNode({
    blockedPatterns: config.guardrails?.blockedPatterns
      ? [...config.guardrails.blockedPatterns]
      : undefined,
    maxInputLength: config.guardrails?.maxInputTokens
      ? config.guardrails.maxInputTokens * 4 // rough char estimate
      : undefined,
  })

  const retrieveNode = createRetrieveNode()

  const thinkNode = createThinkNode({
    model: config.model,
    systemPrompt: config.systemPrompt,
    maxTokens: config.guardrails?.maxOutputTokens,
  })

  const actNode = createActNode({ toolHandlers })

  const respondNode = createRespondNode({
    blockedPatterns: config.guardrails?.blockedPatterns
      ? [...config.guardrails.blockedPatterns]
      : undefined,
  })

  const hasTools = Object.keys(toolHandlers).length > 0

  const edges: readonly GraphEdge[] = [
    ['input_guardrail', 'retrieve'],
    ['retrieve', 'think'],
    // ReAct loop: think → act (if tool calls) or think → respond (if no tool calls)
    ...(hasTools
      ? [
          ['think', 'act', { condition: (state: AgentState) => state.pendingToolCalls.length > 0 }] as const,
          ['think', 'respond', { condition: (state: AgentState) => state.pendingToolCalls.length === 0 }] as const,
          ['act', 'think'] as const, // ReAct: act → think again
        ]
      : [['think', 'respond'] as const]),
  ]

  const definition: GraphDefinition = {
    nodes: {
      input_guardrail: inputGuardrailNode,
      retrieve: retrieveNode,
      think: thinkNode,
      act: actNode,
      respond: respondNode,
    },
    edges,
    entryNode: 'input_guardrail',
  }

  const emitter = createEventEmitter()

  const nodeContext: NodeContext = {
    emitter,
    signal: new AbortController().signal,
    tools: config.skills?.flatMap((s) => s.tools) ?? [],
    rag: config.rag,
    config: {
      systemPrompt: config.systemPrompt,
      maxIterations: (config.maxToolRounds ?? 3) + 3, // tool rounds + base nodes
      tracing: true,
      downloadPolicy: config.downloadPolicy ?? 'prompt',
    },
  }

  return { definition, nodeContext, emitter }
}

// ---------------------------------------------------------------------------
// createRuntimeV2 — graph-backed v1 compat
// ---------------------------------------------------------------------------

export function createRuntimeV2(config: RuntimeConfig): Runtime {
  const { definition, nodeContext, emitter } = buildGraphFromConfig(config)

  let graphState = createInitialState({
    runId: crypto.randomUUID(),
    modelId: config.model.id,
    downloadPolicy: config.downloadPolicy ?? 'prompt',
    systemPrompt: config.systemPrompt,
  })

  const legacyBus = createEventEmitter()

  // Track retrieved chunks for legacy event adapter
  let pendingChunks: readonly Chunk[] = []

  // Forward v2 events as v1 RuntimeEvents
  emitter.on((event: AgentEvent) => {
    // Track chunks from retrieval for the legacy adapter
    if (event.type === 'state:snapshot') {
      const snapshot = event.state as unknown as AgentState
      if (snapshot.retrievedChunks) {
        pendingChunks = snapshot.retrievedChunks
      }
    }
    // Also track from the retrieve node directly
    if (event.type === 'edgekit:retrieval:complete') {
      // pendingChunks already updated by state
    }

    const legacy = adaptEventToLegacy(event, pendingChunks)
    if (legacy) {
      legacyBus.emit(legacy as unknown as AgentEvent)
    }
  })

  const ragReady = config.rag ? config.rag.init() : Promise.resolve()

  // Ensure model is initialized based on download policy
  let modelReady: Promise<boolean> | null = null

  async function ensureModel(): Promise<boolean> {
    if (modelReady) return modelReady

    const policy = config.downloadPolicy ?? 'prompt'

    if (policy === 'never') return false

    if (policy === 'prompt') {
      legacyBus.emit({
        type: 'error',
        error: new Error('Model download requires user permission'),
        recoverable: true,
      } as unknown as AgentEvent)
      return false
    }

    modelReady = config.model.init().then(
      () => true,
      (e) => {
        modelReady = null
        legacyBus.emit({
          type: 'error',
          error: e instanceof Error ? e : new Error(String(e)),
          recoverable: false,
        } as unknown as AgentEvent)
        return false
      },
    )

    return modelReady
  }

  async function* query(input: string): AsyncIterable<string> {
    const validation = validateInput(input, config.guardrails)
    if (!validation.valid) {
      legacyBus.emit({
        type: 'error',
        error: new Error(validation.reason),
        recoverable: true,
      } as unknown as AgentEvent)
      return
    }

    await ragReady

    const ready = await ensureModel()

    // Collect text chunks via event subscription
    const textChunks: string[] = []
    let fullText = ''
    let generationComplete = false
    let resolveGeneration: (() => void) | null = null

    const unsubscribe = emitter.on((event: AgentEvent) => {
      if (event.type === 'text:content') {
        textChunks.push(event.content)
      }
      if (event.type === 'text:end' || event.type === 'run:finished') {
        generationComplete = true
        resolveGeneration?.()
      }
    })

    try {
      if (!ready) {
        // RAG-only fallback: run retrieve node, format chunks
        if (config.rag) {
          const retrieveOnly = createGraphEngine(
            {
              nodes: {
                input_guardrail: definition.nodes.input_guardrail!,
                retrieve: definition.nodes.retrieve!,
              },
              edges: [['input_guardrail', 'retrieve']],
              entryNode: 'input_guardrail',
            },
            nodeContext,
            graphState,
          )
          const result = await retrieveOnly.run(input)
          graphState = result
          retrieveOnly.dispose()

          if (result.retrievedChunks.length > 0) {
            const fallback = formatRetrievalOnly(result.retrievedChunks)
            graphState = updateState(graphState, {
              messages: [...graphState.messages, { role: 'assistant' as const, content: fallback }],
            })

            // Emit legacy events
            legacyBus.emit({
              type: 'retrieval:complete',
              chunks: result.retrievedChunks,
            } as unknown as AgentEvent)
            legacyBus.emit({
              type: 'generation:complete',
              text: fallback,
            } as unknown as AgentEvent)

            yield fallback
          }
        }
        return
      }

      // Full graph execution: retrieve → think → respond
      const engine = createGraphEngine(definition, nodeContext, graphState)

      // Run graph in background, yield text as it streams
      const runPromise = engine.run(input)

      // Yield text chunks as they arrive from the think node
      while (!generationComplete) {
        // Drain accumulated chunks
        while (textChunks.length > 0) {
          const chunk = textChunks.shift()!
          fullText += chunk
          yield chunk
        }

        if (!generationComplete) {
          // Wait for more text or completion
          await new Promise<void>((resolve) => {
            resolveGeneration = resolve
            // Also resolve if chunks arrive
            setTimeout(resolve, 50)
          })
        }
      }

      // Drain any remaining chunks
      while (textChunks.length > 0) {
        const chunk = textChunks.shift()!
        fullText += chunk
        yield chunk
      }

      const finalState = await runPromise
      graphState = finalState
      pendingChunks = finalState.retrievedChunks

      // Emit the legacy generation:complete with full text
      legacyBus.emit({
        type: 'generation:complete',
        text: fullText,
      } as unknown as AgentEvent)

      // Emit retrieval:complete for the UI citation rendering
      if (finalState.retrievedChunks.length > 0) {
        legacyBus.emit({
          type: 'retrieval:complete',
          chunks: finalState.retrievedChunks,
        } as unknown as AgentEvent)
      }

      engine.dispose()
    } catch (e) {
      legacyBus.emit({
        type: 'error',
        error: e instanceof Error ? e : new Error(String(e)),
        recoverable: false,
      } as unknown as AgentEvent)
    } finally {
      unsubscribe()
    }
  }

  return {
    config,
    query,
    getConversation: () => ({
      messages: graphState.messages,
      turn: graphState.turn,
    }),
    clearConversation: () => {
      graphState = createInitialState({
        runId: crypto.randomUUID(),
        modelId: config.model.id,
        downloadPolicy: config.downloadPolicy ?? 'prompt',
        systemPrompt: config.systemPrompt,
      })
    },
    initModel: async () => {
      modelReady = config.model.init().then(() => true)
      await modelReady
    },
    on: (handler) => {
      // Subscribe to legacy-format events
      return legacyBus.on((event: AgentEvent) => {
        handler(event as unknown as RuntimeEvent)
      })
    },
    dispose: async () => {
      emitter.dispose()
      legacyBus.dispose()
      await config.model.dispose()
      await config.rag?.dispose()
    },
  }
}

function formatRetrievalOnly(chunks: readonly Chunk[]): string {
  const sources = chunks
    .map((c) => `**${c.metadata.title ?? c.metadata.source}**: ${c.content}`)
    .join('\n\n')
  return `Here's what I found (model not yet available):\n\n${sources}`
}
