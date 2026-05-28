// FROZEN per Phase C compatibility convention: bug fixes only, no behavior changes. Source of truth lives in the matching sibling package when one exists; otherwise this is deprecated DEFER surface.
export type EdgeSkillPatchOperation = {
  op: 'add' | 'delete' | 'replace'
  path: string
  value?: unknown
  reason?: string
}

export interface EdgeSkillOptimizationCandidate {
  skillId: string
  baselineScore: number
  candidateScore: number
  patch: EdgeSkillPatchOperation[]
  protectedPaths?: string[]
}

export interface ValidateSkillOptimizationOptions {
  maxOperations?: number
  minImprovement?: number
  protectedPaths?: string[]
  allowProtectedEdits?: boolean
}

export interface EdgeSkillOptimizationIssue {
  code: string
  message: string
  path?: string
}

export interface EdgeSkillOptimizationValidation {
  accepted: boolean
  issues: EdgeSkillOptimizationIssue[]
  improvement: number
}

/**
 * Validate a SkillOpt-style candidate before accepting a self-edit.
 *
 * This is a dev-time guardrail: small patch budget, strict held-out
 * improvement, and protected slow-state paths. Ties are rejected by default.
 */
export function validateSkillOptimizationCandidate(
  candidate: EdgeSkillOptimizationCandidate,
  options: ValidateSkillOptimizationOptions = {},
): EdgeSkillOptimizationValidation {
  const maxOperations = options.maxOperations ?? 8
  const minImprovement = options.minImprovement ?? 0
  const protectedPaths = [
    ...(candidate.protectedPaths ?? []),
    ...(options.protectedPaths ?? []),
  ]
  const issues: EdgeSkillOptimizationIssue[] = []
  const improvement = roundScore(candidate.candidateScore - candidate.baselineScore)

  if (!candidate.skillId.trim()) {
    issues.push({ code: 'missing-skill-id', message: 'Optimization candidate must include a skillId.' })
  }

  if (!Number.isFinite(candidate.baselineScore) || !Number.isFinite(candidate.candidateScore)) {
    issues.push({ code: 'invalid-score', message: 'Optimization scores must be finite numbers.' })
  }

  if (candidate.patch.length === 0) {
    issues.push({ code: 'empty-patch', message: 'Optimization candidate must include at least one bounded edit.' })
  }

  if (candidate.patch.length > maxOperations) {
    issues.push({
      code: 'patch-budget-exceeded',
      message: `Optimization candidate has ${candidate.patch.length} edits; maximum is ${maxOperations}.`,
    })
  }

  if (improvement <= minImprovement) {
    issues.push({
      code: 'no-strict-improvement',
      message: 'Candidate must strictly improve the held-out validation score; ties are rejected.',
    })
  }

  for (const operation of candidate.patch) {
    if (!operation.path.trim()) {
      issues.push({ code: 'missing-patch-path', message: 'Each patch operation must include a path.' })
      continue
    }
    if (!options.allowProtectedEdits && protectedPaths.some(path => pathTouchesProtectedPath(operation.path, path))) {
      issues.push({
        code: 'protected-path-edit',
        path: operation.path,
        message: `Patch operation touches protected slow-state path "${operation.path}".`,
      })
    }
  }

  return { accepted: issues.length === 0, issues, improvement }
}

export interface EdgeSkillScore {
  skillId: string
  baselineScore: number
  candidateScore: number
}

export function summarizeSkillOptimizationScores(scores: EdgeSkillScore[]) {
  return scores.map(score => ({
    ...score,
    improvement: roundScore(score.candidateScore - score.baselineScore),
  }))
}

function pathTouchesProtectedPath(path: string, protectedPath: string) {
  if (!protectedPath) return false
  return path === protectedPath ||
    path.startsWith(`${protectedPath}.`) ||
    path.startsWith(`${protectedPath}/`) ||
    path.startsWith(`${protectedPath}[`)
}

function roundScore(value: number) {
  return Math.round(value * 1000) / 1000
}
