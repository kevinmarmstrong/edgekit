import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const root = process.cwd()
const sourcePath = path.join(root, 'packages/core/src/index.ts')
const outDir = path.join(root, 'docs/v3.5')
const csvPath = path.join(outDir, 'core-export-inventory.csv')
const summaryPath = path.join(outDir, 'core-export-classification-summary.md')
const adrPath = path.join(root, 'docs/adrs/core-runtime-capabilities.md')

const sourceText = fs.readFileSync(sourcePath, 'utf8')
const sourceFile = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true)
const lineStarts = sourceFile.getLineStarts()

const runtimeCapabilities = new Set([
  'createAgent',
  'chromeAI',
  'webLLM',
  'createModelProvider',
  'resolveModel',
  'createCascadeReadinessController',
  'tool',
  'stepCountIs',
  'modelOptional',
  'resolveSessionContext',
])

const keepCore = new Set([
  'LanguageModelV3',
  'DownloadPolicy',
  'ModelStatusEvent',
  'DownloadPromptEvent',
  'NoModelEvent',
  'EdgeSessionContext',
  'EdgeSessionProvider',
  'EdgeIdentityProvider',
  'EdgeStateProvider',
  'EdgeToolExecutionContext',
  'EdgeToolManifest',
  'EdgeToolProviderContext',
  'EdgeToolProvider',
  'EdgeTelemetryEvent',
  'EdgeTelemetrySink',
  'ModelProvider',
  'ResolveModelContext',
  'CascadeRecommendedAction',
  'CascadeReadinessSnapshot',
  'CascadeReadinessOptions',
  'EdgeCascadeReadinessController',
  'AgentEvent',
  'EdgeActivityEvent',
  'CreateAgentOptions',
  'EdgeAgentIdentity',
  'EdgeGroundingMode',
  'EdgeToolRepairOptions',
  'EdgeAgent',
  'WebLLMOptions',
  'toolsFromManifests',
  ...runtimeCapabilities,
])

const keepSibling = new Set([
  'EdgeFieldOption',
  'EdgeField',
  'EdgeAction',
  'EdgeActionContext',
  'EdgeViewNode',
  'actionsToEdgeView',
  'EdgeMemoryRecord',
  'EdgeMemorySearchContext',
  'EdgeMemoryStore',
  'EdgeKnowledgeCitation',
  'EdgeKnowledgeResult',
  'EdgeKnowledgeSearchContext',
  'EdgeKnowledgeFreshness',
  'EdgeKnowledgeSource',
  'CreateKnowledgeToolOptions',
  'CreateKnowledgeSkillOptions',
  'MarkdownMemoryDocument',
  'CreateMarkdownMemoryStoreOptions',
  'EdgeMemoryCompactionContext',
  'EdgeMemoryCompactionResult',
  'EdgeMemorySummarizer',
  'MarkdownMemoryCompactionOptions',
  'EdgeRedactorContext',
  'EdgeRedactor',
  'PiiRedactorPattern',
  'CreatePiiRedactorOptions',
  'EdgeAuditAction',
  'EdgeAuditEvent',
  'EdgeAuditEntry',
  'EdgeAuditTrail',
  'EdgeHandoffEnvelope',
  'CreateHandoffEnvelopeOptions',
  'EdgeMutationStatus',
  'EdgeQueuedMutation',
  'EdgeMutationJournalEntry',
  'EdgeMutationJournal',
  'MemoryMutationJournalOptions',
  'LocalStorageMutationJournalOptions',
  'CreateOfflineToolOptions',
  'SyncMutationJournalOptions',
  'ToolPolicy',
  'ToolPolicyExecutorOptions',
  'ExecuteToolWithPolicyOptions',
  'EdgeToolPolicyError',
  'EdgeMissionProfile',
  'createMissionProfile',
  'EdgeValidationSeverity',
  'EdgeProfileValidationIssue',
  'EdgeProfileValidationResult',
  'ValidateMissionProfileOptions',
  'validateMissionProfile',
  'profileToAgentOptions',
  'ApplyMissionProfileOptions',
  'applyMissionProfile',
  'EdgeSkill',
  'createSkill',
  'skillsToTools',
  'createKnowledgeTool',
  'createKnowledgeSkill',
  'AgUiEvent',
  'AgUiRunInput',
  'CreateAgUiAgentOptions',
  'agUiEventToAgentEvents',
  'createAgUiAgent',
  'createMarkdownMemoryStore',
  'createHandoffEnvelope',
  'createMemoryMutationJournal',
  'createLocalStorageMutationJournal',
  'createOfflineTool',
  'syncMutationJournal',
  'createToolPolicyExecutor',
  'executeToolWithPolicy',
  'applyRedactors',
  'createPiiRedactor',
  'CreateAuditTrailOptions',
  'createAuditTrail',
  'McpToolDefinition',
  'McpToolClient',
  'mcpToolsFromDefinitions',
  'loadMcpTools',
])

