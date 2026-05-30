import type { NuvaApiConfig } from '@oevery/nuva/app/types/config'
import type { Method } from 'alova'
import { useDefaultHttpRequestHooks } from '#nuva-core/app/utils/http/default-hooks'

export function useHttpRequestHooks(config: NuvaApiConfig) {
  const defaults = useDefaultHttpRequestHooks(config)

  return {
    ...defaults,
    beforeRequest(method: Method) {
      defaults.beforeRequest(method)
      // 在业务模板中按需追加租户、语言、traceId 等请求头。
    },
  }
}
