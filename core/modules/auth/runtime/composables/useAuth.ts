import { useNuvaConfig } from '../../../nuva/runtime/composables/useNuvaConfig'
import { useAuthAdapter } from '../adapters/registry'
import { clearNuvaAuthDerivedState } from '../internal/clearAuthState'
import { useAuthRedirect } from '../internal/redirect'
import { useAccessMenuState } from '../internal/useAccessMenuState'
import { usePermissionState } from '../internal/usePermissionState'

export function useAuth<TUser = unknown>() {
  const config = useNuvaConfig().auth
  const adapter = useAuthAdapter<TUser>(config.provider)
  const redirect = useAuthRedirect()
  const accessMenuState = useAccessMenuState()
  const permissionState = usePermissionState()

  async function refresh() {
    await adapter.ensureAuthenticated?.()
  }

  async function logout() {
    await adapter.logout()
    clearNuvaAuthDerivedState({ accessMenuState, permissionState })
  }

  return {
    provider: config.provider,
    user: adapter.user,
    ready: adapter.ready,
    isAuthenticated: adapter.isAuthenticated,
    refresh,
    logout,
    toLogin: redirect.toLogin,
    afterLogin: redirect.afterLogin,
  }
}
