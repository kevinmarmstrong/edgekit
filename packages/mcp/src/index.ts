import { tool } from '@kevinmarmstrong/edgekit'
import type { EdgeToolExecutionContext } from '@kevinmarmstrong/edgekit'
import { z } from 'zod'

export type McpToolDefinition = {
  name: string
  description?: string
  inputSchema?: unknown
}

export interface McpToolClient {
  listTools?: () => Promise<McpToolDefinition[] | { tools: McpToolDefinition[] }>
  callTool: (name: string, input: Record<string, unknown>, context?: EdgeToolExecutionContext) => Promise<unknown> | unknown
}

export function mcpToolsFromDefinitions(definitions: McpToolDefinition[], client: McpToolClient): Record<string, unknown> {
  const createTool = tool as never as (options: {
    description: string
    inputSchema: z.ZodType
    execute: (input: Record<string, unknown>, context: EdgeToolExecutionContext) => Promise<unknown> | unknown
  }) => unknown
  return Object.fromEntries(
    definitions.map(definition => [
      definition.name,
      createTool({
        description: definition.description ?? `Call MCP tool ${definition.name}.`,
        inputSchema: jsonSchemaToZod(definition.inputSchema),
        execute: async (input: Record<string, unknown>, context: EdgeToolExecutionContext) =>
          client.callTool(definition.name, input, context),
      }),
    ]),
  )
}

export async function loadMcpTools(client: McpToolClient): Promise<Record<string, unknown>> {
  if (!client.listTools) throw new Error('loadMcpTools requires an MCP client with listTools().')
  const listed = await client.listTools()
  const definitions = Array.isArray(listed) ? listed : listed.tools
  return mcpToolsFromDefinitions(definitions, client)
}

function jsonSchemaToZod(schema: unknown): z.ZodType {
  if (!isRecord(schema)) return z.record(z.string(), z.unknown())
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return z.enum(schema.enum.map(String) as [string, ...string[]])

  switch (schema.type) {
    case 'object': {
      const properties = isRecord(schema.properties) ? schema.properties : {}
      const required = Array.isArray(schema.required) ? new Set(schema.required.map(String)) : new Set<string>()
      const shape = Object.fromEntries(
        Object.entries(properties).map(([key, value]) => {
          const field = jsonSchemaToZod(value)
          return [key, required.has(key) ? field : field.optional()]
        }),
      )
      return z.object(shape)
    }
    case 'string':
      return z.string()
    case 'number':
      return z.number()
    case 'integer':
      return z.number().int()
    case 'boolean':
      return z.boolean()
    case 'array':
      return z.array(jsonSchemaToZod(schema.items))
    default:
      return z.record(z.string(), z.unknown())
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
