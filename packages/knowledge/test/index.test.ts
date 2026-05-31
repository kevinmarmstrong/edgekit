import { describe, expect, it } from 'vitest'
import {
  createGroundedQaSkill,
  createKnowledgeSkill,
  createKnowledgeTool,
  createMarkdownMemoryStore,
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
      id: 'site',
      search: async query => [{ id: 'about', title: 'About', excerpt: `Evidence for ${query}`, uri: '/about' }],
    }
    const kit = createGroundedQaSkill({
      id: 'site',
      name: 'Site Q&A',
      description: 'Answer questions from the public site.',
      source,
      identity: { name: 'Site assistant', noEvidenceMessage: 'I do not know from this site.' },
      toolName: 'searchSite',
    })

    expect(kit.profile).toMatchObject({
      agentIdentity: { name: 'Site assistant', noEvidenceMessage: 'I do not know from this site.' },
      grounding: 'strict',
      requiredTools: ['searchSite'],
      defaults: { toolChoice: 'required', downloadPolicy: 'never' },
    })
    expect(Object.keys(kit.tools)).toEqual(['searchSite'])
    expect(kit.answerFromResults('contact', { results: [] })).toBe('I do not know from this site.')
    expect(kit.answerFromResults('about', {
      results: [{ id: 'about', title: 'About', excerpt: 'Kevin works on Edgekit.', uri: '/about' }],
    })).toContain('Kevin works on Edgekit.')

    // Regression: unsupported public-claim with irrelevant top-k -> explicit no-evidence refusal
    const irrelevant = { results: [{ id: 'irrel', title: 'Irrelevant', excerpt: 'some other topic', score: 0.1 }] }
    expect(kit.answerFromResults('who is the current president of France', irrelevant)).toBe('I do not know from this site.')

    // Regression: identity/runtime prompt in fallback -> configured assistant/runtime disclosure (no demo wording in core)
    const identityAnswer = kit.answerFromResults('who are you', { results: [] })
    expect(identityAnswer).toContain('Site assistant')
    expect(identityAnswer).toContain('the assistant the developer configured with Edgekit')
    expect(identityAnswer).toContain('Edgekit is the runtime/widget')

    // Supported cited answer behavior remains intact
    expect(kit.answerFromResults('about', {
      results: [{ id: 'about', title: 'About', excerpt: 'Kevin works on Edgekit.', uri: '/about' }],
    })).toContain('Kevin works on Edgekit.')
  })

  it('exports reusable weak-support refusal + fallback identity primitive', () => {
    const { resolveGroundedNoEvidence } = require('../src/index')
    expect(typeof resolveGroundedNoEvidence).toBe('function')
    const noEvidence = resolveGroundedNoEvidence('unsupported claim', [], 'no evidence')
    expect(noEvidence).toBe('no evidence')
    const disclosure = resolveGroundedNoEvidence('who are you', [], 'no evidence', { name: 'TestBot' })
    expect(disclosure).toContain('TestBot')
  })
})
