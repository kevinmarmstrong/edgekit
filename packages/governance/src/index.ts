import type { EdgeActivityEvent, EdgeToolExecutionContext } from '@kevinmarmstrong/edgekit'

export interface EdgeRedactorContext extends EdgeToolExecutionContext {
  toolName?: string
  phase?: 'tool-result' | 'telemetry' | 'audit' | 'ui-action'
}

export type EdgeRedactor = (value: unknown, context: EdgeRedactorContext) => unknown | Promise<unknown>

export interface PiiRedactorPattern {
  name: string
  pattern: RegExp
  replacement?: string
}

export interface CreatePiiRedactorOptions {
  email?: boolean
  phone?: boolean
  ssn?: boolean
  creditCard?: boolean
  customPatterns?: PiiRedactorPattern[]
}

export type EdgeAuditAction =
  | 'tool-call'
  | 'tool-result'
  | 'approval-request'
  | 'approval-decision'
  | 'ui-action'
  | 'error'

export interface EdgeAuditEvent {
  action: EdgeAuditAction
  sessionId: string
  runId?: string
  prompt?: string
  toolName?: string
  approved?: boolean
  input?: unknown
  output?: unknown
  reason?: string
}

export interface EdgeAuditEntry {
  id: string
  sequence: number
  timestamp: string
  previousHash: string
  hash: string
  event: EdgeAuditEvent
}

export interface EdgeAuditTrail {
  record(event: EdgeAuditEvent): EdgeAuditEntry | Promise<EdgeAuditEntry>
  entries?(): EdgeAuditEntry[]
}

export type EdgeMutationStatus = 'queued' | 'syncing' | 'synced' | 'failed' | 'conflict'

export interface EdgeQueuedMutation {
  id: string
  toolName: string
  input: Record<string, unknown>
  status: EdgeMutationStatus
  createdAt: string
  updatedAt: string
  attempts: number
  idempotencyKey?: string
  output?: unknown
  error?: unknown
  metadata?: Record<string, unknown>
}

export interface EdgeMutationJournalEntry {
  toolName: string
  input: Record<string, unknown>
  idempotencyKey?: string
  metadata?: Record<string, unknown>
}

export interface EdgeMutationJournal {
  enqueue(entry: EdgeMutationJournalEntry): EdgeQueuedMutation | Promise<EdgeQueuedMutation>
  list(filter?: { status?: EdgeMutationStatus | EdgeMutationStatus[] }): EdgeQueuedMutation[] | Promise<EdgeQueuedMutation[]>
  update(id: string, patch: Partial<Omit<EdgeQueuedMutation, 'id' | 'createdAt'>>): EdgeQueuedMutation | null | Promise<EdgeQueuedMutation | null>
  remove(id: string): void | Promise<void>
  clear?(): void | Promise<void>
}

export interface MemoryMutationJournalOptions {
  now?: () => string
  createId?: () => string
}

export interface LocalStorageMutationJournalOptions extends MemoryMutationJournalOptions {
  key?: string
  storage?: Storage
}

export interface CreateOfflineToolOptions {
  name: string
  tool: unknown
  journal: EdgeMutationJournal
  online?: () => boolean
  idempotencyKey?: (input: Record<string, unknown>, context: EdgeToolExecutionContext) => string
  metadata?: (input: Record<string, unknown>, context: EdgeToolExecutionContext) => Record<string, unknown> | undefined
}

export interface SyncMutationJournalOptions {
  journal: EdgeMutationJournal
  tools: Record<string, unknown>
  context: EdgeToolExecutionContext
  online?: () => boolean
  includeConflicts?: boolean
  onActivity?: (activity: EdgeActivityEvent) => void | Promise<void>
}

export interface ToolPolicy {
  timeoutMs?: number
  maxInputBytes?: number
  maxOutputBytes?: number
  allowedTools?: string[]
}

export interface ToolPolicyExecutorOptions {
  defaultPolicy?: ToolPolicy
  policies?: Record<string, ToolPolicy>
}

export interface ExecuteToolWithPolicyOptions {
  toolName: string
  tool: unknown
  input: Record<string, unknown>
  context: EdgeToolExecutionContext
}

