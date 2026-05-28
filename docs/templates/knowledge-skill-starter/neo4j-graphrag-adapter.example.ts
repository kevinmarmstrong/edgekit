import type { EdgeKnowledgeSource } from '@kevinmarmstrong/edgekit-knowledge'

export function graphRagKnowledgeSource(graphRetriever: {
  search(input: { query: string; tenantId?: string; topK?: number }): Promise<Array<{
    id: string
    summary: string
    evidence: string
    score?: number
    nodes?: Array<{ label: string; href?: string }>
    relationships?: string[]
  }>>
}): EdgeKnowledgeSource {
  return {
    id: 'graph-rag-source',
    label: 'GraphRAG source',
    search: async (query, context) => {
      const paths = await graphRetriever.search({
        query,
        tenantId: context.session.identity?.tenantId,
        topK: context.topK ?? 5,
      })
      return paths.map(path => ({
        id: path.id,
        title: path.summary,
        excerpt: path.evidence,
        source: 'graph-rag',
        score: path.score,
        citations: path.nodes?.map(node => ({ label: node.label, uri: node.href })) ?? [],
        metadata: { relationships: path.relationships },
      }))
    },
  }
}
