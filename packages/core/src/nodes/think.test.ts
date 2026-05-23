import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createThinkNode, type ThinkNodeConfig } from './think.js'
import { createInitialState, updateState, type AgentState } from '../graph/state.js'
import { createEventEmitter } from '../events/emitter.js'
import type { NodeContext, AgentConfig } from '../graph/node.js'
import type { ModelProvider } from '../providers.js'
import type { AgentEvent } from '../events/types.js'
import type { GenerateChunk, Message, ToolCall } from '../types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockModel(
  chunks?: readonly GenerateChunk[],
): ModelProvider {
  const defaultChunks: readonly GenerateChunk[] = [
    { type: 'text', text: 'Hello ' },
    { type: 'text', text: 'world!' },
  ]
  const yielded = chunks ?? defaultChunks

  return {
    id: 'test-model',
    init: vi.fn(async () => {}),
    generate: vi.fn(async function* (_messages, _options) {
      for (const chunk of yielded) {
        yield chunk
      }
    }),
    generateStructured: vi.fn(async () => ({}) as never),
    capabilities: vi.fn(() => ({
      maxTokens: 4096,
      supportsToolCalling: false,
      supportsStreaming: true,
      modelId: 'test',
    })),
    dispose: vi.fn(async () => {}),
  }
}

function createTestState(messages?: readonly Message[]): AgentState {
  const base = createInitialState({
    runId: 'test-run',
    modelId: 'test-model',
    downloadPolicy: 'auto',
  })
  if (messages) {
    return updateState(base, { messages })
  }
  return base
}

