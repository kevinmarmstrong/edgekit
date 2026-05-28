import type { CreateAgentOptions } from '@kevinmarmstrong/edgekit'

export interface EdgeMissionProfile {
  id: string
  mission: 'public-catalog-shopping' | 'docs-qa' | 'internal-admin' | 'support-workflow' | string
  version: string
  systemPrompt: string
  tools?: Record<string, unknown>
  requiredTools?: string[]
  defaults?: Partial<Pick<CreateAgentOptions,
    'toolChoice' | 'downloadPolicy' | 'maxSteps' | 'memoryCompaction' | 'toolRepair' | 'cachePolicy'
  >>
  synthesis?: {
    requiredAttributes?: string[]
    style?: 'concise' | 'explicit'
  }
  policy?: {
    needsApproval?: boolean
    riskLevel?: 'low' | 'medium' | 'high'
    approvalMessage?: string
  }
  uiAffordances?: {
    preferActionCards?: boolean
    suggestedFields?: string[]
  }
  meta?: {
    description?: string
    owner?: string
    compatibility?: string
  }
}

export function createMissionProfile(profile: EdgeMissionProfile): EdgeMissionProfile {
  return profile
}

export type EdgeValidationSeverity = 'error' | 'warning'

export interface EdgeProfileValidationIssue {
  severity: EdgeValidationSeverity
  code: string
  message: string
  path?: string
}

export interface EdgeProfileValidationResult {
  ok: boolean
  errors: EdgeProfileValidationIssue[]
  warnings: EdgeProfileValidationIssue[]
  issues: EdgeProfileValidationIssue[]
}

export interface ValidateMissionProfileOptions {
  registeredTools?: string[] | Record<string, unknown>
}

function validationResult(issues: EdgeProfileValidationIssue[]): EdgeProfileValidationResult {
  const errors = issues.filter(issue => issue.severity === 'error')
  const warnings = issues.filter(issue => issue.severity === 'warning')
  return { ok: errors.length === 0, errors, warnings, issues }
}

function toolNamesFrom(input: string[] | Record<string, unknown> | undefined): Set<string> | null {
  if (!input) return null
  return new Set(Array.isArray(input) ? input : Object.keys(input))
}

function hasExecutableTools(profile: EdgeMissionProfile) {
  return !!profile.tools && Object.keys(profile.tools).length > 0
}

function hasRequiredTools(profile: EdgeMissionProfile) {
  return !!profile.requiredTools && profile.requiredTools.length > 0
}

export function validateMissionProfile(
  profile: EdgeMissionProfile,
  options: ValidateMissionProfileOptions = {},
): EdgeProfileValidationResult {
  const issues: EdgeProfileValidationIssue[] = []

  if (!profile.id?.trim()) {
    issues.push({ severity: 'error', code: 'missing-id', path: 'id', message: 'Mission Profile must include a stable id.' })
  }
  if (!profile.mission?.trim()) {
    issues.push({ severity: 'error', code: 'missing-mission', path: 'mission', message: 'Mission Profile must include a mission name.' })
  }
  if (!profile.version?.trim()) {
    issues.push({ severity: 'error', code: 'missing-version', path: 'version', message: 'Mission Profile must include a version.' })
  }
  if (!profile.systemPrompt?.trim()) {
    issues.push({
      severity: 'error',
      code: 'missing-system-prompt',
      path: 'systemPrompt',
      message: 'Mission Profile must include systemPrompt instructions for the sidecar mission.',
    })
  }

  const executableTools = hasExecutableTools(profile)
  const requiredTools = profile.requiredTools ?? []
  const uniqueRequiredTools = new Set(requiredTools)

  if (requiredTools.length !== uniqueRequiredTools.size) {
    issues.push({
      severity: 'error',
      code: 'duplicate-required-tools',
      path: 'requiredTools',
      message: 'Mission Profile requiredTools must not contain duplicate names.',
    })
  }

  if (!executableTools && !hasRequiredTools(profile)) {
    issues.push({
      severity: 'warning',
      code: 'no-tool-contract',
      path: 'requiredTools',
      message: 'Mission Profile has no executable tools and no requiredTools metadata. Register tools separately or document why this mission is model-only.',
    })
  }

  if (profile.defaults?.toolChoice === 'required' && !executableTools && !hasRequiredTools(profile)) {
    issues.push({
      severity: 'error',
      code: 'required-tool-choice-without-tools',
      path: 'defaults.toolChoice',
      message: 'toolChoice "required" needs executable profile tools or requiredTools metadata so the host can register tools before runtime.',
    })
  }

  const registeredTools = toolNamesFrom(options.registeredTools)
  if (registeredTools) {
    for (const requiredTool of uniqueRequiredTools) {
      if (!registeredTools.has(requiredTool)) {
        issues.push({
          severity: 'error',
          code: 'missing-registered-tool',
          path: 'requiredTools',
          message: `Mission Profile requires tool "${requiredTool}", but it was not found in the registered tool surface.`,
        })
      }
    }
  }

  if ((profile.synthesis?.requiredAttributes?.length ?? 0) > 0 && !executableTools && !hasRequiredTools(profile)) {
    issues.push({
      severity: 'warning',
      code: 'synthesis-without-tool-contract',
      path: 'synthesis.requiredAttributes',
      message: 'Synthesis requiredAttributes are most reliable when backed by executable tools or requiredTools metadata.',
    })
  }

  if ((profile.synthesis?.requiredAttributes?.length ?? 0) > 0) {
    issues.push({
      severity: 'warning',
      code: 'synthesis-authoring-contract',
      path: 'synthesis',
      message: 'Mission Profile synthesis rules are authoring and harness contracts today; outcome tests must verify the final user-visible answer.',
    })
  }

  if (profile.policy) {
    issues.push({
      severity: 'warning',
      code: 'policy-authoring-contract',
      path: 'policy',
      message: 'Mission Profile policy metadata documents intent, but runtime approval is enforced by executable tools such as needsApproval and by registered app actions.',
    })
  }

  if (profile.uiAffordances) {
    issues.push({
      severity: 'warning',
      code: 'ui-affordance-authoring-contract',
      path: 'uiAffordances',
      message: 'Mission Profile UI affordances are authoring hints today; render concrete CTAs and forms with registerActions(), EdgeView, or AG-UI.',
    })
  }

  return validationResult(issues)
}