const defer = new Set([
  'ModelStatus',
  'EdgeIdentity',
  'EdgePublicIdentity',
  'EdgeAuthContext',
  'EdgeStateSnapshot',
  'ContextualToolExecute',
  'EdgeTelemetryEventName',
  'ModelRouterContext',
  'EdgeModelRouter',
  'HybridModelRoute',
  'SupervisorWorkerRoute',
  'CreateSupervisorRouterOptions',
  'MissionControlSnapshot',
  'ResolvedModel',
  'CascadeCapability',
  'CascadeProviderStatus',
  'CascadeMode',
  'CascadeActionType',
  'CascadeVisibilityPolicy',
  'CascadeProviderSnapshot',
  'CascadeReadinessMessages',
  'CascadeReadinessCheckOptions',
  'EdgeCachedResponse',
  'EdgeResponseCache',
  'EdgeResponseCacheContext',
  'EdgeResponseCachePolicy',
  'IndexedDbResponseCacheOptions',
  'ParallelToolCall',
  'ParallelToolResult',
  'ExecuteParallelToolsOptions',
  'EdgeSkillPatchOperation',
  'EdgeSkillOptimizationCandidate',
  'ValidateSkillOptimizationOptions',
  'EdgeSkillOptimizationIssue',
  'EdgeSkillOptimizationValidation',
  'validateSkillOptimizationCandidate',
  'EdgeSkillScore',
  'summarizeSkillOptimizationScores',
  'createHybridModelRouter',
  'createSupervisorRouter',
  'estimateTokens',
  'createMemoryResponseCache',
  'createIndexedDbResponseCache',
  'executeParallelTools',
  'createMissionControl',
  'filterToolManifestsForSession',
  'withToolContext',
])

const cut = new Set([])

