import type { NuvaPermissionResolver, NuvaPermissionState, NuvaProfileResolver, NuvaRemoteRequestConfig, NuvaRemoteRequestMethod, NuvaRemoteResolverContext, NuvaResolvedAuthConfig } from '../../../../config'
import { resolvePermissionState } from './permission'

async function executeRemoteRequest<T>(request: NuvaRemoteRequestConfig | null | undefined) {
  if (!request?.url) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Nuva remote request is not configured',
    })
  }

  const http = useHttpClient()
  const method = (request.method || 'GET') as NuvaRemoteRequestMethod
  const config = {
    params: request.params,
    headers: request.headers,
    meta: request.meta,
  }

  switch (method) {
    case 'POST':
      return http.Post<T>(request.url, request.data, config)
    case 'PUT':
      return http.Put<T>(request.url, request.data, config)
    case 'PATCH':
      return http.Patch<T>(request.url, request.data, config)
    case 'DELETE':
      return http.Delete<T>(request.url, request.data, config)
    default:
      return http.Get<T>(request.url, config)
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

export function toPermissionState(value: NuvaPermissionState | null | undefined, config: NuvaResolvedAuthConfig) {
  return resolvePermissionState(value, config.permission.local, config.permission.source)
}
