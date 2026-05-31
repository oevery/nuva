import type { NuvaApiConfig } from '../types/config'
import { createAlova } from 'alova'
import adapterFetch from 'alova/fetch'
import NuxtHook from 'alova/nuxt'
import { hash } from 'ohash'
import { resolveNuxtBaseURL } from '../utils/http/config'

type HttpClient = ReturnType<typeof createHttpClient>

const httpClients = new Map<string, HttpClient>()

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
  return `nuva:http:${hash({
    baseURL: resolveNuxtBaseURL(apiConfig.baseURL),
    envelopeUnwrap: apiConfig.envelopeUnwrap,
    successCodes: apiConfig.successCodes,
    token: apiConfig.token,
  })}`
}

function getHttpClientFromCache(cache: Map<string, HttpClient>, cacheKey: string, apiConfig: NuvaApiConfig) {
  const httpClient = cache.get(cacheKey)

  if (httpClient) {
    return httpClient
  }

  const newHttpClient = createHttpClient(apiConfig)
  cache.set(cacheKey, newHttpClient)
  return newHttpClient
}

function getServerHttpClient(cacheKey: string, apiConfig: NuvaApiConfig) {
  const nuxtApp = useNuxtApp() as ReturnType<typeof useNuxtApp> & {
    _nuvaHttpClients?: Map<string, HttpClient>
  }

  nuxtApp._nuvaHttpClients ||= new Map<string, HttpClient>()
  return getHttpClientFromCache(nuxtApp._nuvaHttpClients, cacheKey, apiConfig)
}

export function useHttpClient() {
  const config = useRuntimeConfig()
  const apiConfig = config.public.nuva.api
  const cacheKey = getHttpClientCacheKey(apiConfig)

  if (import.meta.server) {
    return getServerHttpClient(cacheKey, apiConfig)
  }

  return getHttpClientFromCache(httpClients, cacheKey, apiConfig)
}
