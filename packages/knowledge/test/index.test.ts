import { describe, expect, it } from 'vitest'
import {
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
})
