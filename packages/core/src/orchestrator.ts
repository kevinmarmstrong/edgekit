import type { Message, Chunk, RuntimeEvent, ToolCall } from './types.js'
import type { Skill, RuntimeConfig, Runtime } from './providers.js'
import { createEventBus, type EventBus } from './event-bus.js'
import { createContextManager, type ContextManager } from './context-manager.js'
import { validateInput } from './guardrails.js'

export function createRuntime(config: RuntimeConfig): Runtime {
  const bus: EventBus = createEventBus()
  const context: ContextManager = createContextManager(
    config.guardrails?.maxConversationTurns,
  )
  const skills: readonly Skill[] = config.skills ?? []
  const maxToolRounds = config.maxToolRounds ?? 3
  const downloadPolicy = config.downloadPolicy ?? 'prompt'

  let modelReady = false
  let modelInitializing = false

  if (config.systemPrompt) {
    context.addMessage({ role: 'system', content: config.systemPrompt })
  }

  for (const skill of skills) {
    skill.activate({
      model: config.model,
      rag: config.rag,
      conversation: context.getState(),
      emit: (_event, data) => bus.emit(data as RuntimeEvent),
    })
  }

  async function ensureModel(): Promise<boolean> {
    if (modelReady) return true
    if (modelInitializing) return false

    if (downloadPolicy === 'never') {
      return false
    }

    if (downloadPolicy === 'prompt') {
      bus.emit({
        type: 'error',
        error: new Error('Model download requires user permission'),
        recoverable: true,
      })
      return false
    }

    modelInitializing = true
    try {
      await config.model.init()
      modelReady = true
      modelInitializing = false
      return true
    } catch (e) {
      modelInitializing = false
      bus.emit({
        type: 'error',
        error: e instanceof Error ? e : new Error(String(e)),
        recoverable: false,
      })
      return false
    }
  }

  async function initModel(): Promise<void> {
    if (modelReady || modelInitializing) return
    modelInitializing = true
    try {
      await config.model.init()
      modelReady = true
    } finally {
      modelInitializing = false
    }
  }

  async function* query(input: string): AsyncIterable<string> {
    const validation = validateInput(input, config.guardrails)
    if (!validation.valid) {
      bus.emit({ type: 'error', error: new Error(validation.reason), recoverable: true })
      return
    }

    context.addMessage({ role: 'user', content: input })

    let retrievedChunks: readonly Chunk[] = []
    if (config.rag) {
      bus.emit({ type: 'retrieval:start', query: input })
      retrievedChunks = await config.rag.retrieve(input)
      bus.emit({ type: 'retrieval:complete', chunks: retrievedChunks })
    }

    const ready = await ensureModel()
    if (!ready) {
      if (retrievedChunks.length > 0) {
        const fallback = formatRetrievalOnly(retrievedChunks)
        context.addMessage({ role: 'assistant', content: fallback })
        bus.emit({ type: 'generation:complete', text: fallback })
        yield fallback
      }
      return
    }

    const messages = buildMessages(context.getState().messages, retrievedChunks)
    const tools = skills.flatMap((s) => s.tools)

    for (let round = 0; round <= maxToolRounds; round++) {
      bus.emit({ type: 'generation:start' })

      const stream = config.model.generate(messages, {
        tools: tools.length > 0 ? tools : undefined,
        maxTokens: config.guardrails?.maxOutputTokens,
      })

      let roundText = ''
      for await (const token of stream) {
        roundText += token
        bus.emit({ type: 'generation:token', token })
        yield token
      }

      const toolCalls = extractToolCalls(roundText)
      if (toolCalls.length === 0) {
        context.addMessage({ role: 'assistant', content: roundText })
        bus.emit({ type: 'generation:complete', text: roundText })
        break
      }

      messages.push({ role: 'assistant', content: roundText, toolCalls })

      for (const tc of toolCalls) {
        bus.emit({ type: 'tool:call', toolCall: tc })
        const handler = skills.find(
          (s) => s.handleToolCall && s.tools.some((t) => t.name === tc.name),
        )
        if (handler?.handleToolCall) {
          const result = await handler.handleToolCall(
            tc.name,
            JSON.parse(tc.arguments) as Record<string, unknown>,
          )
          bus.emit({ type: 'tool:result', toolCallId: tc.id, result })
          messages.push({ role: 'tool', content: result, toolCallId: tc.id })
        }
      }
    }
  }

  return {
    config,
    query,
    getConversation: () => context.getState(),
    clearConversation: () => context.clear(),
    on: (handler) => bus.on(handler),
    initModel,
    dispose: async () => {
      for (const skill of skills) skill.deactivate?.()
      bus.dispose()
      await config.model.dispose()
      await config.rag?.dispose()
      await config.embeddings?.dispose()
    },
  } as Runtime & { initModel: () => Promise<void> }
}

function buildMessages(
  history: readonly Message[],
  chunks: readonly Chunk[],
): Message[] {
  if (chunks.length === 0) return [...history]

  const ragContext = chunks
    .map((c) => `[Source: ${c.metadata.source}]\n${c.content}`)
    .join('\n\n')

  const ragMessage: Message = {
    role: 'system',
    content: `Use the following context to answer the user's question. Cite sources when possible.\n\n${ragContext}`,
  }

  const [systemMsgs, rest] = partition(history, (m) => m.role === 'system')
  return [...systemMsgs, ragMessage, ...rest]
}

function partition<T>(
  arr: readonly T[],
  predicate: (item: T) => boolean,
): [T[], T[]] {
  const yes: T[] = []
  const no: T[] = []
  for (const item of arr) {
    if (predicate(item)) yes.push(item)
    else no.push(item)
  }
  return [yes, no]
}

function formatRetrievalOnly(chunks: readonly Chunk[]): string {
  const sources = chunks
    .map((c) => `**${c.metadata.title ?? c.metadata.source}**: ${c.content}`)
    .join('\n\n')
  return `Here's what I found (model not yet available):\n\n${sources}`
}

function extractToolCalls(_text: string): ToolCall[] {
  // Tool calls come via the model provider's structured output.
  // In WebLLM, they arrive as part of the chat completion response.
  // This function is a placeholder — real tool call extraction happens
  // in the model provider layer. The orchestrator receives them through
  // the generate() stream's final message metadata.
  return []
}
