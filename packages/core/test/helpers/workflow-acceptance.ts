import { expect } from 'vitest'
import type { LanguageModelV3 } from '@ai-sdk/provider'
import {
  createAgent,
  createAuditTrail,
  createMissionControl,
  type AgentEvent,
  type EdgeAuditEntry,
  type EdgeResponseValidationResult,
  type EdgeResponseValidator,
  type EdgeTelemetryEvent,
} from '../../src/index'

const acceptanceModel = {
  provider: 'fixture',
  modelId: 'workflow-acceptance',
  specificationVersion: 'v3',
} as LanguageModelV3

export interface WorkflowAcceptanceReadStep {
  toolName: string
  input: Record<string, unknown>
  output: Record<string, unknown>
  requiredClaim: string
  evidenceHandle?: string
}

export interface WorkflowAcceptanceMutationStep<State extends object> {
  toolName: string
  input: Record<string, unknown>
  adapterName: string
  apply: (state: State, input: Record<string, unknown>) => Record<string, unknown>
}

export interface WorkflowAcceptanceStrictClaimSupport {
  validateResponse: EdgeResponseValidator
  unsupportedPrompt: string
  unsupportedText: string
  refusalText: string
}

export interface WorkflowAcceptanceFixture<State extends object = Record<string, unknown>> {
  name: string
  initialState: () => State
  prompt: string
  read: WorkflowAcceptanceReadStep
  mutation: WorkflowAcceptanceMutationStep<State>
  expectedTelemetryClasses?: string[]
  expectedAuditActions?: string[]
  strictClaimSupport?: WorkflowAcceptanceStrictClaimSupport
}

export interface WorkflowAcceptanceAdapterCall {
  adapterName: string
  actionName: string
  input: Record<string, unknown>
  approvalId: string
}

export interface WorkflowAcceptanceStateSnapshots<State extends object> {
  initial: State
  beforeApproval: State
  afterApproval: State
}

export interface WorkflowAcceptanceScenarioTrace<State extends object> {
  agentEvents: AgentEvent[]
  telemetryEvents: EdgeTelemetryEvent[]
  auditEntries: EdgeAuditEntry[]
  stateSnapshots: WorkflowAcceptanceStateSnapshots<State>
  adapterCalls: WorkflowAcceptanceAdapterCall[]
  finalState: State
  finalVisibleText: string
  claimSupportResults: EdgeResponseValidationResult[]
}

export interface WorkflowAcceptanceStrictTrace<State extends object> extends WorkflowAcceptanceScenarioTrace<State> {
  unsupportedText: string
  refusalText: string
}

export interface WorkflowAcceptanceTrace<State extends object> {
  denied: WorkflowAcceptanceScenarioTrace<State>
  approved: WorkflowAcceptanceScenarioTrace<State>
  strictClaimSupport?: WorkflowAcceptanceStrictTrace<State>
}

export async function runWorkflowAcceptanceFixture<State extends object>(
  fixture: WorkflowAcceptanceFixture<State>,
): Promise<WorkflowAcceptanceTrace<State>> {
  const denied = await runScenario(fixture, { approved: false })
  const approved = await runScenario(fixture, { approved: true })
  const strictClaimSupport = fixture.strictClaimSupport
    ? await runScenario(fixture, { unsupported: true }) as WorkflowAcceptanceStrictTrace<State>
    : undefined

  if (strictClaimSupport && fixture.strictClaimSupport) {
    strictClaimSupport.unsupportedText = fixture.strictClaimSupport.unsupportedText
    strictClaimSupport.refusalText = fixture.strictClaimSupport.refusalText
  }

  return { denied, approved, strictClaimSupport }
}