const siblingPackage = new Map([
  ['EdgeFieldOption', 'ui'],
  ['EdgeField', 'ui'],
  ['EdgeAction', 'ui'],
  ['EdgeActionContext', 'ui'],
  ['EdgeViewNode', 'ui'],
  ['actionsToEdgeView', 'ui'],
  ['EdgeMemoryRecord', 'knowledge'],
  ['EdgeMemorySearchContext', 'knowledge'],
  ['EdgeMemoryStore', 'knowledge'],
  ['EdgeKnowledgeCitation', 'knowledge'],
  ['EdgeKnowledgeResult', 'knowledge'],
  ['EdgeKnowledgeSearchContext', 'knowledge'],
  ['EdgeKnowledgeFreshness', 'knowledge'],
  ['EdgeKnowledgeSource', 'knowledge'],
  ['CreateKnowledgeToolOptions', 'knowledge'],
  ['CreateKnowledgeSkillOptions', 'knowledge'],
  ['MarkdownMemoryDocument', 'knowledge'],
  ['CreateMarkdownMemoryStoreOptions', 'knowledge'],
  ['EdgeMemoryCompactionContext', 'knowledge'],
  ['EdgeMemoryCompactionResult', 'knowledge'],
  ['EdgeMemorySummarizer', 'knowledge'],
  ['MarkdownMemoryCompactionOptions', 'knowledge'],
  ['createKnowledgeTool', 'knowledge'],
  ['createKnowledgeSkill', 'knowledge'],
  ['createMarkdownMemoryStore', 'knowledge'],
  ['EdgeRedactorContext', 'governance'],
  ['EdgeRedactor', 'governance'],
  ['PiiRedactorPattern', 'governance'],
  ['CreatePiiRedactorOptions', 'governance'],
  ['EdgeAuditAction', 'governance'],
  ['EdgeAuditEvent', 'governance'],
  ['EdgeAuditEntry', 'governance'],
  ['EdgeAuditTrail', 'governance'],
  ['EdgeMutationStatus', 'governance'],
  ['EdgeQueuedMutation', 'governance'],
  ['EdgeMutationJournalEntry', 'governance'],
  ['EdgeMutationJournal', 'governance'],
  ['MemoryMutationJournalOptions', 'governance'],
  ['LocalStorageMutationJournalOptions', 'governance'],
  ['CreateOfflineToolOptions', 'governance'],
  ['SyncMutationJournalOptions', 'governance'],
  ['ToolPolicy', 'governance'],
  ['ToolPolicyExecutorOptions', 'governance'],
  ['ExecuteToolWithPolicyOptions', 'governance'],
  ['EdgeToolPolicyError', 'governance'],
  ['createMemoryMutationJournal', 'governance'],
  ['createLocalStorageMutationJournal', 'governance'],
  ['createOfflineTool', 'governance'],
  ['syncMutationJournal', 'governance'],
  ['createToolPolicyExecutor', 'governance'],
  ['executeToolWithPolicy', 'governance'],
  ['applyRedactors', 'governance'],
  ['createPiiRedactor', 'governance'],
  ['CreateAuditTrailOptions', 'governance'],
  ['createAuditTrail', 'governance'],
  ['EdgeMissionProfile', 'skills'],
  ['createMissionProfile', 'skills'],
  ['EdgeValidationSeverity', 'skills'],
  ['EdgeProfileValidationIssue', 'skills'],
  ['EdgeProfileValidationResult', 'skills'],
  ['ValidateMissionProfileOptions', 'skills'],
  ['validateMissionProfile', 'skills'],
  ['profileToAgentOptions', 'skills'],
  ['ApplyMissionProfileOptions', 'skills'],
  ['applyMissionProfile', 'skills'],
  ['EdgeSkill', 'skills'],
  ['createSkill', 'skills'],
  ['skillsToTools', 'skills'],
  ['AgUiEvent', 'agui'],
  ['AgUiRunInput', 'agui'],
  ['CreateAgUiAgentOptions', 'agui'],
  ['agUiEventToAgentEvents', 'agui'],
  ['createAgUiAgent', 'agui'],
  ['EdgeHandoffEnvelope', 'agui'],
  ['CreateHandoffEnvelopeOptions', 'agui'],
  ['createHandoffEnvelope', 'agui'],
  ['McpToolDefinition', 'mcp'],
  ['McpToolClient', 'mcp'],
  ['mcpToolsFromDefinitions', 'mcp'],
  ['loadMcpTools', 'mcp'],
])

