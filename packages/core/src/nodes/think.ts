import type { GraphNode, NodeContext } from '../graph/node.js'
import type { AgentState } from '../graph/state.js'
import { updateState } from '../graph/state.js'
import type { ModelProvider } from '../providers.js'
import type { Message, ToolCall, Chunk } from '../types.js'

export interface ThinkNodeConfig {
  readonly model: ModelProvider
  readonly systemPrompt?: string
  readonly maxTokens?: number
}

function formatRAGContext(chunks: readonly Chunk[]): string {
  const formatted = chunks
    .map((c) => `[Source: ${c.metadata.source}]\n${c.content}`)
    .join('\n\n')
  return (
    'Use the following context to answer the user\'s question. ' +
    'Cite sources when possible.\n\n' +
    formatted
  )
}

function buildMessages(
  state: AgentState,
  config: ThinkNodeConfig,
): readonly Message[] {
  const systemMessages: readonly Message[] = config.systemPrompt
    ? [{ role: 'system' as const, content: config.systemPrompt }]
    : state.messages.filter((m) => m.role === 'system')

  const ragMessage: readonly Message[] =
    state.retrievedChunks.length > 0
      ? [{ role: 'system' as const, content: formatRAGContext(state.retrievedChunks) }]
      : []

  const conversationMessages = state.messages.filter((m) => m.role !== 'system')

  return [...systemMessages, ...ragMessage, ...conversationMessages]
}

export function createThinkNode(config: ThinkNodeConfig): GraphNode {
  return {
    id: 'think',
    execute: async (state: AgentState, context: NodeContext): Promise<AgentState> => {
      if (context.signal.aborted) {
        return state
      }

      const messages = buildMessages(state, config)
      const stream = config.model.generate(messages, {
        maxTokens: config.maxTokens,
        tools: context.tools,
      })

      context.emitter.emit({
        type: 'text:start',
        runId: state.runId,
        timestamp: Date.now(),
      })

      let fullText = ''
      let collectedToolCalls: readonly ToolCall[] = []
      let cancelled = false

      try {
        for await (const chunk of stream) {
          if (context.signal.aborted) {
            cancelled = true
            break
          }

          if (chunk.type === 'text') {
            fullText += chunk.text
            context.emitter.emit({
              type: 'text:content',
              runId: state.runId,
              content: chunk.text,
              timestamp: Date.now(),
            })
          } else if (chunk.type === 'tool_calls') {
            collectedToolCalls = [...collectedToolCalls, ...chunk.toolCalls]
          }
        }
      } finally {
        context.emitter.emit({
          type: 'text:end',
          runId: state.runId,
          cancelled,
          timestamp: Date.now(),
        })
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: fullText,
        ...(collectedToolCalls.length > 0 ? { toolCalls: collectedToolCalls } : {}),
      }

      return updateState(state, {
        messages: [...state.messages, assistantMessage],
        pendingToolCalls: collectedToolCalls,
      })
    },
  }
}
