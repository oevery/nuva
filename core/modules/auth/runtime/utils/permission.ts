import type { NuvaAccessScope, NuvaDataAccess, NuvaPermissionMatchMode, NuvaPermissionSource, NuvaPermissionState } from '../../../../config'

export type PermissionInput = string | string[]

export type BetterAuthPermissionMap = Record<string, string[]>

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

export function matchList(owned: string[], required?: PermissionInput, mode: NuvaPermissionMatchMode = 'all') {
  const items = toList(required)

  if (!items.length) {
    return true
  }

  const set = new Set(owned)
  return mode === 'all' ? items.every(item => set.has(item)) : items.some(item => set.has(item))
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