function createTestContext(overrides?: Partial<NodeContext>): NodeContext {
  const config: AgentConfig = {
    maxIterations: 20,
    tracing: true,
    downloadPolicy: 'auto',
  }
  return {
    emitter: createEventEmitter(),
    signal: new AbortController().signal,
    tools: [],
    config,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createThinkNode', () => {
  it('streams text and emits text:start, text:content, text:end events', async () => {
    const events: AgentEvent[] = []
    const model = createMockModel()
    const context = createTestContext()
    context.emitter.on((evt) => events.push(evt))

    const state = createTestState([
      { role: 'user', content: 'Hi there' },
    ])

    const node = createThinkNode({ model })
    const result = await node.execute(state, context)

    const textStart = events.find((e) => e.type === 'text:start')
    const textContents = events.filter((e) => e.type === 'text:content')
    const textEnd = events.find((e) => e.type === 'text:end')

    expect(textStart).toBeDefined()
    expect(textContents).toHaveLength(2)
    if (textContents[0]?.type === 'text:content') {
      expect(textContents[0].content).toBe('Hello ')
    }
    if (textContents[1]?.type === 'text:content') {
      expect(textContents[1].content).toBe('world!')
    }
    expect(textEnd).toBeDefined()
    if (textEnd?.type === 'text:end') {
      expect(textEnd.cancelled).toBe(false)
    }

    // Verify assistant message was appended
    const lastMsg = result.messages[result.messages.length - 1]
    expect(lastMsg?.role).toBe('assistant')
    expect(lastMsg?.content).toBe('Hello world!')
  })

  it('appends assistant message to state.messages', async () => {
    const model = createMockModel()
    const context = createTestContext()
    const state = createTestState([
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Say hi' },
    ])

    const node = createThinkNode({ model })
    const result = await node.execute(state, context)

    expect(result.messages).toHaveLength(3)
    expect(result.messages[2]).toEqual({
      role: 'assistant',
      content: 'Hello world!',
    })
  })

  it('detects tool calls and stores in pendingToolCalls', async () => {
    const toolCalls: readonly ToolCall[] = [
      { id: 'tc-1', name: 'search', arguments: '{"q":"test"}' },
    ]
    const model = createMockModel([
      { type: 'text', text: 'Let me search' },
      { type: 'tool_calls', toolCalls },
    ])
    const context = createTestContext()

    const state = createTestState([
      { role: 'user', content: 'Search for test' },
    ])

    const node = createThinkNode({ model })
    const result = await node.execute(state, context)

    expect(result.pendingToolCalls).toHaveLength(1)
    expect(result.pendingToolCalls[0]).toEqual({
      id: 'tc-1',
      name: 'search',
      arguments: '{"q":"test"}',
    })
    // Assistant message should include tool calls
    const lastMsg = result.messages[result.messages.length - 1]
    expect(lastMsg?.toolCalls).toHaveLength(1)
  })

  it('builds messages with RAG context when chunks present', async () => {
    const model = createMockModel()
    const context = createTestContext()

    const state = updateState(
      createTestState([
        { role: 'user', content: 'What is Foo?' },
      ]),
      {
        retrievedChunks: [
          { id: '1', content: 'Foo is a bar', metadata: { source: 'docs.md', title: 'Docs' }, score: 0.9 },
        ],
      },
    )

    const node = createThinkNode({ model })
    await node.execute(state, context)

    // Verify generate was called with messages that include RAG context
    const generateCalls = (model.generate as ReturnType<typeof vi.fn>).mock.calls
    expect(generateCalls).toHaveLength(1)
    const messages = generateCalls[0]![0] as readonly Message[]

    // Should include a system message with RAG context
    const ragMessage = messages.find(
      (m) => m.role === 'system' && m.content.includes('Foo is a bar'),
    )
    expect(ragMessage).toBeDefined()
    expect(ragMessage?.content).toContain('[Source: docs.md]')
  })

  it('returns state unchanged when pre-aborted signal', async () => {
    const model = createMockModel()
    const controller = new AbortController()
    controller.abort()
    const context = createTestContext({ signal: controller.signal })

    const state = createTestState([
      { role: 'user', content: 'Hi' },
    ])

    const node = createThinkNode({ model })
    const result = await node.execute(state, context)

    expect(result).toBe(state) // same reference, unchanged
    expect(model.generate).not.toHaveBeenCalled()
  })

  it('uses config systemPrompt override', async () => {
    const model = createMockModel()
    const context = createTestContext()

    const state = createTestState([
      { role: 'system', content: 'Original system prompt' },
      { role: 'user', content: 'Hi' },
    ])

    const thinkConfig: ThinkNodeConfig = {
      model,
      systemPrompt: 'Override system prompt',
    }
    const node = createThinkNode(thinkConfig)
    await node.execute(state, context)

    const generateCalls = (model.generate as ReturnType<typeof vi.fn>).mock.calls
    const messages = generateCalls[0]![0] as readonly Message[]

    // First message should be the override system prompt
    expect(messages[0]?.role).toBe('system')
    expect(messages[0]?.content).toBe('Override system prompt')
    // Original system prompt should NOT be included
    const originalPrompt = messages.find(
      (m) => m.content === 'Original system prompt',
    )
    expect(originalPrompt).toBeUndefined()
  })

  it('does not mutate the original state', async () => {
    const model = createMockModel()
    const context = createTestContext()
    const state = createTestState([
      { role: 'user', content: 'Hi' },
    ])
    const originalMessages = state.messages
    const originalToolCalls = state.pendingToolCalls

    const node = createThinkNode({ model })
    await node.execute(state, context)

    expect(state.messages).toBe(originalMessages)
    expect(state.pendingToolCalls).toBe(originalToolCalls)
    expect(state.messages).toHaveLength(1)
  })

  it('handles empty text generation', async () => {
    const model = createMockModel([])
    const context = createTestContext()

    const state = createTestState([
      { role: 'user', content: 'Hi' },
    ])

    const node = createThinkNode({ model })
    const result = await node.execute(state, context)

    const lastMsg = result.messages[result.messages.length - 1]
    expect(lastMsg?.role).toBe('assistant')
    expect(lastMsg?.content).toBe('')
    expect(result.pendingToolCalls).toEqual([])
  })

  it('passes maxTokens and tools to model.generate', async () => {
    const model = createMockModel()
    const tools = [
      { name: 'search', description: 'Search the web', parameters: {} },
    ]
    const context = createTestContext({ tools })

    const state = createTestState([
      { role: 'user', content: 'Hi' },
    ])

    const node = createThinkNode({ model, maxTokens: 1024 })
    await node.execute(state, context)

    const generateCalls = (model.generate as ReturnType<typeof vi.fn>).mock.calls
    expect(generateCalls[0]![1]).toEqual({
      maxTokens: 1024,
      tools,
    })
  })
})
