import type { AlovaMethodCreateConfig, RequestBody } from 'alova'
import type { PageParams, PageResult } from '#nuva/api'
import type { NuvaAnyApiMethod, NuvaApiMethod } from '../types/api'

export type NuvaResourceId = string | number
export type NuvaResourceMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type NuvaResourcePath<TArgs extends unknown[] = []> = string | ((...args: TArgs) => string)
export type NuvaResourceEndpoint<TArgs extends unknown[] = []> = NuvaResourcePath<TArgs> | {
  path: NuvaResourcePath<TArgs>
  method?: NuvaResourceMethod
  config?: AlovaMethodCreateConfig<any, any, any>
}

export interface NuvaResourceEndpoints {
  list?: NuvaResourceEndpoint
  get?: NuvaResourceEndpoint<[id: NuvaResourceId]>
  create?: NuvaResourceEndpoint
  update?: NuvaResourceEndpoint<[id: NuvaResourceId]>
  remove?: NuvaResourceEndpoint<[id: NuvaResourceId]>
}

export interface CreateNuvaResourceApiOptions {
  path?: string
  endpoints?: NuvaResourceEndpoints
}

function requireResourcePath(action: keyof NuvaResourceEndpoints, path: string | undefined) {
  if (!path) {
    throw new Error(`[nuva/resource] Configure either path or endpoints.${action} before calling ${action}().`)
  }

  return path
}

function appendResourceId(action: 'get' | 'update' | 'remove', path: string | undefined, id: NuvaResourceId) {
  const resourcePath = requireResourcePath(action, path)

  return `${resourcePath.replace(/\/$/, '')}/${encodeURIComponent(String(id))}`
}

function replaceResourceId(path: string, id: NuvaResourceId) {
  return path.replace(':id', encodeURIComponent(String(id)))
}

function resolveResourceEndpoint<TArgs extends unknown[]>(action: keyof NuvaResourceEndpoints, endpoint: NuvaResourceEndpoint<TArgs> | undefined, fallback: () => string, fallbackMethod: NuvaResourceMethod, ...args: TArgs) {
  const endpointPath = endpoint && typeof endpoint === 'object' && 'path' in endpoint ? endpoint.path : endpoint
  const path = typeof endpointPath === 'function' ? endpointPath(...args) : endpointPath || fallback()
  const id = args[0]

  return {
    path: typeof id === 'string' || typeof id === 'number' ? replaceResourceId(path, id) : path,
    method: endpoint && typeof endpoint === 'object' && 'path' in endpoint ? endpoint.method || fallbackMethod : fallbackMethod,
    config: endpoint && typeof endpoint === 'object' && 'path' in endpoint ? endpoint.config : undefined,
  }
}

function toApiMethod<TResponse>(method: NuvaAnyApiMethod): NuvaApiMethod<TResponse> {
  return method as NuvaApiMethod<TResponse>
}

function createRequest<TResponse>(http: ReturnType<typeof useHttpClient>, method: NuvaResourceMethod, url: string, data?: RequestBody, config?: AlovaMethodCreateConfig<any, any, any>): NuvaApiMethod<TResponse> {
  switch (method) {
    case 'GET':
      return toApiMethod<TResponse>(data === undefined ? http.Get<TResponse>(url, config) : http.Get<TResponse>(url, { ...config, params: data as Record<string, unknown> | string }))
    case 'POST':
      return toApiMethod<TResponse>(data === undefined ? http.Post<TResponse>(url, undefined, config) : http.Post<TResponse>(url, data, config))
    case 'PUT':
      return toApiMethod<TResponse>(data === undefined ? http.Put<TResponse>(url, undefined, config) : http.Put<TResponse>(url, data, config))
    case 'PATCH':
      return toApiMethod<TResponse>(data === undefined ? http.Patch<TResponse>(url, undefined, config) : http.Patch<TResponse>(url, data, config))
    case 'DELETE':
      return toApiMethod<TResponse>(data === undefined ? http.Delete<TResponse>(url, undefined, config) : http.Delete<TResponse>(url, data, config))
  }
}

export function createNuvaResourceApi<
  TItem,
  TCreate = Partial<TItem>,
  TUpdate = Partial<TItem>,
  TQuery extends object = Record<string, never>,
  TRemove = null,
  TListResponse = PageResult<TItem>,
>(options: CreateNuvaResourceApiOptions) {
  const { path, endpoints = {} } = options
  const http = useHttpClient()

  return {
    list: (params: PageParams & TQuery) => {
      const endpoint = resolveResourceEndpoint('list', endpoints.list, () => requireResourcePath('list', path), 'GET')

      return createRequest<TListResponse>(http, endpoint.method, endpoint.path, params as Record<string, unknown>, endpoint.config)
    },
    get: (id: NuvaResourceId) => {
      const endpoint = resolveResourceEndpoint('get', endpoints.get, () => appendResourceId('get', path, id), 'GET', id)

      return createRequest<TItem>(http, endpoint.method, endpoint.path, undefined, endpoint.config)
    },
    create: (data: TCreate) => {
      const endpoint = resolveResourceEndpoint('create', endpoints.create, () => requireResourcePath('create', path), 'POST')

      return createRequest<TItem>(http, endpoint.method, endpoint.path, data as RequestBody, endpoint.config)
    },
    update: (id: NuvaResourceId, data: TUpdate) => {
      const endpoint = resolveResourceEndpoint('update', endpoints.update, () => appendResourceId('update', path, id), 'PATCH', id)

      return createRequest<TItem>(http, endpoint.method, endpoint.path, data as RequestBody, endpoint.config)
    },
    remove: (id: NuvaResourceId) => {
      const endpoint = resolveResourceEndpoint('remove', endpoints.remove, () => appendResourceId('remove', path, id), 'DELETE', id)

      return createRequest<TRemove>(http, endpoint.method, endpoint.path, undefined, endpoint.config)
    },
  }
}
