import type { EdgeKnowledgeResult, EdgeKnowledgeSearchContext, EdgeKnowledgeSource } from '@kevinmarmstrong/edgekit-knowledge'

export type KnowledgeDocument = {
  id: string
  title: string
  body: string
  source: string
  uri?: string
  roles?: string[]
  updatedAt?: string
}

export function createSimpleMarkdownKnowledgeSource(documents: KnowledgeDocument[]): EdgeKnowledgeSource {
  return {
    id: 'starter-knowledge',
    label: 'Starter knowledge',
    description: 'Small local Markdown or JSON knowledge source for first sidecar implementations.',
    search(query: string, context: EdgeKnowledgeSearchContext): EdgeKnowledgeResult[] {
      const roles = new Set(context.session.identity?.roles ?? [])
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
      return documents
        .filter(document => !document.roles?.length || document.roles.some(role => roles.has(role)))
        .map(document => {
          const haystack = `${document.title} ${document.body}`.toLowerCase()
          const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0)
          return { document, score }
        })
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, context.topK ?? 4)
        .map(({ document, score }) => ({
          id: document.id,
          title: document.title,
          excerpt: document.body,
          source: document.source,
          uri: document.uri,
          score,
          updatedAt: document.updatedAt,
          citations: [{ label: document.title, uri: document.uri, source: document.source }],
        }))
    },
    freshness: () => ({ stale: false, updatedAt: new Date().toISOString() }),
  }
}
