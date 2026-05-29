import { describe, expect, it } from 'vitest'
import { createClaimSupportValidator } from '../src/index'
import {
  assertWorkflowAcceptanceInvariants,
  runWorkflowAcceptanceFixture,
  type WorkflowAcceptanceFixture,
} from './helpers/workflow-acceptance'

describe('shared workflow acceptance harness', () => {
  const fixtures: Array<WorkflowAcceptanceFixture<Record<string, unknown>>> = [
    {
      name: 'inventory reservation workflow',
      initialState: () => ({ reservations: [] as string[] }),
      prompt: 'Check availability and reserve one generic item.',
      read: {
        toolName: 'lookupInventory',
        input: { sku: 'item-1' },
        output: {
          records: [{ id: 'item-1', status: 'available', quantity: 2 }],
          evidence: [{ id: 'inventory#1' }],
        },
        requiredClaim: 'item-1 is available',
        evidenceHandle: 'inventory#1',
      },
      mutation: {
        toolName: 'reserveInventory',
        input: { sku: 'item-1', quantity: 1 },
        adapterName: 'host.inventory.reserve',
        apply: (state, input) => {
          const reservations = state.reservations as string[]
          reservations.push(String(input.sku))
          return { ok: true, reservationId: `reservation:${String(input.sku)}` }
        },
      },
      strictClaimSupport: {
        validateResponse: createClaimSupportValidator({
          claims: context => [{
            id: 'claim:inventory',
            text: 'item-1 is available',
            evidence: context.text.includes('unsupported') ? [] : ['inventory#1'],
            sequence: 1,
          }],
          refusalMessage: 'I cannot support that workflow claim from prior app evidence.',
        }),
        unsupportedPrompt: 'Make an unsupported inventory claim.',
        unsupportedText: 'unsupported inventory claim',
        refusalText: 'I cannot support that workflow claim from prior app evidence.',
      },
    },
    {
      name: 'case follow-up workflow',
      initialState: () => ({ notes: [] as string[] }),
      prompt: 'Summarize the generic case and append a follow-up note.',
      read: {
        toolName: 'lookupCaseSummary',
        input: { caseId: 'case-1' },
        output: {
          records: [{ id: 'case-1', status: 'open', nextStep: 'send follow-up' }],
          evidenceHandle: 'case#1',
        },
        requiredClaim: 'case-1 is open',
        evidenceHandle: 'case#1',
      },
      mutation: {
        toolName: 'appendCaseNote',
        input: { caseId: 'case-1', note: 'Follow-up queued.' },
        adapterName: 'host.case.appendNote',
        apply: (state, input) => {
          const notes = state.notes as string[]
          notes.push(String(input.note))
          return { ok: true, noteCount: notes.length }
        },
      },
      strictClaimSupport: {
        validateResponse: createClaimSupportValidator({
          claims: context => [{
            id: 'claim:case',
            text: 'case-1 is open',
            evidence: context.text.includes('unsupported') ? ['missing#1'] : ['case#1'],
            sequence: 1,
          }],
          refusalMessage: 'I cannot support that workflow claim from prior app evidence.',
        }),
        unsupportedPrompt: 'Make an unsupported case claim.',
        unsupportedText: 'unsupported case claim',
        refusalText: 'I cannot support that workflow claim from prior app evidence.',
      },
    },
  ]

  for (const fixture of fixtures) {
    it(`proves workflow invariants for ${fixture.name}`, async () => {
      const trace = await runWorkflowAcceptanceFixture(fixture)

      assertWorkflowAcceptanceInvariants(fixture, trace)
      expect(trace.denied.finalState).toEqual(fixture.initialState())
      expect(trace.approved.adapterCalls).toEqual([
        expect.objectContaining({
          adapterName: fixture.mutation.adapterName,
          actionName: fixture.mutation.toolName,
          input: fixture.mutation.input,
        }),
      ])
      expect(trace.strictClaimSupport?.finalVisibleText).toBe(fixture.strictClaimSupport?.refusalText)
    })
  }
})
