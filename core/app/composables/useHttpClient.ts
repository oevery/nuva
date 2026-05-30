import type { NuvaApiConfig } from '../types/config'
import { createAlova } from 'alova'
import adapterFetch from 'alova/fetch'
import NuxtHook from 'alova/nuxt'
import { resolveNuxtBaseURL } from '../utils/http/config'

const httpClients = new Map<string, ReturnType<typeof createHttpClient>>()

export function createHttpClient(apiConfig: NuvaApiConfig) {
  const baseURL = resolveNuxtBaseURL(apiConfig.baseURL)
  const hooks = useHttpRequestHooks(apiConfig)

  return createAlova({
    baseURL,
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

function getHttpClientCacheKey(apiConfig: NuvaApiConfig) {
  return resolveNuxtBaseURL(apiConfig.baseURL)
}

export function useHttpClient() {
  const config = useRuntimeConfig()
  const apiConfig = config.public.nuva.api
  const cacheKey = getHttpClientCacheKey(apiConfig)
  const httpClient = httpClients.get(cacheKey)

  if (httpClient) {
    return httpClient
  }

  const newHttpClient = createHttpClient(apiConfig)
  httpClients.set(cacheKey, newHttpClient)
  return newHttpClient
}
