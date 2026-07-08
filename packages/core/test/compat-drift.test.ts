import { describe, expect, it, vi } from 'vitest'
import {
  agUiEventToAgentEvents as rootAgUiEventToAgentEvents,
  createAuditTrail as rootCreateAuditTrail,
  createKnowledgeSkill as rootCreateKnowledgeSkill,
  createKnowledgeTool as rootCreateKnowledgeTool,
  createMemoryMutationJournal as rootCreateMemoryMutationJournal,
  createMissionProfile as rootCreateMissionProfile,
  createPiiRedactor as rootCreatePiiRedactor,
  createSkill as rootCreateSkill,
  loadMcpTools as rootLoadMcpTools,
  mcpToolsFromDefinitions as rootMcpToolsFromDefinitions,
  profileToAgentOptions as rootProfileToAgentOptions,
} from '../src/index'
import {
  createMissionProfile,
  createSkill,
  profileToAgentOptions,
} from '../../skills/src/index'
import {
  createKnowledgeSkill,
  createKnowledgeTool,
  type EdgeKnowledgeSource,
} from '../../knowledge/src/index'
import {
  createAuditTrail,
  createMemoryMutationJournal,
  createPiiRedactor,
} from '../../governance/src/index'
import { loadMcpTools, mcpToolsFromDefinitions } from '../../mcp/src/index'
import { agUiEventToAgentEvents } from '../../agui/src/index'

describe('core compatibility drift', () => {
  it('keeps Skill and Mission Profile helpers aligned with the skills sibling', () => {
    const skillInput = { id: 'search', name: 'Search', description: 'Search records.' }
    expect(rootCreateSkill(skillInput)).toEqual(createSkill(skillInput))

    const profileInput = {
      id: 'support-v1',
      mission: 'support-workflow',
      version: '1.0.0',
      systemPrompt: 'Search support records.',
      defaults: { toolChoice: 'required' as const, downloadPolicy: 'never' as const, outputLanguage: 'fr' as const },
    }
    expect(rootCreateMissionProfile(profileInput)).toEqual(createMissionProfile(profileInput))
    expect(rootProfileToAgentOptions(profileInput)).toEqual(profileToAgentOptions(profileInput))
  })

  it('keeps Knowledge Access wrappers aligned with the knowledge sibling', () => {
    const source: EdgeKnowledgeSource = {
      id: 'docs',
      search: async () => [{ id: 'r1', title: 'Install', excerpt: 'Run pnpm install.' }],
    }

    expect(Object.keys(rootCreateKnowledgeTool({ name: 'searchDocs', source }))).toEqual(
      Object.keys(createKnowledgeTool({ name: 'searchDocs', source })),
    )
    const rootSkill = rootCreateKnowledgeSkill({ id: 'docs', name: 'Docs', description: 'Search docs.', source })
    const siblingSkill = createKnowledgeSkill({ id: 'docs', name: 'Docs', description: 'Search docs.', source })
    expect({
      id: rootSkill.id,
      requiredTools: rootSkill.requiredTools,
      synthesis: rootSkill.synthesis,
      toolNames: Object.keys(rootSkill.tools ?? {}),
    }).toEqual({
      id: siblingSkill.id,
      requiredTools: siblingSkill.requiredTools,
      synthesis: siblingSkill.synthesis,
      toolNames: Object.keys(siblingSkill.tools ?? {}),
    })
  })

  it('keeps governance helpers aligned with the governance sibling', async () => {
    expect(await rootCreatePiiRedactor()('email a@example.com', { session: {} })).toEqual(
      await createPiiRedactor()('email a@example.com', { session: {} }),
    )

    const rootJournal = rootCreateMemoryMutationJournal({ now: () => '2026-05-28T00:00:00.000Z', createId: () => 'm1' })
    const siblingJournal = createMemoryMutationJournal({ now: () => '2026-05-28T00:00:00.000Z', createId: () => 'm1' })
    expect(await rootJournal.enqueue({ toolName: 'save', input: { ok: true } })).toEqual(
      await siblingJournal.enqueue({ toolName: 'save', input: { ok: true } }),
    )

    const rootAudit = rootCreateAuditTrail({ now: () => '2026-05-28T00:00:00.000Z' })
    const siblingAudit = createAuditTrail({ now: () => '2026-05-28T00:00:00.000Z' })
    const rootEntry = await rootAudit.record({ action: 'tool-call', sessionId: 's1' })
    const siblingEntry = await siblingAudit.record({ action: 'tool-call', sessionId: 's1' })
    expect({
      sequence: rootEntry.sequence,
      timestamp: rootEntry.timestamp,
      previousHash: rootEntry.previousHash,
      hash: rootEntry.hash,
      event: rootEntry.event,
    }).toEqual({
      sequence: siblingEntry.sequence,
      timestamp: siblingEntry.timestamp,
      previousHash: siblingEntry.previousHash,
      hash: siblingEntry.hash,
      event: siblingEntry.event,
    })
  })

  it('keeps MCP catalog wrappers aligned with the MCP sibling', async () => {
    const client = { callTool: vi.fn(async () => ({ ok: true })) }
    expect(Object.keys(rootMcpToolsFromDefinitions([{ name: 'search' }], client))).toEqual(
      Object.keys(mcpToolsFromDefinitions([{ name: 'search' }], client)),
    )

    const listedClient = {
      listTools: async () => ({ tools: [{ name: 'lookup' }] }),
      callTool: vi.fn(async () => ({ ok: true })),
    }
    expect(Object.keys(await rootLoadMcpTools(listedClient))).toEqual(Object.keys(await loadMcpTools(listedClient)))
  })

  it('keeps AG-UI event mapping aligned with the AG-UI sibling', () => {
    const event = { type: 'TEXT_MESSAGE_CONTENT', delta: 'hello' }
    expect(rootAgUiEventToAgentEvents(event)).toEqual(agUiEventToAgentEvents(event))
  })
})
