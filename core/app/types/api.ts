import type { AlovaGenerics, Method } from 'alova'

export interface NuvaApiResponse<T = unknown> {
  code: number | string
  message?: string
  data: T
}

export interface NuvaPageParams {
  pageNum: number
  pageSize: number
}

export interface NuvaPageResult<T> {
  list: T[]
  total: number
  pageNum?: number
  pageSize?: number
}

export type NuvaPageQuery<T extends object = Record<string, never>> = NuvaPageParams & T
export type NuvaApiMethod<TResponse> = Method<AlovaGenerics<TResponse>>
export type NuvaAnyApiMethod = Method
