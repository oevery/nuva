import type { NuvaPermissionCheckContext, NuvaPermissionDecision, NuvaPermissionState } from '../../../../config'
import type { NuvaAuthPermissionAdapter } from './registry'
import { useNuvaConfig } from '../../../nuva/runtime/composables/useNuvaConfig'
import { useNuvaAuthResolvers } from '../internal/useNuvaAuthResolvers'
import { usePermissionState } from '../internal/usePermissionState'
import { explainList, explainScope, matchList, resolvePermissionState, toResourcePermission } from '../utils/permission'
import { fetchRemotePermission, getRemoteRequestKey, toPermissionState, useRemoteRequestRuntimeContext } from '../utils/remote'
import { isFresh } from '../utils/shared'

function toDecision(allowed: boolean): NuvaPermissionDecision {
  return allowed ? 'allow' : 'deny'
}

function useLocalState() {
  const config = useNuvaConfig().auth

  return computed(() => resolvePermissionState(null, config.permission.local, 'local'))
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

export function createLocalPermissionAdapter(): NuvaAuthPermissionAdapter {
  const state = useLocalState()

  return {
    loaded: computed(() => true),
    state,
    refresh: () => state.value,
    ensure: () => state.value,
    canState: permission => toDecision(matchList(state.value.permissions, permission)),
    canAsync: permission => matchList(state.value.permissions, permission),
    anyAsync: permissions => matchList(state.value.permissions, permissions, 'any'),
    allAsync: permissions => matchList(state.value.permissions, permissions, 'all'),
  }
}

export function createRemotePermissionAdapter(): NuvaAuthPermissionAdapter {
  const config = useNuvaConfig().auth
  const resolvers = useNuvaAuthResolvers()
  const permissionState = usePermissionState()
  const remoteRequestRuntime = useRemoteRequestRuntimeContext()

  const state = computed(() => permissionState.value.permission || createEmptyPermissionState('remote'))
  const loaded = computed(() => !!permissionState.value.permission)

  function setPermission(permission: NuvaPermissionState | null) {
    permissionState.value.permission = permission
    permissionState.value.loadedAt = permission ? Date.now() : 0
  }

  async function refresh() {
    const remote = config.permission.remote

    if (!remote.request?.url && !remote.resolver) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Nuva permission endpoint is not configured',
        message: 'Remote permission mode requires permission.remote.request or a permission resolver.',
      })
    }

    const permission = toPermissionState(await fetchRemotePermission(config, remote.request, resolvers.value.permission, {
      cacheMaxAge: remote.cacheMaxAge,
      reuseCached: getRemoteRequestKey(remote.request) === getRemoteRequestKey(config.user.remote.request),
      runtime: remoteRequestRuntime,
      map: remote.map,
    }), config)

    setPermission(permission)
    return permission
  }

  async function ensure() {
    if (permissionState.value.permission && isFresh(permissionState.value.loadedAt, config.permission.remote.cacheMaxAge)) {
      return state.value
    }

    if (permissionState.value.permission && !config.permission.remote.request?.url && !config.permission.remote.resolver) {
      return state.value
    }

    return refresh()
  }

  return {
    loaded,
    state,
    refresh,
    ensure,
    canState: permission => toDecision(matchList(state.value.permissions, permission)),
    async canAsync(permission: string, _context?: NuvaPermissionCheckContext) {
      const ensuredState = await ensure()
      return matchList(ensuredState.permissions, permission)
    },
    async anyAsync(permissions: string[]) {
      const ensuredState = await ensure()
      return matchList(ensuredState.permissions, permissions, 'any')
    },
    async allAsync(permissions: string[]) {
      const ensuredState = await ensure()
      return matchList(ensuredState.permissions, permissions, 'all')
    },
  }
}

