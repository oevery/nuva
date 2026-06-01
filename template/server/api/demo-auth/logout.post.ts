import type { ApiResponse } from '#shared/api/types'
import { clearAuthCookie } from '#server/utils/auth'
import { ok } from '#server/utils/response'

export default defineEventHandler((event): ApiResponse<null> => {
  clearAuthCookie(event)

  return ok(null, '已退出登录')
})
