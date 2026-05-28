import type { EdgeKnowledgeSource } from '@kevinmarmstrong/edgekit-knowledge'

export function llamaIndexKnowledgeSource(retriever: {
  retrieve(input: { query: string; topK?: number }): Promise<Array<{
    id: string
    text: string
    score?: number
    metadata?: Record<string, unknown>
  }>>
}): EdgeKnowledgeSource {
  return {
    id: 'llamaindex-source',
    label: 'LlamaIndex source',
    search: async (query, context) => {
      const nodes = await retriever.retrieve({ query, topK: context.topK ?? 5 })
      return nodes.map(node => ({
        id: node.id,
        title: String(node.metadata?.title ?? node.id),
        excerpt: node.text,
        source: String(node.metadata?.source ?? 'llamaindex'),
        uri: typeof node.metadata?.uri === 'string' ? node.metadata.uri : undefined,
        score: node.score,
        citations: [{ label: String(node.metadata?.title ?? node.id), uri: String(node.metadata?.uri ?? '') }],
        metadata: node.metadata,
      }))
    },
  }
}
