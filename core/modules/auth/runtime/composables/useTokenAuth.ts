import type { NuvaProfileResolver } from '../../../../config'
import { useNuvaConfig } from '../../../nuva/runtime/composables/useNuvaConfig'
import { hasPermissionState, resolvePermissionState } from '../utils/permission'
import { fetchRemoteUser } from '../utils/remote'
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

function isRemoteSource(source: string) {
  return source === 'remote' || source === 'hybrid'
}

function isFresh(timestamp: number, maxAge: number) {
  return maxAge > 0 && timestamp > 0 && Date.now() - timestamp < maxAge
}

function isAuthError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false
  }

  const status = (error as { statusCode?: number, status?: number }).statusCode || (error as { status?: number }).status
  return status === 401 || status === 403
}

export function useTokenAuth<TUser = unknown>() {
  const state = useTokenAuthState<TUser>()
  const resolvers = useNuvaAuthResolvers()
  const permissionState = usePermissionState()
  const { token, isAuthenticated: hasToken, setToken: setStoredToken, clearToken: clearStoredToken } = useTokenStore()

  function clearSessionState() {
    permissionState.value.permission = null
    permissionState.value.loadedAt = 0
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

    return user
  }

  async function ensureUser() {
    const authConfig = useNuvaConfig().auth
    const shouldRefresh = isRemoteSource(authConfig.permission.source)
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
      if (isAuthError(error)) {
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
      syncPermissionFromUser(user)
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
