import type { Method } from 'alova'
import type { NuvaApiConfig } from '../../types/config'
import { handleHttpResponse } from './response'
import { applyToken, getAuthToken } from './token'

export function useDefaultHttpRequestHooks(config: NuvaApiConfig) {
  const cookieToken = useCookie<string | null>(config.token.cookieName)

  return {
    beforeRequest(method: Method) {
      const token = getAuthToken(cookieToken.value, config.token)
      applyToken(method, token, config.token)
    },
    onSuccess(response: Response, method: Method) {
      return handleHttpResponse(response, method, config)
    },
    onError(error: unknown) {
      throw error
    },
    onComplete() {},
  }
}
