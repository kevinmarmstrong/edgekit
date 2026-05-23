import { defineAgent } from '@edgekit/core'
import type { Agent, AgentDefinition } from '@edgekit/core'
import type { ModelProvider, RAGProvider } from '@edgekit/core'
import type { AgentEvent } from '@edgekit/core'
import type { DownloadPolicy } from '@edgekit/core'

export interface DocsAgentConfig {
  /** Display name for the agent */
  readonly name?: string
  /** Model provider for inference */
  readonly model?: ModelProvider
  /** RAG provider for content retrieval */
  readonly rag?: RAGProvider
  /** System prompt override */
  readonly systemPrompt?: string
  /** Download policy for model weights */
  readonly downloadPolicy?: DownloadPolicy
  /** Maximum tool call rounds per query */
  readonly maxToolRounds?: number
  /** Event callback */
  readonly onEvent?: (event: AgentEvent) => void
}

const DEFAULT_SYSTEM_PROMPT = `You are a documentation assistant. Your role is to answer questions using the provided context from the documentation.

Guidelines:
- Answer based on the retrieved documentation content
- If the context doesn't contain relevant information, say so
- Be concise and direct
- Reference specific sections or pages when possible
- Use code examples from the docs when they help explain a concept`

/**
 * Creates a pre-configured documentation Q&A agent.
 *
 * This agent uses RAG retrieval to answer questions about documentation content.
 * It serves as both a useful built-in and a reference implementation for defineAgent().
 *
 * @example
 * ```typescript
 * import { docsAgent } from '@edgekit/skills'
 * import { webllm } from '@edgekit/model-webllm'
 * import { localRAG } from '@edgekit/rag-local'
 *
 * const agent = docsAgent({
 *   model: webllm({ tier: 'standard' }),
 *   rag: localRAG({ indexUrl: '/content-index.json' }),
 * })
 *
 * for await (const token of agent.query('How do I get started?')) {
 *   process.stdout.write(token)
 * }
 * ```
 */
export function docsAgent(config: DocsAgentConfig = {}): Agent {
  const definition: AgentDefinition = {
    name: config.name ?? 'docs-agent',
    description: 'Documentation Q&A agent powered by RAG retrieval',
    version: '1.0.0',
    model: config.model,
    rag: config.rag,
    systemPrompt: config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
    downloadPolicy: config.downloadPolicy ?? 'prompt',
    maxToolRounds: config.maxToolRounds ?? 1,
    onEvent: config.onEvent,
  }

  return defineAgent(definition)
}
