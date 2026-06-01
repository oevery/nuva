export function normalizeAuthRedirectTarget(value: unknown, fallback: string) {
  const target = Array.isArray(value) ? value[0] : value

  if (typeof target === 'string' && target.startsWith('/')) {
    return target
  }

  return fallback
}

export function useAuthRedirect() {
  const nuxtApp = useNuxtApp()
  const route = useRoute()
  const authConfig = useRuntimeConfig().public.nuva.auth

  function toLogin(redirect?: string) {
    const redirectTarget = redirect || route.fullPath

    if (route.path === authConfig.loginPath) {
      return
    }

    return nuxtApp.runWithContext(() => navigateTo({
      path: authConfig.loginPath,
      query: {
        [authConfig.redirectQuery]: redirectTarget,
      },
    }))
  }

  function afterLogin() {
    return nuxtApp.runWithContext(() => navigateTo(
      normalizeAuthRedirectTarget(route.query[authConfig.redirectQuery], authConfig.homePath),
    ))
  }

  return {
    toLogin,
    afterLogin,
  }
}
