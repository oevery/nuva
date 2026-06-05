import type { NuvaPermissionCheckContext, NuvaPermissionDecision, NuvaPermissionMatchMode, NuvaPermissionState } from '../../../../config'
import { useNuvaConfig } from '../../../nuva/runtime/composables/useNuvaConfig'
import { useAuthAdapter } from '../adapters/registry'
import { useNuvaAuthResolvers } from '../internal/useNuvaAuthResolvers'
import { usePermissionState } from '../internal/usePermissionState'
import { useTokenAuth } from '../internal/useTokenAuth'
import { explainList, explainScope, matchList, hasScope as matchScope, resolvePermissionState, toResourcePermission } from '../utils/permission'
import { createEmptyPermissionState } from '../utils/permission-state'
import { fetchRemotePermission, toPermissionState } from '../utils/remote'
import { isAdapterPermissionSource, isFresh, isRemotePermissionSource } from '../utils/shared'

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

export function usePermission<TUser extends Partial<NuvaPermissionState> = Partial<NuvaPermissionState>>() {
  const config = useNuvaConfig().auth
  const resolvers = useNuvaAuthResolvers()
  const tokenAuth = useTokenAuth<TUser>()
  const permissionState = usePermissionState()
  const usesAuthAdapter = config.provider !== 'token' || isAdapterPermissionSource(config.permission.source)
  const authAdapter = usesAuthAdapter
    ? useAuthAdapter<TUser>(config.provider)
    : undefined
  const adapterPermission = authAdapter?.permission

  const state = computed(() => {
    if (isAdapterPermissionSource(config.permission.source) && adapterPermission?.state) {
      return adapterPermission.state.value
    }

    const fallback = isAdapterPermissionSource(config.permission.source)
      ? createEmptyPermissionState('adapter')
      : config.permission.local

    return permissionState.value.permission || resolvePermissionState(
      tokenAuth.user.value,
      fallback,
      config.permission.source,
    )
  })

  const loaded = computed(() => {
    if (isAdapterPermissionSource(config.permission.source)) {
      return !!adapterPermission?.loaded?.value
    }

    if (!isRemotePermissionSource(config.permission.source)) {
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
    if (isAdapterPermissionSource(config.permission.source)) {
      return await adapterPermission?.refresh?.() || state.value
    }

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
    if (isAdapterPermissionSource(config.permission.source)) {
      return await adapterPermission?.ensure?.() || state.value
    }

    if (!isRemotePermissionSource(config.permission.source)) {
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

    if (!isAdapterPermissionSource(config.permission.source)) {
      return toDecision(matchList(state.value.permissions, singlePermission))
    }

    return adapterPermission?.canState?.(singlePermission) || toDecision(matchList(state.value.permissions, singlePermission))
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

  async function canAsync(permission: string | string[], context?: NuvaPermissionCheckContext) {
    warnInvalidPermissionArray('canAsync', permission)
    const singlePermission = pickFirstPermission(permission)

    if (!isAdapterPermissionSource(config.permission.source)) {
      const ensuredState = await ensure()
      return matchList(ensuredState.permissions, singlePermission)
    }

    return await adapterPermission?.canAsync?.(singlePermission, context) || false
  }

  function any(permission: string[]) {
    return anyState(permission) === 'allow'
  }

  function all(permission: string[]) {
    return allState(permission) === 'allow'
  }

  async function anyAsync(permissions: string[], context?: NuvaPermissionCheckContext) {
    if (!permissions.length) {
      return true
    }

    if (!isAdapterPermissionSource(config.permission.source)) {
      const ensuredState = await ensure()
      return matchList(ensuredState.permissions, permissions, 'any')
    }

    if (adapterPermission?.anyAsync) {
      return await adapterPermission.anyAsync(permissions, context)
    }

    const results = await Promise.all(permissions.map(permission => canAsync(permission, context)))
    return results.some(Boolean)
  }

  async function allAsync(permissions: string[], context?: NuvaPermissionCheckContext) {
    if (!permissions.length) {
      return true
    }

    if (!isAdapterPermissionSource(config.permission.source)) {
      const ensuredState = await ensure()
      return matchList(ensuredState.permissions, permissions, 'all')
    }

    if (adapterPermission?.allAsync) {
      return await adapterPermission.allAsync(permissions, context)
    }

    const results = await Promise.all(permissions.map(permission => canAsync(permission, context)))
    return results.every(Boolean)
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

  function explain(permission: string | string[], mode: NuvaPermissionMatchMode = config.permission.permissionMode) {
    return explainList(state.value.permissions, permission, mode, 'missing-permission')
  }

  function explainRole(role: string | string[], mode: NuvaPermissionMatchMode = config.permission.roleMode) {
    return explainList(state.value.roles, role, mode, 'missing-role')
  }

  function explainScopeAccess(scope: string | string[], mode: NuvaPermissionMatchMode = 'all') {
    return explainScope(state.value.scope, scope, mode)
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
    authReady: computed(() => authAdapter ? authAdapter.ready.value : tokenAuth.ready.value),
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
    explain,
    explainRole,
    explainScope: explainScopeAccess,
  }
}
