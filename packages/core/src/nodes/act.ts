import type { GraphNode, NodeContext } from '../graph/node.js'
import type { AgentState, ToolResult } from '../graph/state.js'
import { updateState } from '../graph/state.js'
import type { ToolCall, Message } from '../types.js'

export interface ActNodeConfig {
  readonly toolHandlers: Readonly<Record<string, (args: Record<string, unknown>) => Promise<string>>>
}

function parseArguments(raw: string): { readonly parsed: Record<string, unknown> } | { readonly error: string } {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return { parsed }
  } catch {
    return { error: `Failed to parse tool arguments: ${raw}` }
  }
}

async function executeSingleToolCall(
  tc: ToolCall,
  config: ActNodeConfig,
  state: AgentState,
  context: NodeContext,
): Promise<{ readonly result: ToolResult; readonly message: Message }> {
  const handler = config.toolHandlers[tc.name]

  context.emitter.emit({
    type: 'tool:start',
    runId: state.runId,
    toolCallId: tc.id,
    name: tc.name,
    timestamp: Date.now(),
  })

  context.emitter.emit({
    type: 'tool:args',
    runId: state.runId,
    toolCallId: tc.id,
    args: tc.arguments,
    timestamp: Date.now(),
  })

  if (!handler) {
    const errorMsg = `No handler found for tool: ${tc.name}`
    context.emitter.emit({
      type: 'tool:end',
      runId: state.runId,
      toolCallId: tc.id,
      result: '',
      error: errorMsg,
      timestamp: Date.now(),
    })
    return {
      result: { toolCallId: tc.id, name: tc.name, result: '', error: errorMsg },
      message: { role: 'tool', content: errorMsg, toolCallId: tc.id },
    }
  }

  const argResult = parseArguments(tc.arguments)

  if ('error' in argResult) {
    context.emitter.emit({
      type: 'tool:end',
      runId: state.runId,
      toolCallId: tc.id,
      result: '',
      error: argResult.error,
      timestamp: Date.now(),
    })
    return {
      result: { toolCallId: tc.id, name: tc.name, result: '', error: argResult.error },
      message: { role: 'tool', content: argResult.error, toolCallId: tc.id },
    }
  }

  try {
    const output = await handler(argResult.parsed)
    context.emitter.emit({
      type: 'tool:end',
      runId: state.runId,
      toolCallId: tc.id,
      result: output,
      timestamp: Date.now(),
    })
    return {
      result: { toolCallId: tc.id, name: tc.name, result: output },
      message: { role: 'tool', content: output, toolCallId: tc.id },
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    context.emitter.emit({
      type: 'tool:end',
      runId: state.runId,
      toolCallId: tc.id,
      result: '',
      error: errorMsg,
      timestamp: Date.now(),
    })
    return {
      result: { toolCallId: tc.id, name: tc.name, result: '', error: errorMsg },
      message: { role: 'tool', content: errorMsg, toolCallId: tc.id },
    }
  }
}

export function createActNode(config: ActNodeConfig): GraphNode {
  return {
    id: 'act',
    execute: async (state: AgentState, context: NodeContext): Promise<AgentState> => {
      if (state.pendingToolCalls.length === 0) {
        return state
      }

      let accumulatedResults: readonly ToolResult[] = [...state.toolResults]
      let accumulatedMessages: readonly Message[] = [...state.messages]

      for (const tc of state.pendingToolCalls) {
        const { result, message } = await executeSingleToolCall(tc, config, state, context)
        accumulatedResults = [...accumulatedResults, result]
        accumulatedMessages = [...accumulatedMessages, message]
      }

      return updateState(state, {
        toolResults: accumulatedResults,
        messages: accumulatedMessages,
        pendingToolCalls: [],
      })
    },
  }
}
