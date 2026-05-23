import { describe, it, expect, vi } from 'vitest'
import {
  createRouteNode,
  type SkillRoute,
} from './route.js'
import { createInitialState, updateState } from '../graph/state.js'
import type { NodeContext, AgentConfig } from '../graph/node.js'
import type { Message } from '../types.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestState(messages: readonly Message[] = []) {
  const base = createInitialState({
    runId: 'test-run',
    modelId: 'test-model',
    downloadPolicy: 'prompt' as const,
  })
  return updateState(base, { messages })
}

function createTestContext(overrides: Partial<NodeContext> = {}): NodeContext {
  const config: AgentConfig = {
    systemPrompt: 'test',
    maxIterations: 10,
    tracing: true,
    downloadPolicy: 'prompt' as const,
  }
  return {
    emitter: { emit: vi.fn(), on: vi.fn(() => () => {}), dispose: vi.fn() },
    signal: new AbortController().signal,
    tools: [],
    config,
    ...overrides,
  }
}

const WEATHER_SKILL: SkillRoute = {
  name: 'weather',
  description: 'Get weather forecasts and conditions',
  keywords: ['weather', 'forecast', 'temperature', 'rain'],
}

const CALENDAR_SKILL: SkillRoute = {
  name: 'calendar',
  description: 'Manage calendar events and scheduling',
  keywords: ['calendar', 'meeting', 'schedule', 'event'],
}