const coreAdr = new Map([
  ['createAgent', 'Absorbs the wiring friction of provider cascade, tools, approvals, telemetry, history, and context so adopters do not rebuild an unsafe mini-orchestrator for every app.'],
  ['chromeAI', 'Absorbs Chrome AI availability and gesture-state friction so adopters do not expose raw browser API failures or skip the zero-marginal-cost path.'],
  ['webLLM', 'Absorbs WebGPU/WebLLM provider setup friction so adopters can offer a browser fallback without learning model registry and worker details first.'],
  ['createModelProvider', 'Absorbs provider-normalization friction so adopters can plug AI SDK-compatible models into the same cascade contract instead of special-casing every runtime.'],
  ['resolveModel', 'Absorbs cascade fallthrough friction so each app does not reimplement local-first routing, status callbacks, and no-model behavior.'],
  ['LanguageModelV3', 'Absorbs provider typing friction for custom AI SDK-compatible model routes without forcing adopters to import an extra provider type directly.'],
  ['ResolveModelContext', 'Absorbs provider-resolution context friction so custom providers receive bounded input, status emission, timeout, and session state consistently.'],
  ['toolsFromManifests', 'Absorbs manifest-to-tool hydration friction for dynamic tool exposure while keeping executable tool registration explicit.'],
  ['createCascadeReadinessController', 'Absorbs end-user readiness/download-state friction so apps can show the right action for Chrome AI, WebLLM, server, or no-model states.'],
  ['tool', 'Absorbs tool-shape compatibility friction by re-exporting the AI SDK primitive adopters already need, avoiding an Edgekit-specific tool format.'],
  ['stepCountIs', 'Absorbs AI SDK loop-control import friction for the common bounded tool-loop path without wrapping or replacing AI SDK orchestration.'],
  ['modelOptional', 'Absorbs small local-model schema brittleness around optional/nullish fields so adopters do not loosen schemas unsafely across every tool.'],
  ['resolveSessionContext', 'Absorbs identity/state/session bridging friction so host apps pass public context into tool execution without leaking secrets into prompts.'],
  ['DownloadPolicy', 'Absorbs the product decision of whether model downloads are automatic, prompted, or forbidden so every integration does not invent its own consent switch.'],
  ['ModelStatusEvent', 'Absorbs provider-readiness event shape friction so host UIs and telemetry receive one status contract across Chrome AI, WebLLM, server, and no-model states.'],
  ['DownloadPromptEvent', 'Absorbs model-download consent payload friction so host apps can use custom modals without reverse-engineering provider IDs, model sizes, or copy.'],
  ['NoModelEvent', 'Absorbs graceful-degradation payload friction so apps can explain basic/no-model mode without surfacing WebGPU or browser API failures.'],
  ['EdgeSessionContext', 'Absorbs the host-authority boundary by grouping public identity, auth transport, and state summary into one tool-execution context object.'],
  ['EdgeSessionProvider', 'Absorbs async session hydration friction so adopters can bridge their existing auth/session layer into Edgekit without putting secrets in prompts.'],
  ['EdgeIdentityProvider', 'Absorbs public-identity bridging friction for apps that expose roles or permissions separately from a full session provider.'],
  ['EdgeStateProvider', 'Absorbs page/workflow-state hydration friction so tools receive concise app state without raw DOM dumps or model-owned authority.'],
  ['EdgeToolExecutionContext', 'Absorbs governed tool-execution friction by carrying session, identity, auth, state, and cancellation metadata to host-owned tools.'],
  ['EdgeToolManifest', 'Absorbs dynamic tool exposure metadata friction so apps can describe tool permissions and safety without making every tool executable upfront.'],
  ['EdgeToolProviderContext', 'Absorbs phase-aware tool selection friction so dynamic tool providers can narrow tools by prompt, session, and run phase.'],
  ['EdgeToolProvider', 'Absorbs dynamic tool exposure friction so apps can hydrate read and mutation tools only when intent, role, and workflow state justify them.'],
  ['EdgeTelemetryEvent', 'Absorbs observability payload friction by giving adopters one typed event shape for runs, model choice, tools, approvals, errors, and UI actions.'],
  ['EdgeTelemetrySink', 'Absorbs monitoring-integration friction by letting adopters route Edgekit events to PostHog, OpenTelemetry, Datadog, or custom stores through one contract.'],
  ['ModelProvider', 'Absorbs custom-provider adapter friction by defining the one wrapper shape required to participate in the local-first cascade.'],
  ['CascadeRecommendedAction', 'Absorbs end-user next-action copy/control friction so UIs can show prompt, fallback, retry, or hide decisions from the readiness controller.'],
  ['CascadeReadinessSnapshot', 'Absorbs browser-model readiness-state friction by giving UIs a single snapshot for provider states, capabilities, missing requirements, and allowed actions.'],
  ['CascadeReadinessOptions', 'Absorbs readiness-controller configuration friction so apps can declare providers, required capabilities, fallback policy, and UI callbacks in one object.'],
  ['EdgeCascadeReadinessController', 'Absorbs ongoing readiness orchestration friction by exposing check, subscribe, prompt, fallback, hide, and retry controls as a stable controller.'],
  ['AgentEvent', 'Absorbs agent-to-UI streaming friction by exposing one event union for status, text, tool calls/results, approvals, activity, views, errors, and done.'],
  ['EdgeActivityEvent', 'Absorbs progress-state UI friction by exposing safe orchestration activity without leaking hidden reasoning or chain-of-thought.'],
  ['CreateAgentOptions', 'Absorbs integration-wiring friction by collecting model cascade, tools, providers, policy, context, telemetry, and callbacks into one entry-point contract.'],
  ['EdgeAgentIdentity', 'Absorbs assistant-identity configuration friction so public agents do not inherit model-provider self descriptions or force adopters to hide identity rules in prompts.'],
  ['EdgeGroundingMode', 'Absorbs answer-grounding policy friction by giving adopters one runtime switch for strict evidence-first answers instead of hand-rolling tool-choice and validation rules.'],
  ['EdgeToolRepairOptions', 'Absorbs bounded tool-repair configuration friction so validation retries stay explicit and limited instead of becoming hidden self-repair loops.'],
  ['EdgeAgent', 'Absorbs UI/runtime boundary friction by exposing send, approval-resume, and reset as the small agent contract web components and wrappers consume.'],
  ['WebLLMOptions', 'Absorbs WebLLM provider selection friction by making model ID and label configurable without exposing the underlying runtime setup.'],
])

