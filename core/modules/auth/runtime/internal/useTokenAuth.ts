import type { NuvaProfileResolver } from '../../../../config'
import { useState } from 'nuxt/app'
import { computed } from 'vue'
import { useNuvaConfig } from '../../../nuva/runtime/composables/useNuvaConfig'
import { hasAccessMenus, normalizeAccessMenus } from '../utils/access-menu'
import { hasPermissionState, resolvePermissionState } from '../utils/permission'
import { fetchRemoteUser } from '../utils/remote'
import { isAuthStatusError, isFresh, isRemotePermissionSource } from '../utils/shared'
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
  const { token, isAuthenticated: hasToken, setToken: setStoredToken, clearToken: clearStoredToken } = useTokenStore()

  function clearSessionState() {
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
    if (hasPermissionState(user)) {
      permissionState.value.permission = resolvePermissionState(user, authConfig.permission.local, authConfig.permission.source)
      permissionState.value.loadedAt = Date.now()
      return
    }

    permissionState.value.permission = null
    permissionState.value.loadedAt = 0
  }

  function syncAccessMenuFromUser(user: TUser | null, authConfig = useNuvaConfig().auth) {
    if (authConfig.accessMenu.source !== 'profile') {
      return
    }

    if (hasAccessMenus(user)) {
      accessMenuState.value.menus = normalizeAccessMenus(user)
      accessMenuState.value.loadedAt = Date.now()
      return
    }

    accessMenuState.value.menus = []
    accessMenuState.value.loadedAt = 0
  }

  async function refreshUser() {
    const authConfig = useNuvaConfig().auth
    const request = authConfig.permission.remote.profile

    if (!request?.url && !authConfig.permission.remote.profileResolver) {
      state.value.ready = true
      return state.value.user
    }

    const user = await fetchRemoteUser<TUser>(authConfig, request, resolvers.value.profile as NuvaProfileResolver<TUser> | null)
    setUser(user)

    syncPermissionFromUser(user, authConfig)
    syncAccessMenuFromUser(user, authConfig)

    return user
  }

  async function ensureUser() {
    const authConfig = useNuvaConfig().auth
    const shouldRefresh = isRemotePermissionSource(authConfig.permission.source)
    const fresh = isFresh(state.value.checkedAt, authConfig.permission.remote.cacheMaxAge)

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
      syncAccessMenuFromUser(user, authConfig)
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
