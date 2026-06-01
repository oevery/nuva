import type { CurrentUser } from '#shared/api/auth'
import type { ApiResponse } from '#shared/api/types'
import { demoUser, requireAuth } from '#server/utils/auth'
import { ok } from '#server/utils/response'

export default defineEventHandler((event): ApiResponse<CurrentUser> => {
  requireAuth(event)

  return ok(demoUser)
})
