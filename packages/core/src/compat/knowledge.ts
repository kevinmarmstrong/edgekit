// FROZEN per Phase C compatibility convention: bug fixes only, no behavior changes. Source of truth lives in the matching sibling package when one exists; otherwise this is deprecated DEFER surface.
import { z } from 'zod'
import { modelOptional, tool } from '../tools'
import type { ContextualToolExecute, EdgeSessionContext, EdgeStateSnapshot } from '../context'
import { createSkill, type EdgeSkill } from './skills'
import { createId, estimateTokens, isRecord, toPascalCase } from '../shared'

export interface EdgeMemoryRecord {
  id: string
  title?: string
  body: string
  tags?: string[]
  source?: string
  updatedAt?: string
}

export interface EdgeMemorySearchContext {
  input: string
  session: EdgeSessionContext
  state?: EdgeStateSnapshot
}

export interface EdgeMemoryStore {
  search(query: string, context: EdgeMemorySearchContext): EdgeMemoryRecord[] | Promise<EdgeMemoryRecord[]>
  write?(record: EdgeMemoryRecord, context: EdgeMemorySearchContext): EdgeMemoryRecord | Promise<EdgeMemoryRecord>
  compact?(context: EdgeMemoryCompactionContext): EdgeMemoryCompactionResult | Promise<EdgeMemoryCompactionResult>
  records?(): EdgeMemoryRecord[]
}

export type EdgeKnowledgeCitation = {
  id?: string
  label?: string
  uri?: string
  source?: string
  excerpt?: string
}

export type EdgeKnowledgeResult = {
  id: string
  title: string
  excerpt: string
  source?: string
  uri?: string
  score?: number
  updatedAt?: string
  stale?: boolean
  citations?: EdgeKnowledgeCitation[]
  metadata?: Record<string, unknown>
}

export interface EdgeKnowledgeSearchContext extends EdgeMemorySearchContext {
  topK?: number
  filters?: Record<string, unknown>
}

export interface EdgeKnowledgeFreshness {
  stale?: boolean
  updatedAt?: string
  maxAgeSeconds?: number
  reason?: string
}

export interface EdgeKnowledgeSource {
  id: string
  label?: string
  description?: string
  search(query: string, context: EdgeKnowledgeSearchContext): EdgeKnowledgeResult[] | Promise<EdgeKnowledgeResult[]>
  write?(record: EdgeKnowledgeResult, context: EdgeKnowledgeSearchContext): EdgeKnowledgeResult | Promise<EdgeKnowledgeResult>
  invalidate?(scope?: string, context?: EdgeKnowledgeSearchContext): void | Promise<void>
  freshness?(context: EdgeKnowledgeSearchContext): EdgeKnowledgeFreshness | Promise<EdgeKnowledgeFreshness>
}

export interface CreateKnowledgeToolOptions {
  name: string
  description?: string
  source: EdgeKnowledgeSource
  defaultTopK?: number
  readOnly?: boolean
  parallelSafe?: boolean
}

export interface CreateKnowledgeSkillOptions<TInput = { query: string }, TOutput = { results: EdgeKnowledgeResult[] }> {
  id: string
  name: string
  description: string
  source: EdgeKnowledgeSource
  toolName?: string
  instructions?: string
  activationExamples?: string[]
  doNotActivateWhen?: string[]
  requiredFacts?: string[]
  citationRequired?: boolean
  freshnessRequired?: boolean
  defaultTopK?: number
  protectedSections?: string[]
  meta?: EdgeSkill<TInput, TOutput>['meta']
}

export interface MarkdownMemoryDocument {
  id: string
  content: string
  source?: string
  tags?: string[]
  updatedAt?: string
}

export interface CreateMarkdownMemoryStoreOptions {
  documents: MarkdownMemoryDocument[]
  maxRecords?: number
  compaction?: MarkdownMemoryCompactionOptions
}

export interface EdgeMemoryCompactionContext extends EdgeMemorySearchContext {
  thresholdTokens: number
  maxSnapshotTokens?: number
}

export interface EdgeMemoryCompactionResult {
  compacted: boolean
  approximateTokens: number
  thresholdTokens: number
  snapshot?: EdgeMemoryRecord
  archivedRecords?: EdgeMemoryRecord[]
}

