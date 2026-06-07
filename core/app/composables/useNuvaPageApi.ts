import type { MaybeRefOrGetter } from 'vue'
import type { PageParams, PageResult } from '#nuva/api'
import type { NuvaApiMethod } from '../types/api'
import { usePagination } from 'alova/client'
import { toValue } from 'vue'

export interface UseNuvaPageApiBaseOptions<TQuery extends object> {
  query?: MaybeRefOrGetter<TQuery>
  immediate?: boolean
  initialPage?: number
  initialPageSize?: number
  pageField?: string
  pageSizeField?: string
  watchingStates?: unknown[]
  debounce?: number | number[]
  cleanParams?: boolean | ((params: PageParams & TQuery) => PageParams & TQuery)
}

export interface UseNuvaPageApiOptions<TItem, TQuery extends object> extends UseNuvaPageApiBaseOptions<TQuery> {
  data?: (response: PageResult<TItem>) => TItem[]
  total?: (response: PageResult<TItem>) => number
}

export interface UseCustomNuvaPageApiOptions<
  TItem,
  TQuery extends object,
  TResponse,
> extends UseNuvaPageApiBaseOptions<TQuery> {
  data?: (response: TResponse) => TItem[]
  total: (response: TResponse) => number
}

function getPageDebounce(query: unknown, watchingStates: unknown[] | undefined, debounce: number | number[] | undefined) {
  if (debounce !== undefined || !query || watchingStates) {
    return debounce
  }

  return [300, 0, 0]
}

function cleanPageParams<TQuery extends object>(params: PageParams & TQuery) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  ) as PageParams & TQuery
}

function getValueByPath(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((currentValue, key) => {
    return currentValue && typeof currentValue === 'object' ? (currentValue as Record<string, unknown>)[key] : undefined
  }, value)
}

export function useNuvaPageApi<
  TItem,
  TQuery extends object = Record<string, never>,
>(
  request: (params: PageParams & TQuery) => NuvaApiMethod<PageResult<TItem>>,
  options?: UseNuvaPageApiOptions<TItem, TQuery>,
): ReturnType<typeof usePagination>

export function useNuvaPageApi<
  TItem,
  TQuery extends object,
  TResponse,
>(
  request: (params: PageParams & TQuery) => NuvaApiMethod<TResponse>,
  options: UseCustomNuvaPageApiOptions<TItem, TQuery, TResponse>,
): ReturnType<typeof usePagination>

export function useNuvaPageApi<
  TItem,
  TQuery extends object = Record<string, never>,
  TResponse = PageResult<TItem>,
>(
  request: (params: PageParams & TQuery) => NuvaApiMethod<TResponse>,
  options: UseNuvaPageApiOptions<TItem, TQuery> | UseCustomNuvaPageApiOptions<TItem, TQuery, TResponse> = {},
) {
  const nuvaConfig = useNuvaConfig()
  const pageConfig = nuvaConfig.api.pagination
  const {
    query,
    immediate = true,
    initialPage = pageConfig.initialPage,
    initialPageSize = pageConfig.initialPageSize,
    pageField = pageConfig.pageField,
    pageSizeField = pageConfig.pageSizeField,
    watchingStates,
    cleanParams = pageConfig.cleanParams,
  } = options
  const data = (options.data as ((response: TResponse) => TItem[]) | undefined)
    ?? ((response: TResponse) => getValueByPath(response, pageConfig.listKey) as TItem[])
  const total = (options.total as ((response: TResponse) => number) | undefined)
    ?? ((response: TResponse) => Number(getValueByPath(response, pageConfig.totalKey) || 0))

  return usePagination(
    (page, pageSize) => {
      const queryParams = query ? toValue(query) : {}
      const params = {
        ...queryParams,
        [pageField]: page,
        [pageSizeField]: pageSize,
      } as PageParams & TQuery

      return request(typeof cleanParams === 'function' ? cleanParams(params) : cleanParams ? cleanPageParams(params) : params)
    },
    {
      immediate,
      initialPage,
      initialPageSize,
      watchingStates: watchingStates ?? (query ? [query] : undefined),
      debounce: getPageDebounce(query, watchingStates, options.debounce),
      data,
      total,
    },
  )
}
