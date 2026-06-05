import type { NuvaAccessScope, NuvaDataAccess, NuvaPermissionCheckReason, NuvaPermissionCheckResult, NuvaPermissionDecision, NuvaPermissionMatchMode, NuvaPermissionSource, NuvaPermissionState } from '../../../../config'

export type PermissionInput = string | string[]

export type BetterAuthPermissionMap = Record<string, string[]>

export type NuvaPermissionCatalog<TCatalog extends Record<string, string> = Record<string, string>> = Readonly<TCatalog>

export interface PermissionLikeUser {
  roles?: string[]
  permissions?: string[]
  scope?: NuvaAccessScope
  dataAccess?: NuvaDataAccess
  source?: NuvaPermissionSource
}

export function toList(value?: PermissionInput) {
  if (!value) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

export function defineNuvaPermissions<const TCatalog extends Record<string, string>>(catalog: TCatalog): NuvaPermissionCatalog<TCatalog> {
  return catalog
}

export function matchList(owned: string[], required?: PermissionInput, mode: NuvaPermissionMatchMode = 'all') {
  const items = toList(required)

  if (!items.length) {
    return true
  }

  const set = new Set(owned)
  return mode === 'all' ? items.every(item => set.has(item)) : items.some(item => set.has(item))
}

function toDecision(allowed: boolean): NuvaPermissionDecision {
  return allowed ? 'allow' : 'deny'
}

function createCheckResult(decision: NuvaPermissionDecision, reason: NuvaPermissionCheckReason, required: string[], matched: string[], missing: string[], mode: NuvaPermissionMatchMode): NuvaPermissionCheckResult {
  return {
    decision,
    reason,
    required,
    matched,
    missing,
    mode,
  }
}

export function explainList(owned: string[], required?: PermissionInput, mode: NuvaPermissionMatchMode = 'all', reason: NuvaPermissionCheckReason = 'missing-permission') {
  const items = toList(required)

  if (!items.length) {
    return createCheckResult('allow', 'allowed', [], [], [], mode)
  }

  const set = new Set(owned)
  const matched = items.filter(item => set.has(item))
  const missing = items.filter(item => !set.has(item))
  const allowed = mode === 'all' ? missing.length === 0 : matched.length > 0

  return createCheckResult(toDecision(allowed), allowed ? 'allowed' : reason, items, matched, missing, mode)
}

export function resolvePermissionState(user: PermissionLikeUser | null | undefined, fallback: NuvaPermissionState, source: NuvaPermissionSource): NuvaPermissionState {
  return {
    roles: user?.roles ?? fallback.roles,
    permissions: user?.permissions ?? fallback.permissions,
    scope: user?.scope ?? fallback.scope,
    dataAccess: user?.dataAccess ?? fallback.dataAccess,
    source: user?.source ?? source,
  }
}

export function hasPermissionState(value: unknown): value is PermissionLikeUser {
  if (!value || typeof value !== 'object') {
    return false
  }

  const user = value as PermissionLikeUser
  return Array.isArray(user.roles)
    || Array.isArray(user.permissions)
    || Object.keys(user.scope || {}).length > 0
    || !!user.dataAccess?.type
}

export function hasScope(scope: NuvaAccessScope | undefined, required?: PermissionInput, mode: NuvaPermissionMatchMode = 'all') {
  const items = toList(required)

  if (!items.length) {
    return true
  }

  const keys = new Set(Object.entries(scope || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key]) => key))

  return mode === 'all' ? items.every(item => keys.has(item)) : items.some(item => keys.has(item))
}

export function explainScope(scope: NuvaAccessScope | undefined, required?: PermissionInput, mode: NuvaPermissionMatchMode = 'all') {
  const keys = Object.entries(scope || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key]) => key)

  return explainList(keys, required, mode, 'missing-scope')
}

export function toResourcePermission(resource: string, action?: string) {
  return action ? `${resource}:${action}` : resource
}

export function toBetterAuthPermissions(input: PermissionInput): BetterAuthPermissionMap | null {
  return toList(input).reduce<BetterAuthPermissionMap | null>((result, permission) => {
    if (result === null) {
      return null
    }

    const [resource, action] = permission.split(':')

    if (!resource || !action) {
      return null
    }

    result[resource] ||= []
    result[resource].push(action)
    return result
  }, {})
}