function lineAndCol(pos) {
  const line = sourceFile.getLineAndCharacterOfPosition(pos).line + 1
  const col = sourceFile.getLineAndCharacterOfPosition(pos).character + 1
  return { line, col }
}

function nodeLines(node) {
  const start = lineAndCol(node.getStart(sourceFile)).line
  const end = lineAndCol(node.getEnd()).line
  return { start, end, count: Math.max(1, end - start + 1) }
}

function exportedNames() {
  const rows = []
  for (const node of sourceFile.statements) {
    const isExported = node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword)
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const element of node.exportClause.elements) {
        const { start, end, count } = nodeLines(node)
        rows.push({
          name: element.name.text,
          kind: node.isTypeOnly ? 'type-reexport' : 're-export',
          declaredLine: start,
          declarationEndLine: end,
          declarationLines: count,
        })
      }
      continue
    }
    if (!isExported) continue
    let name
    let kind
    if (ts.isFunctionDeclaration(node)) {
      name = node.name?.text
      kind = 'function'
    } else if (ts.isClassDeclaration(node)) {
      name = node.name?.text
      kind = 'class'
    } else if (ts.isInterfaceDeclaration(node)) {
      name = node.name.text
      kind = 'interface'
    } else if (ts.isTypeAliasDeclaration(node)) {
      name = node.name.text
      kind = 'type'
    }
    if (!name) continue
    const { start, end, count } = nodeLines(node)
    rows.push({
      name,
      kind,
      declaredLine: start,
      declarationEndLine: end,
      declarationLines: count,
    })
  }
  return rows.sort((a, b) => a.declaredLine - b.declaredLine || a.name.localeCompare(b.name))
}

function shouldScan(file) {
  if (!/\.(ts|tsx|js|jsx|mjs|cjs|html)$/.test(file)) return false
  const ignored = [
    '/node_modules/',
    '/dist/',
    '/.git/',
    '/research-results/',
    '/test-results/',
    '/lab/',
  ]
  return !ignored.some((part) => file.includes(part))
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.git', 'research-results', 'test-results', 'lab'].includes(entry.name)) continue
      walk(full, files)
    } else if (shouldScan(full)) {
      files.push(full)
    }
  }
  return files
}

const scanFiles = walk(root).filter((file) => file !== sourcePath && file !== import.meta.filename)
  .filter((file) => path.relative(root, file) !== 'scripts/check-v35-constraints.mjs')

function callSites(name) {
  const pattern = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')
  const hits = []
  for (const file of scanFiles) {
    const text = fs.readFileSync(file, 'utf8')
    const matches = [...text.matchAll(pattern)]
    if (matches.length) {
      hits.push({
        file: path.relative(root, file),
        count: matches.length,
      })
    }
  }
  return hits
}

function classify(name) {
  if (cut.has(name)) return 'CUT'
  if (keepCore.has(name)) return 'KEEP-CORE'
  if (keepSibling.has(name)) return 'KEEP-SIBLING'
  if (defer.has(name)) return 'DEFER'
  return 'DEFER'
}

function rationale(name, verdict) {
  if (verdict === 'KEEP-CORE') {
    if (coreAdr.has(name)) return coreAdr.get(name)
    throw new Error(`Missing KEEP-CORE ADR note for ${name}`)
  }
  if (verdict === 'KEEP-SIBLING') {
    return `Real adopter value for the ${siblingPackage.get(name) ?? 'sibling'} cohort, but optional enough to live outside the harness core with compatibility re-exports during extraction.`
  }
  if (verdict === 'CUT') return 'No current production friction survives the v3.5 friction-absorption test.'
  return 'Does not clearly land as v3.5 core adopter friction; defer until measured adopter demand or collapse into an existing core/sibling contract.'
}

