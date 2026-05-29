export type { LanguageModelV3 } from '@ai-sdk/provider'
import { createModelProvider, type ModelProvider } from './cascade'
import { createAgent as createCoreAgent } from './agent'
import type { CreateAgentOptions, EdgeAgent } from './agent'
import type { WebLLMOptions } from './providers/web-llm'
export { stepCountIs, tool, modelOptional } from './tools'
export type { DownloadPolicy, DownloadPromptEvent, ModelProvider, ModelStatusEvent, NoModelEvent, ResolveModelContext } from './cascade'
export { createModelProvider, resolveModel } from './cascade'
export type { CascadeOnboardingOptions, CascadePreference, CascadePreferenceMode, CascadePreferenceStore, CascadeReadinessOptions, CascadeReadinessSnapshot, CascadeRecommendedAction, EdgeCascadeOnboardingController, EdgeCascadeReadinessController } from './cascade/readiness'
export { createCascadeOnboardingController, createCascadeReadinessController } from './cascade/readiness'
export type { AgentEvent, CreateAgentOptions, EdgeAgent, EdgeAgentIdentity, EdgeGroundingMode, EdgeResponseValidationContext, EdgeResponseValidator, EdgeToolRepairOptions } from './agent'
export type { CreateClaimEvidenceOptions, CreateClaimSupportValidatorOptions, EdgeClaimEvidenceHandle, EdgeClaimSupportIssue, EdgeClaimSupportIssueCode, EdgeClaimValidationState, EdgeResponseClaim, EdgeResponseValidationResult, ValidateClaimSupportOptions } from './claims'
export { createClaimEvidence, createClaimSupportValidator, extractClaimEvidenceFromToolResults, validateClaimSupport } from './claims'
export function createAgent(options: CreateAgentOptions): EdgeAgent {
  return createCoreAgent({ ...options, model: options.model ?? [chromeAI(), webLLM()] })
}
export type { WebLLMOptions } from './providers/web-llm'
export function chromeAI(): ModelProvider {
  return createModelProvider({
    id: 'chrome-ai',
    label: 'Chrome AI',
    resolve: async context => {
      const { chromeAI: createChromeAIProvider } = await import('./providers/chrome-ai')
      return createChromeAIProvider().resolve(context)
    },
  })
}

export function webLLM(options: WebLLMOptions = {}): ModelProvider {
  return createModelProvider({
    id: 'webllm',
    label: 'WebLLM',
    resolve: async context => {
      const { webLLM: createWebLLMProvider } = await import('./providers/web-llm')
      return createWebLLMProvider(options).resolve(context)
    },
  })
}
export type { EdgeActivityEvent, EdgeTelemetryEvent, EdgeTelemetrySink } from './telemetry'
export type { EdgeIdentityProvider, EdgeSessionContext, EdgeSessionProvider, EdgeStateProvider, EdgeToolExecutionContext, EdgeToolManifest, EdgeToolProvider, EdgeToolProviderContext } from './context'
export { resolveSessionContext, toolsFromManifests } from './context'

/** @deprecated Use @kevinmarmstrong/edgekit-ui instead. */
export type { EdgeAction, EdgeActionContext, EdgeField, EdgeFieldOption, EdgeViewNode } from './view'
/** @deprecated Use @kevinmarmstrong/edgekit-ui instead. */
export { actionsToEdgeView } from './view'

/** @deprecated Use @kevinmarmstrong/edgekit-skills instead. */
export type { ApplyMissionProfileOptions, EdgeMissionProfile, EdgeProfileValidationIssue, EdgeProfileValidationResult, EdgeSkill, EdgeValidationSeverity, ValidateMissionProfileOptions } from './compat/skills'
/** @deprecated Use @kevinmarmstrong/edgekit-skills instead. */
export { applyMissionProfile, createMissionProfile, createSkill, profileToAgentOptions, skillsToTools, validateMissionProfile } from './compat/skills'

/** @deprecated Use @kevinmarmstrong/edgekit-knowledge instead. */
export type { CreateKnowledgeSkillOptions, CreateKnowledgeToolOptions, CreateMarkdownMemoryStoreOptions, EdgeKnowledgeCitation, EdgeKnowledgeFreshness, EdgeKnowledgeResult, EdgeKnowledgeSearchContext, EdgeKnowledgeSource, EdgeMemoryCompactionContext, EdgeMemoryCompactionResult, EdgeMemoryRecord, EdgeMemorySearchContext, EdgeMemoryStore, EdgeMemorySummarizer, MarkdownMemoryCompactionOptions, MarkdownMemoryDocument } from './compat/knowledge'
/** @deprecated Use @kevinmarmstrong/edgekit-knowledge instead. */
export { createKnowledgeSkill, createKnowledgeTool, createMarkdownMemoryStore } from './compat/knowledge'

