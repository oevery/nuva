import type { NuvaPublicConfig } from '@oevery/nuva/config'
import type { Method } from 'alova'
import { useDefaultHttpRequestHooks } from '@oevery/nuva/http'

function getErrorStatus(error: unknown) {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    return (error as { statusCode?: number }).statusCode
  }
}

async function redirectUnauthorized(error: unknown, logout: () => void, toLogin: () => ReturnType<typeof navigateTo>) {
  if (getErrorStatus(error) === 401) {
    logout()
    await toLogin()
  }

  throw error
}

export function useHttpRequestHooks(config: NuvaPublicConfig) {
  const defaults = useDefaultHttpRequestHooks(config)
  const authConfig = useRuntimeConfig().public.nuva.auth
  const auth = authConfig.enabled ? useAuth() : undefined

  return {
    ...defaults,
    beforeRequest(method: Method) {
      defaults.beforeRequest(method)
      // 在业务模板中按需追加租户、语言、traceId 等请求头。
    },
    async onSuccess(response: Response, method: Method) {
      try {
        return await defaults.onSuccess(response, method)
      }
      catch (error) {
        if (auth) {
          await redirectUnauthorized(error, auth.logout, auth.toLogin)
        }

        throw error
      }
    },
    async onError(error: unknown) {
      if (auth) {
        await redirectUnauthorized(error, auth.logout, auth.toLogin)
      }

      throw error
    },
  }
}
