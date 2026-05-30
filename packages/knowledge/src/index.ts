import { modelOptional, tool } from '@kevinmarmstrong/edgekit'
import type {
  EdgeAgentIdentity,
  EdgeSessionContext,
  EdgeToolExecutionContext,
} from '@kevinmarmstrong/edgekit'
import { createMissionProfile, createSkill } from '@kevinmarmstrong/edgekit-skills'
import type { EdgeMissionProfile, EdgeSkill } from '@kevinmarmstrong/edgekit-skills'
import { z } from 'zod'

type ContextualToolExecute = (input: Record<string, unknown>, context: EdgeToolExecutionContext) => unknown | Promise<unknown>

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
  state?: EdgeSessionContext['state']
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

export interface CreateGroundedQaSkillOptions {
  id: string
  name: string
  description: string
  source: EdgeKnowledgeSource
  identity: EdgeAgentIdentity
  toolName?: string
  version?: string
  systemPrompt?: string
  noEvidenceMessage?: string
  ambiguityPolicy?: string
  defaultTopK?: number
}

export interface GroundedQaKit {
  skill: EdgeSkill
  profile: EdgeMissionProfile
  tools: Record<string, unknown>
  answerFromResults(input: string, output: unknown): string
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
	  const knowledgeTool = createTool({
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
	  })
	  return {
	    [toolName]: isRecord(knowledgeTool)
	      ? { ...knowledgeTool, readOnly: options.readOnly ?? true, parallelSafe: options.parallelSafe ?? true }
	      : knowledgeTool,
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

export function createGroundedQaSkill(options: CreateGroundedQaSkillOptions): GroundedQaKit {
  const toolName = options.toolName ?? `search${toPascalCase(options.id)}`
  const noEvidenceMessage =
    options.noEvidenceMessage ??
    options.identity.noEvidenceMessage ??
    'I do not know from the available site/app evidence.'
  const skill = createKnowledgeSkill({
    id: options.id,
    name: options.name,
    description: options.description,
    source: options.source,
    toolName,
    defaultTopK: options.defaultTopK,
    instructions: [
      'Use this Skill for public Q&A over app-owned knowledge.',
      `Always call ${toolName} before answering factual questions.`,
      'Answer only from retrieved evidence and configured assistant identity.',
      'If the evidence is empty or irrelevant, use the configured no-evidence response.',
      'Do not invent people, companies, affiliations, biographies, or model-provider identity.',
      options.ambiguityPolicy ? `Ambiguity policy: ${options.ambiguityPolicy}` : '',
    ].filter(Boolean).join(' '),
    requiredFacts: ['retrieved evidence', 'source title or citation when available'],
    citationRequired: true,
    freshnessRequired: false,
  })
  const systemPrompt = options.systemPrompt ?? [
    'Answer public Q&A from the registered knowledge tool and configured assistant identity.',
    'Do not answer factual questions from model memory.',
    `If the knowledge source does not support the answer, say: "${noEvidenceMessage}"`,
    'When asked what the user is chatting with, distinguish the Edgekit runtime, the configured assistant identity, and optional model inference.',
  ].join(' ')
  const profile = createMissionProfile({
    id: `${options.id}-profile`,
    mission: 'public-site-qa',
    version: options.version ?? '1.0.0',
    systemPrompt,
    agentIdentity: { ...options.identity, noEvidenceMessage },
    grounding: 'strict',
    tools: skill.tools,
    requiredTools: [toolName],
    defaults: { toolChoice: 'required', downloadPolicy: 'never' },
    synthesis: { requiredAttributes: ['evidence', 'source'], style: 'explicit' },
    policy: { needsApproval: false, riskLevel: 'low' },
    meta: {
      description: `Grounded public Q&A profile for ${options.name}.`,
    },
  })

  return {
    skill,
    profile,
    tools: skill.tools ?? {},
    answerFromResults: (input, output) => formatGroundedQaAnswer(input, output, noEvidenceMessage),
  }
}

function formatGroundedQaAnswer(input: string, output: unknown, noEvidenceMessage: string) {
  const results = extractKnowledgeResults(output)
  if (results.length === 0) return noEvidenceMessage

  const lines = [
    `From the available evidence for "${input}":`,
    '',
    ...results.slice(0, 3).map(result => {
      const source = result.uri ?? result.source
      const citation = source ? ` (${source})` : ''
      return `- ${result.title}: ${result.excerpt}${citation}`
    }),
  ]
  return lines.join('\n')
}

function extractKnowledgeResults(output: unknown): EdgeKnowledgeResult[] {
  if (!isRecord(output)) return []
  const candidate = Array.isArray(output.results) ? output.results : []
  return candidate.filter(isKnowledgeResult)
}

function isKnowledgeResult(value: unknown): value is EdgeKnowledgeResult {
  return isRecord(value) && typeof value.id === 'string' && typeof value.title === 'string' && typeof value.excerpt === 'string'
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
  return body.length > budget ? `${body.slice(0, Math.max(0, budget - 3)).trimEnd()}...` : body
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

function estimateTokens(value: unknown): number {
  const text = typeof value === 'string' ? value : stableStringify(value)
  return Math.max(1, Math.ceil(text.length / 4))
}

function stableStringify(value: unknown): string {
  if (value == null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
  return `{${entries.join(',')}}`
}

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function toPascalCase(value: string) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Reusable runtime mode enum for grounded Q&A evidence flows.
 * Site-specific modes (e.g. scripted-fallback) remain in app skills.
 */
export type GroundedQaRuntimeMode =
  | 'checking'
  | 'local-ready'
  | 'downloadable'
  | 'fallback-ready'
  | 'hidden'
  | 'unavailable'
  | 'error'

export interface GroundedQaAnswerOptions {
  runtimeMode?: GroundedQaRuntimeMode
  runtimeLabel?: string
  fallbackDisclosure?: string
}

/** Returns a runtime disclosure string based on mode or explicit fallbackDisclosure. */
export function runtimeDisclosureFor(options: GroundedQaAnswerOptions = {}): string {
  if (options.fallbackDisclosure) return options.fallbackDisclosure
  if (options.runtimeMode === 'fallback-ready' || options.runtimeMode === 'unavailable') {
    return 'Fallback: docs search only; no local model handled this turn.'
  }
  return ''
}

/** Prepends runtime disclosure to an answer when present. */
export function withRuntimeDisclosure(disclosure: string, answer: string): string {
  return disclosure ? `${disclosure}\n\n${answer}` : answer
}
