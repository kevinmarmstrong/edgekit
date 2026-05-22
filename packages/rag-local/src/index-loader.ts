import type { ContentIndex } from '@browser-chat-runtime/core'

const IDB_NAME = 'browser-chat-runtime'
const IDB_STORE = 'content-index'
const IDB_KEY = 'current'

export async function fetchContentIndex(url: string): Promise<ContentIndex> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch content index: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<ContentIndex>
}

export async function getStoredHash(): Promise<string | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(IDB_STORE, 'readonly')
    const store = tx.objectStore(IDB_STORE)
    const request = store.get(IDB_KEY)

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const result = request.result as { contentHash?: string } | undefined
        resolve(result?.contentHash ?? null)
      }
      request.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function storeIndex(index: ContentIndex): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(IDB_STORE, 'readwrite')
  const store = tx.objectStore(IDB_STORE)
  store.put({ ...index, key: IDB_KEY }, IDB_KEY)

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export function needsReload(storedHash: string | null, remoteHash: string): boolean {
  return storedHash !== remoteHash
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
