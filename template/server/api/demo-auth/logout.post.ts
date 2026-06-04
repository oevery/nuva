import type { ApiResponse } from '#shared/api/types'
import { assertSameOriginRequest, clearAuthCookie } from '#server/utils/auth'
import { ok } from '#server/utils/response'

export default defineEventHandler((event): ApiResponse<null> => {
  assertSameOriginRequest(event)
  clearAuthCookie(event)

  return ok(null, '已退出登录')
})
