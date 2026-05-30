import type { Method } from 'alova'
import type { NuvaApiConfig } from '../../types/config'
import { handleHttpResponse } from './response'
import { applyToken, getAuthToken } from './token'

export function useDefaultHttpRequestHooks(config: NuvaApiConfig) {
  const token = getAuthToken(config.token)

  return {
    beforeRequest(method: Method) {
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
