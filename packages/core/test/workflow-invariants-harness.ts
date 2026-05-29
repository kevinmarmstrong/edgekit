import { expect, vi } from 'vitest'
import type { LanguageModelV3 } from '@ai-sdk/provider'
import {
  createAgent,
  createAuditTrail,
  createMissionControl,
  type AgentEvent,
  type EdgeTelemetryEvent,
} from '../src/index'
import type { EdgeResponseValidationContext } from '../src/agent'

const fakeModel = { provider: 'fixture', modelId: 'workflow-invariants', specificationVersion: 'v3' } as LanguageModelV3

export interface WorkflowInvariantsFixture<State extends object, MutationInput extends Record<string, unknown>> {
  name: string
  initialState: State
  readToolName: string
  mutateToolName: string
  prompt: string
  readInput: Record<string, unknown>
  readResult: Record<string, unknown>
  requiredClaim: string
  evidenceCitation: string
  mutationInput: MutationInput
  adapterName: string
  applyApprovedMutation: (state: State, input: MutationInput) => Record<string, unknown>
}

interface AdapterCall {
  adapterName: string
  actionName: string
  input: Record<string, unknown>
  approvalId: string
}

interface ScenarioResult<State extends object> {
  events: AgentEvent[]
  telemetryEvents: EdgeTelemetryEvent[]
  auditActions: string[]
  adapterCalls: AdapterCall[]
  beforeApprovalState: State
  finalState: State
  validationContexts: EdgeResponseValidationContext[]
}

export async function runWorkflowInvariantsAcceptance<State extends object, MutationInput extends Record<string, unknown>>(
  fixture: WorkflowInvariantsFixture<State, MutationInput>,
) {
  const denied = await runScenario(fixture, false)
  expect(denied.finalState).toEqual(fixture.initialState)
  expect(denied.adapterCalls).toEqual([])
  expect(denied.auditActions).toEqual(expect.arrayContaining([
    'tool-call',
    'tool-result',
    'approval-request',
    'approval-decision',
  ]))
  assertReadResultBeforeClaim(fixture, denied.events)
  assertStrictGroundingValidation(fixture, denied.validationContexts)
  assertTelemetryClasses(fixture, denied.telemetryEvents)

  const approved = await runScenario(fixture, true)
  expect(approved.beforeApprovalState).toEqual(fixture.initialState)
  expect(approved.finalState).not.toEqual(fixture.initialState)
  expect(approved.adapterCalls).toEqual([
    {
      adapterName: fixture.adapterName,
      actionName: fixture.mutateToolName,
      input: fixture.mutationInput,
      approvalId: `${fixture.name}:approval`,
    },
  ])
  expect(approved.auditActions).toEqual(expect.arrayContaining([
    'tool-call',
    'tool-result',
    'approval-request',
    'approval-decision',
  ]))
  assertReadResultBeforeClaim(fixture, approved.events)
  assertStrictGroundingValidation(fixture, approved.validationContexts)
  assertTelemetryClasses(fixture, approved.telemetryEvents)
  expect(approved.telemetryEvents).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: 'tool-call', toolName: fixture.mutateToolName }),
    expect.objectContaining({ name: 'tool-result', toolName: fixture.mutateToolName }),
  ]))
}

