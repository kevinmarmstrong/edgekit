// FROZEN per Phase C compatibility convention: bug fixes only, no behavior changes. Source of truth lives in the matching sibling package when one exists; otherwise this is deprecated DEFER surface.
import type { CreateAgentOptions, EdgeAgentIdentity, EdgeGroundingMode } from '../agent'

export interface EdgeMissionProfile {
  /** Stable identifier for this mission (e.g. "public-catalog-shopping-v1") */
  id: string
  /** Human-readable mission type */
  mission: 'public-catalog-shopping' | 'docs-qa' | 'internal-admin' | 'support-workflow' | string
  /** Version of the profile shape / expectations */
  version: string

  /** The core system instructions for this mission */
  systemPrompt: string

  /** Runtime assistant identity, distinct from the current user/session identity. */
  agentIdentity?: EdgeAgentIdentity

  /** Runtime grounding mode for model and fallback answers. */
  grounding?: EdgeGroundingMode

  /** Tools that are always available for this mission (can still be augmented by toolProvider) */
  tools?: Record<string, unknown>

  /** Names of executable tools this mission expects the host app to register. */
  requiredTools?: string[]

  /** Mission-specific defaults that the sidecar should apply */
  defaults?: Partial<Pick<CreateAgentOptions,
    'toolChoice' | 'downloadPolicy' | 'maxSteps' | 'memoryCompaction' | 'toolRepair' | 'cachePolicy'
  >>

  /** Explicit synthesis / faithfulness rules for this mission (used by harnesses and optional core helpers) */
  synthesis?: {
    /** Attributes that must survive from tool results into the final user-visible answer or UI */
    requiredAttributes?: string[]
    /** Whether the sidecar should prefer terse vs. explicit attribute restatement */
    style?: 'concise' | 'explicit'
  }

  /** Authoring-only safety intent for docs, harnesses, and future runtime helpers. */
  policy?: {
    needsApproval?: boolean
    riskLevel?: 'low' | 'medium' | 'high'
    approvalMessage?: string
  }

  /** Authoring-only UI rendering hints for docs, harnesses, and future runtime helpers. */
  uiAffordances?: {
    preferActionCards?: boolean
    suggestedFields?: string[]
  }

