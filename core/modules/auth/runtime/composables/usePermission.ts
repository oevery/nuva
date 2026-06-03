import type { NuvaPermissionDecision, NuvaPermissionMatchMode, NuvaPermissionState } from '../../../../config'
import { useNuvaConfig } from '../../../nuva/runtime/composables/useNuvaConfig'
import { matchList, hasScope as matchScope, resolvePermissionState, toBetterAuthPermissions, toResourcePermission } from '../utils/permission'
import { fetchRemotePermission, toPermissionState } from '../utils/remote'
import { useBetterAuth } from './useBetterAuth'
import { useBetterAuthSession } from './useBetterAuthSession'
import { useNuvaAuthResolvers } from './useNuvaAuthResolvers'
import { usePermissionState } from './usePermissionState'
import { useTokenAuth } from './useTokenAuth'

interface BetterAuthOrganizationClient {
  hasPermission?: (payload: { permissions: Record<string, string[]> }) => Promise<{ data?: boolean } | boolean>
  checkRolePermission?: (payload: { role: string, permissions: Record<string, string[]> }) => boolean
}

type PermissionCheckDecision = 'allow' | 'deny' | 'unknown'

function warnInvalidPermissionArray(apiName: string, permission: string | string[]) {
  if (!import.meta.dev || !Array.isArray(permission)) {
    return
  }

  console.warn(`[nuva/auth] ${apiName}() expects a single permission. Received an array and will use the first item. Use any()/all() for grouped checks.`, permission)
}

function pickFirstPermission(permission: string | string[]) {
  if (Array.isArray(permission)) {
    return permission[0] || ''
  }

  return permission
}

function resolveBetterAuthPermissionResult(result: { data?: boolean } | boolean) {
  return typeof result === 'boolean' ? result : !!result.data
}

function toDecision(allowed: boolean): NuvaPermissionDecision {
  return allowed ? 'allow' : 'deny'
}

function combineDecisions(decisions: PermissionCheckDecision[], mode: NuvaPermissionMatchMode): PermissionCheckDecision {
  if (!decisions.length) {
    return 'allow'
  }

  if (mode === 'any') {
    if (decisions.includes('allow')) {
      return 'allow'
    }

    return decisions.includes('unknown') ? 'unknown' : 'deny'
  }

  if (decisions.includes('deny')) {
    return 'deny'
  }

  return decisions.includes('unknown') ? 'unknown' : 'allow'
}

function isRemoteSource(source: string) {
  return source === 'remote' || source === 'hybrid'
}

function isBetterAuthSource(source: string) {
  return source === 'better-auth'
}

function isFresh(timestamp: number, maxAge: number) {
  return maxAge > 0 && timestamp > 0 && Date.now() - timestamp < maxAge
}

function createEmptyPermissionState(source: NuvaPermissionState['source']): NuvaPermissionState {
  return {
    roles: [],
    permissions: [],
    scope: {},
    dataAccess: { type: 'self' },
    source,
  }
}

function toRoleList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean)
  }

  return typeof value === 'string' && value ? [value] : []
}

function createBetterAuthPermissionState(session: ReturnType<typeof useBetterAuthSession>): NuvaPermissionState {
  const activeMember = session.activeMember.value as { role?: string | string[] } | null
  const activeOrganization = session.activeOrganization.value as { id?: string, slug?: string } | null

  return {
    roles: toRoleList(activeMember?.role),
    permissions: [],
    scope: {
      organizationId: activeOrganization?.id,
      organizationSlug: activeOrganization?.slug,
    },
    dataAccess: { type: 'self' },
    source: 'better-auth',
  }
}

