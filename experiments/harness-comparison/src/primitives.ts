// Experimental harness primitives — kept LOCAL to this experiment on purpose.
// They are NOT in @kevinmarmstrong/edgekit core; they must prove themselves on a real
// Gemma run before any core change is proposed. Both work against the PUBLISHED package
// with zero core modifications:
//   - the tool-first primer is just appended to the systemPrompt string;
//   - two-strikes is injected through createAgent's existing `streamText` option.
import { stepCountIs, streamText as aiStreamText } from 'ai'

export const TOOL_FIRST_SYSTEM_PRIMER = [
  'Tool-first policy:',
  '- Prefer the registered tools for anything factual or stateful. They are the source of truth for this app.',
  '- Do not answer from prior knowledge when a tool can fetch the real answer; recalled facts often look right without being right.',
  '- Read before you write: gather evidence with read-only tools before any tool that changes state.',
  '- If no registered tool can satisfy the request, say so plainly instead of guessing or improvising a workaround.',
].join('\n')

export interface ToolFailureSignal {
  toolName: string
  type: 'tool-error' | 'tool-result'
  output?: unknown
  error?: unknown
}

export interface TwoStrikesStopOptions {
  maxFailuresPerTool?: number
  isFailure?: (failure: ToolFailureSignal) => boolean
}

/** Stop condition: halt once any single tool has failed `maxFailuresPerTool` times (default 2). */
export function twoStrikesStop(options: TwoStrikesStopOptions = {}) {
  const max = Math.max(1, options.maxFailuresPerTool ?? 2)
  const isFailure = options.isFailure ?? defaultIsToolFailure
  return ({ steps }: { steps: ReadonlyArray<unknown> }): boolean => {
    const failures = new Map<string, number>()
    for (const step of steps) {
      for (const part of contentParts(step)) {
        const signal = toFailureSignal(part)
        if (!signal || !isFailure(signal)) continue
        const next = (failures.get(signal.toolName) ?? 0) + 1
        failures.set(signal.toolName, next)
        if (next >= max) return true
      }
    }
    return false
  }
}

/**
 * Wrap createAgent's `streamText` so the real executor loop also stops on two strikes.
 * Pass the result as `createAgent({ streamText: streamTextWithTwoStrikes() })`.
 * It calls the real AI SDK streamText with the real model/tool loop, only augmenting `stopWhen`.
 */
export function streamTextWithTwoStrikes(maxFailuresPerTool = 2): typeof aiStreamText {
  const extra = twoStrikesStop({ maxFailuresPerTool })
  const wrapped = (opts: Record<string, unknown>) => {
    const base = opts.stopWhen
    const stopWhen = base == null ? [extra] : [base, extra].flat()
    return aiStreamText({ ...opts, stopWhen } as Parameters<typeof aiStreamText>[0])
  }
  return wrapped as unknown as typeof aiStreamText
}

export { stepCountIs }

function contentParts(step: unknown): ReadonlyArray<unknown> {
  if (!step || typeof step !== 'object') return []
  const content = (step as { content?: unknown }).content
  return Array.isArray(content) ? content : []
}

function toFailureSignal(part: unknown): ToolFailureSignal | null {
  if (!part || typeof part !== 'object') return null
  const record = part as Record<string, unknown>
  const toolName = typeof record.toolName === 'string' ? record.toolName : undefined
  if (!toolName) return null
  if (record.type === 'tool-error') return { toolName, type: 'tool-error', error: record.error }
  if (record.type === 'tool-result') return { toolName, type: 'tool-result', output: record.output }
  return null
}

function defaultIsToolFailure(signal: ToolFailureSignal): boolean {
  if (signal.type === 'tool-error') return true
  return looksLikeErrorOutput(signal.output)
}

function looksLikeErrorOutput(output: unknown): boolean {
  if (!output || typeof output !== 'object') return false
  const record = output as Record<string, unknown>
  if (record.type === 'error-text' || record.type === 'error-json') return true
  if ('value' in record && (record.type === 'json' || record.type === 'text')) {
    return looksLikeErrorOutput(record.value)
  }
  if ('error' in record && record.error != null) return true
  if (record.success === false || record.ok === false) return true
  return false
}
