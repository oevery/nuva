import type { Profile } from '#shared/api/profile'
import type { ApiResponse } from '#shared/api/types'
import { requireNuvaPermission } from '@oevery/nuva/server/utils/permission'
import { requireAuth } from '#server/utils/auth'
import { ok } from '#server/utils/response'

export default defineEventHandler((event): ApiResponse<Profile> => {
  requireAuth(event)
  requireNuvaPermission(event, 'profile:read')

  return ok({
    name: 'nuva-template',
    layer: 'template',
    status: 'ready',
  })
})
