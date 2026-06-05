import type { NuvaPermissionMatchMode } from '../../../../config'
import { toMatchMode, toRecord, toStringList } from './shared'

export interface NuvaRouteAccessMeta {
  roles: string[]
  permissions: string[]
  scopes: string[]
  roleMode?: NuvaPermissionMatchMode
  permissionMode?: NuvaPermissionMatchMode
  forbiddenPath?: string
  requiresAuth: boolean
}

interface RouteAccessSource {
  meta?: unknown
}

function toOptionalString(value: unknown) {
  return typeof value === 'string' && value ? value : undefined
}

export function resolveRouteAccessMeta(route?: RouteAccessSource | null): NuvaRouteAccessMeta {
  const meta = toRecord(route?.meta)
  const authMeta = toRecord(meta.auth)
  const hasAuthObject = !!meta.auth && typeof meta.auth === 'object'

  return {
    roles: toStringList(authMeta.roles),
    permissions: toStringList(authMeta.permissions),
    scopes: toStringList(authMeta.scopes),
    roleMode: toMatchMode(authMeta.roleMode),
    permissionMode: toMatchMode(authMeta.permissionMode),
    forbiddenPath: toOptionalString(authMeta.forbiddenPath),
    requiresAuth: meta.auth === true || hasAuthObject,
  }
}

export function hasRouteAccessMeta(access: Pick<NuvaRouteAccessMeta, 'roles' | 'permissions' | 'scopes'>) {
  return !!(access.roles.length || access.permissions.length || access.scopes.length)
}
