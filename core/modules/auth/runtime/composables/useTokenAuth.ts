import { useTokenStore } from './useTokenStore'

interface TokenAuthState<TUser = unknown> {
  user: TUser | null
  ready: boolean
}

export function useTokenAuthState<TUser = unknown>() {
  return useState<TokenAuthState<TUser>>('nuva:auth', () => ({
    user: null,
    ready: false,
  }))
}

export function useTokenAuth<TUser = unknown>() {
  const state = useTokenAuthState<TUser>()
  const { token, isAuthenticated, setToken, clearToken } = useTokenStore()

  function setUser(user: TUser | null) {
    state.value.user = user
    state.value.ready = true
  }

  function logout() {
    clearToken()
    setUser(null)
  }

  return {
    token,
    user: computed(() => state.value.user),
    ready: computed(() => state.value.ready),
    isAuthenticated,
    setToken,
    clearToken,
    setUser,
    logout,
  }
}
