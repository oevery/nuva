import { useAuthRedirect } from '../utils/redirect'
import { useBetterAuth } from './useBetterAuth'
import { useTokenAuth } from './useTokenAuth'

export function useAuth<TUser = unknown>() {
  const config = useRuntimeConfig().public.nuva.auth
  const tokenAuth = useTokenAuth<TUser>()
  const redirect = useAuthRedirect()
  const betterAuthClient = config.mode === 'fullstack' ? useBetterAuth() : undefined

  return {
    mode: config.mode,
    user: tokenAuth.user,
    ready: tokenAuth.ready,
    isAuthenticated: tokenAuth.isAuthenticated,
    logout: tokenAuth.logout,
    toLogin: redirect.toLogin,
    afterLogin: redirect.afterLogin,
    tokenAuth,
    betterAuthClient,
  }
}
