import type { HttpUnauthorizedBehavior } from '../../../../app/types/alova'
import type { NuvaAccessMenuItem, NuvaAccessMenuResolver, NuvaPermissionResolver, NuvaPermissionState, NuvaProfileResolver, NuvaRemoteRequestConfig, NuvaRemoteRequestMethod, NuvaRemoteResolverContext, NuvaResolvedAuthConfig } from '../../../../config'
import { useRequestURL } from 'nuxt/app'
import { useHttpClient } from '../../../../app/composables/useHttpClient'
import { resolvePermissionState } from './permission'

function resolveRemoteRequestURL(url: string) {
  if (!url.startsWith('/')) {
    return url
  }

  if (import.meta.server) {
    return new URL(url, useRequestURL().origin).toString()
  }

  return globalThis.location?.origin
    ? new URL(url, globalThis.location.origin).toString()
    : url
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

async function executeRemoteRequest<T>(request: NuvaRemoteRequestConfig | null | undefined) {
  if (!request?.url) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Nuva remote request is not configured',
    })
  }

  const method = (request.method || 'GET') as NuvaRemoteRequestMethod
  const url = resolveRemoteRequestURL(request.url)
  const http = useHttpClient()
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

async function createResolverContext(config: NuvaResolvedAuthConfig, request: NuvaRemoteRequestConfig | null): Promise<NuvaRemoteResolverContext> {
  return {
    request,
    config,
    requestWith: async <T>(nextRequest = request) => executeRemoteRequest<T>(nextRequest),
  }
}

export async function fetchRemoteUser<TUser>(config: NuvaResolvedAuthConfig, request: NuvaRemoteRequestConfig | null, resolver: NuvaProfileResolver<TUser> | null) {
  if (resolver) {
    return resolver(await createResolverContext(config, request))
  }

  return executeRemoteRequest<TUser>(request)
}

export async function fetchRemotePermission(config: NuvaResolvedAuthConfig, request: NuvaRemoteRequestConfig | null, resolver: NuvaPermissionResolver | null) {
  if (resolver) {
    return resolver(await createResolverContext(config, request))
  }

  return executeRemoteRequest<NuvaPermissionState>(request)
}

export async function fetchRemoteAccessMenu(config: NuvaResolvedAuthConfig, request: NuvaRemoteRequestConfig | null, resolver: NuvaAccessMenuResolver | null) {
  if (resolver) {
    return resolver(await createResolverContext(config, request))
  }

  return executeRemoteRequest<NuvaAccessMenuItem[]>(request)
}

export function toPermissionState(value: NuvaPermissionState | null | undefined, config: NuvaResolvedAuthConfig) {
  return resolvePermissionState(value, config.permission.local, config.permission.source)
}
