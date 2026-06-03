import { useNuvaConfig } from '../../../nuva/runtime/composables/useNuvaConfig'
import { useAuthRedirect } from '../utils/redirect'
import { useBetterAuth } from './useBetterAuth'
import { useBetterAuthSession } from './useBetterAuthSession'
import { usePermission } from './usePermission'
import { useTokenAuth } from './useTokenAuth'

export function useAuth<TUser = unknown>() {
  const config = useNuvaConfig().auth
  const tokenAuth = useTokenAuth<TUser>()
  const isBetterAuth = config.provider === 'better-auth'
  const betterAuthSession = isBetterAuth ? useBetterAuthSession() : undefined
  const permission = usePermission()
  const redirect = useAuthRedirect()
  const betterAuthClient = config.mode === 'fullstack' ? useBetterAuth() : undefined

  async function logout() {
    if (isBetterAuth) {
      await betterAuthSession?.logout()
      return
    }

    tokenAuth.logout()
  }

  return {
    mode: config.mode,
    provider: config.provider,
    user: computed(() => isBetterAuth ? betterAuthSession?.user.value as TUser | null : tokenAuth.user.value),
    ready: computed(() => isBetterAuth ? !!betterAuthSession?.ready.value : tokenAuth.ready.value),
    isAuthenticated: computed(() => isBetterAuth ? !!betterAuthSession?.isAuthenticated.value : tokenAuth.isAuthenticated.value),
    loginWithToken: tokenAuth.loginWithToken,
    logout,
    toLogin: redirect.toLogin,
    afterLogin: redirect.afterLogin,
    tokenAuth,
    betterAuthSession,
    permission,
    betterAuthClient,
  }
}
