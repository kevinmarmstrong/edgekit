import { describe, it } from 'vitest'
import { runWorkflowInvariantsAcceptance } from './workflow-invariants-harness'

describe('shared workflow invariants acceptance harness', () => {
  const fixtures = [
    {
      name: 'inventory reservation workflow',
      initialState: { reservations: [] as string[] },
      readToolName: 'lookupInventory',
      mutateToolName: 'reserveInventory',
      prompt: 'check availability and reserve the generic item',
      readInput: { sku: 'item-1' },
      readResult: {
        records: [{ id: 'item-1', status: 'available', quantity: 2 }],
        citation: 'inventory-ledger:item-1',
      },
      requiredClaim: 'item-1 is available',
      evidenceCitation: '[evidence:lookupInventory]',
      mutationInput: { sku: 'item-1', quantity: 1 },
      adapterName: 'host.inventory.reserve',
      applyApprovedMutation: (state: { reservations: string[] }, input: { sku: string }) => {
        state.reservations.push(input.sku)
        return { ok: true, reservationId: `reservation:${input.sku}` }
      },
    },
    {
      name: 'support note workflow',
      initialState: { notes: [] as string[] },
      readToolName: 'lookupCaseSummary',
      mutateToolName: 'appendCaseNote',
      prompt: 'summarize the generic case and append a follow-up note',
      readInput: { caseId: 'case-1' },
      readResult: {
        records: [{ id: 'case-1', status: 'open', nextStep: 'send follow-up' }],
        citation: 'case-summary:case-1',
      },
      requiredClaim: 'case-1 is open',
      evidenceCitation: '[evidence:lookupCaseSummary]',
      mutationInput: { caseId: 'case-1', note: 'Follow-up queued.' },
      adapterName: 'host.case.appendNote',
      applyApprovedMutation: (state: { notes: string[] }, input: { note: string }) => {
        state.notes.push(input.note)
        return { ok: true, noteCount: state.notes.length }
      },
    },
  ]

  for (const fixture of fixtures) {
    it(`proves governed workflow invariants for ${fixture.name}`, async () => {
      await runWorkflowInvariantsAcceptance(fixture)
    })
  }
})
