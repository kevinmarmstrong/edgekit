Audience: adopter

# Knowledge Access Skills

Edgekit treats retrieval as a Skill category, not as a built-in RAG platform.

The host app owns the retrieval strategy: Markdown, keyword search, vectors, graph traversal, SQL, hybrid search, LlamaIndex, LangChain, Qdrant, Neo4j, or a private knowledge API. Edgekit owns the agentic sidecar contract around that source: activation, tool visibility, citations, freshness labels, synthesis expectations, telemetry, audit, and outcome tests.

## Mental Model

```text
Knowledge source -> retrieval tool -> Knowledge Access Skill -> Mission Profile -> sidecar UX
```

Use memory for user/session/workflow context. Use Knowledge Access Skills for larger, changing, source-owned information.

## Core Contract

- `EdgeKnowledgeSource`: app-owned source with `search(query, context)` plus optional `write`, `invalidate`, and `freshness`.
- `EdgeKnowledgeResult`: normalized result with title, excerpt, source, URI, score, updated timestamp, stale flag, citations, and metadata.
- `createKnowledgeTool()`: wraps a source as a normal read-only Edgekit tool.
- `createKnowledgeSkill()`: packages the retrieval tool with router-visible description, instructions, synthesis expectations, protected sections, and optimization metadata.

```ts
const source = {
  id: 'policy-kb',
  label: 'Policy KB',
  search: async (query, context) => {
    return searchPolicyService({
      query,
      roles: context.session.identity?.roles,
      topK: context.topK ?? 4,
    })
  },
  freshness: () => ({ stale: false, updatedAt: policyIndexVersion }),
}

const policySkill = createKnowledgeSkill({
  id: 'support-policy',
  name: 'Support Policy Knowledge',
  description: 'Search support policy with citations and freshness labels.',
  source,
  requiredFacts: ['policy title', 'effective date', 'approval requirement'],
})
```

## Rules

- Keep authorization in the source or backend tool, not in model instructions.
- Return citations and freshness metadata whenever the source can provide them.
- Prefer dedicated retrieval Skills over stuffing large or fast-changing knowledge into memory.
- Mark retrieval tools read-only and parallel-safe only when the host implementation is actually safe.
- Test that source facts survive into the visible answer or generated UI.

## Recommended Implementations

- Simple local: Markdown, JSON, docs indexes, or small app bundles.
- Browser semantic: local embeddings with IndexedDB or OPFS when knowledge should remain on device.
- Production vector or hybrid: LlamaIndex.TS, LangChain.js retrievers, Qdrant, pgvector, Pinecone, Weaviate, or a private service.
- Graph and GraphRAG: Neo4j GraphRAG, FalkorDB, or a domain graph API for relationship-heavy workflows.
- Agentic retrieval: expose multiple scoped read tools and let the model choose, while preserving citations and source labels.

## What Edgekit Does Not Do

Edgekit does not ship a vector database, graph database, embedding model, reranker, crawler, or document pipeline. Those are source-specific decisions. Edgekit gives them a consistent sidecar-facing contract.
