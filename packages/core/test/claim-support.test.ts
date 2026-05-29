import { describe, expect, it, vi } from 'vitest'
import type { LanguageModelV3 } from '@ai-sdk/provider'
import {
  createAgent,
  createClaimEvidence,
  createClaimSupportValidator,
  validateClaimSupport,
} from '../src/index'

const fakeModel = { provider: 'fake', modelId: 'fake-model', specificationVersion: 'v3' } as LanguageModelV3

describe('response claim support', () => {
  it('passes a claim with a prior valid evidence handle', () => {
    const result = validateClaimSupport({
      evidence: [createClaimEvidence({ id: 'lookup#1', toolName: 'lookup', sequence: 0, output: { records: [{ id: 'item-1' }] } })],
      claims: [{ id: 'claim-1', text: 'item-1 exists', evidence: ['lookup#1'], sequence: 1 }],
    })

    expect(result).toMatchObject({ state: 'valid', blocked: false, issues: [] })
  })

  it('refuses a claim with no attached evidence handles', () => {
    const result = validateClaimSupport({
      evidence: [createClaimEvidence({ id: 'lookup#1', sequence: 0 })],
      claims: [{ id: 'claim-1', text: 'item-1 exists', evidence: [], sequence: 1 }],
    })

    expect(result).toMatchObject({
      state: 'refused',
      blocked: true,
      issues: [expect.objectContaining({ code: 'missing-evidence', claimId: 'claim-1' })],
    })
  })

  it('refuses a claim with an unknown evidence handle', () => {
    const result = validateClaimSupport({
      evidence: [createClaimEvidence({ id: 'lookup#1', sequence: 0 })],
      claims: [{ id: 'claim-1', text: 'item-1 exists', evidence: ['not-present'], sequence: 1 }],
    })

    expect(result).toMatchObject({
      state: 'refused',
      blocked: true,
      issues: [expect.objectContaining({ code: 'unknown-evidence', evidenceId: 'not-present' })],
    })
  })

  it('refuses a claim that cites later/future evidence', () => {
    const result = validateClaimSupport({
      evidence: [createClaimEvidence({ id: 'lookup#2', sequence: 2 })],
      claims: [{ id: 'claim-1', text: 'item-1 exists', evidence: ['lookup#2'], sequence: 1 }],
    })

    expect(result).toMatchObject({
      state: 'refused',
      blocked: true,
      issues: [expect.objectContaining({ code: 'future-evidence', evidenceId: 'lookup#2' })],
    })
  })

  it('releases strict text when a claim cites a prior tool-result evidence handle', async () => {
    const streamText = vi.fn(() => ({
      fullStream: (async function* () {
        yield { type: 'tool-result', toolCallId: 'tool-1', toolName: 'lookup', output: { evidenceId: 'lookup:item-1', records: [{ id: 'item-1' }] } }
        yield { type: 'text-delta', delta: 'item-1 exists' }
      })(),
      response: Promise.resolve({
        messages: [{ role: 'assistant', content: [{ type: 'text', text: 'item-1 exists' }] }],
      }),
    }))
    const agent = createAgent({
      systemPrompt: 'Answer from app evidence.',
      model: [fakeModel],
      grounding: 'strict',
      streamText: streamText as never,
      validateResponse: createClaimSupportValidator({
        claims: context => [{ id: 'claim-1', text: context.text, evidence: ['lookup:item-1'], sequence: context.toolResults.length }],
        refusalMessage: 'I cannot support that claim from prior app evidence.',
      }),
    })

    const events = []
    for await (const event of agent.send('does item-1 exist?')) {
      events.push(event)
    }

    expect(events).toContainEqual(expect.objectContaining({
      type: 'response-validation',
      validation: expect.objectContaining({ state: 'valid', blocked: false, issues: [] }),
    }))
    expect(events).toContainEqual({ type: 'text-delta', text: 'item-1 exists' })
    expect(events.at(-1)).toEqual({ type: 'done', text: 'item-1 exists' })
  })

  it('surfaces missing evidence structurally even when strict grounding has no tool results', async () => {
    const streamText = vi.fn(() => ({
      fullStream: (async function* () {
        yield { type: 'text-delta', delta: 'item-1 exists' }
      })(),
      response: Promise.resolve({
        messages: [{ role: 'assistant', content: [{ type: 'text', text: 'item-1 exists' }] }],
      }),
    }))
    const agent = createAgent({
      systemPrompt: 'Answer from app evidence.',
      model: [fakeModel],
      grounding: 'strict',
      streamText: streamText as never,
      validateResponse: createClaimSupportValidator({
        claims: () => [{ id: 'claim-1', text: 'item-1 exists', evidence: [], sequence: 1 }],
        refusalMessage: 'I cannot support that claim from prior app evidence.',
      }),
    })

    const events = []
    for await (const event of agent.send('does item-1 exist?')) {
      events.push(event)
    }

    expect(events).toContainEqual(expect.objectContaining({
      type: 'response-validation',
      validation: expect.objectContaining({
        state: 'refused',
        blocked: true,
        issues: [expect.objectContaining({ code: 'missing-evidence', claimId: 'claim-1' })],
      }),
    }))
    expect(events).not.toContainEqual({ type: 'text-delta', text: 'item-1 exists' })
    expect(events.at(-1)).toEqual({ type: 'done', text: 'I cannot support that claim from prior app evidence.' })
  })

  it('surfaces future evidence structurally before releasing strict text', async () => {
    const streamText = vi.fn(() => ({
      fullStream: (async function* () {
        yield { type: 'tool-result', toolCallId: 'tool-1', toolName: 'lookup', output: { evidenceId: 'lookup:item-1', records: [{ id: 'item-1' }] } }
        yield { type: 'text-delta', delta: 'item-1 exists' }
      })(),
      response: Promise.resolve({
        messages: [{ role: 'assistant', content: [{ type: 'text', text: 'item-1 exists' }] }],
      }),
    }))
    const agent = createAgent({
      systemPrompt: 'Answer from app evidence.',
      model: [fakeModel],
      grounding: 'strict',
      streamText: streamText as never,
      validateResponse: createClaimSupportValidator({
        claims: () => [{ id: 'claim-1', text: 'item-1 exists', evidence: ['lookup:item-1'], sequence: 0 }],
        refusalMessage: 'I cannot support that claim from prior app evidence.',
      }),
    })

    const events = []
    for await (const event of agent.send('does item-1 exist?')) {
      events.push(event)
    }

    expect(events).toContainEqual(expect.objectContaining({
      type: 'response-validation',
      validation: expect.objectContaining({
        state: 'refused',
        blocked: true,
        issues: [expect.objectContaining({ code: 'future-evidence', evidenceId: 'lookup:item-1' })],
      }),
    }))
    expect(events).not.toContainEqual({ type: 'text-delta', text: 'item-1 exists' })
    expect(events.at(-1)).toEqual({ type: 'done', text: 'I cannot support that claim from prior app evidence.' })
  })

  it('surfaces unsupported claim failure as structured validation state before release', async () => {
    const streamText = vi.fn(() => ({
      fullStream: (async function* () {
        yield { type: 'tool-result', toolCallId: 'tool-1', toolName: 'lookup', output: { records: [{ id: 'item-1' }] } }
        yield { type: 'text-delta', delta: 'item-1 exists' }
      })(),
      response: Promise.resolve({
        messages: [{ role: 'assistant', content: [{ type: 'text', text: 'item-1 exists' }] }],
      }),
    }))
    const agent = createAgent({
      systemPrompt: 'Answer from app evidence.',
      model: [fakeModel],
      grounding: 'strict',
      streamText: streamText as never,
      validateResponse: createClaimSupportValidator({
        claims: () => [{ id: 'claim-1', text: 'item-1 exists', evidence: ['not-present'], sequence: 1 }],
        refusalMessage: 'I cannot support that claim from prior app evidence.',
      }),
    })

    const events = []
    for await (const event of agent.send('does item-1 exist?')) {
      events.push(event)
    }

    expect(events).toContainEqual(expect.objectContaining({
      type: 'response-validation',
      validation: expect.objectContaining({
        state: 'refused',
        blocked: true,
        issues: [expect.objectContaining({ code: 'unknown-evidence', evidenceId: 'not-present' })],
      }),
    }))
    expect(events).not.toContainEqual({ type: 'text-delta', text: 'item-1 exists' })
    expect(events.at(-1)).toEqual({ type: 'done', text: 'I cannot support that claim from prior app evidence.' })
  })
})
