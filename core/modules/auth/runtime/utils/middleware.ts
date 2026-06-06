import { useNuvaConfig } from '../../../nuva/runtime/composables/useNuvaConfig'
import { useAuthAdapter } from '../adapters/registry'
import { usePermission } from '../composables/usePermission'
import { useAuthRedirect } from '../internal/redirect'
import { hasRouteAccessMeta, resolveRouteAccessMeta } from './route-access'
import { getErrorStatus } from './shared'

const warnedPublicRouteConflicts = new Set<string>()

function isPublicRoute(path: string, publicRoutes: string[]) {
  return publicRoutes.some((route) => {
    if (route.endsWith('/**')) {
      return path.startsWith(route.slice(0, -3))
    }

    return route === path
  })
}

function warnPublicRouteConflict(path: string) {
  if (import.meta.env.PROD || warnedPublicRouteConflicts.has(path)) {
    return
  }

  warnedPublicRouteConflicts.add(path)
  console.warn(`[nuva/auth] publicRoutes contains "${path}" but the route declares auth or access metadata. The explicit route metadata will be protected.`)
}

export function createAuthMiddleware() {
  return defineNuxtRouteMiddleware(async (to) => {
    const authConfig = useNuvaConfig().auth

    if (!authConfig.enabled) {
      return
    }

    if (to.meta.auth === false) {
      return
    }

    const accessMeta = resolveRouteAccessMeta(to)
    const hasAccessMeta = hasRouteAccessMeta(accessMeta)

    const publicRoute = isPublicRoute(to.path, authConfig.publicRoutes)

    if (publicRoute && (accessMeta.requiresAuth || hasAccessMeta)) {
      warnPublicRouteConflict(to.path)
    }

    if (publicRoute && !accessMeta.requiresAuth && !hasAccessMeta) {
      return
    }

    const shouldProtect = authConfig.global || accessMeta.requiresAuth || hasAccessMeta

    if (!shouldProtect) {
      return
    }

    const permission = usePermission()
    const { toLogin } = useAuthRedirect()
    const adapter = useAuthAdapter(authConfig.provider)

    try {
      const authenticated = adapter.ensureAuthenticated
        ? await adapter.ensureAuthenticated()
        : adapter.isAuthenticated.value

      if (!authenticated) {
        return toLogin()
      }
    }
    catch (error) {
      const status = getErrorStatus(error)

      if (status !== 401 && status !== 403) {
        throw error
      }

      return toLogin()
    }

    const roleMode = accessMeta.roleMode || authConfig.permission.roleMode
    const permissionMode = accessMeta.permissionMode || authConfig.permission.permissionMode
    const forbiddenPath = accessMeta.forbiddenPath || authConfig.permission.forbiddenPath

    try {
      await permission.ensure()
    }
    catch (error) {
      const status = getErrorStatus(error)

      if (status === 401) {
        return toLogin()
      }

      if (status !== 403) {
        throw error
      }

      return navigateTo(forbiddenPath)
    }

    if (accessMeta.roles.length && !permission.hasRole(accessMeta.roles, roleMode)) {
      return navigateTo(forbiddenPath)
    }

    if (accessMeta.scopes.length && !permission.hasScope(accessMeta.scopes, permissionMode)) {
      return navigateTo(forbiddenPath)
    }

    if (accessMeta.permissions.length) {
      const allowed = permissionMode === 'any'
        ? await permission.anyAsync(accessMeta.permissions)
        : await permission.allAsync(accessMeta.permissions)

      if (!allowed) {
        return navigateTo(forbiddenPath)
      }
    }
  })
}
