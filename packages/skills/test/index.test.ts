import { describe, expect, it, vi } from 'vitest'
import {
  applyMissionProfile,
  createMissionProfile,
  createSkill,
  profileToAgentOptions,
  validateMissionProfile,
} from '../src/index'

describe('skills package', () => {
  it('creates profiles without wiping separately registered tools', () => {
    const profile = createMissionProfile({
      id: 'catalog-v1',
      mission: 'public-catalog-shopping',
      version: '1.0.0',
      systemPrompt: 'Use catalog tools.',
      tools: {},
      defaults: { toolChoice: 'required', downloadPolicy: 'never' },
    })

    expect(profileToAgentOptions(profile)).toEqual({
      systemPrompt: 'Use catalog tools.',
      toolChoice: 'required',
      downloadPolicy: 'never',
    })
  })

  it('warns on authoring-only synthesis without executable tools', () => {
    const warn = vi.fn()
    const profile = createMissionProfile({
      id: 'docs-v1',
      mission: 'docs-qa',
      version: '1.0.0',
      systemPrompt: 'Search docs first.',
      synthesis: { requiredAttributes: ['source'], style: 'explicit' },
    })

    applyMissionProfile(profile, { logger: { warn } })

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('docs-v1'))
  })

  it('validates required tools against registered host tools', () => {
    const profile = createMissionProfile({
      id: 'support-v1',
      mission: 'support-workflow',
      version: '1.0.0',
      systemPrompt: 'Use support tools.',
      requiredTools: ['searchTickets'],
    })

    expect(validateMissionProfile(profile, { registeredTools: ['searchTickets'] }).ok).toBe(true)
    expect(validateMissionProfile(profile, { registeredTools: [] }).ok).toBe(false)
  })

  it('creates skills', () => {
    expect(createSkill({ id: 'search', name: 'Search', description: 'Search records.' }).id).toBe('search')
  })
})