export class EdgeToolPolicyError extends Error {
  code: 'tool-not-allowed' | 'input-too-large' | 'output-too-large' | 'timeout' | 'not-executable'

  constructor(code: EdgeToolPolicyError['code'], message: string) {
    super(message)
    this.name = 'EdgeToolPolicyError'
    this.code = code
  }
}

export interface CreateAuditTrailOptions {
  sessionId?: string
  now?: () => string
  hash?: (payload: string) => string
}

export function createAuditTrail(options: CreateAuditTrailOptions = {}): EdgeAuditTrail {
  const entries: EdgeAuditEntry[] = []
  const now = options.now ?? (() => new Date().toISOString())
  const hash = options.hash ?? stableHash

  return {
    record(event: EdgeAuditEvent) {
      const sequence = entries.length + 1
      const previousHash = entries.at(-1)?.hash ?? 'genesis'
      const timestamp = now()
      const normalizedEvent = { ...event, sessionId: event.sessionId || options.sessionId || createId('session') }
      const payload = stableStringify({ sequence, timestamp, previousHash, event: normalizedEvent })
      const entry: EdgeAuditEntry = {
        id: createId('audit'),
        sequence,
        timestamp,
        previousHash,
        hash: hash(payload),
        event: normalizedEvent,
      }
      entries.push(entry)
      return entry
    },
    entries() {
      return [...entries]
    },
  }
}

export function createPiiRedactor(options: CreatePiiRedactorOptions = {}): EdgeRedactor {
  const patterns: PiiRedactorPattern[] = []
  if (options.email !== false) patterns.push({ name: 'email', pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi })
  if (options.phone !== false) patterns.push({ name: 'phone', pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g })
  if (options.ssn !== false) patterns.push({ name: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/g })
  if (options.creditCard !== false) patterns.push({ name: 'credit-card', pattern: /\b(?:\d[ -]*?){13,19}\b/g })
  patterns.push(...(options.customPatterns ?? []))

  return value => redactValue(value, patterns)
}

export async function applyRedactors(
  value: unknown,
  redactors: EdgeRedactor | EdgeRedactor[] | undefined,
  context: EdgeRedactorContext,
) {
  const chain = Array.isArray(redactors) ? redactors : redactors ? [redactors] : []
  let current = value
  for (const redactor of chain) {
    current = await redactor(current, context)
  }
  return current
}

export function createMemoryMutationJournal(options: MemoryMutationJournalOptions = {}): EdgeMutationJournal {
  const now = options.now ?? (() => new Date().toISOString())
  const createMutationId = options.createId ?? (() => createId('mutation'))
  const mutations = new Map<string, EdgeQueuedMutation>()

  return {
    enqueue(entry: EdgeMutationJournalEntry) {
      const timestamp = now()
      const mutation: EdgeQueuedMutation = {
        id: createMutationId(),
        toolName: entry.toolName,
        input: entry.input,
        idempotencyKey: entry.idempotencyKey,
        metadata: entry.metadata,
        status: 'queued',
        attempts: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      mutations.set(mutation.id, mutation)
      return mutation
    },
    list(filter?: { status?: EdgeMutationStatus | EdgeMutationStatus[] }) {
      const statuses = Array.isArray(filter?.status) ? filter.status : filter?.status ? [filter.status] : null
      return [...mutations.values()].filter(mutation => !statuses || statuses.includes(mutation.status))
    },
    update(id: string, patch: Partial<Omit<EdgeQueuedMutation, 'id' | 'createdAt'>>) {
      const current = mutations.get(id)
      if (!current) return null
      const next = { ...current, ...patch, updatedAt: patch.updatedAt ?? now() }
      mutations.set(id, next)
      return next
    },
    remove(id: string) {
      mutations.delete(id)
    },
    clear() {
      mutations.clear()
    },
  }
}

export function createLocalStorageMutationJournal(options: LocalStorageMutationJournalOptions = {}): EdgeMutationJournal {
  const storage = options.storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage)
  if (!storage) throw new Error('localStorage is not available in this environment.')
  const key = options.key ?? 'edgekit:mutation-journal'
  const now = options.now ?? (() => new Date().toISOString())
  const createMutationId = options.createId ?? (() => createId('mutation'))

  const read = (): EdgeQueuedMutation[] => {
    const raw = storage.getItem(key)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter(isQueuedMutation) : []
    } catch {
      return []
    }
  }
  const write = (mutations: EdgeQueuedMutation[]) => storage.setItem(key, JSON.stringify(mutations))

  return {
    enqueue(entry: EdgeMutationJournalEntry) {
      const timestamp = now()
      const mutations = read()
      const mutation: EdgeQueuedMutation = {
        id: createMutationId(),
        toolName: entry.toolName,
        input: entry.input,
        idempotencyKey: entry.idempotencyKey,
        metadata: entry.metadata,
        status: 'queued',
        attempts: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      write([...mutations, mutation])
      return mutation
    },
    list(filter?: { status?: EdgeMutationStatus | EdgeMutationStatus[] }) {
      const statuses = Array.isArray(filter?.status) ? filter.status : filter?.status ? [filter.status] : null
      return read().filter(mutation => !statuses || statuses.includes(mutation.status))
    },
    update(id: string, patch: Partial<Omit<EdgeQueuedMutation, 'id' | 'createdAt'>>) {
      const mutations = read()
      const index = mutations.findIndex(mutation => mutation.id === id)
      if (index === -1) return null
      const updated = { ...mutations[index], ...patch, updatedAt: patch.updatedAt ?? now() }
      mutations[index] = updated
      write(mutations)
      return updated
    },
    remove(id: string) {
      write(read().filter(mutation => mutation.id !== id))
    },
    clear() {
      write([])
    },
  }
}