async function runScenario<State extends object, MutationInput extends Record<string, unknown>>(
  fixture: WorkflowInvariantsFixture<State, MutationInput>,
  approved: boolean,
): Promise<ScenarioResult<State>> {
  const state = clone(fixture.initialState)
  const telemetry = createMissionControl()
  const auditTrail = createAuditTrail({
    now: () => '2026-05-29T00:00:00.000Z',
    hash: payload => `hash:${payload.length}`,
  })
  const adapterCalls: AdapterCall[] = []
  const validationContexts: EdgeResponseValidationContext[] = []
  const approvalId = `${fixture.name}:approval`

  const hostAdapter = {
    execute(actionName: string, input: MutationInput) {
      adapterCalls.push({
        adapterName: fixture.adapterName,
        actionName,
        input,
        approvalId,
      })
      return fixture.applyApprovedMutation(state, input)
    },
  }

  const streamText = vi.fn((options: Record<string, unknown>) => {
    const approval = findApprovalResponse(options.messages)
    const text = approval
      ? approval.approved
        ? `Approved through ${fixture.adapterName}; mutation completed from host adapter evidence ${fixture.evidenceCitation}.`
        : `Request denied; ${fixture.requiredClaim} remains supported by ${fixture.evidenceCitation}; no mutation executed.`
      : `${fixture.requiredClaim} according to app-owned read evidence ${fixture.evidenceCitation}. Approval is required before mutation.`

    return {
      fullStream: (async function* () {
        if (!approval) {
          yield { type: 'tool-call', toolCallId: `${fixture.name}:read`, toolName: fixture.readToolName, input: fixture.readInput }
          yield { type: 'tool-result', toolCallId: `${fixture.name}:read`, toolName: fixture.readToolName, output: fixture.readResult }
          yield { type: 'text-delta', delta: text }
          yield {
            type: 'tool-approval-request',
            approvalId,
            toolCall: {
              toolName: fixture.mutateToolName,
              input: fixture.mutationInput,
              adapterName: fixture.adapterName,
            },
          }
          return
        }

        if (approval.approved) {
          yield { type: 'tool-call', toolCallId: `${fixture.name}:mutate`, toolName: fixture.mutateToolName, input: fixture.mutationInput }
          const output = hostAdapter.execute(fixture.mutateToolName, fixture.mutationInput)
          yield { type: 'tool-result', toolCallId: `${fixture.name}:mutate`, toolName: fixture.mutateToolName, output }
          yield { type: 'text-delta', delta: text }
          return
        }

        yield { type: 'tool-call', toolCallId: `${fixture.name}:read-after-denial`, toolName: fixture.readToolName, input: fixture.readInput }
        yield { type: 'tool-result', toolCallId: `${fixture.name}:read-after-denial`, toolName: fixture.readToolName, output: fixture.readResult }
        yield { type: 'text-delta', delta: text }
      })(),
      response: Promise.resolve({
        messages: [{ role: 'assistant', content: [{ type: 'text', text }] }],
      }),
    }
  })

  const agent = createAgent({
    systemPrompt: 'Use host app tools for workflow evidence and request approval before risky mutations.',
    model: [fakeModel],
    grounding: 'strict',
    agentIdentity: { name: 'Workflow acceptance fixture' },
    sessionId: `workflow-invariants:${fixture.name}:${approved ? 'approved' : 'denied'}`,
    toolManifests: [
      { name: fixture.readToolName, description: 'App-owned read evidence tool.', readOnly: true, tool: { readOnly: true } },
      { name: fixture.mutateToolName, description: `Mutation action executed by ${fixture.adapterName}.`, tool: { needsApproval: true } },
    ],
    telemetry,
    auditTrail,
    streamText: streamText as never,
    validateResponse: context => {
      validationContexts.push(context)
      if (context.text.includes(fixture.requiredClaim)) {
        expect(context.grounding).toBe('strict')
        expect(context.text).toContain(fixture.evidenceCitation)
        expect(context.toolsCalled).toContain(fixture.readToolName)
        expect(context.toolResults).toEqual(expect.arrayContaining([
          expect.objectContaining({ toolName: fixture.readToolName, output: fixture.readResult }),
        ]))
      }
      return null
    },
  })

  const events: AgentEvent[] = []
  for await (const event of agent.send(fixture.prompt)) {
    events.push(event)
  }

  const beforeApprovalState = clone(state)
  expect(events).toContainEqual(expect.objectContaining({
    type: 'approval-request',
    approvalId,
    toolCall: expect.objectContaining({
      toolName: fixture.mutateToolName,
      adapterName: fixture.adapterName,
    }),
  }))

  for await (const event of agent.respondToApproval(approvalId, approved, approved ? 'accepted by test host' : 'rejected by test host')) {
    events.push(event)
  }

  return {
    events,
    telemetryEvents: telemetry.events(),
    auditActions: auditTrail.entries?.().map(entry => entry.event.action) ?? [],
    adapterCalls,
    beforeApprovalState,
    finalState: clone(state),
    validationContexts,
  }
}

function assertReadResultBeforeClaim<State extends object, MutationInput extends Record<string, unknown>>(
  fixture: WorkflowInvariantsFixture<State, MutationInput>,
  events: AgentEvent[],
) {
  const readResultIndex = events.findIndex(event =>
    event.type === 'tool-result' && event.toolName === fixture.readToolName,
  )
  const visibleClaimIndex = events.findIndex(event =>
    (event.type === 'text-delta' || event.type === 'done') && event.text.includes(fixture.requiredClaim),
  )
  expect(readResultIndex).toBeGreaterThanOrEqual(0)
  expect(visibleClaimIndex).toBeGreaterThan(readResultIndex)
}

function assertStrictGroundingValidation<State extends object, MutationInput extends Record<string, unknown>>(
  fixture: WorkflowInvariantsFixture<State, MutationInput>,
  contexts: EdgeResponseValidationContext[],
) {
  const claimContexts = contexts.filter(context => context.text.includes(fixture.requiredClaim))
  expect(claimContexts.length).toBeGreaterThan(0)
  for (const context of claimContexts) {
    expect(context.grounding).toBe('strict')
    expect(context.evidenceCount).toBeGreaterThan(0)
    expect(context.text).toContain(fixture.evidenceCitation)
    expect(context.toolResults.some(result => result.toolName === fixture.readToolName)).toBe(true)
  }
}

function assertTelemetryClasses<State extends object, MutationInput extends Record<string, unknown>>(
  fixture: WorkflowInvariantsFixture<State, MutationInput>,
  events: EdgeTelemetryEvent[],
) {
  expect(events.map(event => event.name)).toEqual(expect.arrayContaining([
    'run-start',
    'model-selected',
    'tool-call',
    'tool-result',
    'approval-request',
    'approval-decision',
    'run-finish',
  ]))
  expect(events).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: 'tool-call', toolName: fixture.readToolName }),
    expect.objectContaining({ name: 'tool-result', toolName: fixture.readToolName }),
    expect.objectContaining({ name: 'approval-request', toolName: fixture.mutateToolName }),
  ]))
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

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
