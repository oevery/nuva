import type { NuvaUserResolver } from '../../../../config'
import { useState } from 'nuxt/app'
import { computed } from 'vue'
import { useNuvaConfig } from '../../../nuva/runtime/composables/useNuvaConfig'
import { hasPermissionState, resolvePermissionState } from '../utils/permission'
import { clearNuvaRemoteRequestCache, fetchRemotePermission, fetchRemoteUser, getRemoteRequestKey, toPermissionState, useRemoteRequestRuntimeContext } from '../utils/remote'
import { isAuthStatusError, isFresh } from '../utils/shared'
import { clearNuvaAuthDerivedState } from './clearAuthState'
import { useAccessMenuState } from './useAccessMenuState'
import { useNuvaAuthResolvers } from './useNuvaAuthResolvers'
import { usePermissionState } from './usePermissionState'
import { useTokenStore } from './useTokenStore'

interface TokenAuthState<TUser = unknown> {
  user: TUser | null
  ready: boolean
  checkedAt: number
}

export function useTokenAuthState<TUser = unknown>() {
  return useState<TokenAuthState<TUser>>('nuva:auth', () => ({
    user: null,
    ready: false,
    checkedAt: 0,
  }))
}

export function useTokenAuth<TUser = unknown>() {
  const state = useTokenAuthState<TUser>()
  const resolvers = useNuvaAuthResolvers()
  const accessMenuState = useAccessMenuState()
  const permissionState = usePermissionState()
  const remoteRequestRuntime = useRemoteRequestRuntimeContext()
  const { token, isAuthenticated: hasToken, setToken: setStoredToken, clearToken: clearStoredToken } = useTokenStore()

  function clearSessionState() {
    clearNuvaRemoteRequestCache(remoteRequestRuntime.cache)
    clearNuvaAuthDerivedState({ accessMenuState, permissionState })
    setUser(null)
  }

  function setToken(value: string | null) {
    const previousToken = token.value

    setStoredToken(value)
    state.value.ready = true

    if (value !== previousToken) {
      clearSessionState()
      state.value.ready = true
    }

    if (!value) {
      clearSessionState()
    }
  }

  function setUser(user: TUser | null) {
    state.value.user = user
    state.value.ready = true
    state.value.checkedAt = user ? Date.now() : 0
  }

  function syncPermissionFromUser(user: TUser | null, authConfig = useNuvaConfig().auth) {
    if (authConfig.permission.source === 'remote' && hasPermissionState(user)) {
      permissionState.value.permission = resolvePermissionState(user, authConfig.permission.local, authConfig.permission.source)
      permissionState.value.loadedAt = Date.now()
      return
    }

    permissionState.value.permission = null
    permissionState.value.loadedAt = 0
  }

  async function refreshUser() {
    const authConfig = useNuvaConfig().auth
    const remote = authConfig.user.remote

    if (!remote.request?.url && !remote.resolver) {
      state.value.ready = true
      return state.value.user
    }

    const user = await fetchRemoteUser<TUser>(authConfig, remote.request, resolvers.value.user as NuvaUserResolver<TUser> | null, {
      cacheMaxAge: remote.cacheMaxAge,
      force: true,
      runtime: remoteRequestRuntime,
    })
    setUser(user)

    syncPermissionFromUser(user, authConfig)

    if (authConfig.permission.source === 'remote' && authConfig.permission.remote.request?.url) {
      const permission = await fetchRemotePermission(authConfig, authConfig.permission.remote.request, resolvers.value.permission, {
        cacheMaxAge: authConfig.permission.remote.cacheMaxAge,
        reuseCached: getRemoteRequestKey(authConfig.permission.remote.request) === getRemoteRequestKey(remote.request),
        runtime: remoteRequestRuntime,
        map: authConfig.permission.remote.map,
      })
      permissionState.value.permission = toPermissionState(permission, authConfig)
      permissionState.value.loadedAt = Date.now()
    }

    return user
  }

  async function ensureUser() {
    const authConfig = useNuvaConfig().auth
    const shouldRefresh = !!authConfig.user.remote.request?.url || authConfig.user.remote.resolver
    const fresh = isFresh(state.value.checkedAt, authConfig.user.remote.cacheMaxAge)

    if (state.value.ready && (!shouldRefresh || fresh)) {
      return state.value.user
    }

    if (!shouldRefresh) {
      state.value.ready = true
      return state.value.user
    }

    try {
      return await refreshUser()
    }
    catch (error) {
      if (isAuthStatusError(error)) {
        clearToken()
      }

      throw error
    }
  }

  function logout() {
    clearToken()
  }

  function loginWithToken(value: string, user?: TUser | null) {
    setToken(value)

    if (user !== undefined) {
      setUser(user)
      const authConfig = useNuvaConfig().auth
      syncPermissionFromUser(user, authConfig)
    }
  }

  function clearToken() {
    clearStoredToken()
    clearSessionState()
  }

  return {
    token,
    user: computed(() => state.value.user),
    ready: computed(() => state.value.ready),
    isAuthenticated: computed(() => hasToken.value || !!state.value.user),
    setToken,
    clearToken,
    loginWithToken,
    setUser,
    refreshUser,
    ensureUser,
    logout,
  }
}
