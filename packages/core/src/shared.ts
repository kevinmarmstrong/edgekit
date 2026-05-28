export function estimateTokens(value: unknown): number {
  const text = typeof value === 'string' ? value : stableStringify(value)
  return Math.max(1, Math.ceil(text.length / 4))
}

export function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function toPascalCase(value: string) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('')
}

export function stableStringify(value: unknown): string {
  if (value == null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
  return `{${entries.join(',')}}`
}

export function stableHash(payload: string): string {
  let hash = 2166136261
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export async function maybeAvailability(model: unknown): Promise<string | undefined> {
  if (typeof model === 'object' && model && 'availability' in model) {
    const availability = (model as { availability: () => Promise<string> }).availability
    if (typeof availability === 'function') return availability.call(model)
  }
  return undefined
}

export async function maybeCreateSessionWithProgress(
  model: unknown,
  onProgress: (progress: number) => void,
): Promise<void> {
  if (typeof model === 'object' && model && 'createSessionWithProgress' in model) {
    const createSessionWithProgress = (
      model as { createSessionWithProgress: (onProgress: (progress: number) => void) => Promise<unknown> }
    ).createSessionWithProgress
    if (typeof createSessionWithProgress === 'function') {
      await createSessionWithProgress.call(model, onProgress)
    }
  }
}

export function readableError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number | undefined): Promise<T | null> {
  if (!timeoutMs) return promise

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<null>(resolve => {
        timer = setTimeout(() => resolve(null), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
