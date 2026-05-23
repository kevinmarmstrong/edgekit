import type { GraphNode, NodeErrorPolicy } from '../graph/node.js'
import type { AgentState } from '../graph/state.js'
import { updateState } from '../graph/state.js'

export interface SkillRoute {
  readonly name: string
  readonly description: string
  readonly keywords?: readonly string[]
}

export interface RouteNodeConfig {
  readonly skills?: readonly SkillRoute[]
  readonly confidenceThreshold?: number
  readonly defaultSkill?: string
}

interface ScoredMatch {
  readonly name: string
  readonly confidence: number
}

const SKIP_POLICY: NodeErrorPolicy = { onError: 'skip' } as const
const DEFAULT_THRESHOLD = 0.3

export function createRouteNode(config?: RouteNodeConfig): GraphNode {
  const threshold = config?.confidenceThreshold ?? DEFAULT_THRESHOLD

  return {
    id: 'route',
    errorPolicy: SKIP_POLICY,

    execute: async (state: AgentState, context): Promise<AgentState> => {
      const query = findLastUserMessage(state)
      if (!query || !config?.skills?.length) {
        return state
      }

      const bestMatch = findBestMatch(query, config.skills)
      const selectedSkill = bestMatch.confidence >= threshold
        ? bestMatch.name
        : config.defaultSkill

      const updated = updateState(state, {
        selectedSkill,
        routingConfidence: bestMatch.confidence,
      })

      context.emitter.emit({
        type: 'state:snapshot',
        timestamp: Date.now(),
        runId: state.runId,
        state: updated as unknown as Readonly<Record<string, unknown>>,
      })

      return updated
    },
  }
}

function findLastUserMessage(state: AgentState): string | undefined {
  for (let i = state.messages.length - 1; i >= 0; i--) {
    const msg = state.messages[i]
    if (msg?.role === 'user') {
      return msg.content
    }
  }
  return undefined
}

function findBestMatch(
  query: string,
  skills: readonly SkillRoute[],
): ScoredMatch {
  const queryTokens = tokenize(query)
  let bestName = ''
  let bestConfidence = 0

  for (const skill of skills) {
    const confidence = scoreSkill(queryTokens, skill)
    if (confidence > bestConfidence) {
      bestConfidence = confidence
      bestName = skill.name
    }
  }

  return { name: bestName, confidence: bestConfidence }
}

function scoreSkill(
  queryTokens: readonly string[],
  skill: SkillRoute,
): number {
  const skillTokens = buildSkillTokens(skill)
  if (skillTokens.length === 0 || queryTokens.length === 0) {
    return 0
  }

  const matchCount = queryTokens.filter((token) =>
    skillTokens.some((skillToken) => fuzzyMatch(token, skillToken)),
  ).length

  return matchCount / queryTokens.length
}

function buildSkillTokens(skill: SkillRoute): readonly string[] {
  const descriptionTokens = tokenize(skill.description)
  const keywordTokens = skill.keywords
    ? skill.keywords.flatMap(tokenize)
    : []
  return [...descriptionTokens, ...keywordTokens]
}

function fuzzyMatch(a: string, b: string): boolean {
  return a === b || a.startsWith(b) || b.startsWith(a)
}

function tokenize(text: string): readonly string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((t) => t.length > 0)
}
