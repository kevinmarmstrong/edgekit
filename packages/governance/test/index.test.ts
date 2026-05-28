import { describe, expect, it } from 'vitest'
import {
  EdgeToolPolicyError,
  createAuditTrail,
  createMemoryMutationJournal,
  createOfflineTool,
  createPiiRedactor,
  executeToolWithPolicy,
} from '../src/index'

describe('governance package', () => {
  it('redacts common PII', async () => {
    const redactor = createPiiRedactor()
    await expect(await redactor('email a@example.com', { session: {} })).toContain('[REDACTED:email]')
  })

  it('records audit entries in sequence', async () => {
    const audit = createAuditTrail({ now: () => '2026-05-28T00:00:00.000Z' })
    const entry = await audit.record({ action: 'tool-call', sessionId: 's1' })
    expect(entry.sequence).toBe(1)
    expect(entry.previousHash).toBe('genesis')
  })

  it('queues offline tools', async () => {
    const journal = createMemoryMutationJournal({ now: () => '2026-05-28T00:00:00.000Z', createId: () => 'm1' })
    const tool = createOfflineTool({ name: 'save', tool: { execute: async () => ({ ok: true }) }, journal, online: () => false })

    await expect(tool.execute({}, { session: {} })).resolves.toMatchObject({ queued: true })
    expect(await journal.list()).toHaveLength(1)
  })

  it('enforces tool policy', async () => {
    await expect(executeToolWithPolicy({
      toolName: 'blocked',
      tool: { execute: async () => ({ ok: true }) },
      input: {},
      context: { session: {} },
    }, { defaultPolicy: { allowedTools: ['allowed'] } })).rejects.toBeInstanceOf(EdgeToolPolicyError)
  })
})
