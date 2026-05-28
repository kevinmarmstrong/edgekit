// FROZEN per Phase C compatibility convention: bug fixes only, no behavior changes. Source of truth lives in the matching sibling package when one exists; otherwise this is deprecated DEFER surface.
import type { ContextualToolExecute, EdgeToolExecutionContext, EdgeToolManifest } from '../context'

export interface ParallelToolCall {
  id: string
  toolName: string
  input: Record<string, unknown>
}

export interface ParallelToolResult {
  id: string
  toolName: string
  output?: unknown
  error?: unknown
}

export interface ExecuteParallelToolsOptions {
  calls: ParallelToolCall[]
  tools: Record<string, unknown>
  manifests?: EdgeToolManifest[]
  context: EdgeToolExecutionContext
}

export async function executeParallelTools(options: ExecuteParallelToolsOptions): Promise<ParallelToolResult[]> {
  const manifestByName = new Map((options.manifests ?? []).map(manifest => [manifest.name, manifest]))
  const results: ParallelToolResult[] = []
  let safeBatch: ParallelToolCall[] = []

  const flushSafeBatch = async () => {
    if (safeBatch.length === 0) return
    const batch = safeBatch
    safeBatch = []
    const batchResults = await Promise.all(batch.map(call => executeToolCall(call, options.tools, options.context)))
    results.push(...batchResults)
  }

  for (const call of options.calls) {
    const manifest = manifestByName.get(call.toolName)
    if (manifest?.readOnly && manifest.parallelSafe) {
      safeBatch.push(call)
      continue
    }

    await flushSafeBatch()
    results.push(await executeToolCall(call, options.tools, options.context))
  }

  await flushSafeBatch()
  return results
}

async function executeToolCall(
  call: ParallelToolCall,
  tools: Record<string, unknown>,
  context: EdgeToolExecutionContext,
): Promise<ParallelToolResult> {
  const candidate = tools[call.toolName] as { execute?: ContextualToolExecute } | undefined
  if (!candidate?.execute) return { id: call.id, toolName: call.toolName, error: new Error(`${call.toolName} is not executable.`) }

  try {
    const output = await candidate.execute(call.input, context)
    return { id: call.id, toolName: call.toolName, output }
  } catch (error) {
    return { id: call.id, toolName: call.toolName, error }
  }
}
