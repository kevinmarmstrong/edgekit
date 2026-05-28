import type { EdgeKnowledgeSource } from '@kevinmarmstrong/edgekit-knowledge'

export function qdrantKnowledgeSource(client: {
  query(collection: string, input: unknown): Promise<{ points: Array<{ id: string; score?: number; payload?: Record<string, unknown> }> }>
}, collection = 'knowledge'): EdgeKnowledgeSource {
  return {
    id: 'qdrant-hybrid-source',
    label: 'Qdrant hybrid source',
    search: async (query, context) => {
      const response = await client.query(collection, {
        query,
        limit: context.topK ?? 5,
        filter: context.filters,
      })
      return response.points.map(point => ({
        id: String(point.id),
        title: String(point.payload?.title ?? point.id),
        excerpt: String(point.payload?.excerpt ?? ''),
        source: String(point.payload?.source ?? collection),
        uri: typeof point.payload?.uri === 'string' ? point.payload.uri : undefined,
        score: point.score,
        citations: [{ label: String(point.payload?.title ?? point.id), uri: String(point.payload?.uri ?? '') }],
        metadata: point.payload,
      }))
    },
  }
}
