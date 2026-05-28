// FROZEN per Phase C compatibility convention: bug fixes only, no behavior changes. Source of truth lives in the matching sibling package when one exists; otherwise this is deprecated DEFER surface.
import type { EdgeMemoryRecord } from './knowledge'
import type { EdgeSessionContext, EdgeStateSnapshot } from '../context'
import { publicIdentity } from '../context'
import { stableHash, stableStringify } from '../shared'
import type { CreateAgentOptions } from '../agent'

export interface EdgeCachedResponse {
  key: string
  text: string
  createdAt: string
  expiresAt?: string
  metadata?: Record<string, unknown>
}

export interface EdgeResponseCache {
  get(key: string): EdgeCachedResponse | null | Promise<EdgeCachedResponse | null>
  set(entry: EdgeCachedResponse): void | Promise<void>
  delete?(key: string): void | Promise<void>
  clear?(): void | Promise<void>
}

export interface EdgeResponseCacheContext {
  input: string
  session: EdgeSessionContext
  state?: EdgeStateSnapshot
  memory: EdgeMemoryRecord[]
  tools: string[]
  phase: 'send' | 'approval'
}

export interface EdgeResponseCachePolicy {
  ttlMs?: number
  key?: (context: EdgeResponseCacheContext) => string | Promise<string>
  shouldRead?: (context: EdgeResponseCacheContext) => boolean | Promise<boolean>
  shouldWrite?: (context: EdgeResponseCacheContext & { text: string; usedTools: boolean }) => boolean | Promise<boolean>
}

export interface IndexedDbResponseCacheOptions {
  databaseName?: string
  storeName?: string
}

export function createMemoryResponseCache(now: () => string = () => new Date().toISOString()): EdgeResponseCache {
  const entries = new Map<string, EdgeCachedResponse>()

  return {
    get(key: string) {
      const entry = entries.get(key)
      if (!entry) return null
      if (entry.expiresAt && Date.parse(entry.expiresAt) <= Date.parse(now())) {
        entries.delete(key)
        return null
      }
      return entry
    },
    set(entry: EdgeCachedResponse) {
      entries.set(entry.key, entry)
    },
    delete(key: string) {
      entries.delete(key)
    },
    clear() {
      entries.clear()
    },
  }
}

export function createIndexedDbResponseCache(options: IndexedDbResponseCacheOptions = {}): EdgeResponseCache {
  const databaseName = options.databaseName ?? 'edgekit'
  const storeName = options.storeName ?? 'responses'
  const openStore = async (mode: IDBTransactionMode) => {
    if (typeof indexedDB === 'undefined') throw new Error('IndexedDB is not available in this environment.')
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath: 'key' })
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const transaction = database.transaction(storeName, mode)
    return { database, store: transaction.objectStore(storeName), transaction }
  }

  const requestToPromise = <T>(request: IDBRequest<T>) =>
    new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

  const closeOnDone = (database: IDBDatabase, transaction: IDBTransaction) => {
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => database.close()
    transaction.onabort = () => database.close()
  }

  const deleteEntry = async (key: string) => {
    const { database, store, transaction } = await openStore('readwrite')
    closeOnDone(database, transaction)
    await requestToPromise(store.delete(key))
  }

  return {
    async get(key: string) {
      const { database, store, transaction } = await openStore('readonly')
      closeOnDone(database, transaction)
      const entry = await requestToPromise<EdgeCachedResponse | undefined>(store.get(key))
      if (!entry) return null
      if (entry.expiresAt && Date.parse(entry.expiresAt) <= Date.now()) {
        await deleteEntry(key)
        return null
      }
      return entry
    },
    async set(entry: EdgeCachedResponse) {
      const { database, store, transaction } = await openStore('readwrite')
      closeOnDone(database, transaction)
      await requestToPromise(store.put(entry))
    },
    async delete(key: string) {
      await deleteEntry(key)
    },
    async clear() {
      const { database, store, transaction } = await openStore('readwrite')
      closeOnDone(database, transaction)
      await requestToPromise(store.clear())
    },
  }
}

export function resolveCachePolicy(policy: CreateAgentOptions['cachePolicy']): Required<EdgeResponseCachePolicy> {
  if (policy === false) {
    return {
      ttlMs: 0,
      key: () => '',
      shouldRead: () => false,
      shouldWrite: () => false,
    }
  }

  const provided = typeof policy === 'object' ? policy : {}
  return {
    ttlMs: provided.ttlMs ?? 5 * 60 * 1000,
    key: provided.key ?? createResponseCacheKey,
    shouldRead: provided.shouldRead ?? (() => true),
    shouldWrite: provided.shouldWrite ?? ((context: EdgeResponseCacheContext & { usedTools: boolean }) => !context.usedTools),
  }
}

function createResponseCacheKey(context: EdgeResponseCacheContext) {
  const payload = {
    input: normalizeCacheText(context.input),
    identity: publicIdentity(context.session.identity),
    state: context.state,
    memory: context.memory.map(record => ({
      id: record.id,
      title: record.title,
      updatedAt: record.updatedAt,
      source: record.source,
    })),
    tools: [...context.tools].sort(),
    phase: context.phase,
  }
  return `edgekit:${stableHash(stableStringify(payload))}`
}

function normalizeCacheText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}
