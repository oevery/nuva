import { createAlova } from 'alova'
import adapterFetch from 'alova/fetch'
import NuxtHook from 'alova/nuxt'
import { resolveNuxtBaseURL } from '../utils/http/config'

export function useHttpClient() {
  const config = useRuntimeConfig()
  const apiConfig = config.public.nuva.api
  const hooks = useHttpRequestHooks(apiConfig)

  return createAlova({
    baseURL: resolveNuxtBaseURL(apiConfig.baseURL),
    beforeRequest: hooks.beforeRequest,
    requestAdapter: adapterFetch(),
    responded: {
      onSuccess: hooks.onSuccess,
      onError: hooks.onError,
      onComplete: hooks.onComplete,
    },
    statesHook: NuxtHook({
      nuxtApp: useNuxtApp,
    }),
  })
}