/** @deprecated Use @kevinmarmstrong/edgekit-governance instead. */
export type { CreateAuditTrailOptions, CreateOfflineToolOptions, CreatePiiRedactorOptions, EdgeAuditAction, EdgeAuditEntry, EdgeAuditEvent, EdgeAuditTrail, EdgeMutationJournal, EdgeMutationJournalEntry, EdgeMutationStatus, EdgeQueuedMutation, EdgeRedactor, EdgeRedactorContext, ExecuteToolWithPolicyOptions, LocalStorageMutationJournalOptions, MemoryMutationJournalOptions, PiiRedactorPattern, SyncMutationJournalOptions, ToolPolicy, ToolPolicyExecutorOptions } from './compat/governance'
/** @deprecated Use @kevinmarmstrong/edgekit-governance instead. */
export { EdgeToolPolicyError, applyRedactors, createAuditTrail, createLocalStorageMutationJournal, createMemoryMutationJournal, createOfflineTool, createPiiRedactor, createToolPolicyExecutor, executeToolWithPolicy, syncMutationJournal } from './compat/governance'

/** @deprecated Use @kevinmarmstrong/edgekit-mcp instead. */
export type { McpToolClient, McpToolDefinition } from './compat/mcp'
/** @deprecated Use @kevinmarmstrong/edgekit-mcp instead. */
export { loadMcpTools, mcpToolsFromDefinitions } from './compat/mcp'

/** @deprecated Use @kevinmarmstrong/edgekit-agui instead. */
export type { AgUiEvent, AgUiRunInput, CreateAgUiAgentOptions, CreateHandoffEnvelopeOptions, EdgeHandoffEnvelope } from './compat/agui'
/** @deprecated Use @kevinmarmstrong/edgekit-agui instead. */
export { agUiEventToAgentEvents, createHandoffEnvelope } from './compat/agui'
/** @deprecated BREAKING in v0.3.0: endpoint transport was removed from the root export. Use @kevinmarmstrong/edgekit-agui for endpoint-based AG-UI agents, or pass a custom run handler. Root export removal is scheduled for v0.4. */
export { createAgUiAgent } from './compat/agui'

/** @deprecated Not part of the v0.3 public API contract; scheduled for removal in v0.4. */
export type { CascadeActionType, CascadeCapability, CascadeChoiceState, CascadeDisplayMode, CascadeMode, CascadeProviderKind, CascadeProviderSnapshot, CascadeProviderStatus, CascadeReadinessCheckOptions, CascadeReadinessMessages, CascadeVisibilityPolicy } from './cascade/readiness'
/** @deprecated Not part of the v0.3 public API contract; scheduled for removal in v0.4. */
export type { ContextualToolExecute, EdgeAuthContext, EdgeIdentity, EdgePublicIdentity, EdgeStateSnapshot } from './context'
/** @deprecated Not part of the v0.3 public API contract; scheduled for removal in v0.4. */
export type { EdgeTelemetryEventName, MissionControlSnapshot } from './telemetry'
/** @deprecated Use the EdgeTelemetrySink callback directly instead; scheduled for removal in v0.4. */
export { createMissionControl } from './telemetry'
/** @deprecated Not part of the v0.3 public API contract; scheduled for removal in v0.4. */
export type { CreateSupervisorRouterOptions, EdgeModelRouter, HybridModelRoute, ModelRouterContext, SupervisorWorkerRoute } from './compat/routing'
/** @deprecated Use the cascade via resolveModel() for provider routing; scheduled for removal in v0.4. */
export { createHybridModelRouter, createSupervisorRouter } from './compat/routing'
/** @deprecated Not part of the v0.3 public API contract; scheduled for removal in v0.4. */
export type { EdgeCachedResponse, EdgeResponseCache, EdgeResponseCacheContext, EdgeResponseCachePolicy, IndexedDbResponseCacheOptions } from './compat/cache'
/** @deprecated Not part of the v0.3 public API contract; scheduled for removal in v0.4. */
export { createIndexedDbResponseCache, createMemoryResponseCache } from './compat/cache'
/** @deprecated Not part of the v0.3 public API contract; scheduled for removal in v0.4. */
export type { ExecuteParallelToolsOptions, ParallelToolCall, ParallelToolResult } from './compat/parallel'
/** @deprecated Not part of the v0.3 public API contract; scheduled for removal in v0.4. */
export { executeParallelTools } from './compat/parallel'
/** @deprecated Not part of the v0.3 public API contract; scheduled for removal in v0.4. */
export type { EdgeSkillOptimizationCandidate, EdgeSkillOptimizationIssue, EdgeSkillOptimizationValidation, EdgeSkillPatchOperation, EdgeSkillScore, ValidateSkillOptimizationOptions } from './compat/skill-optimization'
/** @deprecated Not part of the v0.3 public API contract; scheduled for removal in v0.4. */
export { summarizeSkillOptimizationScores, validateSkillOptimizationCandidate } from './compat/skill-optimization'
/** @deprecated Use toolsFromManifests() or toolProvider instead; scheduled for removal in v0.4. */
export { filterToolManifestsForSession, withToolContext } from './context'
/** @deprecated Not part of the v0.3 public API contract; scheduled for removal in v0.4. */
export { estimateTokens } from './shared'