export function createPermissionApi(adapter: NuvaAuthPermissionAdapter) {
  const config = useNuvaConfig().auth
  const state = computed(() => adapter.state?.value || resolvePermissionState(null, config.permission.local, config.permission.source))
  const loaded = computed(() => !!adapter.loaded?.value)

  function warnInvalidPermissionArray(apiName: string, permission: string | string[]) {
    if (!import.meta.dev || !Array.isArray(permission)) {
      return
    }

    console.warn(`[nuva/auth] ${apiName}() expects a single permission. Received an array and will use the first item. Use any()/all() for grouped checks.`, permission)
  }

  function pickFirstPermission(permission: string | string[]) {
    return Array.isArray(permission) ? permission[0] || '' : permission
  }

  function canState(permission: string | string[]) {
    warnInvalidPermissionArray('canState', permission)
    const singlePermission = pickFirstPermission(permission)
    return adapter.canState?.(singlePermission) || toDecision(matchList(state.value.permissions, singlePermission))
  }

  async function canAsync(permission: string | string[], context?: NuvaPermissionCheckContext) {
    warnInvalidPermissionArray('canAsync', permission)
    const singlePermission = pickFirstPermission(permission)

    if (adapter.canAsync) {
      return await adapter.canAsync(singlePermission, context)
    }

    const ensuredState = await adapter.ensure?.() || state.value
    return matchList(ensuredState.permissions, singlePermission)
  }

  function combineDecisions(decisions: NuvaPermissionDecision[], mode: 'any' | 'all') {
    if (!decisions.length) {
      return 'allow' as const
    }

    if (mode === 'any') {
      if (decisions.includes('allow')) {
        return 'allow' as const
      }

      return decisions.includes('unknown') ? 'unknown' as const : 'deny' as const
    }

    if (decisions.includes('deny')) {
      return 'deny' as const
    }

    return decisions.includes('unknown') ? 'unknown' as const : 'allow' as const
  }

  function anyState(permissions: string[]) {
    return combineDecisions(permissions.map(permission => canState(permission)), 'any')
  }

  function allState(permissions: string[]) {
    return combineDecisions(permissions.map(permission => canState(permission)), 'all')
  }

  async function anyAsync(permissions: string[], context?: NuvaPermissionCheckContext) {
    if (!permissions.length) {
      return true
    }

    if (adapter.anyAsync) {
      return await adapter.anyAsync(permissions, context)
    }

    const results = await Promise.all(permissions.map(permission => canAsync(permission, context)))
    return results.some(Boolean)
  }

  async function allAsync(permissions: string[], context?: NuvaPermissionCheckContext) {
    if (!permissions.length) {
      return true
    }

    if (adapter.allAsync) {
      return await adapter.allAsync(permissions, context)
    }

    const results = await Promise.all(permissions.map(permission => canAsync(permission, context)))
    return results.every(Boolean)
  }

  return {
    authReady: adapter.authReady || computed(() => true),
    permissionReady: loaded,
    ready: loaded,
    loaded,
    source: computed(() => state.value.source),
    roles: computed(() => state.value.roles),
    permissions: computed(() => state.value.permissions),
    scope: computed(() => state.value.scope),
    dataAccess: computed(() => state.value.dataAccess),
    state,
    setPermission(permission: NuvaPermissionState | null) {
      usePermissionState().value.permission = permission
      usePermissionState().value.loadedAt = permission ? Date.now() : 0
    },
    refresh: () => adapter.refresh?.() || state.value,
    ensure: () => adapter.ensure?.() || state.value,
    canState,
    anyState,
    allState,
    can: (permission: string | string[]) => canState(permission) === 'allow',
    canAsync,
    cannot: (permission: string | string[]) => canState(permission) !== 'allow',
    any: (permissions: string[]) => anyState(permissions) === 'allow',
    all: (permissions: string[]) => allState(permissions) === 'allow',
    anyAsync,
    allAsync,
    hasRole: (role: string | string[], mode = config.permission.roleMode) => matchList(state.value.roles, role, mode),
    hasScope: (scope: string | string[], mode: 'any' | 'all' = 'all') => explainScope(state.value.scope, scope, mode).decision === 'allow',
    role: (role: string | string[], mode = config.permission.roleMode) => matchList(state.value.roles, role, mode),
    inScope: (scope: string | string[], mode: 'any' | 'all' = 'all') => explainScope(state.value.scope, scope, mode).decision === 'allow',
    canAccess: (resource: string, action?: string) => canState(toResourcePermission(resource, action)) === 'allow',
    explain: (permission: string | string[], mode = config.permission.permissionMode) => explainList(state.value.permissions, permission, mode, 'missing-permission'),
    explainRole: (role: string | string[], mode = config.permission.roleMode) => explainList(state.value.roles, role, mode, 'missing-role'),
    explainScope: (scope: string | string[], mode: 'any' | 'all' = 'all') => explainScope(state.value.scope, scope, mode),
  }
}
