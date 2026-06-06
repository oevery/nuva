import type { HttpUnauthorizedBehavior } from '../../../../app/types/alova'
import type { NuvaAccessMenuItem, NuvaAccessMenuResolver, NuvaPermissionResolver, NuvaPermissionState, NuvaRemoteMap, NuvaRemoteRequestConfig, NuvaRemoteRequestMethod, NuvaRemoteResolverContext, NuvaResolvedAuthConfig, NuvaUserResolver } from '../../../../config'
import { useRequestURL, useState } from 'nuxt/app'
import { useHttpClient } from '../../../../app/composables/useHttpClient'
import { extractAccessMenus } from './access-menu'
import { resolvePermissionState } from './permission'

interface RemoteCacheEntry {
  value: unknown
  loadedAt: number
}

type RemoteCacheState = Record<string, RemoteCacheEntry | undefined>
type RemoteHttpClient = ReturnType<typeof useHttpClient>

export interface NuvaRemoteRequestRuntimeContext {
  cache: ReturnType<typeof useRemoteRequestCache>
  origin?: string
  http: RemoteHttpClient
}

export function useRemoteRequestCache() {
  return useState<RemoteCacheState>('nuva:remote-cache', () => ({}))
}

export function useRemoteRequestRuntimeContext(): NuvaRemoteRequestRuntimeContext {
  return {
    cache: useRemoteRequestCache(),
    origin: import.meta.server ? useRequestURL().origin : undefined,
    http: useHttpClient(),
  }
}

function sortRecord(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortRecord)
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => [key, sortRecord(item)]))
}

function stableStringify(value: unknown) {
  return JSON.stringify(sortRecord(value))
}

function resolveRemoteRequestURL(url: string, origin?: string) {
  if (!url.startsWith('/')) {
    return url
  }

  if (import.meta.server) {
    return new URL(url, origin || useRequestURL().origin).toString()
  }

  return globalThis.location?.origin
    ? new URL(url, globalThis.location.origin).toString()
    : url
}

function normalizeRemoteRequest(request: NuvaRemoteRequestConfig) {
  return {
    method: request.method || 'GET',
    url: request.url,
    params: request.params,
    data: request.data,
    headers: request.headers,
    meta: request.meta,
  }
}

export function getRemoteRequestKey(request?: NuvaRemoteRequestConfig | null) {
  if (!request?.url) {
    return ''
  }

  return stableStringify(normalizeRemoteRequest(request))
}

function resolveErrorSilent(meta: NuvaRemoteRequestConfig['meta']) {
  return typeof meta?.errorSilent === 'boolean' ? meta.errorSilent : true
}

function resolveUnauthorizedBehavior(meta: NuvaRemoteRequestConfig['meta']): HttpUnauthorizedBehavior {
  return meta?.unauthorizedBehavior === 'redirect' || meta?.unauthorizedBehavior === 'throw'
    ? meta.unauthorizedBehavior
    : 'throw'
}

function createAuthRemoteRequestConfig(request: NuvaRemoteRequestConfig) {
  return {
    params: request.params,
    headers: request.headers,
    meta: {
      ...request.meta,
      errorSilent: resolveErrorSilent(request.meta),
      unauthorizedBehavior: resolveUnauthorizedBehavior(request.meta),
    },
  }
}

async function executeRemoteRequest<T>(request: NuvaRemoteRequestConfig | null | undefined, runtime?: NuvaRemoteRequestRuntimeContext) {
  if (!request?.url) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Nuva remote request is not configured',
    })
  }

  const method = (request.method || 'GET') as NuvaRemoteRequestMethod
  const url = resolveRemoteRequestURL(request.url, runtime?.origin)
  const http = runtime?.http || useHttpClient()
  const requestConfig = createAuthRemoteRequestConfig(request)

  switch (method) {
    case 'POST':
      return http.Post<T>(url, request.data, requestConfig)
    case 'PUT':
      return http.Put<T>(url, request.data, requestConfig)
    case 'PATCH':
      return http.Patch<T>(url, request.data, requestConfig)
    case 'DELETE':
      return http.Delete<T>(url, request.data, requestConfig)
    default:
      return http.Get<T>(url, requestConfig)
  }
}

