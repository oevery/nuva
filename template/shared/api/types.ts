export interface ApiResponse<T = unknown> {
  code: number | string
  message?: string
  data: T
}

export interface PageParams {
  pageNum: number
  pageSize: number
}

export interface PageResult<T> {
  list: T[]
  total: number
  pageNum?: number
  pageSize?: number
}

export type PageQuery<T extends object = Record<string, never>> = PageParams & T