export type EdgeMemorySummarizer = (
  records: EdgeMemoryRecord[],
  context: EdgeMemoryCompactionContext,
) => string | EdgeMemoryRecord | Promise<string | EdgeMemoryRecord>

export interface MarkdownMemoryCompactionOptions {
  thresholdTokens: number
  maxSnapshotTokens?: number
  archive?: boolean
  summarize?: EdgeMemorySummarizer
  now?: () => string
}

export function createKnowledgeTool(options: CreateKnowledgeToolOptions): Record<string, unknown> {
  const createTool = tool as never as (config: {
    description: string
    inputSchema: z.ZodType
    execute: ContextualToolExecute
  }) => unknown
  const toolName = options.name
  return {
    [toolName]: createTool({
      description:
        options.description ??
        `Search ${options.source.label ?? options.source.id} and return grounded results with citations and freshness metadata.`,
      inputSchema: z.object({
        query: z.string().describe('Natural-language knowledge query.'),
        topK: modelOptional(z.number()).describe('Maximum number of knowledge results to return.'),
        filters: modelOptional(z.record(z.string(), z.unknown())).describe('Optional app-owned source filters.'),
      }),
      execute: async (input: Record<string, unknown>, context) => {
        const query = typeof input.query === 'string' ? input.query : ''
        const topK = typeof input.topK === 'number' ? input.topK : options.defaultTopK
        const filters = isRecord(input.filters) ? input.filters : undefined
        const session = context?.session ?? {}
        const searchContext: EdgeKnowledgeSearchContext = {
          input: query,
          session,
          state: session.state,
          topK,
          filters,
        }
        const [results, freshness] = await Promise.all([
          options.source.search(query, searchContext),
          options.source.freshness?.(searchContext),
        ])
        return {
          source: {
            id: options.source.id,
            label: options.source.label,
            description: options.source.description,
          },
          query,
          freshness,
          results: typeof topK === 'number' ? results.slice(0, topK) : results,
        }
      },
    }),
  }
}

export function createKnowledgeSkill<TInput = { query: string }, TOutput = { results: EdgeKnowledgeResult[] }>(
  options: CreateKnowledgeSkillOptions<TInput, TOutput>,
): EdgeSkill<TInput, TOutput> {
  const toolName = options.toolName ?? `search${toPascalCase(options.id)}`
  const requiredFacts = [
    ...(options.requiredFacts ?? ['answerable facts from retrieved context']),
    ...(options.citationRequired === false ? [] : ['source citations']),
    ...(options.freshnessRequired === false ? [] : ['freshness or staleness status']),
  ]
  return createSkill<TInput, TOutput>({
    id: options.id,
    name: options.name,
    description: options.description,
    instructions:
      options.instructions ??
      [
        'Use this Skill when the user needs grounded knowledge from an app-owned source.',
        'Call the retrieval tool before answering.',
        'Synthesize the result; do not dump raw chunks.',
        'Surface citations and freshness when available.',
        'If the source returns no supporting result, say the source did not contain enough evidence.',
      ].join(' '),
    activationExamples: options.activationExamples,
    doNotActivateWhen: options.doNotActivateWhen,
    requiredTools: [toolName],
    tools: createKnowledgeTool({
      name: toolName,
      source: options.source,
      defaultTopK: options.defaultTopK,
    }),
    policy: { needsApproval: false, riskLevel: 'low' },
    synthesis: {
      requiredFacts,
      preferredStyle: 'explicit',
    },
    protectedSections: options.protectedSections ?? ['policy', 'instructions.safety', 'source.authorization'],
    optimization: {
      slowStatePaths: ['policy', 'instructions.safety', 'source.authorization'],
      fastStatePaths: ['description', 'instructions', 'activationExamples', 'doNotActivateWhen', 'synthesis'],
      maxPatchOperations: 8,
    },
    meta: {
      category: 'knowledge-access',
      ...(options.meta ?? {}),
      tags: [...(options.meta?.tags ?? []), 'knowledge', 'retrieval'],
    },
  })
}