export function assertWorkflowAcceptanceInvariants<State extends object>(
  fixture: WorkflowAcceptanceFixture<State>,
  trace: WorkflowAcceptanceTrace<State>,
) {
  assertScenarioEvidencePrecedesClaims(fixture, trace.denied)
  assertScenarioEvidencePrecedesClaims(fixture, trace.approved)

  expect(trace.denied.finalState).toEqual(trace.denied.stateSnapshots.initial)
  expect(trace.denied.adapterCalls).toEqual([])
  expect(trace.denied.telemetryEvents).toContainEqual(expect.objectContaining({
    name: 'approval-decision',
    approved: false,
  }))
  expect(trace.denied.auditEntries).toContainEqual(expect.objectContaining({
    event: expect.objectContaining({ action: 'approval-decision', approved: false }),
  }))

  expect(trace.approved.stateSnapshots.beforeApproval).toEqual(trace.approved.stateSnapshots.initial)
  expect(trace.approved.adapterCalls).toEqual([
    {
      adapterName: fixture.mutation.adapterName,
      actionName: fixture.mutation.toolName,
      input: fixture.mutation.input,
      approvalId: approvalIdFor(fixture),
    },
  ])
  expect(trace.approved.finalState).not.toEqual(trace.approved.stateSnapshots.initial)
  expect(trace.approved.telemetryEvents).toContainEqual(expect.objectContaining({
    name: 'approval-decision',
    approved: true,
  }))
  expect(trace.approved.telemetryEvents).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: 'tool-call', toolName: fixture.mutation.toolName }),
    expect.objectContaining({ name: 'tool-result', toolName: fixture.mutation.toolName }),
  ]))
  expect(trace.approved.auditEntries).toContainEqual(expect.objectContaining({
    event: expect.objectContaining({ action: 'approval-decision', approved: true }),
  }))
  expect(trace.approved.auditEntries).toEqual(expect.arrayContaining([
    expect.objectContaining({ event: expect.objectContaining({ action: 'tool-call', toolName: fixture.mutation.toolName }) }),
    expect.objectContaining({ event: expect.objectContaining({ action: 'tool-result', toolName: fixture.mutation.toolName }) }),
  ]))

  assertTelemetryAndAuditClasses(fixture, trace.denied)
  assertTelemetryAndAuditClasses(fixture, trace.approved)

  if (fixture.strictClaimSupport) {
    expect(trace.strictClaimSupport).toBeDefined()
    assertStrictClaimSupportFailure(fixture.strictClaimSupport, trace.strictClaimSupport!)
  }
}

async function runScenario<State extends object>(
  fixture: WorkflowAcceptanceFixture<State>,
  options: { approved?: boolean; unsupported?: boolean },
): Promise<WorkflowAcceptanceScenarioTrace<State>> {
  const state = clone(fixture.initialState())
  const initial = clone(state)
  const telemetry = createMissionControl()
  const auditTrail = createAuditTrail({
    now: () => '2026-05-29T00:00:00.000Z',
    hash: payload => `hash:${payload.length}`,
  })
  const adapterCalls: WorkflowAcceptanceAdapterCall[] = []
  const claimSupportResults: EdgeResponseValidationResult[] = []
  const approvalId = approvalIdFor(fixture)

  const executeDeclaredHostAdapter = (actionName: string, input: Record<string, unknown>) => {
    adapterCalls.push({
      adapterName: fixture.mutation.adapterName,
      actionName,
      input,
      approvalId,
    })
    return fixture.mutation.apply(state, input)
  }

  const streamText = (streamOptions: Record<string, unknown>) => ({
    fullStream: streamForScenario(fixture, streamOptions, options, executeDeclaredHostAdapter),
    response: Promise.resolve({
      messages: [{ role: 'assistant', content: [{ type: 'text', text: responseTextForScenario(fixture, streamOptions, options) }] }],
    }),
  })

  const validateResponse: EdgeResponseValidator = async context => {
    const result = await fixture.strictClaimSupport?.validateResponse(context)
    if (isValidationResult(result)) claimSupportResults.push(result)
    return result
  }

  const agent = createAgent({
    systemPrompt: 'Use app-owned read tools before workflow claims and request approval before risky mutations.',
    model: [acceptanceModel],
    grounding: 'strict',
    agentIdentity: {
      name: 'Workflow acceptance fixture',
      noEvidenceMessage: fixture.strictClaimSupport?.refusalText,
    },
    sessionId: `workflow-acceptance:${fixture.name}:${options.unsupported ? 'unsupported' : options.approved ? 'approved' : 'denied'}`,
    toolManifests: [
      { name: fixture.read.toolName, description: 'App-owned read evidence tool.', readOnly: true, tool: { readOnly: true } },
      { name: fixture.mutation.toolName, description: `Risky host action through ${fixture.mutation.adapterName}.`, tool: { needsApproval: true } },
    ],
    telemetry,
    auditTrail,
    streamText: streamText as never,
    validateResponse,
  })

  const agentEvents: AgentEvent[] = []
  for await (const event of agent.send(options.unsupported ? fixture.strictClaimSupport!.unsupportedPrompt : fixture.prompt)) {
    agentEvents.push(event)
  }

  const beforeApproval = clone(state)
  if (!options.unsupported) {
    expect(agentEvents).toContainEqual(expect.objectContaining({
      type: 'approval-request',
      approvalId,
      toolCall: expect.objectContaining({
        toolName: fixture.mutation.toolName,
        adapterName: fixture.mutation.adapterName,
      }),
    }))

    for await (const event of agent.respondToApproval(
      approvalId,
      Boolean(options.approved),
      options.approved ? 'approved by host test' : 'denied by host test',
    )) {
      agentEvents.push(event)
    }
  }

  return {
    agentEvents,
    telemetryEvents: telemetry.events(),
    auditEntries: auditTrail.entries?.() ?? [],
    stateSnapshots: {
      initial,
      beforeApproval,
      afterApproval: clone(state),
    },
    adapterCalls,
    finalState: clone(state),
    finalVisibleText: finalVisibleText(agentEvents),
    claimSupportResults,
  }
}

