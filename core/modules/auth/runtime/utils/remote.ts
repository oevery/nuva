import type { NuvaAccessMenuItem, NuvaAccessMenuResolver, NuvaPermissionResolver, NuvaPermissionState, NuvaProfileResolver, NuvaRemoteRequestConfig, NuvaRemoteRequestMethod, NuvaRemoteResolverContext, NuvaResolvedAuthConfig } from '../../../../config'
import { handleHttpResponse } from '../../../../app/utils/http/response'
import { resolvePermissionState } from './permission'

function resolveRemoteRequestURL(url: string) {
  const baseURL = useRuntimeConfig().public.nuva?.api?.baseURL

  if (typeof baseURL !== 'string' || !baseURL.startsWith('/') || !url.startsWith('/')) {
    return url
  }

  const normalizedBaseURL = baseURL.replace(/\/+$/, '') || '/'
  const includesBaseURL = url === normalizedBaseURL || url.startsWith(`${normalizedBaseURL}/`)

  if (!includesBaseURL) {
    return url
  }

  if (import.meta.server) {
    return new URL(url, useRequestURL().origin).toString()
  }

  return globalThis.location?.origin
    ? new URL(url, globalThis.location.origin).toString()
    : url
}

function appendRequestParams(url: string, params: NuvaRemoteRequestConfig['params']) {
  if (!params) {
    return url
  }

  const targetURL = new URL(url)
  const searchParams = typeof params === 'string'
    ? new URLSearchParams(params)
    : new URLSearchParams(params as Record<string, string>)

  searchParams.forEach((value, key) => {
    targetURL.searchParams.set(key, value)
  })

  return targetURL.toString()
}

async function executeServerRemoteRequest(config: NuvaResolvedAuthConfig, request: NuvaRemoteRequestConfig, method: NuvaRemoteRequestMethod) {
  const url = appendRequestParams(resolveRemoteRequestURL(request.url), request.params)
  const apiConfig = useRuntimeConfig().public.nuva.api
  const requestHeaders = useRequestHeaders(['cookie'])
  const headers = new Headers(request.headers)
  const cookieToken = useCookie<string | null>(config.token.cookieName)

  if (requestHeaders.cookie) {
    headers.set('cookie', requestHeaders.cookie)
  }

  if (!request.meta?.ignoreToken && cookieToken.value) {
    headers.set(config.token.header, config.token.prefix ? `${config.token.prefix} ${cookieToken.value}` : cookieToken.value)
  }

  if (request.data && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  const response = await fetch(url, {
    method,
    headers,
    body: method === 'GET' ? undefined : request.data ? JSON.stringify(request.data) : undefined,
  })

  return handleHttpResponse(response, {
    config: { headers: Object.fromEntries(headers.entries()) },
    meta: request.meta || {},
  } as any, apiConfig)
}

async function executeRemoteRequest<T>(config: NuvaResolvedAuthConfig, request: NuvaRemoteRequestConfig | null | undefined) {
  if (!request?.url) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Nuva remote request is not configured',
    })
  }

  const method = (request.method || 'GET') as NuvaRemoteRequestMethod
  const url = resolveRemoteRequestURL(request.url)

  if (import.meta.server) {
    return executeServerRemoteRequest(config, request, method)
  }

  const http = useHttpClient()
  const requestConfig = {
    params: request.params,
    headers: request.headers,
    meta: request.meta,
  }

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

async function createResolverContext(config: NuvaResolvedAuthConfig, request: NuvaRemoteRequestConfig | null): Promise<NuvaRemoteResolverContext> {
  return {
    request,
    config,
    requestWith: async <T>(nextRequest = request) => executeRemoteRequest<T>(config, nextRequest),
  }
}

export async function fetchRemoteUser<TUser>(config: NuvaResolvedAuthConfig, request: NuvaRemoteRequestConfig | null, resolver: NuvaProfileResolver<TUser> | null) {
  if (resolver) {
    return resolver(await createResolverContext(config, request))
  }

  return executeRemoteRequest<TUser>(config, request)
}

export async function fetchRemotePermission(config: NuvaResolvedAuthConfig, request: NuvaRemoteRequestConfig | null, resolver: NuvaPermissionResolver | null) {
  if (resolver) {
    return resolver(await createResolverContext(config, request))
  }

  return executeRemoteRequest<NuvaPermissionState>(config, request)
}

export async function fetchRemoteAccessMenu(config: NuvaResolvedAuthConfig, request: NuvaRemoteRequestConfig | null, resolver: NuvaAccessMenuResolver | null) {
  if (resolver) {
    return resolver(await createResolverContext(config, request))
  }

  return executeRemoteRequest<NuvaAccessMenuItem[]>(config, request)
}

export function toPermissionState(value: NuvaPermissionState | null | undefined, config: NuvaResolvedAuthConfig) {
  return resolvePermissionState(value, config.permission.local, config.permission.source)
}