export function profileToAgentOptions(profile: EdgeMissionProfile): Partial<CreateAgentOptions> {
  const result: Partial<CreateAgentOptions> = {
    systemPrompt: profile.systemPrompt,
    ...profile.defaults,
  }

  if (profile.tools && Object.keys(profile.tools).length > 0) {
    result.tools = profile.tools
  }

  return result
}

export interface ApplyMissionProfileOptions {
  warn?: boolean
  logger?: Pick<Console, 'warn'>
}

export function applyMissionProfile(
  profile: EdgeMissionProfile,
  options: ApplyMissionProfileOptions = {},
): Partial<CreateAgentOptions> {
  const result = profileToAgentOptions(profile)
  const logger = options.logger ?? console
  const shouldWarn = options.warn !== false

  const hasRichSynthesis =
    !!profile.synthesis &&
    Object.values(profile.synthesis).some(value =>
      Array.isArray(value) ? value.length > 0 : value != null,
    )

  const hasNoTools = !profile.tools || Object.keys(profile.tools).length === 0

  if (shouldWarn && hasRichSynthesis && hasNoTools) {
    logger.warn(
      `[Edgekit] Mission Profile "${profile.id}" contains synthesis rules but no executable tools. ` +
        `Synthesis fields are currently for authoring/documentation only. ` +
        `Register real tools separately with registerTools() or provide executable profile tools.`,
    )
  }

  return result
}

export interface EdgeSkill<TInput = unknown, TOutput = unknown> {
  id: string
  name: string
  description: string
  instructions?: string
  activationExamples?: string[]
  doNotActivateWhen?: string[]
  protectedSections?: string[]
  tools?: Record<string, unknown>
  requiredTools?: string[]
  examples?: Array<{
    input: TInput
    output?: TOutput
    rationale?: string
  }>
  policy?: {
    needsApproval?: boolean
    approvalMessage?: string
    riskLevel?: 'low' | 'medium' | 'high'
  }
  synthesis?: {
    requiredFacts?: string[]
    preferredStyle?: 'concise' | 'explicit' | 'narrative'
  }
  uiAffordances?: {
    preferActionCards?: boolean
    suggestedFields?: string[]
  }
  meta?: {
    version?: string
    category?: string
    tags?: string[]
    compatibility?: string
  }
  optimization?: {
    slowStatePaths?: string[]
    fastStatePaths?: string[]
    maxPatchOperations?: number
    lastSelectionScore?: number
  }
}

export function createSkill<TInput = unknown, TOutput = unknown>(
  skill: EdgeSkill<TInput, TOutput>,
): EdgeSkill<TInput, TOutput> {
  return skill
}

export function skillsToTools(skills: EdgeSkill[]): Record<string, unknown> {
  return skills.reduce((acc, skill) => ({ ...acc, ...(skill.tools ?? {}) }), {})
}
