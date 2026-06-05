import type { NuvaPublicConfig } from '../../config'
import { createAlova } from 'alova'
import adapterFetch from 'alova/fetch'
import NuxtHook from 'alova/nuxt'
import { useNuxtApp, useRuntimeConfig } from 'nuxt/app'
import { hash } from 'ohash'
import { resolveNuxtBaseURL } from '../utils/http/config'
import { useHttpRequestHooks } from '../utils/http/hooks'

type HttpClient = ReturnType<typeof createHttpClient>

const httpClients = new Map<string, HttpClient>()

export function createHttpClient(nuvaConfig: NuvaPublicConfig) {
  const { api: apiConfig } = nuvaConfig
  const baseURL = resolveNuxtBaseURL(apiConfig.baseURL)
  const hooks = useHttpRequestHooks(nuvaConfig)
  const nuxtApp = useNuxtApp()

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
      nuxtApp: () => nuxtApp,
    }),
  })
}

function getHttpClientCacheKey(nuvaConfig: NuvaPublicConfig) {
  const { api: apiConfig, auth: authConfig } = nuvaConfig

  return `nuva:http:${hash({
    baseURL: resolveNuxtBaseURL(apiConfig.baseURL),
    envelopeUnwrap: apiConfig.envelopeUnwrap,
    successCodes: apiConfig.successCodes,
    token: authConfig.token,
  })}`
}

function getHttpClientFromCache(cache: Map<string, HttpClient>, cacheKey: string, nuvaConfig: NuvaPublicConfig) {
  const httpClient = cache.get(cacheKey)

  if (httpClient) {
    return httpClient
  }

  const newHttpClient = createHttpClient(nuvaConfig)
  cache.set(cacheKey, newHttpClient)
  return newHttpClient
}

function getServerHttpClient(cacheKey: string, nuvaConfig: NuvaPublicConfig) {
  const nuxtApp = useNuxtApp() as ReturnType<typeof useNuxtApp> & {
    _nuvaHttpClients?: Map<string, HttpClient>
  }

  nuxtApp._nuvaHttpClients ||= new Map<string, HttpClient>()
  return getHttpClientFromCache(nuxtApp._nuvaHttpClients, cacheKey, nuvaConfig)
}

export function useHttpClient() {
  const config = useRuntimeConfig()
  const nuvaConfig = config.public.nuva as NuvaPublicConfig
  const cacheKey = getHttpClientCacheKey(nuvaConfig)

  if (import.meta.server) {
    return getServerHttpClient(cacheKey, nuvaConfig)
  }

  return getHttpClientFromCache(httpClients, cacheKey, nuvaConfig)
}