export function clearNuvaRemoteRequestCache(cache = useRemoteRequestCache()) {
  cache.value = {}
}

export async function fetchRemoteRequest<T>(request: NuvaRemoteRequestConfig | null | undefined, options: { cacheMaxAge?: number, force?: boolean, reuseCached?: boolean, runtime?: NuvaRemoteRequestRuntimeContext } = {}) {
  if (!request?.url) {
    return executeRemoteRequest<T>(request, options.runtime)
  }

  const cache = options.runtime?.cache || useRemoteRequestCache()
  const key = getRemoteRequestKey(request)
  const cached = cache.value[key]
  const cacheMaxAge = options.cacheMaxAge || 0
  const isFresh = cached && cacheMaxAge > 0 && Date.now() - cached.loadedAt < cacheMaxAge

  if (!options.force && cached && (options.reuseCached || isFresh)) {
    return cached.value as T
  }

  const value = await executeRemoteRequest<T>(request, options.runtime)
  cache.value = {
    ...cache.value,
    [key]: {
      value,
      loadedAt: Date.now(),
    },
  }

  return value
}

async function createResolverContext(config: NuvaResolvedAuthConfig, request: NuvaRemoteRequestConfig | null, runtime?: NuvaRemoteRequestRuntimeContext): Promise<NuvaRemoteResolverContext> {
  return {
    request,
    config,
    requestWith: async <T>(nextRequest = request) => fetchRemoteRequest<T>(nextRequest, { runtime }),
  }
}

export async function fetchRemoteUser<TUser>(config: NuvaResolvedAuthConfig, request: NuvaRemoteRequestConfig | null, resolver: NuvaUserResolver<TUser> | null, options: { cacheMaxAge?: number, force?: boolean, reuseCached?: boolean, runtime?: NuvaRemoteRequestRuntimeContext } = {}) {
  if (resolver) {
    return resolver(await createResolverContext(config, request, options.runtime))
  }

  return fetchRemoteRequest<TUser>(request, options)
}

function getPathValue(value: unknown, path: string) {
  if (!path) {
    return value
  }

  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') {
      return undefined
    }

    return (current as Record<string, unknown>)[key]
  }, value)
}

function applyRemoteMap(value: unknown, map: NuvaRemoteMap | null | undefined) {
  if (!map) {
    return value
  }

  if (typeof map === 'string') {
    return getPathValue(value, map)
  }

  return Object.fromEntries(Object.entries(map).map(([key, path]) => [key, getPathValue(value, path)]))
}

export async function fetchRemotePermission(config: NuvaResolvedAuthConfig, request: NuvaRemoteRequestConfig | null, resolver: NuvaPermissionResolver | null, options: { cacheMaxAge?: number, force?: boolean, reuseCached?: boolean, runtime?: NuvaRemoteRequestRuntimeContext, map?: NuvaRemoteMap | null } = {}) {
  if (resolver) {
    return applyRemoteMap(await resolver(await createResolverContext(config, request, options.runtime)), options.map) as NuvaPermissionState
  }

  return applyRemoteMap(await fetchRemoteRequest<unknown>(request, options), options.map) as NuvaPermissionState
}

export async function fetchRemoteAccessMenu(config: NuvaResolvedAuthConfig, request: NuvaRemoteRequestConfig | null, resolver: NuvaAccessMenuResolver | null, options: { cacheMaxAge?: number, force?: boolean, reuseCached?: boolean, runtime?: NuvaRemoteRequestRuntimeContext, map?: NuvaRemoteMap | null } = {}) {
  if (resolver) {
    return extractAccessMenus(applyRemoteMap(await resolver(await createResolverContext(config, request, options.runtime)), options.map))
  }

  return extractAccessMenus(applyRemoteMap(await fetchRemoteRequest<unknown>(request, options), options.map)) as NuvaAccessMenuItem[]
}

export function toPermissionState(value: NuvaPermissionState | null | undefined, config: NuvaResolvedAuthConfig) {
  return resolvePermissionState(value, config.permission.local, config.permission.source)
}
