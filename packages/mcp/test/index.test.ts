import { describe, expect, it, vi } from 'vitest'
import { loadMcpTools, mcpToolsFromDefinitions } from '../src/index'

describe('mcp package', () => {
  it('converts MCP definitions into tools', () => {
    const tools = mcpToolsFromDefinitions([{ name: 'search' }], { callTool: vi.fn() })

    expect(Object.keys(tools)).toEqual(['search'])
  })

  it('loads definitions from a client', async () => {
    const tools = await loadMcpTools({
      listTools: async () => ({ tools: [{ name: 'lookup' }] }),
      callTool: vi.fn(),
    })

    expect(Object.keys(tools)).toEqual(['lookup'])
  })
})
