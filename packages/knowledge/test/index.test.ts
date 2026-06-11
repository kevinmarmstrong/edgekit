import { describe, expect, it } from 'vitest'
import {
  createGroundedQaSkill,
  createKnowledgeSkill,
  createKnowledgeTool,
  createMarkdownMemoryStore,
  resolveGroundedNoEvidence,
  type EdgeKnowledgeSource,
} from '../src/index'

describe('knowledge package', () => {
  it('searches Markdown memory records', async () => {
    const store = createMarkdownMemoryStore({
      documents: [{ id: 'docs', content: '# Install\nRun pnpm install.' }],
    })

    const results = await store.search('install', { input: 'install', session: {} })
    expect(results[0]?.title).toBe('Install')
  })

  it('creates a knowledge tool and skill', () => {
    const source: EdgeKnowledgeSource = {
      id: 'docs',
      search: async query => [{ id: 'one', title: 'One', excerpt: query }],
    }

    expect(Object.keys(createKnowledgeTool({ name: 'searchDocs', source }))).toEqual(['searchDocs'])
    expect(createKnowledgeSkill({ id: 'docs', name: 'Docs', description: 'Search docs.', source }).requiredTools).toEqual(['searchDocs'])
  })

  it('creates a strict grounded Q&A skill and profile', () => {
    const source: EdgeKnowledgeSource = {
      id: 'test-source',
      search: async query => [{ id: 'reference', title: 'Reference', excerpt: `Evidence for ${query}`, uri: '/reference' }],
    }
    const kit = createGroundedQaSkill({
      id: 'test-source',
      name: 'Test Q&A',
      description: 'Answer questions from the test knowledge base.',
      source,
      identity: { name: 'TestBot', noEvidenceMessage: 'I do not know from the available evidence.' },
      toolName: 'searchTestKnowledge',
    })

    expect(kit.profile).toMatchObject({
      agentIdentity: { name: 'TestBot', noEvidenceMessage: 'I do not know from the available evidence.' },
      grounding: 'strict',
      requiredTools: ['searchTestKnowledge'],
      defaults: { toolChoice: 'required', downloadPolicy: 'never' },
    })
    expect(Object.keys(kit.tools)).toEqual(['searchTestKnowledge'])
    expect(kit.answerFromResults('contact', { results: [] })).toBe('I do not know from the available evidence.')
    expect(kit.answerFromResults('offline workflows', {
      results: [{ id: 'reference', title: 'Reference', excerpt: 'TestProject supports offline workflows.', uri: '/reference' }],
    })).toContain('TestProject supports offline workflows.')

    // Regression: unsupported public-claim with irrelevant top-k -> explicit no-evidence refusal
    const irrelevant = { results: [{ id: 'irrel', title: 'Irrelevant', excerpt: 'onboarding checklists', score: 0.1 }] }
    expect(kit.answerFromResults('unlisted warranty code', irrelevant)).toBe('I do not know from the available evidence.')

    const sharedNameOnly = { results: [{ id: 'overview', title: 'TestProject overview', excerpt: 'Navigation basics.', score: 0.1 }] }
    expect(kit.answerFromResults('TestProject encrypted vault export', sharedNameOnly)).toBe('I do not know from the available evidence.')

    // Regression: identity/runtime prompt in fallback -> configured assistant/runtime disclosure (no demo wording in core)
    const identityAnswer = kit.answerFromResults('who are you', { results: [] })
    expect(identityAnswer).toContain('TestBot')
    expect(identityAnswer).toContain('the assistant the developer configured with Edgekit')
    expect(identityAnswer).toContain('Edgekit is the runtime/widget')

    // Supported cited answer behavior remains intact
    expect(kit.answerFromResults('offline workflows', {
      results: [{ id: 'reference', title: 'Reference', excerpt: 'TestProject supports offline workflows.', uri: '/reference' }],
    })).toContain('TestProject supports offline workflows.')
  })

  it('exports reusable weak-support refusal + fallback identity primitive', () => {
    expect(typeof resolveGroundedNoEvidence).toBe('function')
    const noEvidence = resolveGroundedNoEvidence('unsupported claim', [], 'no evidence')
    expect(noEvidence).toBe('no evidence')
    const disclosure = resolveGroundedNoEvidence('who are you', [], 'no evidence', { name: 'TestBot' })
    expect(disclosure).toContain('TestBot')
  })
})
