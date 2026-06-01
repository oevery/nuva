import type { Method } from 'alova'
import type { NuvaPublicConfig } from '../../../config'
import { isSameOriginURL, resolveNuxtBaseURL } from './config'
import { handleHttpResponse } from './response'
import { applyAuthHeader, resolveTokenValue } from './token'

export function useDefaultHttpRequestHooks(config: NuvaPublicConfig) {
  const { api: apiConfig, auth: authConfig } = config
  const cookieToken = useCookie<string | null>(authConfig.token.cookieName)
  const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const canForwardCookie = import.meta.server && isSameOriginURL(resolveNuxtBaseURL(apiConfig.baseURL))

  return {
    beforeRequest(method: Method) {
      if (canForwardCookie && requestHeaders?.cookie) {
        method.config.headers = {
          ...(method.config.headers || {}),
          cookie: requestHeaders.cookie,
        }
      }

      applyAuthHeader(
        method,
        resolveTokenValue(cookieToken.value, authConfig.token),
        authConfig.token,
      )
    },
    onSuccess(response: Response, method: Method) {
      return handleHttpResponse(response, method, apiConfig)
    },
    onError(error: unknown) {
      throw error
    },
    onComplete() {},
  }
}