export function createOfflineTool(options: CreateOfflineToolOptions) {
  const online = options.online ?? (() => typeof navigator === 'undefined' ? true : navigator.onLine)
  const candidate = options.tool as { execute?: ContextualToolExecute } | undefined
  return {
    ...(isRecord(options.tool) ? options.tool : {}),
    execute: async (input: Record<string, unknown>, context: EdgeToolExecutionContext) => {
      if (online()) {
        if (!candidate?.execute) throw new EdgeToolPolicyError('not-executable', `${options.name} is not executable.`)
        return candidate.execute(input, context)
      }
      const mutation = await options.journal.enqueue({
        toolName: options.name,
        input,
        idempotencyKey: options.idempotencyKey?.(input, context),
        metadata: options.metadata?.(input, context),
      })
      return { queued: true, mutation }
    },
  }
}

export async function syncMutationJournal(options: SyncMutationJournalOptions): Promise<EdgeQueuedMutation[]> {
  const online = options.online ?? (() => typeof navigator === 'undefined' ? true : navigator.onLine)
  if (!online()) return options.journal.list({ status: 'queued' })

  const statuses: EdgeMutationStatus[] = options.includeConflicts ? ['queued', 'failed', 'conflict'] : ['queued', 'failed']
  const queued = await options.journal.list({ status: statuses })
  const results: EdgeQueuedMutation[] = []

  for (const mutation of queued) {
    const activityId = `sync-${mutation.id}`
    await options.onActivity?.({
      id: activityId,
      label: `Syncing ${mutation.toolName}`,
      status: 'started',
      toolName: mutation.toolName,
      data: { mutationId: mutation.id },
    })
    const attempts = mutation.attempts + 1
    await options.journal.update(mutation.id, { status: 'syncing', attempts })
    const candidate = options.tools[mutation.toolName] as { execute?: ContextualToolExecute } | undefined
    if (!candidate?.execute) {
      const updated = await options.journal.update(mutation.id, {
        status: 'failed',
        attempts,
        error: `${mutation.toolName} is not executable.`,
      })
      if (updated) results.push(updated)
      continue
    }

    try {
      const output = await candidate.execute(mutation.input, options.context)
      const updated = await options.journal.update(mutation.id, { status: 'synced', attempts, output, error: undefined })
      if (updated) results.push(updated)
      await options.onActivity?.({
        id: activityId,
        label: `Synced ${mutation.toolName}`,
        status: 'completed',
        toolName: mutation.toolName,
        data: { mutationId: mutation.id },
      })
    } catch (error) {
      const status: EdgeMutationStatus = isConflictError(error) ? 'conflict' : 'failed'
      const updated = await options.journal.update(mutation.id, { status, attempts, error: readableError(error) })
      if (updated) results.push(updated)
      await options.onActivity?.({
        id: activityId,
        label: status === 'conflict' ? `Conflict in ${mutation.toolName}` : `Failed ${mutation.toolName}`,
        status: 'failed',
        toolName: mutation.toolName,
        data: { mutationId: mutation.id, error: readableError(error) },
      })
    }
  }

  return results
}

