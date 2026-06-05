import { useTokenAuth } from '../internal/useTokenAuth'

export function useTokenAuthClient<TUser = unknown>() {
  const tokenAuth = useTokenAuth<TUser>()

  return {
    token: tokenAuth.token,
    user: tokenAuth.user,
    ready: tokenAuth.ready,
    isAuthenticated: tokenAuth.isAuthenticated,
    setToken: tokenAuth.setToken,
    clearToken: tokenAuth.clearToken,
    setUser: tokenAuth.setUser,
    setSession: tokenAuth.loginWithToken,
    refreshUser: tokenAuth.refreshUser,
    ensureUser: tokenAuth.ensureUser,
    logout: tokenAuth.logout,
  }
}
