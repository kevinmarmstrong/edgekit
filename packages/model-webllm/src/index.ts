import type {
  ModelProvider,
  ModelCapabilities,
  GenerateOptions,
  GenerateChunk,
  Message,
  RuntimeEvent,
  ToolCall,
} from '@edgekit/core'
import {
  CreateMLCEngine,
  type MLCEngineInterface,
  type InitProgressReport,
  type ChatCompletionMessageParam,
} from '@mlc-ai/web-llm'

export interface WebLLMConfig {
  readonly model?: string
  readonly tier?: ModelTier
  readonly onEvent?: (event: RuntimeEvent) => void
}

const MODEL_LADDER = {
  tiny: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
  standard: 'Phi-4-mini-instruct-q4f16_1-MLC',
  high: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
} as const

export type ModelTier = keyof typeof MODEL_LADDER

export function webllm(config: WebLLMConfig = {}): ModelProvider {
  const modelId = config.model ?? (config.tier ? MODEL_LADDER[config.tier] : MODEL_LADDER.standard)
  let engine: MLCEngineInterface | null = null

  function emitEvent(event: RuntimeEvent) {
    config.onEvent?.(event)
  }

  return {
    id: `webllm:${modelId}`,

    async init() {
      emitEvent({ type: 'model:download:start', modelId })

      engine = await CreateMLCEngine(modelId, {
        initProgressCallback: (report: InitProgressReport) => {
          emitEvent({
            type: 'model:download:progress',
            modelId,
            progress: report.progress,
          })
        },
      })

      emitEvent({ type: 'model:download:complete', modelId })
      emitEvent({ type: 'model:ready' })
    },

    async *generate(
      messages: readonly Message[],
      options?: GenerateOptions,
    ): AsyncIterable<GenerateChunk> {
      if (!engine) throw new Error('Model not initialized. Call init() first.')

      const chatMessages = toWebLLMMessages(messages)

      const response = await engine.chat.completions.create({
        messages: chatMessages,
        stream: true,
        max_tokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.7,
        stop: options?.stopSequences as string[] | undefined,
        tools: options?.tools?.map((t) => ({
          type: 'function' as const,
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        })),
      })

      const pendingToolCalls = new Map<number, { id: string; name: string; arguments: string }>()

      for await (const chunk of response) {
        const choice = chunk.choices[0]
        if (!choice) continue

        const content = choice.delta?.content
        if (content) {
          yield { type: 'text', text: content }
        }

        const deltaToolCalls = (choice.delta as Record<string, unknown>)?.tool_calls as
          | Array<{ index: number; id?: string; function?: { name?: string; arguments?: string } }>
          | undefined
        if (deltaToolCalls) {
          for (const dtc of deltaToolCalls) {
            const existing = pendingToolCalls.get(dtc.index)
            if (existing) {
              existing.arguments += dtc.function?.arguments ?? ''
            } else {
              pendingToolCalls.set(dtc.index, {
                id: dtc.id ?? `call_${dtc.index}`,
                name: dtc.function?.name ?? '',
                arguments: dtc.function?.arguments ?? '',
              })
            }
          }
        }

        if (choice.finish_reason === 'tool_calls' || choice.finish_reason === 'stop') {
          if (pendingToolCalls.size > 0) {
            const toolCalls: readonly ToolCall[] = [...pendingToolCalls.values()]
            yield { type: 'tool_calls', toolCalls }
          }
        }
      }
    },

    async generateStructured<T>(
      messages: readonly Message[],
      schema: Record<string, unknown>,
    ): Promise<T> {
      if (!engine) throw new Error('Model not initialized. Call init() first.')

      const chatMessages = toWebLLMMessages(messages)

      const response = await engine.chat.completions.create({
        messages: chatMessages,
        response_format: {
          type: 'json_object',
          schema: JSON.stringify(schema),
        } as Record<string, unknown>,
        temperature: 0,
      })

      const content = response.choices[0]?.message?.content
      if (!content) throw new Error('No response from model')

      return JSON.parse(content) as T
    },

    capabilities(): ModelCapabilities {
      return {
        maxTokens: 4096,
        supportsToolCalling: true,
        supportsStreaming: true,
        modelId,
      }
    },

    async dispose() {
      if (engine) {
        await engine.unload()
        engine = null
      }
    },
  }
}

export { MODEL_LADDER }

function toWebLLMMessages(
  messages: readonly Message[],
): ChatCompletionMessageParam[] {
  return messages.map((m): ChatCompletionMessageParam => {
    if (m.role === 'tool') {
      return {
        role: 'tool',
        content: m.content,
        tool_call_id: m.toolCallId ?? '',
      }
    }

    if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
      return {
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.toolCalls.map((tc: ToolCall) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: tc.arguments,
          },
        })),
      }
    }

    return {
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }
  })
}
