import type { NuvaAuthAdapterCore } from './registry'
import { useTokenAuth } from '../internal/useTokenAuth'

export function createTokenAuthAdapter<TUser = unknown>(): NuvaAuthAdapterCore<TUser> {
  const tokenAuth = useTokenAuth<TUser>()

  return {
    user: tokenAuth.user,
    ready: tokenAuth.ready,
    isAuthenticated: tokenAuth.isAuthenticated,
    async ensureAuthenticated() {
      await tokenAuth.ensureUser()
      return tokenAuth.isAuthenticated.value
    },
    logout: tokenAuth.logout,
  }
}
