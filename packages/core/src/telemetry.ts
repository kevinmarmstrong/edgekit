import { createId } from './shared'

export type EdgeTelemetryEventName =
  | 'run-start'
  | 'run-finish'
  | 'handoff-start'
  | 'handoff-finish'
  | 'model-selected'
  | 'model-unavailable'
  | 'status'
  | 'activity'
  | 'memory-compact'
  | 'text-delta'
  | 'tool-call'
  | 'tool-result'
  | 'tool-repair'
  | 'approval-request'
  | 'approval-decision'
  | 'view'
  | 'error'
  | 'ui-action'

export interface EdgeTelemetryEvent {
  id: string
  sessionId: string
  runId?: string
  timestamp: string
  name: EdgeTelemetryEventName
  input?: string
  toolName?: string
  approved?: boolean
  provider?: string
  status?: string
  data?: unknown
}

export type EdgeTelemetrySink =
  | ((event: EdgeTelemetryEvent) => void | Promise<void>)
  | { record(event: EdgeTelemetryEvent): void | Promise<void> }

export interface EdgeActivityEvent {
  id: string
  label: string
  status: 'started' | 'completed' | 'failed'
  detail?: string
  toolName?: string
  data?: unknown
}

export interface MissionControlSnapshot {
  runs: number
  toolCalls: Record<string, number>
  approvals: { requested: number; approved: number; rejected: number }
  errors: number
  localModelUnavailable: number
  lastEvent?: EdgeTelemetryEvent
}

export function createMissionControl() {
  const events: EdgeTelemetryEvent[] = []
  const subscribers = new Set<(event: EdgeTelemetryEvent, snapshot: MissionControlSnapshot) => void>()

  const snapshot = (): MissionControlSnapshot => {
    const toolCalls: Record<string, number> = {}
    let runs = 0
    let requested = 0
    let approved = 0
    let rejected = 0
    let errors = 0
    let localModelUnavailable = 0

    for (const event of events) {
      if (event.name === 'run-start') runs += 1
      if (event.name === 'tool-call' && event.toolName) toolCalls[event.toolName] = (toolCalls[event.toolName] ?? 0) + 1
      if (event.name === 'approval-request') requested += 1
      if (event.name === 'approval-decision') event.approved ? approved += 1 : rejected += 1
      if (event.name === 'error') errors += 1
      if (event.name === 'model-unavailable') localModelUnavailable += 1
    }

    return {
      runs,
      toolCalls,
      approvals: { requested, approved, rejected },
      errors,
      localModelUnavailable,
      lastEvent: events.at(-1),
    }
  }

  return {
    record(event: EdgeTelemetryEvent) {
      events.push(event)
      const current = snapshot()
      subscribers.forEach(subscriber => subscriber(event, current))
    },
    events() {
      return [...events]
    },
    snapshot,
    subscribe(subscriber: (event: EdgeTelemetryEvent, snapshot: MissionControlSnapshot) => void) {
      subscribers.add(subscriber)
      return () => subscribers.delete(subscriber)
    },
  }
}

export function createTelemetryDispatcher(telemetry: EdgeTelemetrySink | EdgeTelemetrySink[] | undefined, sessionId: string) {
  const sinks = (Array.isArray(telemetry) ? telemetry : telemetry ? [telemetry] : []).filter(Boolean)

  return {
    async emit(name: EdgeTelemetryEventName, event: Partial<EdgeTelemetryEvent> = {}) {
      if (sinks.length === 0) return
      const payload: EdgeTelemetryEvent = {
        id: event.id ?? createId('evt'),
        sessionId: event.sessionId ?? sessionId,
        timestamp: event.timestamp ?? new Date().toISOString(),
        name,
        ...event,
      }
      await Promise.all(
        sinks.map(async sink => {
          try {
            if (typeof sink === 'function') await sink(payload)
            else await sink.record(payload)
          } catch {
            // Telemetry must never break the user workflow.
          }
        }),
      )
    },
  }
}
