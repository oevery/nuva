import type { NuvaPublicConfig } from '@oevery/nuva/config'
import type { Method } from 'alova'
import { useDefaultHttpRequestHooks } from '@oevery/nuva/http'

export function useHttpRequestHooks(config: NuvaPublicConfig) {
  const defaults = useDefaultHttpRequestHooks(config, {
    notify({ message }) {
      // 业务项目可在这里接入 Nuxt UI、Element Plus、Ant Design Vue 等 Toast。
      console.warn(message)
    },
  })

  return {
    ...defaults,
    beforeRequest(method: Method) {
      defaults.beforeRequest(method)
      // 在业务模板中按需追加租户、语言、traceId 等请求头。
    },
  }
}