export function createMarkdownMemoryStore(options: CreateMarkdownMemoryStoreOptions): EdgeMemoryStore {
  const maxRecords = options.maxRecords ?? 5
  const records = options.documents.flatMap(parseMarkdownMemoryDocument)
  const archivedRecords: EdgeMemoryRecord[] = []

  return {
    search(query: string) {
      const terms = tokenize(query)
      if (terms.length === 0) return []

      return records
        .map(record => ({ record, score: scoreMemoryRecord(record, terms) }))
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxRecords)
        .map(result => result.record)
    },
    write(record: EdgeMemoryRecord) {
      records.unshift(record)
      return record
    },
    async compact(context: EdgeMemoryCompactionContext) {
      const thresholdTokens = context.thresholdTokens
      const approximateTokens = estimateTokens(records)
      if (approximateTokens <= thresholdTokens || records.length <= 1) {
        return { compacted: false, approximateTokens, thresholdTokens }
      }

      const summarized = await (options.compaction?.summarize ?? defaultMemorySummarizer)(records, context)
      const snapshot = normalizeMemorySnapshot(summarized, options.compaction?.now?.() ?? new Date().toISOString())
      if (options.compaction?.archive !== false) archivedRecords.push(...records)
      records.splice(0, records.length, snapshot)
      return {
        compacted: true,
        approximateTokens,
        thresholdTokens,
        snapshot,
        archivedRecords: [...archivedRecords],
      }
    },
    records() {
      return [...records]
    },
  }
}

function defaultMemorySummarizer(records: EdgeMemoryRecord[], context: EdgeMemoryCompactionContext) {
  const maxTokens = context.maxSnapshotTokens ?? 500
  const budget = maxTokens * 4
  const bullets = records.map(record => {
    const title = record.title ? `${record.title}: ` : ''
    return `- ${title}${record.body.replace(/\s+/g, ' ').trim()}`
  })
  const body = `Current state snapshot:\n${bullets.join('\n')}`
  return body.length > budget ? body.slice(0, Math.max(0, budget - 3)).trimEnd() + '...' : body
}

function normalizeMemorySnapshot(value: string | EdgeMemoryRecord, updatedAt: string): EdgeMemoryRecord {
  if (typeof value !== 'string') {
    return {
      ...value,
      id: value.id || createId('memory'),
      title: value.title ?? 'Current state snapshot',
      updatedAt: value.updatedAt ?? updatedAt,
    }
  }

  return {
    id: createId('memory'),
    title: 'Current state snapshot',
    body: value,
    tags: ['snapshot'],
    updatedAt,
  }
}

function parseMarkdownMemoryDocument(document: MarkdownMemoryDocument): EdgeMemoryRecord[] {
  const lines = document.content.split(/\r?\n/)
  const records: EdgeMemoryRecord[] = []
  let currentTitle = document.source ?? document.id
  let currentBody: string[] = []
  let currentHeadingId = 'root'

  const flush = () => {
    const body = currentBody.join('\n').trim()
    if (!body) return
    records.push({
      id: `${document.id}:${currentHeadingId}`,
      title: currentTitle,
      body,
      tags: document.tags,
      source: document.source,
      updatedAt: document.updatedAt,
    })
  }

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (heading) {
      flush()
      currentTitle = heading[2].trim()
      currentHeadingId = slugify(currentTitle) || String(records.length + 1)
      currentBody = []
      continue
    }
    currentBody.push(line)
  }

  flush()
  return records.length > 0
    ? records
    : [{
        id: `${document.id}:root`,
        title: document.source ?? document.id,
        body: document.content.trim(),
        tags: document.tags,
        source: document.source,
        updatedAt: document.updatedAt,
      }].filter(record => record.body)
}

function scoreMemoryRecord(record: EdgeMemoryRecord, terms: string[]) {
  const title = `${record.title ?? ''} ${record.tags?.join(' ') ?? ''}`.toLowerCase()
  const body = record.body.toLowerCase()
  return terms.reduce((score, term) => {
    if (title.includes(term)) return score + 3
    if (body.includes(term)) return score + 1
    return score
  }, 0)
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(term => term.length > 1)
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
