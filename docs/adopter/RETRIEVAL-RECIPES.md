Audience: adopter

# Retrieval Recipes

These recipes show how to plug retrieval into Edgekit without turning Edgekit into a RAG framework.

## Simple Markdown Or JSON

Use this for project docs, product notes, support policy, or small internal playbooks.

```ts
const source = {
  id: 'manuals',
  label: 'Repair manuals',
  search: async query => searchLocalDocs(query),
  freshness: () => ({ stale: false, updatedAt: '2026-05-26' }),
}
```

## LlamaIndex Or LangChain

Use mature retrieval frameworks when chunking, loaders, vector stores, rerankers, or citations are already part of your stack.

```ts
const source = {
  id: 'engineering-handbook',
  label: 'Engineering handbook',
  search: async (query, context) => {
    const nodes = await retriever.retrieve({ query, topK: context.topK ?? 5 })
    return nodes.map(node => ({
      id: node.id,
      title: node.metadata.title,
      excerpt: node.text,
      source: node.metadata.source,
      uri: node.metadata.url,
      score: node.score,
      citations: [{ label: node.metadata.title, uri: node.metadata.url }],
    }))
  },
}
```

## Qdrant Or Hybrid Search

Use dense plus sparse retrieval when exact terms and semantic similarity both matter.

```ts
const source = {
  id: 'support-hybrid',
  label: 'Support hybrid index',
  search: async (query, context) => {
    const results = await qdrantHybridSearch({ query, filters: context.filters, topK: context.topK ?? 6 })
    return results.map(result => ({
      id: result.id,
      title: result.payload.title,
      excerpt: result.payload.excerpt,
      source: result.payload.source,
      uri: result.payload.uri,
      score: result.score,
      citations: [{ label: result.payload.title, uri: result.payload.uri }],
    }))
  },
}
```

## GraphRAG Or Domain Graph

Use graph retrieval when relationships matter: accounts, assets, contracts, cases, invoices, work orders, dependencies, and policy exceptions.

```ts
const source = {
  id: 'asset-graph',
  label: 'Asset graph',
  search: async (query, context) => {
    const paths = await graphRetriever.search({ query, tenant: context.session.identity?.tenantId })
    return paths.map(path => ({
      id: path.id,
      title: path.summary,
      excerpt: path.evidence,
      source: 'asset-graph',
      score: path.score,
      citations: path.nodes.map(node => ({ label: node.label, uri: node.href })),
      metadata: { relationshipPath: path.relationships },
    }))
  },
}
```

## Required Tests

- The answer cites the retrieved source.
- Unauthorized roles cannot retrieve restricted records.
- Stale sources are labeled stale.
- Empty retrieval produces a grounded "not enough evidence" answer.
- Cache invalidation changes the answer when the source changes.
- Source facts survive into the visible text or generated UI.
