import type { GraphNode, NodeContext } from '../graph/node.js'
import type { AgentState, ApprovalResult } from '../graph/state.js'
import { updateState } from '../graph/state.js'

export interface HitlNodeConfig {
  readonly timeoutMs?: number
}

function generateCheckpointId(runId: string): string {
  return `${runId}-hitl-${Date.now()}`
}

function createTimeoutPromise(ms: number): Promise<ApprovalResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ approved: false, reason: 'Approval timed out' })
    }, ms)
  })
}

async function awaitApproval(
  context: NodeContext,
  checkpointId: string,
  timeoutMs?: number,
): Promise<ApprovalResult> {
  if (!context.waitForApproval) {
    return { approved: true }
  }

  const approvalPromise = context.waitForApproval(checkpointId)

  if (timeoutMs === undefined) {
    return approvalPromise
  }

  return Promise.race([approvalPromise, createTimeoutPromise(timeoutMs)])
}

function emitRequest(
  context: NodeContext,
  state: AgentState,
  checkpointId: string,
): void {
  context.emitter.emit({
    type: 'edgekit:hitl:request',
    timestamp: Date.now(),
    runId: state.runId,
    checkpointId,
    description: state.approvalRequest?.description ?? 'Approval required',
  })
}

function emitResponse(
  context: NodeContext,
  state: AgentState,
  checkpointId: string,
  approved: boolean,
): void {
  context.emitter.emit({
    type: 'edgekit:hitl:response',
    timestamp: Date.now(),
    runId: state.runId,
    checkpointId,
    approved,
  })
}

export function createHitlNode(config?: HitlNodeConfig): GraphNode {
  return {
    id: 'hitl',
    errorPolicy: { onError: 'halt' },
    execute: async (
      state: AgentState,
      context: NodeContext,
    ): Promise<AgentState> => {
      if (!state.awaitingApproval) {
        return state
      }

      if (context.signal.aborted) {
        throw new Error('HITL aborted: signal already aborted')
      }

      const checkpointId = generateCheckpointId(state.runId)

      emitRequest(context, state, checkpointId)

      const abortPromise = new Promise<never>((_resolve, reject) => {
        if (context.signal.aborted) {
          reject(new Error('HITL aborted'))
          return
        }
        context.signal.addEventListener('abort', () => {
          reject(new Error('HITL aborted'))
        }, { once: true })
      })

      const approval = await Promise.race([
        awaitApproval(context, checkpointId, config?.timeoutMs),
        abortPromise,
      ])

      emitResponse(context, state, checkpointId, approval.approved)

      return updateState(state, {
        awaitingApproval: false,
        approvalRequest: undefined,
        metadata: { ...state.metadata, lastApproval: approval },
      })
    },
  }
}
