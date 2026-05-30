import type { ApiResponse } from '#shared/api/types'

export function ok<T>(data: T, message = '成功'): ApiResponse<T> {
  return {
    code: 0,
    message,
    data,
  }
}
