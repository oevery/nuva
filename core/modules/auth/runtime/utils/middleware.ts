import type { RouteLocationNormalized } from 'vue-router'
import type { NuvaPermissionMatchMode } from '../../../../config'
import { useNuvaConfig } from '../../../nuva/runtime/composables/useNuvaConfig'
import { useBetterAuthSession } from '../composables/useBetterAuthSession'
import { usePermission } from '../composables/usePermission'
import { useTokenAuth } from '../composables/useTokenAuth'
import { useAuthRedirect } from './redirect'

interface RouteAccessMeta {
  roles?: string[]
  permissions?: string[]
  scopes?: string[]
  roleMode?: NuvaPermissionMatchMode
  permissionMode?: NuvaPermissionMatchMode
  forbiddenPath?: string
}

function isPublicRoute(path: string, publicRoutes: string[]) {
  return publicRoutes.some((route) => {
    if (route.endsWith('/**')) {
      return path.startsWith(route.slice(0, -3))
    }

    return route === path
  })
}

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object') {
    return
  }

  return (error as { statusCode?: number, status?: number }).statusCode || (error as { status?: number }).status
}

function getRouteAccessMeta(to: RouteLocationNormalized) {
  const authMeta = typeof to.meta.auth === 'object' && to.meta.auth !== null
    ? to.meta.auth as RouteAccessMeta
    : undefined

  return {
    roles: authMeta?.roles || to.meta.roles,
    permissions: authMeta?.permissions || to.meta.permissions,
    scopes: authMeta?.scopes || to.meta.scopes,
    roleMode: authMeta?.roleMode || to.meta.roleMode,
    permissionMode: authMeta?.permissionMode || to.meta.permissionMode,
    forbiddenPath: authMeta?.forbiddenPath || to.meta.forbiddenPath,
    requiresAuth: to.meta.auth === true || !!authMeta,
  }
}

async function ensureBetterAuthSession() {
  const session = useBetterAuthSession()
  await session.refresh()
  return session.isAuthenticated.value
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

    const accessMeta = getRouteAccessMeta(to)
    const hasAccessMeta = !!(accessMeta.roles?.length || accessMeta.permissions?.length || accessMeta.scopes?.length)

    if (isPublicRoute(to.path, authConfig.publicRoutes) && !hasAccessMeta) {
      return
    }

    const shouldProtect = authConfig.global || accessMeta.requiresAuth || hasAccessMeta

    if (!shouldProtect) {
      return
    }

    const tokenAuth = useTokenAuth()
    const { toLogin } = useAuthRedirect()

    if (authConfig.provider === 'better-auth') {
      if (!(await ensureBetterAuthSession())) {
        return toLogin()
      }
    }
    else {
      try {
        await tokenAuth.ensureUser()
      }
      catch (error) {
        const status = getErrorStatus(error)

        if (status !== 401 && status !== 403) {
          throw error
        }

        return toLogin()
      }

      if (!tokenAuth.isAuthenticated.value) {
        return toLogin()
      }
    }

    const permission = usePermission()
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

    if (accessMeta.roles && !permission.hasRole(accessMeta.roles, roleMode)) {
      return navigateTo(forbiddenPath)
    }

    if (accessMeta.scopes && !permission.hasScope(accessMeta.scopes, permissionMode)) {
      return navigateTo(forbiddenPath)
    }

    if (accessMeta.permissions) {
      const allowed = permissionMode === 'any'
        ? await permission.anyAsync(accessMeta.permissions)
        : await permission.allAsync(accessMeta.permissions)

      if (!allowed) {
        return navigateTo(forbiddenPath)
      }
    }
  })
}