async function* streamForScenario<State extends object>(
  fixture: WorkflowAcceptanceFixture<State>,
  streamOptions: Record<string, unknown>,
  options: { approved?: boolean; unsupported?: boolean },
  executeDeclaredHostAdapter: (actionName: string, input: Record<string, unknown>) => Record<string, unknown>,
): AsyncGenerator<Record<string, unknown>> {
  if (options.unsupported) {
    yield { type: 'tool-call', toolCallId: `${fixture.name}:unsupported-read`, toolName: fixture.read.toolName, input: fixture.read.input }
    yield { type: 'tool-result', toolCallId: `${fixture.name}:unsupported-read`, toolName: fixture.read.toolName, output: fixture.read.output }
    yield { type: 'text-delta', delta: fixture.strictClaimSupport!.unsupportedText }
    return
  }

  const approval = findApprovalResponse(streamOptions.messages)
  if (!approval) {
    yield { type: 'tool-call', toolCallId: `${fixture.name}:read`, toolName: fixture.read.toolName, input: fixture.read.input }
    yield { type: 'tool-result', toolCallId: `${fixture.name}:read`, toolName: fixture.read.toolName, output: fixture.read.output }
    yield { type: 'text-delta', delta: supportedReadClaimText(fixture) }
    yield {
      type: 'tool-approval-request',
      approvalId: approvalIdFor(fixture),
      toolCall: {
        toolName: fixture.mutation.toolName,
        input: fixture.mutation.input,
        adapterName: fixture.mutation.adapterName,
      },
    }
    return
  }

  if (approval.approved) {
    yield { type: 'tool-call', toolCallId: `${fixture.name}:mutate`, toolName: fixture.mutation.toolName, input: fixture.mutation.input }
    const output = executeDeclaredHostAdapter(fixture.mutation.toolName, fixture.mutation.input)
    yield { type: 'tool-result', toolCallId: `${fixture.name}:mutate`, toolName: fixture.mutation.toolName, output }
    yield { type: 'text-delta', delta: `Approved through ${fixture.mutation.adapterName}; the host adapter reported the mutation outcome.` }
    return
  }

  yield { type: 'tool-call', toolCallId: `${fixture.name}:read-after-denial`, toolName: fixture.read.toolName, input: fixture.read.input }
  yield { type: 'tool-result', toolCallId: `${fixture.name}:read-after-denial`, toolName: fixture.read.toolName, output: fixture.read.output }
  yield { type: 'text-delta', delta: `Request denied; ${supportedReadClaimText(fixture)} No mutation was executed.` }
}

function assertScenarioEvidencePrecedesClaims<State extends object>(
  fixture: WorkflowAcceptanceFixture<State>,
  trace: WorkflowAcceptanceScenarioTrace<State>,
) {
  const readResultIndex = trace.agentEvents.findIndex(event =>
    event.type === 'tool-result' && event.toolName === fixture.read.toolName,
  )
  const visibleClaimIndex = trace.agentEvents.findIndex(event =>
    (event.type === 'text-delta' || event.type === 'done') && event.text.includes(fixture.read.requiredClaim),
  )

  if (visibleClaimIndex >= 0) {
    expect(readResultIndex).toBeGreaterThanOrEqual(0)
    expect(visibleClaimIndex).toBeGreaterThan(readResultIndex)
  }
}

