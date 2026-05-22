import type { Skill, SkillContext, Tool } from '@browser-chat-runtime/core'

export interface BlogChatConfig {
  readonly siteName?: string
}

export function blogChat(config: BlogChatConfig = {}): Skill {
  const siteName = config.siteName ?? 'this site'

  const tools: readonly Tool[] = [
    {
      name: 'search_content',
      description: `Search ${siteName} content for relevant information`,
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
  ]

  return {
    name: 'blog-chat',
    description: `Answer questions about ${siteName} using its content`,
    tools,

    activate(_context: SkillContext) {
      // TODO: Register tool handlers
    },

    deactivate() {
      // cleanup
    },

    async handleToolCall(
      name: string,
      args: Record<string, unknown>,
    ): Promise<string> {
      if (name === 'search_content') {
        // TODO: Use RAG provider to search
        return JSON.stringify({ results: [], query: args['query'] })
      }
      throw new Error(`Unknown tool: ${name}`)
    },
  }
}