function csvEscape(value) {
  const text = String(value ?? '')
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

const rows = exportedNames().map((row) => {
  const hits = callSites(row.name)
  const verdict = classify(row.name)
  return {
    ...row,
    callSiteCount: hits.reduce((sum, hit) => sum + hit.count, 0),
    consumerFiles: hits.map((hit) => `${hit.file}:${hit.count}`).join('; '),
    verdict,
    targetPackage: verdict === 'KEEP-CORE' ? 'core' : verdict === 'KEEP-SIBLING' ? siblingPackage.get(row.name) ?? 'sibling' : '',
    frictionAbsorbed: rationale(row.name, verdict),
    adrNote: verdict === 'KEEP-CORE' ? rationale(row.name, verdict) : '',
  }
})

fs.mkdirSync(outDir, { recursive: true })
fs.mkdirSync(path.dirname(adrPath), { recursive: true })

const columns = [
  'name',
  'kind',
  'declaredLine',
  'declarationEndLine',
  'declarationLines',
  'callSiteCount',
  'consumerFiles',
  'verdict',
  'targetPackage',
  'frictionAbsorbed',
  'adrNote',
]

const csv = [
  columns.join(','),
  ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(',')),
].join('\n')
fs.writeFileSync(csvPath, `${csv}\n`)

const counts = rows.reduce((acc, row) => {
  acc[row.verdict] = (acc[row.verdict] ?? 0) + 1
  return acc
}, {})

const byPackage = rows.reduce((acc, row) => {
  if (row.verdict !== 'KEEP-SIBLING') return acc
  const target = row.targetPackage || 'sibling'
  acc[target] = (acc[target] ?? 0) + 1
  return acc
}, {})

const summary = `Audience: contributor

# v3.5 Core Export Classification Summary

Generated by \`node scripts/v35-export-inventory.mjs\` from \`packages/core/src/index.ts\`.

## Counts

| Verdict | Count |
|---|---:|
${Object.entries(counts).sort().map(([verdict, count]) => `| ${verdict} | ${count} |`).join('\n')}

## Sibling Targets

| Target package | Export count |
|---|---:|
${Object.entries(byPackage).sort().map(([target, count]) => `| ${target} | ${count} |`).join('\n')}

## Notes

- This is an evidence artifact for the root package export surface, including deprecated compatibility exports.
- Phase A was a public API audit; Phase B extracted sibling packages; Phase C split core into focused modules while keeping source-local compatibility exports to avoid core -> sibling package cycles.
- Internal implementation CUT work is tracked separately from public export classification. Phase D removed the core legacy AG-UI SSE parser, custom message mutation sites, and the hand-rolled tool-repair retry loop.
- Call-site counts scan workspace source/test/demo files and exclude \`node_modules\`, \`dist\`, \`research-results\`, \`test-results\`, and \`lab\`.
- KEEP-SIBLING exports now have sibling package homes and remain available from \`@kevinmarmstrong/edgekit\` only as deprecated compatibility surface.
- Every compatibility export should carry JSDoc: \`@deprecated Use @kevinmarmstrong/edgekit-{sibling} instead.\` Track removal for v0.4 or the next planned breaking release in \`CHANGELOG.md\`.
- DEFER exports are not part of the v0.3 public API contract. Any temporary survivor must be marked \`@deprecated\` and scheduled for removal.
- Phase C removed two former DEFER detail exports from the root surface: \`ModelStatus\` and \`ResolvedModel\`.
- Phase D removed the core legacy AG-UI SSE parser and replaced the hand-rolled tool-repair retry loop with AI SDK \`experimental_repairToolCall\`. The permanent core banned-pattern check is \`node scripts/check-core-banned-patterns.mjs\`.
`
fs.writeFileSync(summaryPath, summary)

const adrRows = rows.filter((row) => row.verdict === 'KEEP-CORE')
const zeroCallKeepCore = adrRows
  .filter((row) => row.callSiteCount === 0)
  .map((row) => `- \`${row.name}\`: kept because it is a consumer-facing TypeScript contract even though current workspace consumers reach it through exported signatures or configuration shapes.`)
  .join('\n')
const adr = `Audience: contributor

# Core Runtime Capability ADR Notes

These one-line ADR notes apply the v3.5 friction-absorption test to every KEEP-CORE export in \`packages/core/src/index.ts\`.

| Export | ADR note |
|---|---|
${adrRows.map((row) => `| \`${row.name}\` | ${row.adrNote.replace(/\|/g, '\\|')} |`).join('\n')}

## Zero-Callsite KEEP-CORE Notes

${zeroCallKeepCore || 'None.'}
`
fs.writeFileSync(adrPath, adr)

console.log(`Wrote ${rows.length} exports to ${path.relative(root, csvPath)}`)
console.log(`Wrote summary to ${path.relative(root, summaryPath)}`)
console.log(`Wrote ADR notes to ${path.relative(root, adrPath)}`)
