import type { Profile } from '#shared/api/profile'
import type { ApiResponse } from '#shared/api/types'
import { requireAuth } from '#server/utils/auth'
import { ok } from '#server/utils/response'

export default defineEventHandler((event): ApiResponse<Profile> => {
  requireAuth(event)

  return ok({
    name: 'nuva-template',
    layer: 'template',
    status: 'ready',
  })
})
