import { isRecord } from './shared'

export interface EdgeIdentity {
  id: string
  tenantId?: string
  roles?: string[]
  permissions?: string[]
  claims?: Record<string, unknown>
}

export interface EdgePublicIdentity {
  id: string
  tenantId?: string
  roles: string[]
  permissions: string[]
}

export interface EdgeAuthContext {
  headers?: Record<string, string>
  credentials?: RequestCredentials
}

export interface EdgeStateSnapshot {
  route?: string
  view?: string
  summary: string
  data?: Record<string, unknown>
}

export interface EdgeSessionContext {
  identity?: EdgeIdentity
  auth?: EdgeAuthContext
  state?: EdgeStateSnapshot
}

export type EdgeSessionProvider = () => EdgeSessionContext | Promise<EdgeSessionContext>
export type EdgeIdentityProvider = () => EdgeIdentity | null | undefined | Promise<EdgeIdentity | null | undefined>
export type EdgeStateProvider = () => EdgeStateSnapshot | null | undefined | Promise<EdgeStateSnapshot | null | undefined>

export interface EdgeToolExecutionContext {
  session: EdgeSessionContext
  identity?: EdgeIdentity
  auth?: EdgeAuthContext
  state?: EdgeStateSnapshot
  signal?: AbortSignal
}

export type ContextualToolExecute = (input: Record<string, unknown>, context: EdgeToolExecutionContext) => unknown | Promise<unknown>

export interface EdgeToolManifest {
  name: string
  tool: unknown
  description?: string
  roles?: string[]
  permissions?: string[]
  readOnly?: boolean
  parallelSafe?: boolean
  offlineCapable?: boolean
  syncPolicy?: 'online-only' | 'queue-when-offline'
  conflictPolicy?: 'host-review' | 'last-write-wins' | 'custom'
}

export interface EdgeToolProviderContext {
  session: EdgeSessionContext
  input: string
  phase: 'send' | 'approval'
}

export type EdgeToolProvider = (
  context: EdgeToolProviderContext,
) => Record<string, unknown> | Promise<Record<string, unknown>>

export function filterToolManifestsForSession(manifests: EdgeToolManifest[], session: EdgeSessionContext): EdgeToolManifest[] {
  return manifests.filter(manifest => canUseTool(manifest, session.identity))
}

export function toolsFromManifests(manifests: EdgeToolManifest[]): Record<string, unknown> {
  return Object.fromEntries(manifests.map(manifest => [manifest.name, manifest.tool]))
}

export async function resolveSessionContext(options: {
  sessionProvider?: EdgeSessionProvider
  identityProvider?: EdgeIdentityProvider
  stateProvider?: EdgeStateProvider
}): Promise<EdgeSessionContext> {
  const provided = await options.sessionProvider?.()
  const identity = await options.identityProvider?.()
  const state = await options.stateProvider?.()
  return {
    ...(provided ?? {}),
    identity: identity ?? provided?.identity,
    state: state ?? provided?.state,
  }
}

export function withToolContext(tools: Record<string, unknown>, context: EdgeToolExecutionContext): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(tools).map(([name, candidate]) => {
      if (!isRecord(candidate) || typeof candidate.execute !== 'function') return [name, candidate]
      return [
        name,
        {
          ...candidate,
          execute: (input: Record<string, unknown>) =>
            (candidate.execute as ContextualToolExecute)(input, context),
        },
      ]
    }),
  )
}

export function publicIdentity(identity: EdgeIdentity | undefined): EdgePublicIdentity | undefined {
  if (!identity) return undefined
  return {
    id: identity.id,
    tenantId: identity.tenantId,
    roles: identity.roles ?? [],
    permissions: identity.permissions ?? [],
  }
}

function canUseTool(manifest: EdgeToolManifest, identity: EdgeIdentity | undefined) {
  const roles = identity?.roles ?? []
  const permissions = identity?.permissions ?? []
  const roleAllowed = !manifest.roles?.length || manifest.roles.some(role => roles.includes(role))
  const permissionAllowed =
    !manifest.permissions?.length || manifest.permissions.every(permission => permissions.includes(permission))
  return roleAllowed && permissionAllowed
}