export function usePermission<TUser extends Partial<NuvaPermissionState> = Partial<NuvaPermissionState>>() {
  const config = useNuvaConfig().auth
  const resolvers = useNuvaAuthResolvers()
  const tokenAuth = useTokenAuth<TUser>()
  const permissionState = usePermissionState()
  const isBetterAuthProvider = config.provider === 'better-auth'
  const betterAuthSession = isBetterAuthProvider || config.permission.source === 'better-auth' ? useBetterAuthSession() : undefined

  const state = computed(() => {
    if (config.permission.source === 'better-auth' && betterAuthSession) {
      return createBetterAuthPermissionState(betterAuthSession)
    }

    const fallback = config.permission.source === 'better-auth'
      ? createEmptyPermissionState('better-auth')
      : config.permission.local

    return permissionState.value.permission || resolvePermissionState(
      tokenAuth.user.value,
      fallback,
      config.permission.source,
    )
  })

  const loaded = computed(() => {
    if (config.permission.source === 'better-auth') {
      return !!betterAuthSession?.ready.value
    }

    if (!isRemoteSource(config.permission.source)) {
      return true
    }

    if (permissionState.value.permission) {
      return true
    }

    if (config.permission.source === 'hybrid') {
      return true
    }

    return false
  })

  function setPermission(permission: NuvaPermissionState | null) {
    permissionState.value.permission = permission
    permissionState.value.loadedAt = permission ? Date.now() : 0
  }

  async function refresh() {
    const request = config.permission.remote.permission

    if (!request?.url && !config.permission.remote.permissionResolver) {
      if (config.permission.source === 'remote' && !permissionState.value.permission) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Nuva permission endpoint is not configured',
          message: 'Remote permission mode requires profile/profileResolver to return permissions or permission/permissionResolver to be configured.',
        })
      }

      return state.value
    }

    const permission = toPermissionState(await fetchRemotePermission(config, request, resolvers.value.permission), config)
    setPermission(permission)
    return permission
  }

  async function ensure() {
    if (!isRemoteSource(config.permission.source)) {
      return state.value
    }

    if (permissionState.value.permission && isFresh(permissionState.value.loadedAt, config.permission.remote.cacheMaxAge)) {
      return state.value
    }

    return refresh()
  }

  function canState(permission: string | string[]): NuvaPermissionDecision {
    warnInvalidPermissionArray('canState', permission)
    const singlePermission = pickFirstPermission(permission)

    if (!isBetterAuthSource(config.permission.source)) {
      return toDecision(matchList(state.value.permissions, singlePermission))
    }

    if (!config.permission.betterAuth.hasPermission) {
      return toDecision(matchList(state.value.permissions, singlePermission))
    }

    const role = state.value.roles[0]
    const permissions = toBetterAuthPermissions(singlePermission)
    const organization = (useBetterAuth() as { organization?: BetterAuthOrganizationClient }).organization

    if (!role || !permissions || !Object.keys(permissions).length || !organization?.checkRolePermission) {
      return 'unknown'
    }

    return toDecision(organization.checkRolePermission({ role, permissions }))
  }

  function anyState(permissions: string[]) {
    return combineDecisions(permissions.map(permission => canState(permission)), 'any')
  }

  function allState(permissions: string[]) {
    return combineDecisions(permissions.map(permission => canState(permission)), 'all')
  }

  function can(permission: string | string[]) {
    return canState(permission) === 'allow'
  }

  async function canAsync(permission: string | string[]) {
    warnInvalidPermissionArray('canAsync', permission)
    const singlePermission = pickFirstPermission(permission)

    if (config.permission.source !== 'better-auth') {
      return can(singlePermission)
    }

    if (!config.permission.betterAuth.hasPermission) {
      return false
    }

    const organization = (useBetterAuth() as { organization?: BetterAuthOrganizationClient }).organization

    if (!organization?.hasPermission) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Better Auth hasPermission is not configured',
        message: 'Set nuvaAuth.permission.betterAuth.hasPermission to true and enable the Better Auth organization plugin.',
      })
    }

    const permissions = toBetterAuthPermissions(singlePermission)

    if (!permissions || !Object.keys(permissions).length) {
      return false
    }

    return resolveBetterAuthPermissionResult(await organization.hasPermission({ permissions }))
  }

  function any(permission: string[]) {
    return anyState(permission) === 'allow'
  }

  function all(permission: string[]) {
    return allState(permission) === 'allow'
  }

  async function anyAsync(permissions: string[]) {
    if (!permissions.length) {
      return true
    }

    const results = await Promise.all(permissions.map(permission => canAsync(permission)))
    return results.some(Boolean)
  }

  async function allAsync(permissions: string[]) {
    if (!permissions.length) {
      return true
    }

    if (config.permission.source !== 'better-auth') {
      const results = await Promise.all(permissions.map(permission => canAsync(permission)))
      return results.every(Boolean)
    }

    if (!config.permission.betterAuth.hasPermission) {
      return false
    }

    const organization = (useBetterAuth() as { organization?: BetterAuthOrganizationClient }).organization

    if (!organization?.hasPermission) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Better Auth hasPermission is not configured',
        message: 'Set nuvaAuth.permission.betterAuth.hasPermission to true and enable the Better Auth organization plugin.',
      })
    }

    const mergedPermissions = toBetterAuthPermissions(permissions)

    if (!mergedPermissions || !Object.keys(mergedPermissions).length) {
      return false
    }

    return resolveBetterAuthPermissionResult(await organization.hasPermission({ permissions: mergedPermissions }))
  }

  function hasRole(role: string | string[], mode: NuvaPermissionMatchMode = config.permission.roleMode) {
    return matchList(state.value.roles, role, mode)
  }

  function hasScope(scope: string | string[], mode: NuvaPermissionMatchMode = 'all') {
    return matchScope(state.value.scope, scope, mode)
  }

  function canAccess(resource: string, action?: string) {
    return can(toResourcePermission(resource, action))
  }

  function cannot(permission: string | string[]) {
    return !can(permission)
  }

  function role(role: string | string[], mode: NuvaPermissionMatchMode = config.permission.roleMode) {
    return hasRole(role, mode)
  }

  function inScope(scope: string | string[], mode: NuvaPermissionMatchMode = 'all') {
    return hasScope(scope, mode)
  }

  return {
    authReady: computed(() => isBetterAuthProvider ? !!betterAuthSession?.ready.value : tokenAuth.ready.value),
    permissionReady: loaded,
    ready: loaded,
    loaded,
    source: computed(() => state.value.source),
    roles: computed(() => state.value.roles),
    permissions: computed(() => state.value.permissions),
    scope: computed(() => state.value.scope),
    dataAccess: computed(() => state.value.dataAccess),
    state,
    setPermission,
    refresh,
    ensure,
    canState,
    anyState,
    allState,
    can,
    canAsync,
    cannot,
    any,
    all,
    anyAsync,
    allAsync,
    hasRole,
    hasScope,
    role,
    inScope,
    canAccess,
  }
}
