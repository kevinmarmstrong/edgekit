import type { EdgeEvidenceRecord, EdgeResponseValidationContext, EdgeResponseValidator } from './agent'
import { isRecord } from './shared'

export type EdgeClaimValidationState = 'valid' | 'refused'
export type EdgeClaimSupportIssueCode = 'missing-evidence' | 'unknown-evidence' | 'future-evidence'

export interface EdgeClaimEvidenceHandle {
  id: string
  sequence: number
  toolName?: string
  output?: unknown
  label?: string
  metadata?: Record<string, unknown>
}

export interface EdgeResponseClaim {
  id?: string
  text: string
  evidence: string[]
  sequence: number
  metadata?: Record<string, unknown>
}

export interface EdgeClaimSupportIssue {
  code: EdgeClaimSupportIssueCode
  severity: 'blocking'
  message: string
  claimId?: string
  claim: string
  evidenceId?: string
}

export interface EdgeResponseValidationResult {
  state: EdgeClaimValidationState
  blocked: boolean
  text?: string
  refusal?: string
  issues: EdgeClaimSupportIssue[]
  claims?: EdgeResponseClaim[]
  evidence?: EdgeClaimEvidenceHandle[]
  metadata?: Record<string, unknown>
}

export interface ValidateClaimSupportOptions {
  claims: EdgeResponseClaim[]
  evidence: EdgeClaimEvidenceHandle[]
  refusalMessage?: string
}

export interface CreateClaimEvidenceOptions {
  id: string
  sequence?: number
  toolName?: string
  output?: unknown
  label?: string
  metadata?: Record<string, unknown>
}

export type EdgeResponseClaimProvider = (
  context: EdgeResponseValidationContext,
) => EdgeResponseClaim[] | Promise<EdgeResponseClaim[]>

export type EdgeClaimEvidenceProvider = (
  context: EdgeResponseValidationContext,
) => EdgeClaimEvidenceHandle[] | Promise<EdgeClaimEvidenceHandle[]>

export interface CreateClaimSupportValidatorOptions {
  claims: EdgeResponseClaim[] | EdgeResponseClaimProvider
  evidence?: EdgeClaimEvidenceHandle[] | EdgeClaimEvidenceProvider
  refusalMessage?: string | ((result: EdgeResponseValidationResult, context: EdgeResponseValidationContext) => string)
}

export function createClaimEvidence(options: CreateClaimEvidenceOptions): EdgeClaimEvidenceHandle {
  return {
    id: options.id,
    sequence: options.sequence ?? 0,
    toolName: options.toolName,
    output: options.output,
    label: options.label,
    metadata: options.metadata,
  }
}

export function validateClaimSupport(options: ValidateClaimSupportOptions): EdgeResponseValidationResult {
  const evidence = options.evidence.map(record => createClaimEvidence(record))
  const evidenceById = new Map(evidence.map(record => [record.id, record]))
  const issues: EdgeClaimSupportIssue[] = []

  for (const claim of options.claims) {
    const claimSequence = claim.sequence
    if (claim.evidence.length === 0) {
      issues.push({
        code: 'missing-evidence',
        severity: 'blocking',
        claimId: claim.id,
        claim: claim.text,
        message: claimIssueMessage(claim, 'does not attach any evidence handles'),
      })
      continue
    }

    for (const evidenceId of claim.evidence) {
      const priorEvidence = evidenceById.get(evidenceId)
      if (!priorEvidence) {
        issues.push({
          code: 'unknown-evidence',
          severity: 'blocking',
          claimId: claim.id,
          claim: claim.text,
          evidenceId,
          message: claimIssueMessage(claim, `cites unknown evidence handle "${evidenceId}"`),
        })
        continue
      }
      if (priorEvidence.sequence >= claimSequence) {
        issues.push({
          code: 'future-evidence',
          severity: 'blocking',
          claimId: claim.id,
          claim: claim.text,
          evidenceId,
          message: claimIssueMessage(claim, `cites evidence handle "${evidenceId}" that is not prior to the claim`),
        })
      }
    }
  }

  const blocked = issues.length > 0
  return {
    state: blocked ? 'refused' : 'valid',
    blocked,
    refusal: blocked ? options.refusalMessage : undefined,
    text: blocked ? options.refusalMessage : undefined,
    issues,
    claims: options.claims,
    evidence,
  }
}

export function createClaimSupportValidator(options: CreateClaimSupportValidatorOptions): EdgeResponseValidator {
  return async context => {
    const claims = typeof options.claims === 'function'
      ? await options.claims(context)
      : options.claims
    const evidence = options.evidence
      ? (typeof options.evidence === 'function' ? await options.evidence(context) : options.evidence)
      : extractClaimEvidenceFromToolResults(context.toolResults)
    const initialResult = validateClaimSupport({ claims, evidence })
    if (!initialResult.blocked) return initialResult

    const refusal = typeof options.refusalMessage === 'function'
      ? options.refusalMessage(initialResult, context)
      : options.refusalMessage ?? context.agentIdentity?.noEvidenceMessage ?? 'I do not know from the available site/app evidence.'

    return {
      ...initialResult,
      text: refusal,
      refusal,
    }
  }
}

export function extractClaimEvidenceFromToolResults(toolResults: EdgeEvidenceRecord[]): EdgeClaimEvidenceHandle[] {
  const evidence: EdgeClaimEvidenceHandle[] = []
  const seen = new Set<string>()
  const addEvidence = (record: EdgeClaimEvidenceHandle) => {
    if (seen.has(record.id)) return
    seen.add(record.id)
    evidence.push(record)
  }

  toolResults.forEach((result, index) => {
    const sequence = index
    addEvidence(createClaimEvidence({
      id: `${result.toolName}#${index + 1}`,
      sequence,
      toolName: result.toolName,
      output: result.output,
    }))

    for (const id of evidenceIdsFromOutput(result.output)) {
      addEvidence(createClaimEvidence({
        id,
        sequence,
        toolName: result.toolName,
        output: result.output,
      }))
    }
  })

  return evidence
}

function evidenceIdsFromOutput(output: unknown): string[] {
  if (!isRecord(output)) return []
  const ids: string[] = []
  for (const key of ['evidenceId', 'evidenceHandle', 'citation']) {
    const value = output[key]
    if (typeof value === 'string' && value) ids.push(value)
  }

  const evidence = output.evidence
  if (typeof evidence === 'string' && evidence) ids.push(evidence)
  if (Array.isArray(evidence)) {
    for (const item of evidence) {
      if (typeof item === 'string' && item) ids.push(item)
      if (isRecord(item) && typeof item.id === 'string' && item.id) ids.push(item.id)
    }
  }

  return ids
}

function claimIssueMessage(claim: EdgeResponseClaim, problem: string) {
  const id = claim.id ? `Claim "${claim.id}"` : 'Claim'
  return `${id} ${problem}.`
}
