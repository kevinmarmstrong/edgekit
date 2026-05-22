import type { Message, Chunk, RuntimeEvent } from './types.js'
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

    const messages = buildMessages(context.getState().messages, retrievedChunks)

    const tools = skills.flatMap((s) => s.tools)
    let fullResponse = ''

    for (let round = 0; round <= maxToolRounds; round++) {
      bus.emit({ type: 'generation:start' })

      const stream = config.model.generate(messages, {
        tools: tools.length > 0 ? tools : undefined,
        maxTokens: config.guardrails?.maxOutputTokens,
      })

      let roundText = ''
      for await (const token of stream) {
        roundText += token
        fullResponse += token
        bus.emit({ type: 'generation:token', token })
        yield token
      }

      const toolCalls = parseToolCalls(roundText)
      if (toolCalls.length === 0) break

      for (const tc of toolCalls) {
        bus.emit({ type: 'tool:call', toolCall: tc })
        const handler = skills.find((s) => s.handleToolCall && s.tools.some((t) => t.name === tc.name))
        if (handler?.handleToolCall) {
          const result = await handler.handleToolCall(tc.name, JSON.parse(tc.arguments) as Record<string, unknown>)
          bus.emit({ type: 'tool:result', toolCallId: tc.id, result })
          messages.push(
            { role: 'assistant', content: '', toolCalls: [tc] },
            { role: 'tool', content: result, toolCallId: tc.id },
          )
        }
      }
    }

    context.addMessage({ role: 'assistant', content: fullResponse })
    bus.emit({ type: 'generation:complete', text: fullResponse })
  }

  return {
    config,
    query,
    getConversation: () => context.getState(),
    clearConversation: () => context.clear(),
    on: (handler) => bus.on(handler),
    dispose: async () => {
      for (const skill of skills) skill.deactivate?.()
      bus.dispose()
      await config.model.dispose()
      await config.rag?.dispose()
      await config.embeddings?.dispose()
    },
  }
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

function parseToolCalls(text: string): Array<{ id: string; name: string; arguments: string }> {
  // Tool calls come structured from the model's generate() via the provider.
  // This is a placeholder — real parsing happens in the model provider layer
  // when it returns structured tool call messages.
  void text
  return []
}