  /** Optional metadata for docs, dev agents, and upgrade tooling */
  meta?: {
    description?: string
    owner?: string
    compatibility?: string // semver range of Edgekit this profile was written against
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
  /**
   * Tool names or tool map that the host app has registered for this profile.
   * When provided, requiredTools are checked against the executable host surface.
   */
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

/**
 * Validate that a Mission Profile is production-shaped before applying it.
 *
 * This is intentionally structural, not opinionated business logic. It catches
 * foot-guns that make sidecars fail at runtime while keeping final authority
 * with the host app.
 */
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

  if (profile.grounding === 'strict' && !executableTools && !hasRequiredTools(profile)) {
    issues.push({
      severity: 'error',
      code: 'strict-grounding-without-tools',
      path: 'grounding',
      message: 'Strict grounding needs executable profile tools or requiredTools metadata so factual answers are backed by host evidence.',
    })
  }

  if (profile.agentIdentity && !profile.agentIdentity.name?.trim()) {
    issues.push({
      severity: 'error',
      code: 'missing-agent-identity-name',
      path: 'agentIdentity.name',
      message: 'Agent identity must include a stable name when provided.',
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

/**
 * Helper to apply a mission profile's defaults into a partial CreateAgentOptions.
 * Apps can still override or layer additional providers on top.
 */
export function profileToAgentOptions(profile: EdgeMissionProfile): Partial<CreateAgentOptions> {
  const result: Partial<CreateAgentOptions> = {
    systemPrompt: profile.systemPrompt,
    ...profile.defaults,
  }

  if (profile.agentIdentity) {
    result.agentIdentity = profile.agentIdentity
  }

  if (profile.grounding) {
    result.grounding = profile.grounding
    if (profile.grounding === 'strict' && result.toolChoice == null && (hasExecutableTools(profile) || hasRequiredTools(profile))) {
      result.toolChoice = 'required'
    }
  }

  // Only include tools if the profile actually provides real executable tools.
  // This prevents empty profile.tools from wiping tools registered via registerTools().
  if (profile.tools && Object.keys(profile.tools).length > 0) {
    result.tools = profile.tools
  }

  return result
}

export interface ApplyMissionProfileOptions {
  warn?: boolean
  logger?: Pick<Console, 'warn'>
}

/**
 * applyMissionProfile
 *
 * Recommended way to apply a Mission Profile safely.
 * It returns a partial config that can be passed to `configure()`.
 *
 * It deliberately avoids overwriting executable tools with empty objects from profiles.
 * This is the safer, higher-level API compared to manually spreading `profileToAgentOptions`.
 */
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

/**
 * EdgeSkill — the packaged, composable unit of agent capability.
 *
 * This is the "skills, not apps" abstraction (in the spirit of Garry Tan's framing).
 *
 * A Skill wraps one or more low-level tools with everything an agent (or another system)
 * needs to decide when and how to use it:
 * - Rich, agent-readable description + examples
 * - Approval / safety posture
 * - Synthesis / faithfulness expectations (what facts must surface to the user)
 * - UI affordance hints (when to render action cards, what fields are natural)
 * - When this skill is appropriate (mission context, user intent signals, etc.)
 *
 * Edgekit core provides the execution runtime.
 * Apps (and future skill marketplaces) own and version Skills.
 * Mission Profiles compose Skills into a localized sidecar experience.
 *
 * This layering is what gives us the ability to move extremely fast underneath
 * (new models, better routing, improved synthesis, MCP evolution, etc.)
 * while giving consumers and other agents a stable, discoverable, composable surface.
 */
export interface EdgeSkill<TInput = unknown, TOutput = unknown> {
  id: string
  name: string
  /**
   * Router-visible surface. Keep this short and precise because skill routers
   * often see only the description before deciding whether to activate a skill.
   */
  description: string

  /**
   * Activated skill body. The agent sees this only after the skill is selected.
   * Keep it compact, procedural, and aligned with the router description.
   */
  instructions?: string

  /** Positive activation examples for routing and harness fixtures. */
  activationExamples?: string[]

  /** Negative activation boundaries; useful for avoiding catch-all skills. */
  doNotActivateWhen?: string[]

  /**
   * Paths/sections that optimizer loops must not change in normal fast-edit
   * mode. Use this for slow-state lessons such as safety invariants, tone, and
   * app-owned authority boundaries.
   */
  protectedSections?: string[]

  /** The underlying executable tool(s). Can be a single tool or a small related set. */
  tools?: Record<string, unknown>

  /** Names of executable tools this skill expects the host app to register. */
  requiredTools?: string[]

  /** Human + agent-facing examples of good usage */
  examples?: Array<{
    input: TInput
    output?: TOutput
    rationale?: string
  }>

  /** How this skill should be treated from a safety / approval perspective */
  policy?: {
    needsApproval?: boolean
    approvalMessage?: string
    riskLevel?: 'low' | 'medium' | 'high'
  }

  /** Guidance on what "good synthesis" looks like when this skill is used */
  synthesis?: {
    requiredFacts?: string[]
    preferredStyle?: 'concise' | 'explicit' | 'narrative'
  }

  /** Hints for the UI layer about how to render results from this skill */
  uiAffordances?: {
    preferActionCards?: boolean
    suggestedFields?: string[]
  }

  /** Optional metadata for discovery, versioning, and marketplaces */
  meta?: {
    version?: string
    category?: string
    tags?: string[]
    compatibility?: string // semver range of Edgekit
  }

  /**
   * Dev-time optimization metadata. Edgekit does not run self-editing loops at
   * inference time; this metadata is for harnesses and authoring tools.
   */
  optimization?: {
    slowStatePaths?: string[]
    fastStatePaths?: string[]
    maxPatchOperations?: number
    lastSelectionScore?: number
  }
}

export function createSkill<TInput = unknown, TOutput = unknown>(
  skill: EdgeSkill<TInput, TOutput>
): EdgeSkill<TInput, TOutput> {
  return skill
}

/**
 * Helper to extract just the tool definitions from a set of skills.
 * Useful when wiring skills into a Mission Profile or directly into configure().
 */
export function skillsToTools(skills: EdgeSkill[]): Record<string, unknown> {
  return skills.reduce((acc, skill) => ({ ...acc, ...(skill.tools ?? {}) }), {})
}