const SEARCH_SKILL: SkillRoute = {
  name: 'search',
  description: 'Search the web for information',
  keywords: ['search', 'find', 'look', 'web'],
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createRouteNode', () => {
  it('returns state unchanged when no skills configured', async () => {
    const node = createRouteNode()
    const state = createTestState([{ role: 'user', content: 'hello' }])
    const context = createTestContext()

    const result = await node.execute(state, context)

    expect(result.selectedSkill).toBeUndefined()
    expect(result.routingConfidence).toBe(0)
  })

  it('returns state unchanged when skills array is empty', async () => {
    const node = createRouteNode({ skills: [] })
    const state = createTestState([{ role: 'user', content: 'hello' }])
    const context = createTestContext()

    const result = await node.execute(state, context)

    expect(result.selectedSkill).toBeUndefined()
    expect(result.routingConfidence).toBe(0)
  })

  it('returns state unchanged when no user message exists', async () => {
    const node = createRouteNode({ skills: [WEATHER_SKILL] })
    const state = createTestState([
      { role: 'system', content: 'You are a helpful assistant.' },
    ])
    const context = createTestContext()

    const result = await node.execute(state, context)

    expect(result.selectedSkill).toBeUndefined()
    expect(result.routingConfidence).toBe(0)
  })

  it('matches skill by keyword overlap', async () => {
    const node = createRouteNode({ skills: [WEATHER_SKILL] })
    const state = createTestState([
      { role: 'user', content: 'What is the weather forecast?' },
    ])
    const context = createTestContext()

    const result = await node.execute(state, context)

    expect(result.selectedSkill).toBe('weather')
    expect(result.routingConfidence).toBeGreaterThan(0)
  })

  it('sets selectedSkill and routingConfidence in state', async () => {
    const node = createRouteNode({ skills: [CALENDAR_SKILL] })
    const state = createTestState([
      { role: 'user', content: 'schedule a meeting' },
    ])
    const context = createTestContext()

    const result = await node.execute(state, context)

    expect(result.selectedSkill).toBe('calendar')
    expect(result.routingConfidence).toBeGreaterThan(0.3)
  })

  it('uses confidenceThreshold to filter low-confidence matches', async () => {
    const node = createRouteNode({
      skills: [WEATHER_SKILL],
      confidenceThreshold: 0.9,
    })
    const state = createTestState([
      { role: 'user', content: 'tell me about the weather' },
    ])
    const context = createTestContext()

    const result = await node.execute(state, context)

    expect(result.selectedSkill).toBeUndefined()
    expect(result.routingConfidence).toBeGreaterThan(0)
    expect(result.routingConfidence).toBeLessThan(0.9)
  })

  it('falls back to defaultSkill when below threshold', async () => {
    const node = createRouteNode({
      skills: [WEATHER_SKILL],
      confidenceThreshold: 0.99,
      defaultSkill: 'general',
    })
    const state = createTestState([
      { role: 'user', content: 'the weather is nice' },
    ])
    const context = createTestContext()

    const result = await node.execute(state, context)

    expect(result.selectedSkill).toBe('general')
  })

  it('handles multiple skills and picks highest confidence', async () => {
    const node = createRouteNode({
      skills: [WEATHER_SKILL, CALENDAR_SKILL, SEARCH_SKILL],
    })
    const state = createTestState([
      { role: 'user', content: 'schedule a calendar meeting event' },
    ])
    const context = createTestContext()

    const result = await node.execute(state, context)

    expect(result.selectedSkill).toBe('calendar')
  })

  it('emits state:snapshot event', async () => {
    const emitter = { emit: vi.fn(), on: vi.fn(() => () => {}), dispose: vi.fn() }
    const context = createTestContext({ emitter })
    const node = createRouteNode({ skills: [WEATHER_SKILL] })
    const state = createTestState([
      { role: 'user', content: 'weather forecast please' },
    ])

    await node.execute(state, context)

    expect(emitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'state:snapshot',
        runId: 'test-run',
      }),
    )
  })

  it('has error policy set to skip', () => {
    const node = createRouteNode()

    expect(node.errorPolicy?.onError).toBe('skip')
  })

  it('does not mutate the original state', async () => {
    const node = createRouteNode({ skills: [WEATHER_SKILL] })
    const state = createTestState([
      { role: 'user', content: 'weather forecast' },
    ])
    const context = createTestContext()
    const originalSkill = state.selectedSkill
    const originalConfidence = state.routingConfidence

    await node.execute(state, context)

    expect(state.selectedSkill).toBe(originalSkill)
    expect(state.routingConfidence).toBe(originalConfidence)
  })

  it('handles empty keywords gracefully', async () => {
    const skillNoKeywords: SkillRoute = {
      name: 'empty-kw',
      description: 'A skill with no keywords',
      keywords: [],
    }
    const node = createRouteNode({ skills: [skillNoKeywords] })
    const state = createTestState([
      { role: 'user', content: 'skill with no keywords' },
    ])
    const context = createTestContext()

    const result = await node.execute(state, context)

    expect(result.routingConfidence).toBeGreaterThan(0)
    expect(result.selectedSkill).toBe('empty-kw')
  })

  it('performs case-insensitive keyword matching', async () => {
    const node = createRouteNode({ skills: [WEATHER_SKILL] })
    const state = createTestState([
      { role: 'user', content: 'WEATHER FORECAST please' },
    ])
    const context = createTestContext()

    const result = await node.execute(state, context)

    expect(result.selectedSkill).toBe('weather')
    expect(result.routingConfidence).toBeGreaterThan(0)
  })

  it('uses the last user message when multiple exist', async () => {
    const node = createRouteNode({
      skills: [WEATHER_SKILL, CALENDAR_SKILL],
    })
    const state = createTestState([
      { role: 'user', content: 'schedule a meeting' },
      { role: 'assistant', content: 'Sure, when?' },
      { role: 'user', content: 'what is the weather forecast?' },
    ])
    const context = createTestContext()

    const result = await node.execute(state, context)

    expect(result.selectedSkill).toBe('weather')
  })

  it('matches on description words when no explicit keywords', async () => {
    const skillNoKeywords: SkillRoute = {
      name: 'translator',
      description: 'translate text between languages',
    }
    const node = createRouteNode({ skills: [skillNoKeywords] })
    const state = createTestState([
      { role: 'user', content: 'translate this text' },
    ])
    const context = createTestContext()

    const result = await node.execute(state, context)

    expect(result.selectedSkill).toBe('translator')
    expect(result.routingConfidence).toBeGreaterThan(0)
  })

  it('returns confidence of 0 when query has no overlap with any skill', async () => {
    const node = createRouteNode({ skills: [WEATHER_SKILL] })
    const state = createTestState([
      { role: 'user', content: 'xyzzy plugh' },
    ])
    const context = createTestContext()

    const result = await node.execute(state, context)

    expect(result.routingConfidence).toBe(0)
    expect(result.selectedSkill).toBeUndefined()
  })
})
