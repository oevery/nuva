import { useTokenAuth } from '../composables/useTokenAuth'
import { useAuthRedirect } from './redirect'

function isPublicRoute(path: string, publicRoutes: string[]) {
  return publicRoutes.some((route) => {
    if (route.endsWith('/**')) {
      return path.startsWith(route.slice(0, -3))
    }

    return route === path
  })
}

export function createAuthMiddleware() {
  return defineNuxtRouteMiddleware((to) => {
    const authConfig = useRuntimeConfig().public.nuva.auth

    if (!authConfig.enabled) {
      return
    }

    if (to.meta.auth === false) {
      return
    }

    if (isPublicRoute(to.path, authConfig.publicRoutes)) {
      return
    }

    if (!authConfig.global && to.meta.auth !== true) {
      return
    }

    const { isAuthenticated } = useTokenAuth()
    const { toLogin } = useAuthRedirect()

    if (!isAuthenticated.value) {
      return toLogin()
    }
  })
}
