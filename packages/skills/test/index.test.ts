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
      agentIdentity: { name: 'Catalog assistant' },
      grounding: 'strict',
      requiredTools: ['searchCatalog'],
      defaults: { toolChoice: 'required', downloadPolicy: 'never' },
    })

    expect(profileToAgentOptions(profile)).toEqual({
      systemPrompt: 'Use catalog tools.',
      agentIdentity: { name: 'Catalog assistant' },
      grounding: 'strict',
      toolChoice: 'required',
      downloadPolicy: 'never',
    })
  })

  it('defaults strict grounding profiles with tools to required tool use', () => {
    const profile = createMissionProfile({
      id: 'site-qa-v1',
      mission: 'docs-qa',
      version: '1.0.0',
      systemPrompt: 'Answer from site content.',
      agentIdentity: { name: 'Site assistant' },
      grounding: 'strict',
      requiredTools: ['searchSite'],
    })

    expect(profileToAgentOptions(profile)).toMatchObject({
      agentIdentity: { name: 'Site assistant' },
      grounding: 'strict',
      toolChoice: 'required',
    })
  })

  it('requires a tool contract for strict grounding', () => {
    const profile = createMissionProfile({
      id: 'unsafe-qa-v1',
      mission: 'docs-qa',
      version: '1.0.0',
      systemPrompt: 'Answer from site content.',
      grounding: 'strict',
    })

    expect(validateMissionProfile(profile).ok).toBe(false)
    expect(validateMissionProfile(profile).errors).toContainEqual(expect.objectContaining({
      code: 'strict-grounding-without-tools',
    }))
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