export function createToolPolicyExecutor(options: ToolPolicyExecutorOptions = {}) {
  return {
    execute: (call: ExecuteToolWithPolicyOptions) => executeToolWithPolicy(call, options),
  }
}

export async function executeToolWithPolicy(
  call: ExecuteToolWithPolicyOptions,
  options: ToolPolicyExecutorOptions = {},
): Promise<unknown> {
  const policy = mergeToolPolicy(options.defaultPolicy, options.policies?.[call.toolName])
  if (policy.allowedTools && !policy.allowedTools.includes(call.toolName)) {
    throw new EdgeToolPolicyError('tool-not-allowed', `${call.toolName} is not allowed by the tool execution policy.`)
  }
  enforcePayloadLimit('input-too-large', call.input, policy.maxInputBytes, `${call.toolName} input exceeds the policy payload limit.`)

  const candidate = call.tool as { execute?: ContextualToolExecute } | undefined
  if (!candidate?.execute) throw new EdgeToolPolicyError('not-executable', `${call.toolName} is not executable.`)

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined
  const context = controller ? { ...call.context, signal: controller.signal } : call.context
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const execution = Promise.resolve(candidate.execute(call.input, context))
    const output = policy.timeoutMs
      ? await Promise.race([
          execution,
          new Promise<never>((_resolve, reject) => {
            timer = setTimeout(() => {
              controller?.abort()
              reject(new EdgeToolPolicyError('timeout', `${call.toolName} exceeded the policy timeout.`))
            }, policy.timeoutMs)
          }),
        ])
      : await execution
    enforcePayloadLimit('output-too-large', output, policy.maxOutputBytes, `${call.toolName} output exceeds the policy payload limit.`)
    return output
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function mergeToolPolicy(defaultPolicy: ToolPolicy | undefined, policy: ToolPolicy | undefined): ToolPolicy {
  return { ...(defaultPolicy ?? {}), ...(policy ?? {}) }
}

function enforcePayloadLimit(
  code: 'input-too-large' | 'output-too-large',
  value: unknown,
  limit: number | undefined,
  message: string,
) {
  if (!limit) return
  if (estimatePayloadBytes(value) > limit) throw new EdgeToolPolicyError(code, message)
}

function estimatePayloadBytes(value: unknown): number {
  return new TextEncoder().encode(stableStringify(value)).byteLength
}

type ContextualToolExecute = (input: Record<string, unknown>, context: EdgeToolExecutionContext) => unknown | Promise<unknown>

function redactValue(value: unknown, patterns: PiiRedactorPattern[]): unknown {
  if (typeof value === 'string') {
    return patterns.reduce(
      (current, item) => current.replace(item.pattern, item.replacement ?? `[REDACTED:${item.name}]`),
      value,
    )
  }

  if (Array.isArray(value)) return value.map(item => redactValue(item, patterns))

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, redactValue(item, patterns)]),
    )
  }

  return value
}

function isConflictError(error: unknown): boolean {
  if (!isRecord(error)) return false
  return error.code === 'conflict' || error.code === 'CONFLICT' || error.status === 409 || error.statusCode === 409
}

function isQueuedMutation(value: unknown): value is EdgeQueuedMutation {
  if (!isRecord(value)) return false
  return typeof value.id === 'string'
    && typeof value.toolName === 'string'
    && isRecord(value.input)
    && typeof value.status === 'string'
    && ['queued', 'syncing', 'synced', 'failed', 'conflict'].includes(value.status)
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && typeof value.attempts === 'number'
}

function stableStringify(value: unknown): string {
  if (value == null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
  return `{${entries.join(',')}}`
}

function stableHash(payload: string): string {
  let hash = 2166136261
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