function assertTelemetryAndAuditClasses<State extends object>(
  fixture: WorkflowAcceptanceFixture<State>,
  trace: WorkflowAcceptanceScenarioTrace<State>,
) {
  const expectedTelemetryClasses = fixture.expectedTelemetryClasses ?? [
    'run-start',
    'model-selected',
    'tool-call',
    'tool-result',
    'approval-request',
    'approval-decision',
    'run-finish',
  ]
  expect(trace.telemetryEvents.map(event => event.name)).toEqual(expect.arrayContaining(expectedTelemetryClasses))
  expect(trace.telemetryEvents).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: 'tool-call', toolName: fixture.read.toolName }),
    expect.objectContaining({ name: 'tool-result', toolName: fixture.read.toolName }),
    expect.objectContaining({ name: 'approval-request', toolName: fixture.mutation.toolName }),
  ]))

  const expectedAuditActions = fixture.expectedAuditActions ?? [
    'tool-call',
    'tool-result',
    'approval-request',
    'approval-decision',
  ]
  expect(trace.auditEntries.map(entry => entry.event.action)).toEqual(expect.arrayContaining(expectedAuditActions))
}

function assertStrictClaimSupportFailure<State extends object>(
  strictClaimSupport: WorkflowAcceptanceStrictClaimSupport,
  trace: WorkflowAcceptanceStrictTrace<State>,
) {
  expect(trace.finalState).toEqual(trace.stateSnapshots.initial)
  expect(trace.adapterCalls).toEqual([])
  expect(trace.claimSupportResults).toContainEqual(expect.objectContaining({
    blocked: true,
    state: 'refused',
  }))
  expect(trace.agentEvents).toContainEqual(expect.objectContaining({
    type: 'response-validation',
    validation: expect.objectContaining({ blocked: true, state: 'refused' }),
  }))

  const blockedValidationIndex = trace.agentEvents.findIndex(event =>
    event.type === 'response-validation' && event.validation.blocked,
  )
  const unsupportedVisibleIndex = trace.agentEvents.findIndex(event =>
    (event.type === 'text-delta' || event.type === 'done') && event.text.includes(strictClaimSupport.unsupportedText),
  )
  expect(blockedValidationIndex).toBeGreaterThanOrEqual(0)
  expect(unsupportedVisibleIndex).toBe(-1)
  expect(trace.finalVisibleText).toBe(strictClaimSupport.refusalText)
}

function responseTextForScenario<State extends object>(
  fixture: WorkflowAcceptanceFixture<State>,
  streamOptions: Record<string, unknown>,
  options: { approved?: boolean; unsupported?: boolean },
) {
  if (options.unsupported) return fixture.strictClaimSupport!.unsupportedText
  const approval = findApprovalResponse(streamOptions.messages)
  if (!approval) return supportedReadClaimText(fixture)
  if (approval.approved) return `Approved through ${fixture.mutation.adapterName}; the host adapter reported the mutation outcome.`
  return `Request denied; ${supportedReadClaimText(fixture)} No mutation was executed.`
}

function supportedReadClaimText<State extends object>(fixture: WorkflowAcceptanceFixture<State>) {
  const evidence = fixture.read.evidenceHandle ? ` [evidence:${fixture.read.evidenceHandle}]` : ''
  return `${fixture.read.requiredClaim}${evidence} according to app-owned read evidence.`
}

function findApprovalResponse(messages: unknown) {
  if (!Array.isArray(messages)) return null
  for (const message of messages) {
    if (!isRecord(message) || message.role !== 'tool' || !Array.isArray(message.content)) continue
    const response = message.content.find(part =>
      isRecord(part) && part.type === 'tool-approval-response' && typeof part.approved === 'boolean',
    )
    if (isRecord(response)) return response as { approved: boolean }
  }
  return null
}

function finalVisibleText(events: AgentEvent[]) {
  const finalDone = events.findLast(event => event.type === 'done')
  return finalDone?.text ?? ''
}

function approvalIdFor<State extends object>(fixture: WorkflowAcceptanceFixture<State>) {
  return `${fixture.name}:approval`
}

function isValidationResult(value: unknown): value is EdgeResponseValidationResult {
  return isRecord(value) && typeof value.blocked === 'boolean' && typeof value.state === 'string'
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
