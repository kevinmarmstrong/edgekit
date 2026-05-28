import { createElement, useMemo, useSyncExternalStore } from 'react'
import type { ReactElement } from 'react'
import type {
  AgentEvent,
  EdgeActivityEvent,
  EdgeAgent,
} from '@kevinmarmstrong/edgekit'
import type { EdgeMissionProfile, EdgeProfileValidationResult } from '@kevinmarmstrong/edgekit-skills'

export interface EdgeAgentState {
  status: 'idle' | 'streaming' | 'awaiting-approval' | 'done' | 'error'
  text: string
  events: AgentEvent[]
  activities: EdgeActivityEvent[]
  error?: unknown
  approval?: Extract<AgentEvent, { type: 'approval-request' }>
}

export interface EdgeAgentController {
  getSnapshot(): EdgeAgentState
  subscribe(listener: (state: EdgeAgentState) => void): () => void
  send(input: string): Promise<EdgeAgentState>
  respondToApproval(approvalId: string, approved: boolean, reason?: string): Promise<EdgeAgentState>
  reset(): void
}

export interface CreateEdgeAgentControllerOptions {
  agent: EdgeAgent
}

export function createEdgeAgentController(options: CreateEdgeAgentControllerOptions): EdgeAgentController {
  const listeners = new Set<(state: EdgeAgentState) => void>()
  let state: EdgeAgentState = {
    status: 'idle',
    text: '',
    events: [],
    activities: [],
  }

  const emit = () => listeners.forEach(listener => listener(state))
  const setState = (patch: Partial<EdgeAgentState>) => {
    state = { ...state, ...patch }
    emit()
  }
  const applyEvent = (event: AgentEvent) => {
    const events = [...state.events, event]
    if (event.type === 'activity') {
      setState({
        status: state.status === 'idle' ? 'streaming' : state.status,
        events,
        activities: [...state.activities.filter(activity => activity.id !== event.activity.id), event.activity],
      })
      return
    }
    if (event.type === 'text-delta') {
      setState({ status: 'streaming', events, text: state.text + event.text })
      return
    }
    if (event.type === 'approval-request') {
      setState({ status: 'awaiting-approval', events, approval: event })
      return
    }
    if (event.type === 'done') {
      setState({ status: 'done', events, text: event.text, approval: undefined })
      return
    }
    if (event.type === 'error') {
      setState({ status: 'error', events, error: event.error })
      return
    }
    setState({ events })
  }
  const drain = async (stream: AsyncGenerator<AgentEvent>) => {
    setState({ status: 'streaming', text: '', events: [], activities: [], error: undefined, approval: undefined })
    for await (const event of stream) applyEvent(event)
    return state
  }

  return {
    getSnapshot: () => state,
    subscribe(listener: (state: EdgeAgentState) => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    send(input: string) {
      return drain(options.agent.send(input))
    },
    respondToApproval(approvalId: string, approved: boolean, reason?: string) {
      return drain(options.agent.respondToApproval(approvalId, approved, reason))
    },
    reset() {
      state = { status: 'idle', text: '', events: [], activities: [] }
      emit()
    },
  }
}

export function useEdgeAgent(agent: EdgeAgent): EdgeAgentController & { state: EdgeAgentState } {
  const controller = useMemo(() => createEdgeAgentController({ agent }), [agent])
  const state = useSyncExternalStore(
    listener => controller.subscribe(listener),
    () => controller.getSnapshot(),
    () => controller.getSnapshot(),
  )
  return { ...controller, state }
}

export function useEdgeActivity(agent: EdgeAgent): EdgeActivityEvent[] {
  return useEdgeAgent(agent).state.activities
}

export interface EdgeChatElement extends HTMLElement {
  configure?: (options: unknown) => void
  applyMissionProfile?: (profile: EdgeMissionProfile) => void
  validateMissionProfile?: (profile: EdgeMissionProfile) => EdgeProfileValidationResult
  registerTools?: (tools: Record<string, unknown>) => void
  registerActions?: (resolver: unknown) => void
  useAgent?: (agent: EdgeAgent) => void
}

export interface EdgeChatProps {
  systemPrompt?: string
  missionProfile?: EdgeMissionProfile
  placeholder?: string
  showToolEvents?: boolean
  className?: string
  onReady?: (element: EdgeChatElement) => void
}

export function EdgeChat(props: EdgeChatProps): ReactElement {
  if (typeof window !== 'undefined') void import('@kevinmarmstrong/edgekit-ui')

  const elementProps: Record<string, unknown> = {
    className: props.className,
    placeholder: props.placeholder,
    ref: (element: EdgeChatElement | null) => {
      if (element) {
        if (props.missionProfile) element.applyMissionProfile?.(props.missionProfile)
        props.onReady?.(element)
      }
    },
  }
  if (props.systemPrompt) elementProps['system-prompt'] = props.systemPrompt
  if (props.showToolEvents) elementProps['show-tool-events'] = ''
  return createElement('edge-chat', elementProps)
}
