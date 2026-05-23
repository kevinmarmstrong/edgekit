import type { GraphNode, NodeErrorPolicy } from '../graph/node.js'
import type { AgentState } from '../graph/state.js'
import { updateState } from '../graph/state.js'
import type { EscalationEvent } from '../events/types.js'

export interface EscalateNodeConfig {
  readonly confidenceThreshold?: number
  readonly cloudModelId?: string
  readonly allowCloudEscalation?: boolean
  readonly reason?: string
}

const DEFAULT_CONFIDENCE_THRESHOLD = 0.3
const DEFAULT_REASON = 'Routing confidence below threshold'

const FALLBACK_POLICY: NodeErrorPolicy = {
  onError: 'fallback',
  fallbackNode: 'respond',
} as const

function shouldEscalateToCloud(
  state: AgentState,
  config: EscalateNodeConfig,
): boolean {
  const allowCloud = config.allowCloudEscalation ?? true
  if (!allowCloud) {
    return false
  }
  const threshold = config.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD
  return state.routingConfidence < threshold
}

function buildEscalationReason(
  state: AgentState,
  config: EscalateNodeConfig,
): string {
  const threshold = config.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD
  if (config.reason) {
    return config.reason
  }
  return `${DEFAULT_REASON} (${state.routingConfidence} < ${threshold})`
}

export function createEscalateNode(
  config: EscalateNodeConfig = {},
): GraphNode {
  return {
    id: 'escalate',
    execute: async (state: AgentState, context) => {
      const currentMode = state.inferenceMode === 'hybrid' ? 'local' : state.inferenceMode
      const escalate = shouldEscalateToCloud(state, config)

      const targetMode: 'local' | 'cloud' = escalate ? 'cloud' : 'local'
      const reason = buildEscalationReason(state, config)

      const event: EscalationEvent = {
        type: 'edgekit:escalation',
        runId: state.runId,
        reason,
        from: currentMode,
        to: targetMode,
        timestamp: Date.now(),
      }
      context.emitter.emit(event)

      const modelUpdates: Partial<AgentState> =
        escalate && config.cloudModelId
          ? { inferenceMode: targetMode, modelId: config.cloudModelId }
          : { inferenceMode: targetMode }

      return updateState(state, modelUpdates)
    },
    errorPolicy: FALLBACK_POLICY,
  }
}
